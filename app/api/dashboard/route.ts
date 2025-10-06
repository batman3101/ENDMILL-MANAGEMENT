import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/services/supabaseService'

export async function GET(request: NextRequest) {
  console.log('🚀 대시보드 API 호출됨:', new Date().toISOString())
  try {
    const supabase = createServerSupabaseClient()
    console.log('✅ Supabase 클라이언트 생성 완료')

    // 병렬로 모든 데이터 조회
    const [
      equipmentStats,
      endmillUsageStats,
      inventoryStats,
      toolChangeStats,
      costAnalysis,
      frequencyAnalysis,
      lifespanAnalysis,
      modelCostAnalysis,
      recentAlerts
    ] = await Promise.all([
      getEquipmentStats(supabase),
      getEndmillUsageStats(supabase),
      getInventoryStats(supabase),
      getToolChangeStats(supabase),
      getCostAnalysis(supabase),
      getFrequencyAnalysis(supabase),
      getLifespanAnalysis(supabase),
      getModelCostAnalysis(supabase),
      getRecentAlerts(supabase)
    ])

    const dashboardData = {
      // 기존 인사이트
      equipment: equipmentStats,
      endmillUsage: endmillUsageStats,
      inventory: inventoryStats,
      toolChanges: toolChangeStats,

      // 새로운 인사이트
      costAnalysis,
      frequencyAnalysis,
      lifespanAnalysis,
      modelCostAnalysis,
      recentAlerts,

      // 메타 정보
      lastUpdated: new Date().toISOString(),
      dataSource: 'realtime'
    }

    return Response.json(dashboardData)

  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error)
    return Response.json(
      { error: '대시보드 데이터를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 설비 통계
async function getEquipmentStats(supabase: any) {
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('status, model_code, location')

  if (error) {
    console.error('equipment 조회 오류:', error)
    throw error
  }

  const total = equipment.length
  const statusCounts = equipment.reduce((acc: any, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})

  const operatingRate = Math.round((statusCounts['가동중'] || 0) / total * 100)

  return {
    total,
    active: statusCounts['가동중'] || 0,
    maintenance: statusCounts['점검중'] || 0,
    setup: statusCounts['셋업중'] || 0,
    operatingRate,
    toolLifeEfficiency: 75 // 계산된 값 또는 별도 조회
  }
}

// 엔드밀 사용 현황 통계 (수량 기반)
async function getEndmillUsageStats(supabase: any) {
  const { data: toolPositions, error } = await supabase
    .from('tool_positions')
    .select('current_life, total_life, status')
    .neq('status', 'empty')

  if (error) {
    console.error('tool_positions 조회 오류:', error)
    throw error
  }

  // 잔여 수명 비율에 따라 상태 분류
  const stats = toolPositions.reduce((acc: any, pos: any) => {
    const remainingRatio = pos.total_life > 0 ? pos.current_life / pos.total_life : 0

    if (remainingRatio >= 0.3) {
      acc.normal++
    } else if (remainingRatio >= 0.1) {
      acc.warning++
    } else {
      acc.critical++
    }

    return acc
  }, { normal: 0, warning: 0, critical: 0 })

  const totalInUse = stats.normal + stats.warning + stats.critical
  const usageRate = totalInUse > 0 ? Math.round((stats.normal / totalInUse) * 100) : 0

  return {
    total: totalInUse,
    normal: stats.normal,
    warning: stats.warning,
    critical: stats.critical,
    usageRate
  }
}

// 재고 통계
async function getInventoryStats(supabase: any) {
  const { data: inventory, error } = await supabase
    .from('inventory')
    .select('current_stock, min_stock, max_stock, status')

  if (error) throw error

  const statusCounts = inventory.reduce((acc: any, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})

  return {
    total: inventory.length,
    sufficient: statusCounts['sufficient'] || 0,
    low: statusCounts['low'] || 0,
    critical: statusCounts['critical'] || 0
  }
}

// 교체 실적 통계
async function getToolChangeStats(supabase: any) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: todayChanges, error: todayError } = await supabase
    .from('tool_changes')
    .select('*')
    .gte('change_date', today)

  const { data: yesterdayChanges, error: yesterdayError } = await supabase
    .from('tool_changes')
    .select('*')
    .gte('change_date', yesterday)
    .lt('change_date', today)

  if (todayError || yesterdayError) throw todayError || yesterdayError

  const todayCount = todayChanges.length
  const yesterdayCount = yesterdayChanges.length
  const difference = todayCount - yesterdayCount

  return {
    today: todayCount,
    yesterday: yesterdayCount,
    difference,
    trend: difference >= 0 ? `+${difference}` : `${difference}`,
    target: 130
  }
}

// 공구 사용 비용 분석
async function getCostAnalysis(supabase: any) {
  const currentMonth = new Date().getMonth() + 1
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const currentYear = new Date().getFullYear()
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // 이번달 교체 내역
  const { data: currentMonthChanges, error: currentError } = await supabase
    .from('tool_changes')
    .select('endmill_code')
    .gte('change_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)

  // 지난달 교체 내역
  const { data: lastMonthChanges, error: lastError } = await supabase
    .from('tool_changes')
    .select('endmill_code')
    .gte('change_date', `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`)
    .lt('change_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)

  if (currentError || lastError) {
    console.error('tool_changes 조회 오류:', currentError || lastError)
    throw currentError || lastError
  }

  // endmill_types 조회
  const { data: endmillTypes, error: etError } = await supabase
    .from('endmill_types')
    .select('code, unit_cost')

  if (etError) {
    console.error('endmill_types 조회 오류:', etError)
    throw etError
  }

  // Map으로 변환
  const endmillMap = new Map(endmillTypes?.map((et: any) => [et.code, et]) || [])

  // 비용 계산
  const currentMonthCost = currentMonthChanges.reduce((sum: number, change: any) => {
    const endmill: any = endmillMap.get(change.endmill_code)
    if (!endmill) return sum + 50000
    const unitCostString = endmill.unit_cost || '50000'
    const unitCost = typeof unitCostString === 'string' ? parseFloat(unitCostString) : Number(unitCostString)
    return sum + (isNaN(unitCost) ? 50000 : unitCost)
  }, 0)

  const lastMonthCost = lastMonthChanges.reduce((sum: number, change: any) => {
    const endmill: any = endmillMap.get(change.endmill_code)
    if (!endmill) return sum + 50000
    const unitCostString = endmill.unit_cost || '50000'
    const unitCost = typeof unitCostString === 'string' ? parseFloat(unitCostString) : Number(unitCostString)
    return sum + (isNaN(unitCost) ? 50000 : unitCost)
  }, 0)

  const savings = lastMonthCost - currentMonthCost
  const savingsPercent = lastMonthCost > 0 ? Math.round((savings / lastMonthCost) * 100) : 0

  return {
    currentMonth: currentMonthCost,
    lastMonth: lastMonthCost,
    savings,
    savingsPercent,
    trend: savings >= 0 ? 'decrease' : 'increase'
  }
}

// 설비별 교체 빈도 분석
async function getFrequencyAnalysis(supabase: any) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // tool_changes 조회
  const { data: weeklyChanges, error: tcError } = await supabase
    .from('tool_changes')
    .select('equipment_number, change_date, production_model')
    .gte('change_date', oneWeekAgo)

  if (tcError) {
    console.error('tool_changes 조회 오류:', tcError)
    throw tcError
  }

  // equipment 조회
  const { data: equipment, error: eqError } = await supabase
    .from('equipment')
    .select('equipment_number, model_code')

  if (eqError) {
    console.error('equipment 조회 오류:', eqError)
    throw eqError
  }

  // Map으로 변환
  const equipmentMap = new Map(equipment?.map((eq: any) => [eq.equipment_number, eq]) || [])

  const modelStats = weeklyChanges.reduce((acc: any, change: any) => {
    const equipment: any = equipmentMap.get(change.equipment_number)
    const model = equipment?.model_code || change.production_model || 'Unknown'
    const series = model.split('-')[0] // PA-xxx -> PA

    if (!acc[series]) {
      acc[series] = { count: 0, dates: [] }
    }
    acc[series].count++
    acc[series].dates.push(change.change_date)
    return acc
  }, {})

  // 각 시리즈별 평균 교체 간격 계산
  const frequencyData = Object.entries(modelStats).map(([series, stats]: [string, any]) => {
    const avgInterval = stats.count > 1 ? Math.round(7 / stats.count * 10) / 10 : 7
    return {
      series,
      count: stats.count,
      avgInterval
    }
  })

  return frequencyData
}

// 엔드밀 평균 사용 수명 분석 (수량 기반)
async function getLifespanAnalysis(supabase: any) {
  // endmill_types 조회 (id 포함)
  const { data: endmillTypes, error: etError } = await supabase
    .from('endmill_types')
    .select('id, code, name, standard_life')

  if (etError) {
    console.error('endmill_types 조회 오류:', etError)
    throw etError
  }

  // tool_changes에서 실제 사용 수량 데이터 조회
  const { data: toolChanges, error: tcError } = await supabase
    .from('tool_changes')
    .select('endmill_type_id, tool_life')

  if (tcError) {
    console.error('tool_changes 조회 오류:', tcError)
    throw tcError
  }

  // endmill_type_id별로 그룹화
  const changesByTypeId = toolChanges.reduce((acc: any, change: any) => {
    if (!acc[change.endmill_type_id]) {
      acc[change.endmill_type_id] = []
    }
    // tool_life를 사용 수명으로 사용
    const usedLife = change.tool_life || 0
    if (usedLife > 0) {
      acc[change.endmill_type_id].push(usedLife)
    }
    return acc
  }, {})

  const lifespanData = endmillTypes.map((type: any) => {
    const usedLives = changesByTypeId[type.id] || []
    const avgLife = usedLives.length > 0
      ? Math.round(usedLives.reduce((sum: number, life: number) => sum + life, 0) / usedLives.length)
      : type.standard_life || 800

    const variance = usedLives.length > 1
      ? Math.round(Math.sqrt(usedLives.reduce((sum: number, life: number) => sum + Math.pow(life - avgLife, 2), 0) / (usedLives.length - 1)))
      : 50

    // 공구 타입 분류
    const typeName = type.name.toUpperCase()
    let category = 'OTHER'
    if (typeName.includes('FLAT')) category = 'FLAT'
    else if (typeName.includes('BALL')) category = 'BALL'
    else if (typeName.includes('T-CUT') || typeName.includes('TCUT')) category = 'T-CUT'
    else if (typeName.includes('DRILL')) category = 'DRILL'
    else if (typeName.includes('RADIUS')) category = 'RADIUS'

    return {
      category,
      avgLife,
      variance,
      sampleSize: usedLives.length
    }
  })

  // 카테고리별 그룹화
  const categoryStats = lifespanData.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = { totalLife: 0, totalVariance: 0, count: 0 }
    }
    acc[item.category].totalLife += item.avgLife
    acc[item.category].totalVariance += item.variance
    acc[item.category].count++
    return acc
  }, {})

  return Object.entries(categoryStats).map(([category, stats]: [string, any]) => ({
    category,
    avgLife: Math.round(stats.totalLife / stats.count),
    variance: Math.round(stats.totalVariance / stats.count)
  }))
}

