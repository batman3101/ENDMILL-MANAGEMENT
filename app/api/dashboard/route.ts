import { NextRequest } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createServerClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { getFactoryToday, getFactoryYesterday, getFactoryDayRange } from '@/lib/utils/dateUtils'
import { applyFactoryFilter } from '@/lib/utils/factoryFilter'

interface ToolChangeRecord {
  id: string
  created_at: string | null
  change_date: string
  change_reason: '수명완료' | '파손' | '마모' | '예방교체' | '모델변경' | '기타' | null
  equipment_number: number | null
  t_number: number
  endmill_code: string | null
  endmill_type_id: string | null
  tool_life: number | null
  production_model: string | null
}

interface EndmillTypeRecord {
  id: string
  code: string
  name: string
  unit_cost: number | null
  standard_life: number | null
}

// 동적 라우트로 명시적 설정 (캐싱 방지)
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  // Next.js Data Cache 완전 비활성화
  noStore()

  const factoryId = request.nextUrl.searchParams.get('factoryId') || undefined
  logger.log('🚀 대시보드 API 호출됨:', new Date().toISOString(), { factoryId })
  try {
    // Service Role Key를 직접 사용하여 Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error('❌ 환경변수 누락:', {
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

    const supabase = createServerClient()
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

    // tool_changes와 endmill_types를 각 1회만 조회 (공유 데이터)
    let tcSharedQuery = supabase
      .from('tool_changes')
      .select('id, created_at, change_date, change_reason, equipment_number, t_number, endmill_code, endmill_type_id, tool_life, production_model')
    tcSharedQuery = applyFactoryFilter(tcSharedQuery, factoryId)
    const { data: allToolChangesRaw, error: tcSharedError } = await tcSharedQuery
    if (tcSharedError) {
      logger.error('❌ tool_changes 공유 쿼리 오류:', tcSharedError)
      throw tcSharedError
    }
    const allToolChanges: ToolChangeRecord[] = allToolChangesRaw || []
    logger.log('✅ tool_changes 공유 쿼리 완료:', { count: allToolChanges.length })

    const { data: allEndmillTypesRaw, error: etSharedError } = await supabase
      .from('endmill_types')
      .select('id, code, name, unit_cost, standard_life')
    if (etSharedError) {
      logger.error('❌ endmill_types 공유 쿼리 오류:', etSharedError)
      throw etSharedError
    }
    const allEndmillTypes: EndmillTypeRecord[] = allEndmillTypesRaw || []
    logger.log('✅ endmill_types 공유 쿼리 완료:', { count: allEndmillTypes.length })

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
      recentAlerts,
      endmillByEquipmentCount,
      modelEndmillUsage,
      equipmentLifeConsumption,
      topBrokenEndmills
    ] = await Promise.all([
      getEquipmentStats(supabase, factoryId),
      getEndmillUsageStats(allToolChanges),
      getInventoryStats(supabase, factoryId),
      getToolChangeStats(supabase, allToolChanges, factoryId),
      getCostAnalysis(supabase, allToolChanges, allEndmillTypes),
      getFrequencyAnalysis(supabase, allToolChanges, factoryId),
      getLifespanAnalysis(supabase, allToolChanges, allEndmillTypes),
      getModelCostAnalysis(supabase, allToolChanges, allEndmillTypes, factoryId),
      getRecentAlerts(supabase, allToolChanges, allEndmillTypes, factoryId),
      getEndmillByEquipmentCount(supabase, factoryId),
      getModelEndmillUsage(supabase, factoryId),
      getEquipmentLifeConsumption(supabase, allToolChanges, factoryId),
      getTopBrokenEndmills(allToolChanges)
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

      // Phase 4.1 추가 인사이트
      endmillByEquipmentCount,
      modelEndmillUsage,
      equipmentLifeConsumption,
      topBrokenEndmills,

      // 메타 정보
      lastUpdated: new Date().toISOString(),
      dataSource: 'realtime'
    }

    // Vercel 배포 시 캐싱 방지를 위한 헤더 추가
    return Response.json(dashboardData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error)
    return Response.json(
      { error: '대시보드 데이터를 가져오는데 실패했습니다.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  }
}

// 설비 통계
async function getEquipmentStats(supabase: any, factoryId?: string) {
  try {
    // 타임스탬프를 추가하여 캐시 무효화
    const timestamp = Date.now()

    let equipmentQuery = supabase
      .from('equipment')
      .select('status, model_code, location, id, factory_id')
      .gte('id', '00000000-0000-0000-0000-000000000000') // 모든 레코드 포함 (캐시 회피)
    equipmentQuery = applyFactoryFilter(equipmentQuery, factoryId)

    const { data: equipment, error } = await equipmentQuery

    if (error) {
      logger.error('equipment 조회 오류:', error)
      throw error
    }

    const total = equipment.length
    const statusCounts = equipment.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})

    logger.log(`📊 설비 통계 (ts: ${timestamp}):`, {
      total,
      statusDistribution: statusCounts,
      firstEquipmentId: equipment[0]?.id
    })

    const operatingRate = Math.round((statusCounts['가동중'] || 0) / total * 100)

    // tool_positions에서 실제 공구 수명 효율 계산 (공장 필터링: JS에서 equipment_id 기준)
    const equipmentIdSet = new Set(equipment.map((e: any) => e.id))
    if (factoryId && equipmentIdSet.size === 0) {
      return { total: 0, active: 0, maintenance: 0, setup: 0, operatingRate: 0, toolLifeEfficiency: 0 }
    }
    const { data: allPositionsRaw } = await supabase
      .from('tool_positions')
      .select('current_life, total_life, status, equipment_id')
    // JS에서 공장별 필터링 (.in()은 800개 UUID로 Bad Request 발생)
    const allPositions = factoryId
      ? (allPositionsRaw || []).filter((pos: any) => equipmentIdSet.has(pos.equipment_id))
      : allPositionsRaw

    const inUsePositions = (allPositions || []).filter((pos: any) => pos.status === 'in_use' && pos.total_life > 0)
    const toolLifeEfficiency = inUsePositions.length > 0
      ? Math.round(inUsePositions.reduce((sum: number, pos: any) => {
          const efficiency = pos.total_life > 0 ? (pos.current_life / pos.total_life) * 100 : 0
          return sum + efficiency
        }, 0) / inUsePositions.length)
      : 0

    const result = {
      total,
      active: statusCounts['가동중'] || 0,
      maintenance: statusCounts['점검중'] || 0,
      setup: statusCounts['셋업중'] || 0,
      operatingRate,
      toolLifeEfficiency // 실제 계산된 공구 수명 효율
    }

    logger.log('📊 설비 통계 계산 완료:', result)
    return result
  } catch (error) {
    logger.error('설비 통계 조회 오류:', error)
    throw error
  }
}

