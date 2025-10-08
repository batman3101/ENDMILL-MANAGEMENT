import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { ToolLifeAnalysisData, ReportFilter } from '../../../../lib/types/reports'
import {
  getDateRangeFromFilter,
  calculateAverage,
  calculatePercentage,
  calculateStdDeviation,
  calculateAchievementRate,
  generateLifeRecommendation,
  groupBy,
  maxBy,
  minBy
} from '../../../../lib/utils/reportCalculations'
import { logger } from '../../../../lib/utils/logger'

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
      .select('id, change_date, equipment_number, production_model, tool_life, change_reason, endmill_code')
      .gte('change_date', startDate)
      .lte('change_date', endDate)

    if (filter.equipmentModel) {
      tcQuery = tcQuery.eq('production_model', filter.equipmentModel)
    }

    const { data: toolChanges, error: tcError } = await tcQuery

    if (tcError) {
      logger.error('tool_changes 조회 오류:', tcError)
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
      logger.error('endmill_types 조회 오류:', etError)
    }

    // 3. 데이터 병합
    const endmillMap = new Map(endmillTypes?.map(et => [et.code, et]) || [])

    const mergedData = toolChanges.map(tc => ({
      ...tc,
      endmill_types: endmillMap.get(tc.endmill_code ?? '') || null
    }))

    // 엔드밀 카테고리 필터 적용 (클라이언트 사이드)
    let filteredChanges = mergedData

    if (filter.endmillCategory && filteredChanges.length > 0) {
      filteredChanges = filteredChanges.filter((change: any) => {
        const categoryName = change.endmill_types?.endmill_categories?.name_ko
        return categoryName === filter.endmillCategory
      })
    }

    if (filteredChanges.length === 0) {
      logger.log('데이터가 없습니다. 필터:', filter)
      return NextResponse.json({
        error: 'No data found for the specified filter',
        filter,
        dateRange: { startDate, endDate }
      }, { status: 404 })
    }

    // 데이터 변환
    const changes = filteredChanges.map((change: any) => {
      const unitCostString = change.endmill_types?.unit_cost || '0'
      const unitCost = typeof unitCostString === 'string'
        ? parseFloat(unitCostString)
        : Number(unitCostString)

      return {
        date: change.change_date,
        toolCode: change.endmill_types?.code || change.endmill_code,
        toolName: change.endmill_types?.name || '미지정',
        category: change.endmill_types?.endmill_categories?.name_ko || '미분류',
        life: change.tool_life || 0,
        standardLife: change.endmill_types?.standard_life || 0,
        reason: change.change_reason || '미지정',
        unitCost: isNaN(unitCost) ? 0 : unitCost
      }
    })

    // ========================================
    // Summary 계산
    // ========================================
    const allLives = changes.map((c: any) => c.life)
    const averageLife = calculateAverage(allLives)
    const totalChanges = changes.length

    // 조기 파손 건수 (표준 수명의 50% 미만)
    const prematureFailures = changes.filter((c: any) => {
      if (c.standardLife === 0) return false
      return c.life < (c.standardLife * 0.5)
    }).length

    // 표준 수명 달성률
    const achievementRates = changes
      .filter((c: any) => c.standardLife > 0)
      .map((c: any) => calculateAchievementRate(c.life, c.standardLife))
    const standardLifeAchievement = calculateAverage(achievementRates)

    // 최고/최저 성능 공구
    const toolStats = new Map<string, any>()
    changes.forEach((c: any) => {
      if (!toolStats.has(c.toolCode)) {
        toolStats.set(c.toolCode, {
          code: c.toolCode,
          name: c.toolName,
          standardLife: c.standardLife,
          lives: []
        })
      }
      toolStats.get(c.toolCode).lives.push(c.life)
    })

    const toolPerformance = Array.from(toolStats.values())
      .map((tool: any) => ({
        code: tool.code,
        name: tool.name,
        averageLife: calculateAverage(tool.lives),
        standardLife: tool.standardLife,
        achievementRate: calculateAchievementRate(
          calculateAverage(tool.lives),
          tool.standardLife
        )
      }))
      .filter((t: any) => t.standardLife > 0)

    const topPerformer = maxBy(toolPerformance, 'achievementRate' as any)
    const worstPerformer = minBy(toolPerformance, 'achievementRate' as any)

    // ========================================
    // 공구별 수명 분석
    // ========================================
    const lifeByTool = Array.from(toolStats.values())
      .map((tool: any) => {
        const lives = tool.lives
        const averageLife = calculateAverage(lives)
        const stdDeviation = calculateStdDeviation(lives)
        const achievementRate = calculateAchievementRate(averageLife, tool.standardLife)

        return {
          toolCode: tool.code,
          toolName: tool.name,
          category: changes.find((c: any) => c.toolCode === tool.code)?.category || '미분류',
          averageLife,
          standardLife: tool.standardLife,
          achievementRate,
          changeCount: lives.length,
          minLife: Math.min(...lives),
          maxLife: Math.max(...lives),
          stdDeviation
        }
      })
      .sort((a, b) => b.achievementRate - a.achievementRate)

    // ========================================
    // 교체 사유별 수명 분석
    // ========================================
    const lifeByReasonMap = groupBy(changes, 'reason' as any)
    const lifeByReason = Array.from(lifeByReasonMap.entries())
      .map(([reason, items]: [any, any]) => {
        const lives = items.map((i: any) => i.life)
        return {
          reason,
          averageLife: calculateAverage(lives),
          count: items.length,
          percentage: calculatePercentage(items.length, totalChanges)
        }
      })
      .sort((a, b) => b.count - a.count)

    // ========================================
    // 시간별 수명 트렌드
    // ========================================
    const lifeTrendMap = new Map<string, any>()
    changes.forEach((c: any) => {
      const period = c.date.substring(0, 7) // YYYY-MM
      if (!lifeTrendMap.has(period)) {
        lifeTrendMap.set(period, { lives: [], count: 0 })
      }
      const data = lifeTrendMap.get(period)
      data.lives.push(c.life)
      data.count++
    })

    const lifeTrend = Array.from(lifeTrendMap.entries())
      .map(([period, data]: [any, any]) => ({
        period,
        averageLife: calculateAverage(data.lives),
        changeCount: data.count
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    // ========================================
    // 수명 분포
    // ========================================
    const lifeRanges = [
      { min: 0, max: 100, label: '0-100' },
      { min: 101, max: 200, label: '101-200' },
      { min: 201, max: 300, label: '201-300' },
      { min: 301, max: 500, label: '301-500' },
      { min: 501, max: 1000, label: '501-1000' },
      { min: 1001, max: Infinity, label: '1000+' }
    ]

    const lifeDistribution = lifeRanges.map(range => {
      const count = changes.filter((c: any) =>
        c.life >= range.min && c.life <= range.max
      ).length
      return {
        range: range.label,
        count,
        percentage: calculatePercentage(count, totalChanges)
      }
    }).filter(d => d.count > 0)

    // ========================================
    // 조기 파손 분석
    // ========================================
    const prematureFailureData = Array.from(toolStats.values())
      .map((tool: any) => {
        const prematureLives = tool.lives.filter((life: number) =>
          tool.standardLife > 0 && life < (tool.standardLife * 0.5)
        )

        if (prematureLives.length === 0) return null

        const averageLifeAtFailure = calculateAverage(prematureLives)
        const achievementRate = calculateAchievementRate(averageLifeAtFailure, tool.standardLife)

        // 주요 파손 원인 찾기
        const failureReasons = changes.filter((c: any) =>
          c.toolCode === tool.code &&
          c.standardLife > 0 &&
          c.life < (c.standardLife * 0.5)
        )
        const reasonCount = new Map<string, number>()
        failureReasons.forEach((c: any) => {
          reasonCount.set(c.reason, (reasonCount.get(c.reason) || 0) + 1)
        })
        const mainReason = Array.from(reasonCount.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '알 수 없음'

        return {
          toolCode: tool.code,
          toolName: tool.name,
          failureCount: prematureLives.length,
          averageLifeAtFailure,
          standardLife: tool.standardLife,
          achievementRate,
          mainReason
        }
      })
      .filter((item: any) => item !== null)
      .sort((a: any, b: any) => b.failureCount - a.failureCount)
      .slice(0, 10)

    // ========================================
    // 응답 데이터 구성
    // ========================================
    const reportData: ToolLifeAnalysisData = {
      metadata: {
        id: `tool-life-${Date.now()}`,
        type: 'tool-life',
        title: 'Tool Life 분석',
        generatedAt: new Date().toISOString(),
        generatedBy: 'system',
        filter
      },
      summary: {
        averageLife: Math.round(averageLife),
        totalChanges,
        prematureFailures,
        standardLifeAchievement: Math.round(standardLifeAchievement * 10) / 10,
        topPerformingTool: topPerformer ? `${topPerformer.name} (${topPerformer.achievementRate.toFixed(1)}%)` : 'N/A',
        worstPerformingTool: worstPerformer ? `${worstPerformer.name} (${worstPerformer.achievementRate.toFixed(1)}%)` : 'N/A'
      },
      lifeByTool,
      lifeByReason,
      lifeTrend,
      lifeDistribution,
      prematureFailureAnalysis: prematureFailureData as any
    }

    return NextResponse.json(reportData)
  } catch (error) {
    logger.error('Tool Life 분석 생성 오류:', error)
    return NextResponse.json(
      { error: 'Failed to generate tool life analysis' },
      { status: 500 }
    )
  }
}