// 설비 모델별 비용 분석
async function getModelCostAnalysis(supabase: any) {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // tool_changes 조회
  const { data: monthlyChanges, error: tcError } = await supabase
    .from('tool_changes')
    .select('equipment_number, endmill_code, production_model')
    .gte('change_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)

  if (tcError) {
    console.error('tool_changes 조회 오류:', tcError)
    throw tcError
  }

  // equipment 조회
  const { data: equipment, error: eqError } = await supabase
    .from('equipment')
    .select('equipment_number, model_code')

  if (eqError) {
    console.error('equipment 조회 오류:', eqError)
    throw eqError
  }

  // endmill_types 조회
  const { data: endmillTypes, error: etError } = await supabase
    .from('endmill_types')
    .select('code, unit_cost')

  if (etError) {
    console.error('endmill_types 조회 오류:', etError)
    throw etError
  }

  // Map으로 변환
  const equipmentMap = new Map(equipment?.map((eq: any) => [eq.equipment_number, eq]) || [])
  const endmillMap = new Map(endmillTypes?.map((et: any) => [et.code, et]) || [])

  const modelCosts = monthlyChanges.reduce((acc: any, change: any) => {
    const equipment: any = equipmentMap.get(change.equipment_number)
    const model = equipment?.model_code || change.production_model || 'Unknown'
    const series = model.split('-')[0] // PA-xxx -> PA

    const endmill: any = endmillMap.get(change.endmill_code)
    const unitCostString = endmill?.unit_cost || '50000'
    const cost = typeof unitCostString === 'string' ? parseFloat(unitCostString) : Number(unitCostString)
    const finalCost = isNaN(cost) ? 50000 : cost

    if (!acc[series]) {
      acc[series] = 0
    }
    acc[series] += finalCost
    return acc
  }, {})

  const totalCost = (Object.values(modelCosts) as number[]).reduce((sum, cost) => sum + cost, 0)

  return (Object.entries(modelCosts) as [string, number][]).map(([series, cost]) => ({
    series,
    cost,
    percentage: totalCost > 0 ? Math.round((cost / totalCost) * 100) : 0
  })).sort((a, b) => b.cost - a.cost)
}

// 최근 경고 및 알림 조회
async function getRecentAlerts(supabase: any) {
  const alerts = []

  // 1. 비정상 마모 감지: 표준 수명보다 빠르게 소진된 교체 이력
  const { data: abnormalWear, error: wearError } = await supabase
    .from('tool_changes')
    .select('equipment_number, t_number, tool_life, endmill_type_id, created_at, endmill_types(standard_life, name)')
    .not('tool_life', 'is', null)
    .not('endmill_type_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!wearError && abnormalWear && abnormalWear.length > 0) {
    for (const change of abnormalWear) {
      const standardLife = change.endmill_types?.standard_life || 800
      const actualLife = change.tool_life || 0

      // 표준 수명의 50% 미만으로 사용했으면 비정상 마모
      if (actualLife > 0 && actualLife < standardLife * 0.5) {
        const minutesAgo = Math.floor((new Date().getTime() - new Date(change.created_at).getTime()) / 60000)
        alerts.push({
          type: 'abnormal_wear',
          severity: 'high',
          title: '비정상 마모 감지',
          message: `${change.equipment_number || 'Unknown'} 설비 T${change.t_number} - 표준 대비 빠른 마모율 (${actualLife}개 생산 후 교체, 표준: ${standardLife}개)`,
          time: minutesAgo < 60 ? `${minutesAgo}분 전` : `${Math.floor(minutesAgo / 60)}시간 전`,
          color: 'red'
        })
        break // 첫 번째만 추가
      }
    }
  }

  // 2. 비정상 파손 감지: 파손 사유로 교체된 최근 이력
  const { data: brokenTools, error: brokenError } = await supabase
    .from('tool_changes')
    .select('equipment_number, t_number, change_reason, created_at')
    .eq('change_reason', '파손')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!brokenError && brokenTools && brokenTools.length > 0) {
    const change = brokenTools[0]
    const minutesAgo = Math.floor((new Date().getTime() - new Date(change.created_at).getTime()) / 60000)
    alerts.push({
      type: 'abnormal_damage',
      severity: 'warning',
      title: '비정상 파손 감지',
      message: `${change.equipment_number || 'Unknown'} 설비 T${change.t_number} - 갑작스러운 공구 파손 의심 (즉시 확인 필요)`,
      time: minutesAgo < 60 ? `${minutesAgo}분 전` : `${Math.floor(minutesAgo / 60)}시간 전`,
      color: 'orange'
    })
  }

  // 3. 재고 부족 경보: 최소 재고 이하인 항목
  const { data: lowStock, error: stockError } = await supabase
    .from('inventory')
    .select('endmill_type_id, current_stock, min_stock, last_updated, endmill_types(code, name)')
    .eq('status', 'critical')
    .order('last_updated', { ascending: false })
    .limit(1)

  if (!stockError && lowStock && lowStock.length > 0) {
    const item = lowStock[0]
    const minutesAgo = Math.floor((new Date().getTime() - new Date(item.last_updated).getTime()) / 60000)
    alerts.push({
      type: 'low_stock',
      severity: 'medium',
      title: '재고 부족 경보',
      message: `${item.endmill_types?.code || 'Unknown'} ${item.endmill_types?.name || ''} - 재고상태 ${item.current_stock}개 (최소 재고 ${item.min_stock}개)`,
      time: minutesAgo < 60 ? `${minutesAgo}분 전` : `${Math.floor(minutesAgo / 60)}시간 전`,
      color: 'yellow'
    })
  }

  // 4. 최근 증가 교체사유: 파손 사유 증가 추세
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: recentBreaks, error: recentError } = await supabase
    .from('tool_changes')
    .select('id')
    .eq('change_reason', '파손')
    .gte('change_date', sevenDaysAgo)

  const { data: previousBreaks, error: prevError } = await supabase
    .from('tool_changes')
    .select('id')
    .eq('change_reason', '파손')
    .gte('change_date', fourteenDaysAgo)
    .lt('change_date', sevenDaysAgo)

  if (!recentError && !prevError && recentBreaks && previousBreaks) {
    const recentCount = recentBreaks.length
    const previousCount = previousBreaks.length

    if (recentCount > previousCount && previousCount > 0) {
      const increase = Math.round(((recentCount - previousCount) / previousCount) * 100)
      alerts.push({
        type: 'trend_increase',
        severity: 'info',
        title: '최근 증가 교체사유',
        message: `파손 사유 교체 증가 추세 - 최근 7일간 ${recentCount}건 (전주 대비 +${increase}%)`,
        time: '1시간 전',
        color: 'blue'
      })
    }
  }

  return alerts
}