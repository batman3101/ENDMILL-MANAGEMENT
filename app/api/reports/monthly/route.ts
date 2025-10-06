import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { MonthlyReportData, ReportFilter } from '../../../../lib/types/reports'
import {
  getDateRangeFromFilter,
  calculateAverage,
  calculatePercentage,
  groupBy,
  sumBy,
  maxBy
} from '../../../../lib/utils/reportCalculations'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const filter: ReportFilter = body.filter

    if (!filter) {
      return NextResponse.json({ error: 'Filter is required' }, { status: 400 })
    }

    // 날짜 범위 계산
    const { startDate, endDate } = getDateRangeFromFilter(filter)

    // 1. tool_changes 데이터 조회
    let tcQuery = supabase
      .from('tool_changes')
      .select('id, change_date, equipment_number, production_model, tool_life, change_reason, endmill_code, changed_by')
      .gte('change_date', startDate)
      .lte('change_date', endDate)

    if (filter.equipmentModel) {
      tcQuery = tcQuery.eq('production_model', filter.equipmentModel)
    }

    const { data: toolChanges, error: tcError } = await tcQuery

    if (tcError) {
      console.error('tool_changes 조회 오류:', tcError)
      return NextResponse.json({ error: 'Failed to fetch tool changes', details: tcError }, { status: 500 })
    }

    if (!toolChanges || toolChanges.length === 0) {
      return NextResponse.json({
        error: 'No data found for the specified filter',
        filter,
        dateRange: { startDate, endDate }
      }, { status: 404 })
    }

    // 2. endmill_types 데이터 조회 (카테고리 포함)
    const { data: endmillTypes, error: etError } = await supabase
      .from('endmill_types')
      .select(`
        code,
        name,
        unit_cost,
        standard_life,
        category_id,
        endmill_categories(name_ko)
      `)

    if (etError) {
      console.error('endmill_types 조회 오류:', etError)
    }

    // 3. user_profiles 데이터 조회
    const { data: userProfiles, error: upError } = await supabase
      .from('user_profiles')
      .select('id, name')

    if (upError) {
      console.error('user_profiles 조회 오류:', upError)
    }

    // 4. 데이터 병합
    const endmillMap = new Map(endmillTypes?.map(et => [et.code, et]) || [])
    const userMap = new Map(userProfiles?.map(up => [up.id, up]) || [])

    const mergedData = toolChanges.map(tc => ({
      ...tc,
      endmill_types: endmillMap.get(tc.endmill_code ?? '') || null,
      user_profiles: userMap.get(tc.changed_by ?? '') || null
    }))


    // 카테고리 필터 적용 (클라이언트 사이드)
    let filteredChanges = mergedData

    if (filter.endmillCategory && filteredChanges.length > 0) {
      filteredChanges = filteredChanges.filter((change: any) => {
        const categoryName = change.endmill_types?.endmill_categories?.name_ko
        return categoryName === filter.endmillCategory
      })
    }

    if (filteredChanges.length === 0) {
      console.log('데이터가 없습니다. 필터:', filter)
      return NextResponse.json({
        error: 'No data found for the specified filter',
        filter,
        dateRange: { startDate, endDate }
      }, { status: 404 })
    }

    // 데이터 변환 및 계산
    const changes = filteredChanges.map((change: any) => {
      const unitCostString = change.endmill_types?.unit_cost || '0'
      const unitCost = typeof unitCostString === 'string'
        ? parseFloat(unitCostString)
        : Number(unitCostString)

      return {
        date: change.change_date,
        equipmentNumber: change.equipment_number,
        model: change.production_model || '미지정',
        toolCode: change.endmill_types?.code || change.endmill_code,
        toolName: change.endmill_types?.name || '미지정',
        category: change.endmill_types?.endmill_categories?.name_ko || '미분류',
        life: change.tool_life || 0,
        reason: change.change_reason || '미지정',
        unitCost: isNaN(unitCost) ? 0 : unitCost,
        standardLife: change.endmill_types?.standard_life || 0,
        changedBy: change.user_profiles?.name || '알 수 없음'
      }
    })

    // ========================================
    // Summary 계산
    // ========================================
    const totalChanges = changes.length
    const totalCost = changes.reduce((sum: number, c: any) => sum + c.unitCost, 0)
    const averageToolLife = calculateAverage(changes.map((c: any) => c.life))

    // 가장 많이 교체된 공구
    const toolChangeCount = new Map<string, number>()
    changes.forEach((c: any) => {
      const key = c.toolCode
      toolChangeCount.set(key, (toolChangeCount.get(key) || 0) + 1)
    })
    const mostChangedToolCode = Array.from(toolChangeCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    const mostChangedTool = changes.find((c: any) => c.toolCode === mostChangedToolCode)?.toolName || 'N/A'

    // 가장 비용이 많이 든 공구
    const toolCostSum = new Map<string, number>()
    changes.forEach((c: any) => {
      const key = c.toolCode
      toolCostSum.set(key, (toolCostSum.get(key) || 0) + c.unitCost)
    })
    const mostExpensiveToolCode = Array.from(toolCostSum.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    const mostExpensiveTool = changes.find((c: any) => c.toolCode === mostExpensiveToolCode)?.toolName || 'N/A'

    // ========================================
    // 날짜별 교체 현황
    // ========================================
    const changesByDateMap = groupBy(changes, 'date' as any)
    const changesByDate = Array.from(changesByDateMap.entries())
      .map(([date, items]: [any, any]) => ({
        date,
        count: items.length,
        cost: items.reduce((sum: number, item: any) => sum + (item.unitCost || 0), 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // ========================================
    // 모델별 교체 현황
    // ========================================
    const changesByModelMap = groupBy(changes, 'model' as any)
    const changesByModel = Array.from(changesByModelMap.entries())
      .map(([model, items]: [any, any]) => ({
        model: model || '미지정',
        count: items.length,
        cost: items.reduce((sum: number, item: any) => sum + (item.unitCost || 0), 0),
        percentage: calculatePercentage(items.length, totalChanges)
      }))
      .sort((a, b) => b.count - a.count)

    // ========================================
    // 카테고리별 교체 현황
    // ========================================
    const changesByCategoryMap = groupBy(changes, 'category' as any)
    const changesByCategory = Array.from(changesByCategoryMap.entries())
      .map(([category, items]: [any, any]) => ({
        category,
        count: items.length,
        cost: items.reduce((sum: number, item: any) => sum + (item.unitCost || 0), 0),
        percentage: calculatePercentage(items.length, totalChanges)
      }))
      .sort((a, b) => b.count - a.count)

    // ========================================
    // 교체 사유별 현황
    // ========================================
    const changesByReasonMap = groupBy(changes, 'reason' as any)
    const changesByReason = Array.from(changesByReasonMap.entries())
      .map(([reason, items]: [any, any]) => ({
        reason,
        count: items.length,
        percentage: calculatePercentage(items.length, totalChanges)
      }))
      .sort((a, b) => b.count - a.count)

    // ========================================
    // 상위 공구 목록
    // ========================================
    const toolStats = new Map<string, any>()
    changes.forEach((c: any) => {
      if (!toolStats.has(c.toolCode)) {
        toolStats.set(c.toolCode, {
          code: c.toolCode,
          name: c.toolName,
          changes: [],
          totalCost: 0
        })
      }
      const stats = toolStats.get(c.toolCode)
      stats.changes.push(c.life)
      stats.totalCost += c.unitCost
    })

    const topTools = Array.from(toolStats.values())
      .map((tool: any) => ({
        code: tool.code,
        name: tool.name,
        changeCount: tool.changes.length,
        totalCost: tool.totalCost,
        averageLife: calculateAverage(tool.changes)
      }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10)

    // ========================================
    // 응답 데이터 구성
    // ========================================
    const reportData: MonthlyReportData = {
      metadata: {
        id: `monthly-${Date.now()}`,
        type: 'monthly',
        title: '월간 리포트',
        generatedAt: new Date().toISOString(),
        generatedBy: 'system',
        filter
      },
      summary: {
        totalChanges,
        totalCost: Math.round(totalCost),
        averageToolLife,
        mostChangedTool,
        mostExpensiveTool
      },
      changesByDate,
      changesByModel,
      changesByCategory,
      changesByReason,
      topTools
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('월간 리포트 생성 오류:', error)
    return NextResponse.json(
      { error: 'Failed to generate monthly report' },
      { status: 500 }
    )
  }
}