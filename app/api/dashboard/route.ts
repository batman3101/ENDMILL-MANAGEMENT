import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  logger.log('🚀 대시보드 API 호출됨:', new Date().toISOString())
  try {
    // Service Role Key를 직접 사용하여 Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ 환경변수 누락:', {
        url: !!supabaseUrl,
        key: !!supabaseServiceKey
      })
      throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
    }

    logger.log('🔑 환경변수 확인:', {
      url: supabaseUrl,
      serviceKeyLength: supabaseServiceKey.length,
      serviceKeyPrefix: supabaseServiceKey.substring(0, 20) + '...'
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    })
    logger.log('✅ Supabase 클라이언트 생성 완료 (Service Role Key 사용)')

    // 연결 테스트 - equipment 테이블 조회
    const { data: testData, error: testError } = await supabase
      .from('equipment')
      .select('id')
      .limit(1)

    logger.log('🧪 연결 테스트:', {
      testDataCount: testData?.length || 0,
      testError: testError?.message || null
    })

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
  // .neq() 메서드가 작동하지 않으므로 전체 데이터를 가져와서 JavaScript로 필터링
  const { data: allPositions, error } = await supabase
    .from('tool_positions')
    .select('current_life, total_life, status')

  if (error) {
    console.error('tool_positions 조회 오류:', error)
    throw error
  }

  // JavaScript로 필터링: empty가 아닌 것만
  const toolPositions = (allPositions || []).filter((pos: any) => pos.status !== 'empty')

  console.log('📊 tool_positions 조회 및 필터링 완료:', {
    totalCount: allPositions?.length || 0,
    filteredCount: toolPositions.length,
    sample: toolPositions.slice(0, 3)
  })

  if (!toolPositions || toolPositions.length === 0) {
    console.warn('⚠️ tool_positions가 비어있습니다!')
    return {
      total: 0,
      normal: 0,
      warning: 0,
      critical: 0,
      usageRate: 0
    }
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

  logger.log('✅ 엔드밀 통계 계산 완료:', { totalInUse, stats, usageRate })

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
    .select('current_stock, min_stock, max_stock')

  logger.log('📦 inventory 조회 결과:', {
    count: inventory?.length || 0,
    sample: inventory?.slice(0, 5),
    error: error?.message || null
  })

  if (error) throw error

  // status 필드를 신뢰하지 않고, 실제 재고 수량으로 직접 계산
  const stats = inventory.reduce((acc: any, item: any) => {
    // 재고 상태 계산 로직:
    // - current_stock >= min_stock * 1.5: sufficient (충분)
    // - min_stock <= current_stock < min_stock * 1.5: low (부족)
    // - current_stock < min_stock: critical (위험)
    if (item.current_stock >= item.min_stock * 1.5) {
      acc.sufficient++
    } else if (item.current_stock >= item.min_stock) {
      acc.low++
    } else {
      acc.critical++
    }
    return acc
  }, { sufficient: 0, low: 0, critical: 0 })

  logger.log('📊 재고 상태별 집계 (재계산):', stats)

  // 실제 데이터 샘플 출력
  const sufficientSamples = inventory
    .filter((i: any) => i.current_stock >= i.min_stock * 1.5)
    .slice(0, 3)
    .map((i: any) => ({ stock: i.current_stock, min: i.min_stock }))

  const criticalSamples = inventory
    .filter((i: any) => i.current_stock < i.min_stock)
    .slice(0, 3)
    .map((i: any) => ({ stock: i.current_stock, min: i.min_stock }))

  logger.log('✅ sufficient 샘플:', sufficientSamples)
  logger.log('⚠️ critical 샘플:', criticalSamples)

  return {
    total: inventory.length,
    sufficient: stats.sufficient,
    low: stats.low,
    critical: stats.critical
  }
}