// 교체 사유 분석 (교체 실적 기반)
async function getEndmillUsageStats(toolChanges: ToolChangeRecord[]) {
  // 최근 30일 교체 실적 조회
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const startDate = thirtyDaysAgo

  logger.log('🔧 교체 사유 분석 시작:', { startDate, period: '최근 30일' })

  // JavaScript로 필터링: 최근 30일 데이터만
  const recentChanges = toolChanges.filter((change) => change.change_date >= startDate)

  if (!recentChanges || recentChanges.length === 0) {
    return {
      total: 0,
      normalLife: 0,
      broken: 0,
      premature: 0,
      brokenRate: 0
    }
  }

  // 교체 사유별 집계
  const stats = recentChanges.reduce((acc: { normalLife: number; broken: number; premature: number }, change: ToolChangeRecord) => {
    const reason = change.change_reason || '기타'

    if (reason === '수명완료') {
      acc.normalLife++
    } else if (reason === '파손') {
      acc.broken++
    } else {
      // 마모, 예방교체, 모델변경, 기타 -> 조기교체로 분류
      acc.premature++
    }

    return acc
  }, { normalLife: 0, broken: 0, premature: 0 })

  const total = recentChanges.length
  const brokenRate = total > 0 ? Math.round((stats.broken / total) * 100) : 0

  logger.log('✅ 교체 사유 분석 완료:', {
    total,
    stats,
    brokenRate,
    startDate
  })

  return {
    total,
    normalLife: stats.normalLife,
    broken: stats.broken,
    premature: stats.premature,
    brokenRate
  }
}

