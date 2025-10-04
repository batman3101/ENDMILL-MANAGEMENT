import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { PerformanceReportData, ReportFilter } from '../../../../lib/types/reports'
import {
  getDateRangeFromFilter,
  calculateAverage,
  calculateAchievementRate,
  calculateEfficiencyScore,
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
      .select('id, change_date, equipment_number, production_model, tool_life, change_reason, endmill_code, process')
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

    // 2. endmill_types 데이터 조회
    const { data: endmillTypes, error: etError } = await supabase
      .from('endmill_types')
      .select('code, name, unit_cost, standard_life')

    if (etError) {
      console.error('endmill_types 조회 오류:', etError)
    }

    // 3. equipment 데이터 조회
    const { data: equipments, error: eqError } = await supabase
      .from('equipments')
      .select('equipment_number, model_code, location')

    if (eqError) {
      console.error('equipment 조회 오류:', eqError)
    }

    // 4. 데이터 병합
    const endmillMap = new Map(endmillTypes?.map(et => [et.code, et]) || [])
    const equipmentDataMap = new Map(equipments?.map(eq => [eq.equipment_number, eq]) || [])

    const mergedData = toolChanges.map(tc => ({
      ...tc,
      endmill_types: endmillMap.get(tc.endmill_code) || null,
      equipment: equipmentDataMap.get(tc.equipment_number) || null
    }))

    // 데이터 변환
    const changes = mergedData.map((change: any) => {
      const unitCostString = change.endmill_types?.unit_cost || '0'
      const unitCost = typeof unitCostString === 'string'
        ? parseFloat(unitCostString)
        : Number(unitCostString)

      // 설비번호 포맷팅 (C001, C002 등)
      const rawEquipmentNumber = change.equipment?.equipment_number || change.equipment_number
      const formattedEquipmentNumber = typeof rawEquipmentNumber === 'string' && rawEquipmentNumber.startsWith('C')
        ? rawEquipmentNumber
        : `C${String(rawEquipmentNumber).padStart(3, '0')}`

      return {
        date: change.change_date,
        equipmentNumber: formattedEquipmentNumber,
        model: change.equipment?.model_code || change.production_model || '미지정',
        location: change.equipment?.location || 'A동',
        process: change.process || '미지정',
        life: change.tool_life || 0,
        standardLife: change.endmill_types?.standard_life || 0,
        unitCost: isNaN(unitCost) ? 0 : unitCost,
        reason: change.change_reason || '미지정'
      }
    })

    // ========================================
    // Summary 계산
    // ========================================
    const equipmentSet = new Set(changes.map((c: any) => c.equipmentNumber))
    const totalEquipment = equipmentSet.size
    const totalChanges = changes.length
    const averageChangesPerEquipment = totalChanges / totalEquipment

    // 전체 효율성 (전체 평균 수명 달성률)
    const validChanges = changes.filter((c: any) => c.standardLife > 0)
    const achievementRates = validChanges.map((c: any) =>
      calculateAchievementRate(c.life, c.standardLife)
    )
    const overallEfficiency = calculateAverage(achievementRates)

    // ========================================
    // 설비별 성능 분석
    // ========================================
    const equipmentMap = groupBy(changes, 'equipmentNumber' as any)
    const equipmentPerformance = Array.from(equipmentMap.entries())
      .map(([equipmentNumber, items]: [any, any]) => {
        const totalCost = sumBy(items, 'unitCost' as any)
        const lives = items.map((i: any) => i.life)
        const averageToolLife = calculateAverage(lives)

        // 표준 수명 달성률
        const validItems = items.filter((i: any) => i.standardLife > 0)
        const itemAchievementRates = validItems.map((i: any) =>
          calculateAchievementRate(i.life, i.standardLife)
        )
        const standardLifeAchievement = calculateAverage(itemAchievementRates)

        // 조기 파손 건수
        const prematureFailures = items.filter((i: any) =>
          i.standardLife > 0 && i.life < (i.standardLife * 0.5)
        ).length

        // 효율성 점수
        const efficiencyScores = validItems.map((i: any) =>
          calculateEfficiencyScore(i.life, i.standardLife)
        )
        const efficiencyScore = calculateAverage(efficiencyScores)

        return {
          equipmentNumber,
          model: items[0].model || '미지정',
          location: items[0].location,
          totalChanges: items.length,
          totalCost: Math.round(totalCost),
          averageToolLife: Math.round(averageToolLife),
          standardLifeAchievement: Math.round(standardLifeAchievement * 10) / 10,
          prematureFailures,
          efficiencyScore: Math.round(efficiencyScore),
          ranking: 0 // 나중에 설정
        }
      })
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)

    // 랭킹 설정
    equipmentPerformance.forEach((item, index) => {
      item.ranking = index + 1
    })

    const topPerformer = equipmentPerformance[0]
    const worstPerformer = equipmentPerformance[equipmentPerformance.length - 1]

    // ========================================
    // 모델별 비교
    // ========================================
    const modelMap = groupBy(changes, 'model' as any)
    const modelComparison = Array.from(modelMap.entries())
      .map(([model, items]: [any, any]) => {
        const equipmentCount = new Set(items.map((i: any) => i.equipmentNumber)).size
        const averageChanges = items.length / equipmentCount
        const totalCost = sumBy(items, 'unitCost' as any)
        const averageCost = totalCost / items.length
        const lives = items.map((i: any) => i.life)
        const averageLife = calculateAverage(lives)

        // 표준 수명 달성률
        const validItems = items.filter((i: any) => i.standardLife > 0)
        const itemAchievementRates = validItems.map((i: any) =>
          calculateAchievementRate(i.life, i.standardLife)
        )
        const standardLifeAchievement = calculateAverage(itemAchievementRates)

        // 효율성 점수
        const efficiencyScores = validItems.map((i: any) =>
          calculateEfficiencyScore(i.life, i.standardLife)
        )
        const efficiencyScore = calculateAverage(efficiencyScores)

        return {
          model: model || '미지정',
          equipmentCount,
          averageChanges: Math.round(averageChanges * 10) / 10,
          averageCost: Math.round(averageCost),
          averageLife: Math.round(averageLife),
          standardLifeAchievement: Math.round(standardLifeAchievement * 10) / 10,
          efficiencyScore: Math.round(efficiencyScore)
        }
      })
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)

    // ========================================
    // 위치별 비교
    // ========================================
    const locationMap = groupBy(changes, 'location' as any)
    const locationComparison = Array.from(locationMap.entries())
      .map(([location, items]: [any, any]) => {
        const equipmentCount = new Set(items.map((i: any) => i.equipmentNumber)).size
        const totalChanges = items.length
        const totalCost = sumBy(items, 'unitCost' as any)
        const lives = items.map((i: any) => i.life)
        const averageLife = calculateAverage(lives)

        // 효율성 점수
        const validItems = items.filter((i: any) => i.standardLife > 0)
        const efficiencyScores = validItems.map((i: any) =>
          calculateEfficiencyScore(i.life, i.standardLife)
        )
        const efficiencyScore = calculateAverage(efficiencyScores)

        return {
          location,
          equipmentCount,
          totalChanges,
          totalCost: Math.round(totalCost),
          averageLife: Math.round(averageLife),
          efficiencyScore: Math.round(efficiencyScore)
        }
      })
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)

    // ========================================
    // 공정별 효율성
    // ========================================
    const processMap = groupBy(changes, 'process' as any)
    const processEfficiency = Array.from(processMap.entries())
      .map(([process, items]: [any, any]) => {
        const changeCount = items.length
        const lives = items.map((i: any) => i.life)
        const averageLife = calculateAverage(lives)
        const cost = sumBy(items, 'unitCost' as any)

        // 효율성 점수
        const validItems = items.filter((i: any) => i.standardLife > 0)
        const efficiencyScores = validItems.map((i: any) =>
          calculateEfficiencyScore(i.life, i.standardLife)
        )
        const efficiencyScore = calculateAverage(efficiencyScores)

        return {
          process: process || '미지정',
          changeCount,
          averageLife: Math.round(averageLife),
          cost: Math.round(cost),
          efficiencyScore: Math.round(efficiencyScore)
        }
      })
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)

    // ========================================
    // 시간별 분석
    // ========================================
    const timeMap = new Map<string, any>()
    changes.forEach((c: any) => {
      const period = c.date.substring(0, 7) // YYYY-MM
      if (!timeMap.has(period)) {
        timeMap.set(period, {
          lives: [],
          costs: 0,
          count: 0,
          validItems: []
        })
      }
      const data = timeMap.get(period)
      data.lives.push(c.life)
      data.costs += c.unitCost
      data.count++
      if (c.standardLife > 0) {
        data.validItems.push(c)
      }
    })

    const timeBasedAnalysis = Array.from(timeMap.entries())
      .map(([period, data]: [any, any]) => {
        const averageLife = calculateAverage(data.lives)
        const efficiencyScores = data.validItems.map((i: any) =>
          calculateEfficiencyScore(i.life, i.standardLife)
        )
        const efficiencyScore = calculateAverage(efficiencyScores)

        return {
          period,
          changeCount: data.count,
          cost: Math.round(data.costs),
          averageLife: Math.round(averageLife),
          efficiencyScore: Math.round(efficiencyScore)
        }
      })
      .sort((a, b) => a.period.localeCompare(b.period))

    // ========================================
    // 응답 데이터 구성
    // ========================================
    const reportData: PerformanceReportData = {
      metadata: {
        id: `performance-${Date.now()}`,
        type: 'performance',
        title: '성능 리포트',
        generatedAt: new Date().toISOString(),
        generatedBy: 'system',
        filter
      },
      summary: {
        totalEquipment,
        averageChangesPerEquipment: Math.round(averageChangesPerEquipment * 10) / 10,
        topPerformer: topPerformer ? `설비 ${topPerformer.equipmentNumber} (${topPerformer.efficiencyScore}점)` : 'N/A',
        worstPerformer: worstPerformer ? `설비 ${worstPerformer.equipmentNumber} (${worstPerformer.efficiencyScore}점)` : 'N/A',
        overallEfficiency: Math.round(overallEfficiency * 10) / 10
      },
      equipmentPerformance,
      modelComparison,
      locationComparison,
      processEfficiency,
      timeBasedAnalysis
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('성능 리포트 생성 오류:', error)
    return NextResponse.json(
      { error: 'Failed to generate performance report' },
      { status: 500 }
    )
  }
}