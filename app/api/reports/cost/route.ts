import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { CostAnalysisData, ReportFilter } from '../../../../lib/types/reports'
import {
  getDateRangeFromFilter,
  calculateAverage,
  calculatePercentage,
  calculateCostPerLife,
  calculateEfficiencyScore,
  calculateAchievementRate,
  calculateTrend,
  generateCostRecommendation,
  groupBy,
  sumBy,
  maxBy,
  minBy
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
      .select('id, change_date, equipment_number, production_model, tool_life, endmill_code')
      .gte('change_date', startDate)
      .lte('change_date', endDate)

    if (filter.equipmentModel) {
      tcQuery = tcQuery.eq('production_model', filter.equipmentModel)
    }

    const { data: toolChanges, error: tcError } = await tcQuery

    if (tcError) {
      console.error('비용 분석 데이터 조회 오류:', tcError)
      return NextResponse.json({ error: 'Failed to fetch tool changes' }, { status: 500 })
    }

    if (!toolChanges || toolChanges.length === 0) {
      return NextResponse.json({
        error: 'No data found for the specified filter'
      }, { status: 404 })
    }

    // 2. endmill_types 데이터 조회 (카테고리 포함)
    const { data: endmillTypes } = await supabase
      .from('endmill_types')
      .select(`
        code,
        name,
        unit_cost,
        standard_life,
        endmill_categories(name_ko)
      `)

    // 3. 데이터 병합
    const endmillMap = new Map(endmillTypes?.map(et => [et.code, et]) || [])

    const mergedData = toolChanges.map(tc => ({
      ...tc,
      endmill_types: endmillMap.get(tc.endmill_code) || null
    }))

    // 4. 엔드밀 카테고리 필터 적용
    let filteredChanges = mergedData
    if (filter.endmillCategory) {
      filteredChanges = mergedData.filter((change: any) => {
        const categoryName = change.endmill_types?.endmill_categories?.name_ko
        return categoryName === filter.endmillCategory
      })
    }

    // 5. 데이터 변환
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
        unitCost: isNaN(unitCost) ? 0 : unitCost,
        standardLife: change.endmill_types?.standard_life || 0
      }
    })

    // ========================================
    // Summary 계산
    // ========================================
    const totalCost = changes.reduce((sum: number, c: any) => sum + c.unitCost, 0)
    const totalChanges = changes.length
    const averageCostPerChange = totalChanges > 0 ? totalCost / totalChanges : 0

    // 기간별 비용 트렌드 계산
    const periodCosts = changes.reduce((acc: any, c: any) => {
      const period = c.date.substring(0, 7) // YYYY-MM
      if (!acc[period]) acc[period] = 0
      acc[period] += c.unitCost
      return acc
    }, {})
    const costTrend = calculateTrend(Object.values(periodCosts))

    // 최고/최저 비용 기간
    const periodData = Object.entries(periodCosts).map(([period, cost]) => ({
      period,
      cost: cost as number
    }))
    const highestCostPeriod = maxBy(periodData, 'cost' as any)?.period || 'N/A'
    const lowestCostPeriod = minBy(periodData, 'cost' as any)?.period || 'N/A'

    // ========================================
    // 기간별 비용
    // ========================================
    const costByPeriod = Object.entries(periodCosts)
      .map(([period, cost]: [string, any]) => {
        const periodChanges = changes.filter((c: any) => c.date.startsWith(period))
        return {
          period,
          cost: Math.round(cost),
          changeCount: periodChanges.length,
          averageCost: Math.round(cost / periodChanges.length)
        }
      })
      .sort((a, b) => a.period.localeCompare(b.period))

    // ========================================
    // 모델별 비용
    // ========================================
    const costByModelMap = groupBy(changes, 'model' as any)
    const costByModel = Array.from(costByModelMap.entries())
      .map(([model, items]: [any, any]) => {
        const cost = sumBy(items, 'unitCost' as any)
        return {
          model,
          totalCost: Math.round(cost),
          changeCount: items.length,
          averageCost: Math.round(cost / items.length),
          costPercentage: calculatePercentage(cost, totalCost)
        }
      })
      .sort((a, b) => b.totalCost - a.totalCost)

    // ========================================
    // 카테고리별 비용
    // ========================================
    const costByCategoryMap = groupBy(changes, 'category' as any)
    const costByCategory = Array.from(costByCategoryMap.entries())
      .map(([category, items]: [any, any]) => {
        const cost = sumBy(items, 'unitCost' as any)
        return {
          category,
          totalCost: Math.round(cost),
          changeCount: items.length,
          averageCost: Math.round(cost / items.length),
          costPercentage: calculatePercentage(cost, totalCost)
        }
      })
      .sort((a, b) => b.totalCost - a.totalCost)

    // ========================================
    // 비용 효율성 분석
    // ========================================
    const toolStats = new Map<string, any>()
    changes.forEach((c: any) => {
      if (!toolStats.has(c.toolCode)) {
        toolStats.set(c.toolCode, {
          code: c.toolCode,
          name: c.toolName,
          unitCost: c.unitCost,
          standardLife: c.standardLife,
          lives: []
        })
      }
      toolStats.get(c.toolCode).lives.push(c.life)
    })

    const costEfficiency = Array.from(toolStats.values())
      .map((tool: any) => {
        const averageLife = calculateAverage(tool.lives)
        const costPerLife = calculateCostPerLife(tool.unitCost, averageLife)
        const achievementRate = calculateAchievementRate(averageLife, tool.standardLife)
        const efficiencyScore = calculateEfficiencyScore(averageLife, tool.standardLife)

        return {
          toolCode: tool.code,
          toolName: tool.name,
          unitCost: tool.unitCost,
          averageLife,
          standardLife: tool.standardLife,
          costPerLife,
          efficiencyRating: efficiencyScore,
          recommendation: generateCostRecommendation(costPerLife, achievementRate, efficiencyScore)
        }
      })
      .sort((a, b) => a.costPerLife - b.costPerLife)

    // ========================================
    // 응답 데이터 구성
    // ========================================
    const reportData: CostAnalysisData = {
      metadata: {
        id: `cost-${Date.now()}`,
        type: 'cost',
        title: '비용 분석',
        generatedAt: new Date().toISOString(),
        generatedBy: 'system',
        filter
      },
      summary: {
        totalCost: Math.round(totalCost),
        averageCostPerChange: Math.round(averageCostPerChange),
        costTrend,
        highestCostPeriod,
        lowestCostPeriod
      },
      costByPeriod,
      costByModel,
      costByCategory,
      costEfficiency
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('비용 분석 생성 오류:', error)
    return NextResponse.json(
      { error: 'Failed to generate cost analysis' },
      { status: 500 }
    )
  }
}