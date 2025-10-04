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
      inventoryStats,
      toolChangeStats,
      costAnalysis,
      frequencyAnalysis,
      lifespanAnalysis,
      modelCostAnalysis
    ] = await Promise.all([
      getEquipmentStats(supabase),
      getInventoryStats(supabase),
      getToolChangeStats(supabase),
      getCostAnalysis(supabase),
      getFrequencyAnalysis(supabase),
      getLifespanAnalysis(supabase),
      getModelCostAnalysis(supabase)
    ])

    const dashboardData = {
      // 기존 인사이트
      equipment: equipmentStats,
      inventory: inventoryStats,
      toolChanges: toolChangeStats,
      qualityMetrics: {
        achievementRate: 99.2,
        target: 99.0,
        trend: '+0.3%',
        status: 'excellent'
      },
      
      // 새로운 인사이트
      costAnalysis,
      frequencyAnalysis,
      lifespanAnalysis,
      modelCostAnalysis,
      
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
    .select('status, current_model, process')

  if (error) throw error

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

  // 이번달 비용 (tool_changes에서 계산)
  const { data: currentMonthChanges, error: currentError } = await supabase
    .from('tool_changes')
    .select(`
      endmill_type_id,
      endmill_types (unit_cost)
    `)
    .gte('change_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)

  // 지난달 비용
  const { data: lastMonthChanges, error: lastError } = await supabase
    .from('tool_changes')
    .select(`
      endmill_type_id,
      endmill_types (unit_cost)
    `)
    .gte('change_date', `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`)
    .lt('change_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)

  if (currentError || lastError) throw currentError || lastError

  const currentMonthCost = currentMonthChanges.reduce((sum: number, change: any) => {
    return sum + (change.endmill_types?.unit_cost || 50000) // 기본값 50,000 VND
  }, 0)

  const lastMonthCost = lastMonthChanges.reduce((sum: number, change: any) => {
    return sum + (change.endmill_types?.unit_cost || 50000)
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

  const { data: weeklyChanges, error } = await supabase
    .from('tool_changes')
    .select(`
      equipment_id,
      change_date,
      equipment (current_model)
    `)
    .gte('change_date', oneWeekAgo)

  if (error) throw error

  const modelStats = weeklyChanges.reduce((acc: any, change: any) => {
    const model = change.equipment?.current_model || 'Unknown'
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

// 공구별 수명 분석
async function getLifespanAnalysis(supabase: any) {
  const { data: endmillTypes, error } = await supabase
    .from('endmill_types')
    .select(`
      name,
      standard_life,
      specifications,
      tool_changes (tool_life)
    `)

  if (error) throw error

  const lifespanData = endmillTypes.map((type: any) => {
    const toolLives = type.tool_changes.map((change: any) => change.tool_life).filter(Boolean)
    const avgLife = toolLives.length > 0 
      ? Math.round(toolLives.reduce((sum: number, life: number) => sum + life, 0) / toolLives.length)
      : type.standard_life || 800

    const variance = toolLives.length > 1
      ? Math.round(Math.sqrt(toolLives.reduce((sum: number, life: number) => sum + Math.pow(life - avgLife, 2), 0) / (toolLives.length - 1)))
      : 50

    // 공구 타입 분류
    const typeName = type.name.toUpperCase()
    let category = 'OTHER'
    if (typeName.includes('FLAT')) category = 'FLAT'
    else if (typeName.includes('BALL')) category = 'BALL'
    else if (typeName.includes('T-CUT') || typeName.includes('TCUT')) category = 'T-CUT'
    else if (typeName.includes('DRILL')) category = 'DRILL'

    return {
      category,
      avgLife,
      variance,
      sampleSize: toolLives.length
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

  const { data: monthlyChanges, error } = await supabase
    .from('tool_changes')
    .select(`
      equipment_id,
      endmill_type_id,
      equipment (current_model),
      endmill_types (unit_cost)
    `)
    .gte('change_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)

  if (error) throw error

  const modelCosts = monthlyChanges.reduce((acc: any, change: any) => {
    const model = change.equipment?.current_model || 'Unknown'
    const series = model.split('-')[0] // PA-xxx -> PA
    const cost = change.endmill_types?.unit_cost || 50000

    if (!acc[series]) {
      acc[series] = 0
    }
    acc[series] += cost
    return acc
  }, {})

  const totalCost = (Object.values(modelCosts) as number[]).reduce((sum, cost) => sum + cost, 0)

  return (Object.entries(modelCosts) as [string, number][]).map(([series, cost]) => ({
    series,
    cost,
    percentage: Math.round((cost / totalCost) * 100)
  })).sort((a, b) => b.cost - a.cost)
} 