// 재고 통계
async function getInventoryStats(supabase: any, factoryId?: string) {
  let invQuery = supabase
    .from('inventory')
    .select('current_stock, min_stock, max_stock, factory_id')
  invQuery = applyFactoryFilter(invQuery, factoryId)
  const { data: inventory, error } = await invQuery

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

// 교체 실적 통계 (공장 근무시간 기준: 베트남 08:00 시작)
async function getToolChangeStats(supabase: any, toolChanges: ToolChangeRecord[], factoryId?: string) {
  // 공장 근무시간 기준 오늘/어제 날짜 및 범위 계산
  const today = getFactoryToday()
  const yesterday = getFactoryYesterday()
  const todayRange = getFactoryDayRange(today)
  const yesterdayRange = getFactoryDayRange(yesterday)

  logger.log('📅 교체 실적 조회 (공장 근무시간 기준):', {
    today,
    yesterday,
    todayRange,
    yesterdayRange
  })

  // created_at 기준으로 JS 필터링 (이 함수만 created_at 기준, 다른 함수는 change_date 기준)
  const todayChanges = toolChanges.filter(c =>
    c.created_at != null && c.created_at >= todayRange.start && c.created_at < todayRange.end
  )
  const yesterdayChanges = toolChanges.filter(c =>
    c.created_at != null && c.created_at >= yesterdayRange.start && c.created_at < yesterdayRange.end
  )

  logger.log('📊 교체 실적 집계 (공장 근무시간 기준):', {
    today,
    yesterday,
    todayCount: todayChanges.length,
    yesterdayCount: yesterdayChanges.length,
    todaySample: todayChanges.slice(0, 3).map((c) => ({
      created_at: c.created_at,
      equipment: c.equipment_number
    }))
  })

  const todayCount = todayChanges.length
  const yesterdayCount = yesterdayChanges.length
  const difference = todayCount - yesterdayCount

  // 일일 교체 실적 목표를 system_settings에서 조회
  const { data: targetSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('category', 'dashboard')
    .eq('key', 'daily_change_target')
    .single()

  const dailyTarget = targetSetting?.value || 130 // 기본값 130

  return {
    today: todayCount,
    yesterday: yesterdayCount,
    difference,
    trend: difference >= 0 ? `+${difference}` : `${difference}`,
    target: dailyTarget
  }
}

// 공구 사용 비용 분석
async function getCostAnalysis(_supabase: any, toolChanges: ToolChangeRecord[], endmillTypes: EndmillTypeRecord[]) {
  const currentMonth = new Date().getMonth() + 1
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const currentYear = new Date().getFullYear()
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const currentMonthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
  const lastMonthStart = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`

  logger.log('💰 비용 분석 시작:', { currentMonth, lastMonth, currentMonthStart, lastMonthStart })

  // JavaScript로 필터링
  const currentMonthChanges = toolChanges.filter((change) => change.change_date >= currentMonthStart)
  const lastMonthChanges = toolChanges.filter((change) =>
    change.change_date >= lastMonthStart && change.change_date < currentMonthStart
  )

  logger.log('📊 비용 분석 데이터 집계:', {
    totalCount: toolChanges.length,
    currentMonthCount: currentMonthChanges.length,
    lastMonthCount: lastMonthChanges.length,
    currentMonthSample: currentMonthChanges.slice(0, 3)
  })

  // Map으로 변환
  const endmillMap = new Map(endmillTypes.map((et) => [et.code, et]))

  // 비용 계산
  const currentMonthCost = currentMonthChanges.reduce((sum: number, change: ToolChangeRecord) => {
    const endmill = endmillMap.get(change.endmill_code ?? '')
    if (!endmill) return sum + 50000
    const rawCost = endmill.unit_cost
    const unitCost = typeof rawCost === 'number' ? rawCost : (rawCost != null ? parseFloat(String(rawCost)) : 50000)
    return sum + (isNaN(unitCost) ? 50000 : unitCost)
  }, 0)

  const lastMonthCost = lastMonthChanges.reduce((sum: number, change: ToolChangeRecord) => {
    const endmill = endmillMap.get(change.endmill_code ?? '')
    if (!endmill) return sum + 50000
    const rawCost = endmill.unit_cost
    const unitCost = typeof rawCost === 'number' ? rawCost : (rawCost != null ? parseFloat(String(rawCost)) : 50000)
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
async function getFrequencyAnalysis(supabase: any, toolChanges: ToolChangeRecord[], factoryId?: string) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  logger.log('📈 frequencyAnalysis 시작:', { oneWeekAgo })

  // JavaScript로 필터링: oneWeekAgo 이후 데이터만
  const weeklyChanges = toolChanges.filter((change) => change.change_date >= oneWeekAgo)

  logger.log('📊 주간 tool_changes 조회 및 필터링 완료:', {
    totalCount: toolChanges.length,
    filteredCount: weeklyChanges.length,
    sample: weeklyChanges.slice(0, 3)
  })

  // equipment 조회 (current_model 추가)
  let freqEqQuery = supabase
    .from('equipment')
    .select('equipment_number, model_code, current_model, factory_id')
  freqEqQuery = applyFactoryFilter(freqEqQuery, factoryId)
  const { data: equipment, error: eqError } = await freqEqQuery

  if (eqError) {
    console.error('equipment 조회 오류:', eqError)
    throw eqError
  }

  // Map으로 변환
  const equipmentMap = new Map(equipment?.map((eq: any) => [eq.equipment_number, eq]) || [])

  const modelStats = weeklyChanges.reduce((acc: any, change: any) => {
    const equipment: any = equipmentMap.get(change.equipment_number)
    // current_model을 우선 사용, 없으면 model_code, 그것도 없으면 production_model 사용
    const model = equipment?.current_model || equipment?.model_code || change.production_model || 'Unknown'
    const series = model.split('-')[0] // PA1-xxx -> PA1, R13-xxx -> R13

    if (!acc[series]) {
      acc[series] = { count: 0, dates: [] }
    }
    acc[series].count++
    acc[series].dates.push(change.change_date)
    return acc
  }, {})

  // 각 시리즈별 평균 교체 간격 계산 및 횟수 내림차순 정렬
  const frequencyData = Object.entries(modelStats).map(([series, stats]: [string, any]) => {
    const avgInterval = stats.count > 1 ? Math.round(7 / stats.count * 10) / 10 : 7
    return {
      series,
      count: stats.count,
      avgInterval
    }
  }).sort((a, b) => b.count - a.count) // 횟수 내림차순 정렬

  return frequencyData
}

// 엔드밀 평균 사용 수명 분석 (수량 기반)
async function getLifespanAnalysis(_supabase: any, toolChanges: ToolChangeRecord[], endmillTypes: EndmillTypeRecord[]) {
  // endmill_type_id별로 그룹화
  const changesByTypeId = toolChanges.reduce((acc: Record<string, number[]>, change: ToolChangeRecord) => {
    if (!change.endmill_type_id) return acc
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

  const lifespanData = endmillTypes.map((type: EndmillTypeRecord) => {
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
async function getModelCostAnalysis(supabase: any, toolChanges: ToolChangeRecord[], endmillTypes: EndmillTypeRecord[], factoryId?: string) {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`

  logger.log('💰 modelCostAnalysis 시작:', { currentMonth, currentYear, startDate })

  // JavaScript로 필터링: startDate 이후 데이터만
  const monthlyChanges = toolChanges.filter((change) => change.change_date >= startDate)

  logger.log('📊 월간 tool_changes 조회 및 필터링 완료:', {
    totalCount: toolChanges.length,
    filteredCount: monthlyChanges.length,
    sample: monthlyChanges.slice(0, 3)
  })

  // equipment 조회 (current_model 추가)
  let modelCostEqQuery = supabase
    .from('equipment')
    .select('equipment_number, model_code, current_model, factory_id')
  modelCostEqQuery = applyFactoryFilter(modelCostEqQuery, factoryId)
  const { data: equipment, error: eqError } = await modelCostEqQuery

  if (eqError) {
    console.error('equipment 조회 오류:', eqError)
    throw eqError
  }

  // Map으로 변환
  const equipmentMap = new Map(equipment?.map((eq: any) => [eq.equipment_number, eq]) || [])
  const endmillMap = new Map(endmillTypes.map((et) => [et.code, et]))

  const modelCosts = monthlyChanges.reduce((acc: Record<string, number>, change: ToolChangeRecord) => {
    const eq: any = equipmentMap.get(change.equipment_number)
    // current_model을 우선 사용, 없으면 model_code, 그것도 없으면 production_model 사용
    const model = eq?.current_model || eq?.model_code || change.production_model || 'Unknown'
    const series = model.split('-')[0] // PA1-xxx -> PA1, R13-xxx -> R13

    const endmill = endmillMap.get(change.endmill_code ?? '')
    const rawCost = endmill?.unit_cost
    const finalCost = typeof rawCost === 'number' ? rawCost : (rawCost != null ? parseFloat(String(rawCost)) : 50000)

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

// 최근 경고 및 알림 조회 (각 유형당 최대 3개씩)
async function getRecentAlerts(supabase: any, toolChanges: ToolChangeRecord[], endmillTypes: EndmillTypeRecord[], factoryId?: string) {
  logger.log('🚨 최근 알림 조회 시작')

  const alerts: any[] = []
  const MAX_ALERTS_PER_TYPE = 3

  // 1. 비정상 파손 감지: 파손 사유로 교체된 최근 이력 (가장 중요하므로 먼저)
  // JavaScript로 필터링: 파손 사유만 & 최신순 정렬
  const brokenTools = toolChanges
    .filter((change) => change.change_reason === '파손')
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())

  logger.log('🔨 파손 이력 조회 결과:', {
    totalChanges: toolChanges.length,
    brokenCount: brokenTools.length,
    latestBroken: brokenTools[0] || null
  })

  // 최대 3개까지 추가
  brokenTools.slice(0, MAX_ALERTS_PER_TYPE).forEach((change) => {
    const minutesAgo = Math.floor((new Date().getTime() - new Date(change.created_at ?? 0).getTime()) / 60000)

    logger.log('⚠️ 파손 발견:', {
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
  })

  // 2. 비정상 마모 감지: 표준 수명보다 빠르게 소진된 교체 이력
  const recentChangesWithLife = toolChanges
    .filter((change) => change.tool_life != null && change.endmill_type_id != null)
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 30) // 더 많은 데이터에서 찾기 위해 확장

  const endmillMap = new Map(endmillTypes.map((et) => [et.id, et]))
  let abnormalWearCount = 0

  for (const change of recentChangesWithLife) {
    if (abnormalWearCount >= MAX_ALERTS_PER_TYPE) break

    const endmillType = endmillMap.get(change.endmill_type_id ?? '')
    const standardLife = endmillType?.standard_life || 800
    const actualLife = change.tool_life || 0

    // 표준 수명의 50% 미만으로 사용했으면 비정상 마모
    if (actualLife > 0 && actualLife < standardLife * 0.5) {
      const minutesAgo = Math.floor((new Date().getTime() - new Date(change.created_at ?? 0).getTime()) / 60000)
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
      abnormalWearCount++
    }
  }

  // 4. 추세 상승 경보: 이전 주 대비 교체 건수 20% 이상 증가
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // 최근 7일 교체 건수 (모델별)
  const recentChanges = toolChanges.filter((c) => new Date(c.created_at ?? 0) >= sevenDaysAgo)
  // 이전 7일 교체 건수 (모델별)
  const previousChanges = toolChanges.filter((c) =>
    new Date(c.created_at ?? 0) >= fourteenDaysAgo &&
    new Date(c.created_at ?? 0) < sevenDaysAgo
  )

  // 설비번호별로 교체 건수 집계
  const recentByEquipment = new Map<string, number>()
  const previousByEquipment = new Map<string, number>()

  recentChanges.forEach((c) => {
    const key = String(c.equipment_number)
    recentByEquipment.set(key, (recentByEquipment.get(key) || 0) + 1)
  })

  previousChanges.forEach((c) => {
    const key = String(c.equipment_number)
    previousByEquipment.set(key, (previousByEquipment.get(key) || 0) + 1)
  })

  // 20% 이상 증가한 설비 찾기
  const trendAlerts: { equipmentNumber: string; recentCount: number; previousCount: number; increaseRate: number }[] = []
  recentByEquipment.forEach((recentCount, equipmentNumber) => {
    const previousCount = previousByEquipment.get(equipmentNumber) || 0

    // 이전 주에 데이터가 있고, 20% 이상 증가한 경우
    if (previousCount > 0) {
      const increaseRate = ((recentCount - previousCount) / previousCount) * 100
      if (increaseRate >= 20) {
        trendAlerts.push({
          equipmentNumber,
          recentCount,
          previousCount,
          increaseRate: Math.round(increaseRate)
        })
      }
    }
  })

  // 증가율 높은 순으로 정렬 후 최대 3개 추가
  trendAlerts
    .sort((a, b) => b.increaseRate - a.increaseRate)
    .slice(0, MAX_ALERTS_PER_TYPE)
    .forEach((trend) => {
      alerts.push({
        type: 'trend_increase',
        severity: 'info',
        equipmentNumber: trend.equipmentNumber,
        recentCount: trend.recentCount,
        increase: trend.increaseRate,
        minutesAgo: 0, // 추세 분석은 실시간이 아님
        color: 'blue'
      })
    })

  // 3. 재고 부족 경보: 최소 재고 이하인 항목
  let alertInvQuery = supabase
    .from('inventory')
    .select('endmill_type_id, current_stock, min_stock, last_updated, factory_id')
  alertInvQuery = applyFactoryFilter(alertInvQuery, factoryId)
  const { data: inventory, error: invError } = await alertInvQuery

  if (!invError && inventory) {
    // JavaScript로 필터링: critical (current_stock < min_stock)
    const criticalItems = (inventory || [])
      .filter((item: any) => item.current_stock < item.min_stock)
      .sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())

    logger.log('📦 재고 부족 항목:', { criticalCount: criticalItems.length })

    const endmillStockMap = new Map(endmillTypes.map((et) => [et.id, et]))

    // 최대 3개까지 추가
    criticalItems.slice(0, MAX_ALERTS_PER_TYPE).forEach((item: any) => {
      const endmillType: any = endmillStockMap.get(item.endmill_type_id)
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
    })
  }

  logger.log('✅ 최근 알림 조회 완료:', { alertCount: alerts.length })

  return alerts
}

// Phase 4.1: 앤드밀별 사용 설비 개수
async function getEndmillByEquipmentCount(supabase: any, factoryId?: string) {
  logger.log('🔧 앤드밀별 사용 설비 개수 조회 시작')

  // 공장 필터링을 위해 해당 공장의 equipment IDs 먼저 조회
  let eqCountQuery = supabase.from('equipment').select('id, factory_id')
  eqCountQuery = applyFactoryFilter(eqCountQuery, factoryId)
  const { data: factoryEquipment } = await eqCountQuery
  const factoryEquipmentIds = (factoryEquipment || []).map((e: any) => e.id)

  // tool_positions에서 사용 중인 앤드밀 조회 (JS에서 equipment 필터링 - .in() 800개 UUID Bad Request 방지)
  const factoryEquipmentIdSet = new Set(factoryEquipmentIds)
  if (factoryId && factoryEquipmentIdSet.size === 0) {
    return []
  }
  const { data: toolPositionsRaw, error: tpError } = await supabase
    .from('tool_positions')
    .select('endmill_type_id, equipment_id, status')

  if (tpError) {
    console.error('tool_positions 조회 오류:', tpError)
    throw tpError
  }

  // JavaScript로 필터링: 공장별 + in_use만
  const toolPositions = factoryId
    ? (toolPositionsRaw || []).filter((pos: any) => factoryEquipmentIdSet.has(pos.equipment_id))
    : toolPositionsRaw
  const inUsePositions = (toolPositions || []).filter((pos: any) => pos.status === 'in_use')

  logger.log('📊 사용 중인 포지션 조회 완료:', {
    totalCount: toolPositions?.length || 0,
    inUseCount: inUsePositions.length
  })

  // endmill_type_id별로 고유한 equipment_id 개수 계산
  const endmillEquipmentCount = inUsePositions.reduce((acc: any, pos: any) => {
    if (!pos.endmill_type_id) return acc

    if (!acc[pos.endmill_type_id]) {
      acc[pos.endmill_type_id] = new Set()
    }
    acc[pos.endmill_type_id].add(pos.equipment_id)
    return acc
  }, {})

  // endmill_types 정보 조회
  const { data: endmillTypes, error: etError } = await supabase
    .from('endmill_types')
    .select('id, code, name')

  if (etError) {
    console.error('endmill_types 조회 오류:', etError)
    throw etError
  }

  const endmillMap = new Map(endmillTypes?.map((et: any) => [et.id, et]) || [])

  // 결과 변환
  const results = Object.entries(endmillEquipmentCount)
    .map(([endmillTypeId, equipmentSet]: [string, any]) => {
      const endmill: any = endmillMap.get(endmillTypeId)
      return {
        endmillCode: endmill?.code || 'Unknown',
        endmillName: endmill?.name || 'Unknown',
        equipmentCount: equipmentSet.size,
        totalPositions: inUsePositions.filter((p: any) => p.endmill_type_id === endmillTypeId).length
      }
    })
    .sort((a, b) => b.equipmentCount - a.equipmentCount)
    .slice(0, 10) // 상위 10개만

  logger.log('✅ 앤드밀별 사용 설비 개수 계산 완료:', { count: results.length })

  return results
}

// Phase 4.1: 모델별 앤드밀 사용 현황 (CAM Sheet 기준)
async function getModelEndmillUsage(supabase: any, factoryId?: string) {
  logger.log('📊 모델별 앤드밀 사용 현황 조회 시작 (CAM Sheet 기준)')

  // CAM Sheet에서 모델/공정별 T번호 개수 조회
  const { data: camSheets, error: camError } = await supabase
    .from('cam_sheets')
    .select(`
      id,
      model,
      process,
      cam_sheet_endmills (
        t_number
      )
    `)

  if (camError) {
    console.error('cam_sheets 조회 오류:', camError)
    throw camError
  }

  // CAM Sheet별 T번호 개수 계산
  const camSheetMap = new Map()
  camSheets?.forEach((sheet: any) => {
    const key = `${sheet.model}-${sheet.process}`
    const tNumbers = new Set(sheet.cam_sheet_endmills?.map((e: any) => e.t_number) || [])
    camSheetMap.set(key, tNumbers.size)
  })

  logger.log('📊 CAM Sheet T번호 개수:', {
    camSheetCount: camSheets?.length || 0,
    sampleCounts: Array.from(camSheetMap.entries()).slice(0, 5)
  })

  // equipment 조회
  let modelUsageEqQuery = supabase
    .from('equipment')
    .select('id, equipment_number, current_model, process, factory_id')
  modelUsageEqQuery = applyFactoryFilter(modelUsageEqQuery, factoryId)
  const { data: equipment, error: eqError } = await modelUsageEqQuery

  if (eqError) {
    console.error('equipment 조회 오류:', eqError)
    throw eqError
  }

  // 모델별로 그룹화 (CAM Sheet 기준)
  const modelUsage = (equipment || []).reduce((acc: any, eq: any) => {
    const model = eq.current_model || 'Unknown'
    const process = eq.process || ''
    const key = `${model}-${process}`
    const tNumberCount = camSheetMap.get(key) || 0

    if (!acc[model]) {
      acc[model] = {
        equipmentIds: new Set(),
        totalEndmills: 0,
        processes: new Set()
      }
    }

    acc[model].equipmentIds.add(eq.id)
    acc[model].totalEndmills += tNumberCount
    acc[model].processes.add(process)

    return acc
  }, {})

  // 결과 변환
  const results = Object.entries(modelUsage)
    .map(([model, data]: [string, any]) => {
      const equipmentCount = data.equipmentIds.size
      const endmillCount = data.totalEndmills
      return {
        model,
        equipmentCount,
        endmillCount,
        avgEndmillPerEquipment: equipmentCount > 0
          ? Math.round((endmillCount / equipmentCount) * 10) / 10
          : 0
      }
    })
    .filter((item) => item.equipmentCount > 0) // 설비가 있는 모델만
    .sort((a, b) => b.endmillCount - a.endmillCount)

  logger.log('✅ 모델별 앤드밀 사용 현황 계산 완료 (CAM Sheet 기준):', {
    count: results.length,
    sampleResults: results.slice(0, 3)
  })

  return results
}

// Phase 4.1: 설비별 교체 실적 통계 (실제 교체 건수 기준)
async function getEquipmentLifeConsumption(supabase: any, toolChanges: ToolChangeRecord[], factoryId?: string) {
  logger.log('⚙️ 설비별 교체 실적 통계 조회 시작')

  // 최근 30일간의 교체 실적 조회
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // JavaScript로 필터링: 최근 30일 데이터만
  const recentChanges = toolChanges.filter((change) => change.change_date >= thirtyDaysAgo)

  logger.log('📊 최근 30일 교체 실적 조회:', {
    totalCount: toolChanges.length,
    recentCount: recentChanges.length
  })

  // 데이터가 없으면 빈 배열 반환
  if (recentChanges.length === 0) {
    logger.log('⚠️ 최근 30일 교체 이력 없음 - 빈 배열 반환')
    return []
  }

  // equipment 조회 (tool_position_count 포함)
  let lifeConEqQuery = supabase
    .from('equipment')
    .select('id, equipment_number, current_model, process, tool_position_count, factory_id')
  lifeConEqQuery = applyFactoryFilter(lifeConEqQuery, factoryId)
  const { data: equipment, error: eqError } = await lifeConEqQuery

  if (eqError) {
    console.error('equipment 조회 오류:', eqError)
    throw eqError
  }

  logger.log('📊 equipment 조회 완료:', {
    count: equipment?.length || 0,
    sample: equipment?.slice(0, 3).map((e: any) => ({
      equipment_number: e.equipment_number,
      model: e.current_model,
      tool_position_count: e.tool_position_count
    }))
  })

  // equipment_number별로 교체 건수 집계
  const changeCountByEquipment = recentChanges.reduce((acc: any, change: any) => {
    const eqNum = change.equipment_number
    if (!acc[eqNum]) {
      acc[eqNum] = 0
    }
    acc[eqNum]++
    return acc
  }, {})

  // equipment_number로 매핑
  const equipmentMap = new Map(equipment?.map((eq: any) => [eq.equipment_number, eq]) || [])

  // 결과 생성
  const results = Object.entries(changeCountByEquipment)
    .map(([equipmentNumber, changeCount]: [string, any]) => {
      const eq: any = equipmentMap.get(Number(equipmentNumber))

      // CAM Sheet 기반 앤드밀 관리 수량 (tool_position_count 사용)
      const toolCount = eq?.tool_position_count || 0

      // 교체 건수를 기반으로 소진율 계산 (30일 기준, 높을수록 소진율이 높음)
      const consumptionRate = Math.min(100, Math.round((changeCount / 30) * 100))

      return {
        equipmentNumber: Number(equipmentNumber),
        model: eq?.current_model || 'Unknown',
        process: eq?.process || '',
        changeCount,
        consumptionRate,
        toolCount
      }
    })
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10) // 상위 10개 (교체 건수가 많은 순)

  logger.log('✅ 설비별 교체 실적 통계 계산 완료:', { count: results.length })

  return results
}

// 최다 파손 교체 엔드밀 Top 3 (최근 30일 기준)
async function getTopBrokenEndmills(toolChanges: ToolChangeRecord[]) {
  logger.log('🔨 최다 파손 교체 엔드밀 Top 3 조회 시작')

  // 최근 30일간의 파손 교체 실적 조회
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // JavaScript로 필터링: 최근 30일 & 파손 사유만
  const brokenChanges = toolChanges.filter((change) =>
    change.change_date >= thirtyDaysAgo && change.change_reason === '파손'
  )

  logger.log('📊 최근 30일 파손 교체 실적 조회:', {
    totalCount: toolChanges.length,
    brokenCount: brokenChanges.length
  })

  // 데이터가 없으면 빈 배열 반환
  if (brokenChanges.length === 0) {
    logger.log('⚠️ 파손 교체 이력 없음 - 빈 배열 반환')
    return []
  }

  // endmill_code별로 교체 횟수 집계
  const changeCountByCode = brokenChanges.reduce((acc: any, change: any) => {
    const code = change.endmill_code
    if (!acc[code]) {
      acc[code] = 0
    }
    acc[code]++
    return acc
  }, {})

  // Top 3 추출
  const topBroken = Object.entries(changeCountByCode)
    .map(([code, count]) => ({ code, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 3)

  logger.log('✅ 최다 파손 교체 엔드밀 Top 3 계산 완료:', {
    count: topBroken.length,
    results: topBroken
  })

  return topBroken
}