// 교체 실적 통계
async function getToolChangeStats(supabase: any) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  logger.log('📅 교체 실적 조회:', { today, yesterday })

  // .gte()가 작동하지 않을 수 있으므로 전체 데이터를 가져와서 JavaScript로 필터링
  const { data: allChanges, error } = await supabase
    .from('tool_changes')
    .select('id, change_date, equipment_number, t_number')

  if (error) {
    console.error('tool_changes 조회 오류:', error)
    throw error
  }

  // JavaScript로 필터링
  const todayChanges = (allChanges || []).filter((change: any) => change.change_date >= today)
  const yesterdayChanges = (allChanges || []).filter((change: any) =>
    change.change_date >= yesterday && change.change_date < today
  )

  logger.log('📊 교체 실적 집계:', {
    totalCount: allChanges?.length || 0,
    todayCount: todayChanges.length,
    yesterdayCount: yesterdayChanges.length,
    todaySample: todayChanges.slice(0, 3)
  })

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
  const currentMonthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
  const lastMonthStart = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`

  logger.log('💰 비용 분석 시작:', { currentMonth, lastMonth, currentMonthStart, lastMonthStart })

  // .gte()가 작동하지 않을 수 있으므로 전체 데이터를 가져와서 JavaScript로 필터링
  const { data: allChanges, error } = await supabase
    .from('tool_changes')
    .select('endmill_code, change_date')

  if (error) {
    console.error('tool_changes 조회 오류:', error)
    throw error
  }

  // JavaScript로 필터링
  const currentMonthChanges = (allChanges || []).filter((change: any) => change.change_date >= currentMonthStart)
  const lastMonthChanges = (allChanges || []).filter((change: any) =>
    change.change_date >= lastMonthStart && change.change_date < currentMonthStart
  )

  logger.log('📊 비용 분석 데이터 집계:', {
    totalCount: allChanges?.length || 0,
    currentMonthCount: currentMonthChanges.length,
    lastMonthCount: lastMonthChanges.length,
    currentMonthSample: currentMonthChanges.slice(0, 3)
  })

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

  logger.log('💵 비용 계산 완료:', {
    currentMonthCost,
    lastMonthCost,
    savings,
    savingsPercent
  })

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

  logger.log('📈 frequencyAnalysis 시작:', { oneWeekAgo })

  // .gte()가 작동하지 않으므로 전체 데이터를 가져와서 JavaScript로 필터링
  const { data: allChanges, error: tcError } = await supabase
    .from('tool_changes')
    .select('equipment_number, change_date, production_model')

  if (tcError) {
    console.error('tool_changes 조회 오류:', tcError)
    throw tcError
  }

  // JavaScript로 필터링: oneWeekAgo 이후 데이터만
  const weeklyChanges = (allChanges || []).filter((change: any) => change.change_date >= oneWeekAgo)

  logger.log('📊 주간 tool_changes 조회 및 필터링 완료:', {
    totalCount: allChanges?.length || 0,
    filteredCount: weeklyChanges.length,
    sample: weeklyChanges.slice(0, 3)
  })

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
  const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`

  logger.log('💰 modelCostAnalysis 시작:', { currentMonth, currentYear, startDate })

  // .gte()가 작동하지 않으므로 전체 데이터를 가져와서 JavaScript로 필터링
  const { data: allChanges, error: tcError } = await supabase
    .from('tool_changes')
    .select('equipment_number, endmill_code, production_model, change_date')

  if (tcError) {
    console.error('tool_changes 조회 오류:', tcError)
    throw tcError
  }

  // JavaScript로 필터링: startDate 이후 데이터만
  const monthlyChanges = (allChanges || []).filter((change: any) => change.change_date >= startDate)

  logger.log('📊 월간 tool_changes 조회 및 필터링 완료:', {
    totalCount: allChanges?.length || 0,
    filteredCount: monthlyChanges.length,
    sample: monthlyChanges.slice(0, 3)
  })

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
  logger.log('🚨 최근 알림 조회 시작')

  const alerts = []

  // 1. 비정상 파손 감지: 파손 사유로 교체된 최근 이력 (가장 중요하므로 먼저)
  const { data: allChanges, error: changesError } = await supabase
    .from('tool_changes')
    .select('equipment_number, t_number, change_reason, created_at, tool_life, endmill_type_id')

  if (changesError) {
    console.error('tool_changes 조회 오류:', changesError)
  } else {
    // JavaScript로 필터링: 파손 사유만 & 최신순 정렬
    const brokenTools = (allChanges || [])
      .filter((change: any) => change.change_reason === '파손')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    logger.log('🔨 파손 이력 조회 결과:', {
      totalChanges: allChanges?.length || 0,
      brokenCount: brokenTools.length,
      latestBroken: brokenTools[0] || null
    })

    if (brokenTools.length > 0) {
      const change = brokenTools[0]
      const minutesAgo = Math.floor((new Date().getTime() - new Date(change.created_at).getTime()) / 60000)

      logger.log('⚠️ 최근 파손 발견:', {
        equipment: change.equipment_number,
        tNumber: change.t_number,
        createdAt: change.created_at,
        minutesAgo
      })

      alerts.push({
        type: 'abnormal_damage',
        severity: 'warning',
        equipmentNumber: change.equipment_number,
        tNumber: change.t_number,
        minutesAgo,
        color: 'orange'
      })
    }

    // 2. 비정상 마모 감지: 표준 수명보다 빠르게 소진된 교체 이력
    const recentChangesWithLife = (allChanges || [])
      .filter((change: any) => change.tool_life != null && change.endmill_type_id != null)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    // endmill_types 조회 (standard_life 필요)
    const { data: endmillTypes, error: etError } = await supabase
      .from('endmill_types')
      .select('id, standard_life, name')

    if (!etError && endmillTypes) {
      const endmillMap = new Map(endmillTypes.map((et: any) => [et.id, et]))

      for (const change of recentChangesWithLife) {
        const endmillType: any = endmillMap.get(change.endmill_type_id)
        const standardLife = endmillType?.standard_life || 800
        const actualLife = change.tool_life || 0

        // 표준 수명의 50% 미만으로 사용했으면 비정상 마모
        if (actualLife > 0 && actualLife < standardLife * 0.5) {
          const minutesAgo = Math.floor((new Date().getTime() - new Date(change.created_at).getTime()) / 60000)
          alerts.push({
            type: 'abnormal_wear',
            severity: 'high',
            equipmentNumber: change.equipment_number,
            tNumber: change.t_number,
            actualLife,
            standardLife,
            minutesAgo,
            color: 'red'
          })
          break // 첫 번째만 추가
        }
      }
    }
  }

  // 3. 재고 부족 경보: 최소 재고 이하인 항목
  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('endmill_type_id, current_stock, min_stock, last_updated')

  if (!invError && inventory) {
    // JavaScript로 필터링: critical (current_stock < min_stock)
    const criticalItems = (inventory || [])
      .filter((item: any) => item.current_stock < item.min_stock)
      .sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())

    logger.log('📦 재고 부족 항목:', { criticalCount: criticalItems.length })

    if (criticalItems.length > 0) {
      const item = criticalItems[0]

      // endmill_types 정보 조회
      const { data: endmillType, error: etError } = await supabase
        .from('endmill_types')
        .select('code, name')
        .eq('id', item.endmill_type_id)
        .single()

      const minutesAgo = Math.floor((new Date().getTime() - new Date(item.last_updated).getTime()) / 60000)
      alerts.push({
        type: 'low_stock',
        severity: 'medium',
        endmillCode: endmillType?.code || 'Unknown',
        endmillName: endmillType?.name || 'Unknown',
        currentStock: item.current_stock,
        minStock: item.min_stock,
        minutesAgo,
        color: 'yellow'
      })
    }
  }

  logger.log('✅ 최근 알림 조회 완료:', { alertCount: alerts.length })

  return alerts
}