import { NextRequest } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createServerClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { getFactoryToday, getFactoryYesterday, getFactoryDayRange } from '@/lib/utils/dateUtils'
import { applyFactoryFilter } from '@/lib/utils/factoryFilter'

// 동적 라우트로 명시적 설정 (캐싱 방지)
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// ─── 공통 데이터 조회 헬퍼 (각 테이블 1회씩만 조회) ────────
async function fetchAllToolChanges(supabase: any, factoryId?: string) {
  let query = supabase
    .from('tool_changes')
    .select('id, equipment_number, t_number, endmill_type_id, endmill_code, change_date, change_reason, created_at, tool_life, production_model')
  query = applyFactoryFilter(query, factoryId)
  const { data, error } = await query
  if (error) {
    logger.error('tool_changes 공통 조회 오류:', error)
    throw error
  }
  return data || []
}

async function fetchAllEquipment(supabase: any, factoryId?: string) {
  let query = supabase
    .from('equipment')
    .select('id, equipment_number, status, model_code, current_model, location, process, tool_position_count')
  query = applyFactoryFilter(query, factoryId)
  const { data, error } = await query
  if (error) {
    logger.error('equipment 공통 조회 오류:', error)
    throw error
  }
  return data || []
}

async function fetchAllEndmillTypes(supabase: any) {
  const { data, error } = await supabase
    .from('endmill_types')
    .select('id, code, name, unit_cost, standard_life')
  if (error) {
    logger.error('endmill_types 공통 조회 오류:', error)
    throw error
  }
  return data || []
}

async function fetchAllToolPositions(supabase: any) {
  const { data, error } = await supabase
    .from('tool_positions')
    .select('equipment_id, endmill_type_id, current_life, total_life, status')
  if (error) {
    logger.error('tool_positions 공통 조회 오류:', error)
    throw error
  }
  return data || []
}

// ─── GET 핸들러 ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Next.js Data Cache 완전 비활성화
  noStore()

  const factoryId = request.nextUrl.searchParams.get('factoryId') || undefined
  logger.log('🚀 대시보드 API 호출됨:', new Date().toISOString(), { factoryId })
  try {
    const supabase = createServerClient()

    // 1단계: 공통 데이터 병렬 조회 (4개 테이블, 각 1회씩)
    const [allToolChanges, allEquipment, allEndmillTypes, allToolPositions] = await Promise.all([
      fetchAllToolChanges(supabase, factoryId),
      fetchAllEquipment(supabase, factoryId),
      fetchAllEndmillTypes(supabase),
      fetchAllToolPositions(supabase),
    ])

    logger.log('📊 공통 데이터 조회 완료:', {
      toolChanges: allToolChanges.length,
      equipment: allEquipment.length,
      endmillTypes: allEndmillTypes.length,
      toolPositions: allToolPositions.length,
    })

    // 2단계: 분석 함수 병렬 실행 (공통 데이터 재사용)
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
      getEquipmentStats(allEquipment, allToolPositions, factoryId),
      getEndmillUsageStats(allToolChanges),
      getInventoryStats(supabase, factoryId),
      getToolChangeStats(supabase, factoryId),
      getCostAnalysis(allToolChanges, allEndmillTypes),
      getFrequencyAnalysis(allToolChanges, allEquipment),
      getLifespanAnalysis(allToolChanges, allEndmillTypes),
      getModelCostAnalysis(allToolChanges, allEquipment, allEndmillTypes),
      getRecentAlerts(allToolChanges, allEndmillTypes, supabase, factoryId),
      getEndmillByEquipmentCount(allEquipment, allToolPositions, allEndmillTypes, factoryId),
      getModelEndmillUsage(supabase, allEquipment, factoryId),
      getEquipmentLifeConsumption(allToolChanges, allEquipment),
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
    logger.error('대시보드 데이터 조회 오류:', error)
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

// ─── 분석 함수 (공통 데이터 사용) ───────────────────────────

// 설비 통계
function getEquipmentStats(allEquipment: any[], allToolPositions: any[], factoryId?: string) {
  try {
    const equipment = allEquipment
    const total = equipment.length

    if (total === 0) {
      return { total: 0, active: 0, maintenance: 0, setup: 0, operatingRate: 0, toolLifeEfficiency: 0 }
    }

    const statusCounts = equipment.reduce((acc: Record<string, number>, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})

    const operatingRate = Math.round((statusCounts['가동중'] || 0) / total * 100)

    // tool_positions에서 실제 공구 수명 효율 계산 (공장 필터링: JS에서 equipment_id 기준)
    const equipmentIdSet = new Set(equipment.map((e) => e.id))
    const filteredPositions = factoryId
      ? allToolPositions.filter((pos) => equipmentIdSet.has(pos.equipment_id))
      : allToolPositions

    const inUsePositions = filteredPositions.filter((pos) => pos.status === 'in_use' && pos.total_life > 0)
    const toolLifeEfficiency = inUsePositions.length > 0
      ? Math.round(inUsePositions.reduce((sum, pos) => {
          const efficiency = pos.total_life > 0 ? (pos.current_life / pos.total_life) * 100 : 0
          return sum + efficiency
        }, 0) / inUsePositions.length)
      : 0

    return {
      total,
      active: statusCounts['가동중'] || 0,
      maintenance: statusCounts['점검중'] || 0,
      setup: statusCounts['셋업중'] || 0,
      operatingRate,
      toolLifeEfficiency
    }
  } catch (error) {
    logger.error('설비 통계 조회 오류:', error)
    throw error
  }
}

// 교체 사유 분석 (교체 실적 기반)
function getEndmillUsageStats(allToolChanges: any[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // 최근 30일 데이터만 필터링
  const recentChanges = allToolChanges.filter((change) => change.change_date >= thirtyDaysAgo)

  if (recentChanges.length === 0) {
    return { total: 0, normalLife: 0, broken: 0, premature: 0, brokenRate: 0 }
  }

  // 교체 사유별 집계
  const stats = recentChanges.reduce((acc, change) => {
    const reason = change.change_reason || '기타'
    if (reason === '수명완료') acc.normalLife++
    else if (reason === '파손') acc.broken++
    else acc.premature++
    return acc
  }, { normalLife: 0, broken: 0, premature: 0 })

  const total = recentChanges.length
  const brokenRate = total > 0 ? Math.round((stats.broken / total) * 100) : 0

  return { total, normalLife: stats.normalLife, broken: stats.broken, premature: stats.premature, brokenRate }
}

// 재고 통계 (자체 쿼리 유지 - inventory 테이블)
async function getInventoryStats(supabase: any, factoryId?: string) {
  let invQuery = supabase
    .from('inventory')
    .select('current_stock, min_stock, max_stock, factory_id')
  invQuery = applyFactoryFilter(invQuery, factoryId)
  const { data: inventory, error } = await invQuery

  if (error) throw error

  const items = inventory || []

  // status 필드를 신뢰하지 않고, 실제 재고 수량으로 직접 계산
  const stats = items.reduce((acc: { sufficient: number; low: number; critical: number }, item: any) => {
    if (item.current_stock >= item.min_stock * 1.5) acc.sufficient++
    else if (item.current_stock >= item.min_stock) acc.low++
    else acc.critical++
    return acc
  }, { sufficient: 0, low: 0, critical: 0 })

  return { total: items.length, sufficient: stats.sufficient, low: stats.low, critical: stats.critical }
}

// 교체 실적 통계 (자체 쿼리 유지 - created_at 범위 조회 + system_settings)
async function getToolChangeStats(supabase: any, factoryId?: string) {
  const today = getFactoryToday()
  const yesterday = getFactoryYesterday()
  const todayRange = getFactoryDayRange(today)
  const yesterdayRange = getFactoryDayRange(yesterday)

  // created_at 기준으로 오늘/어제 범위의 데이터 조회 (날짜 범위 필터 사용)
  let todayQuery = supabase
    .from('tool_changes')
    .select('id, created_at, equipment_number, t_number, factory_id')
    .gte('created_at', todayRange.start)
    .lt('created_at', todayRange.end)
  todayQuery = applyFactoryFilter(todayQuery, factoryId)

  let yesterdayQuery = supabase
    .from('tool_changes')
    .select('id, created_at, equipment_number, t_number, factory_id')
    .gte('created_at', yesterdayRange.start)
    .lt('created_at', yesterdayRange.end)
  yesterdayQuery = applyFactoryFilter(yesterdayQuery, factoryId)

  const [
    { data: todayChanges, error: todayError },
    { data: yesterdayChanges, error: yesterdayError }
  ] = await Promise.all([todayQuery, yesterdayQuery])

  if (todayError) {
    logger.error('tool_changes 오늘 조회 오류:', todayError)
    throw todayError
  }
  if (yesterdayError) {
    logger.error('tool_changes 어제 조회 오류:', yesterdayError)
    throw yesterdayError
  }

  const todayCount = todayChanges?.length || 0
  const yesterdayCount = yesterdayChanges?.length || 0
  const difference = todayCount - yesterdayCount

  // 일일 교체 실적 목표를 system_settings에서 조회
  const { data: targetSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('category', 'dashboard')
    .eq('key', 'daily_change_target')
    .single()

  const dailyTarget = targetSetting?.value || 130

  return {
    today: todayCount,
    yesterday: yesterdayCount,
    difference,
    trend: difference >= 0 ? `+${difference}` : `${difference}`,
    target: dailyTarget
  }
}

// 공구 사용 비용 분석
function getCostAnalysis(allToolChanges: any[], allEndmillTypes: any[]) {
  const currentMonth = new Date().getMonth() + 1
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const currentYear = new Date().getFullYear()
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const currentMonthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
  const lastMonthStart = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`

  const currentMonthChanges = allToolChanges.filter((change) => change.change_date >= currentMonthStart)
  const lastMonthChanges = allToolChanges.filter((change) =>
    change.change_date >= lastMonthStart && change.change_date < currentMonthStart
  )

  const endmillMap = new Map(allEndmillTypes.map((et) => [et.code, et]))

  const calcCost = (changes: any[]) =>
    changes.reduce((sum, change) => {
      const endmill = endmillMap.get(change.endmill_code)
      if (!endmill) return sum + 50000
      const unitCostString = endmill.unit_cost || '50000'
      const unitCost = typeof unitCostString === 'string' ? parseFloat(unitCostString) : Number(unitCostString)
      return sum + (isNaN(unitCost) ? 50000 : unitCost)
    }, 0)

  const currentMonthCost = calcCost(currentMonthChanges)
  const lastMonthCost = calcCost(lastMonthChanges)
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
function getFrequencyAnalysis(allToolChanges: any[], allEquipment: any[]) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const weeklyChanges = allToolChanges.filter((change) => change.change_date >= oneWeekAgo)

  const equipmentMap = new Map(allEquipment.map((eq) => [eq.equipment_number, eq]))

  const modelStats = weeklyChanges.reduce((acc: Record<string, { count: number; dates: string[] }>, change) => {
    const eq = equipmentMap.get(change.equipment_number)
    const model = eq?.current_model || eq?.model_code || change.production_model || 'Unknown'
    const series = model.split('-')[0]

    if (!acc[series]) acc[series] = { count: 0, dates: [] }
    acc[series].count++
    acc[series].dates.push(change.change_date)
    return acc
  }, {})

  return Object.entries(modelStats).map(([series, stats]) => ({
    series,
    count: stats.count,
    avgInterval: stats.count > 1 ? Math.round(7 / stats.count * 10) / 10 : 7
  })).sort((a, b) => b.count - a.count)
}

// 엔드밀 평균 사용 수명 분석 (수량 기반)
function getLifespanAnalysis(allToolChanges: any[], allEndmillTypes: any[]) {
  // endmill_type_id별로 그룹화
  const changesByTypeId = allToolChanges.reduce((acc: Record<string, number[]>, change) => {
    if (!acc[change.endmill_type_id]) acc[change.endmill_type_id] = []
    const usedLife = change.tool_life || 0
    if (usedLife > 0) acc[change.endmill_type_id].push(usedLife)
    return acc
  }, {})

  const lifespanData = allEndmillTypes.map((type) => {
    const usedLives = changesByTypeId[type.id] || []
    const avgLife = usedLives.length > 0
      ? Math.round(usedLives.reduce((sum, life) => sum + life, 0) / usedLives.length)
      : type.standard_life || 800

    const variance = usedLives.length > 1
      ? Math.round(Math.sqrt(usedLives.reduce((sum, life) => sum + Math.pow(life - avgLife, 2), 0) / (usedLives.length - 1)))
      : 50

    const typeName = type.name.toUpperCase()
    let category = 'OTHER'
    if (typeName.includes('FLAT')) category = 'FLAT'
    else if (typeName.includes('BALL')) category = 'BALL'
    else if (typeName.includes('T-CUT') || typeName.includes('TCUT')) category = 'T-CUT'
    else if (typeName.includes('DRILL')) category = 'DRILL'
    else if (typeName.includes('RADIUS')) category = 'RADIUS'

    return { category, avgLife, variance, sampleSize: usedLives.length }
  })

  // 카테고리별 그룹화
  const categoryStats = lifespanData.reduce((acc: Record<string, { totalLife: number; totalVariance: number; count: number }>, item) => {
    if (!acc[item.category]) acc[item.category] = { totalLife: 0, totalVariance: 0, count: 0 }
    acc[item.category].totalLife += item.avgLife
    acc[item.category].totalVariance += item.variance
    acc[item.category].count++
    return acc
  }, {})

  return Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    avgLife: Math.round(stats.totalLife / stats.count),
    variance: Math.round(stats.totalVariance / stats.count)
  }))
}

// 설비 모델별 비용 분석
function getModelCostAnalysis(allToolChanges: any[], allEquipment: any[], allEndmillTypes: any[]) {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`

  const monthlyChanges = allToolChanges.filter((change) => change.change_date >= startDate)

  const equipmentMap = new Map(allEquipment.map((eq) => [eq.equipment_number, eq]))
  const endmillMap = new Map(allEndmillTypes.map((et) => [et.code, et]))

  const modelCosts = monthlyChanges.reduce((acc: Record<string, number>, change) => {
    const eq = equipmentMap.get(change.equipment_number)
    const model = eq?.current_model || eq?.model_code || change.production_model || 'Unknown'
    const series = model.split('-')[0]

    const endmill = endmillMap.get(change.endmill_code)
    const unitCostString = endmill?.unit_cost || '50000'
    const cost = typeof unitCostString === 'string' ? parseFloat(unitCostString) : Number(unitCostString)
    const finalCost = isNaN(cost) ? 50000 : cost

    acc[series] = (acc[series] || 0) + finalCost
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
async function getRecentAlerts(
  allToolChanges: any[],
  allEndmillTypes: any[],
  supabase: any,
  factoryId?: string
) {
  const alerts: any[] = []
  const MAX_ALERTS_PER_TYPE = 3

  // 1. 비정상 파손 감지
  const brokenTools = allToolChanges
    .filter((change) => change.change_reason === '파손')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  brokenTools.slice(0, MAX_ALERTS_PER_TYPE).forEach((change) => {
    const minutesAgo = Math.floor((new Date().getTime() - new Date(change.created_at).getTime()) / 60000)
    alerts.push({
      type: 'abnormal_damage',
      severity: 'warning',
      equipmentNumber: change.equipment_number,
      tNumber: change.t_number,
      minutesAgo,
      color: 'orange'
    })
  })

  // 2. 비정상 마모 감지
  const recentChangesWithLife = allToolChanges
    .filter((change) => change.tool_life != null && change.endmill_type_id != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30)

  const endmillMapById = new Map(allEndmillTypes.map((et) => [et.id, et]))
  let abnormalWearCount = 0

  for (const change of recentChangesWithLife) {
    if (abnormalWearCount >= MAX_ALERTS_PER_TYPE) break

    const endmillType = endmillMapById.get(change.endmill_type_id)
    const standardLife = endmillType?.standard_life || 800
    const actualLife = change.tool_life || 0

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
      abnormalWearCount++
    }
  }

  // 3. 추세 상승 경보
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const recentChanges = allToolChanges.filter((c) => new Date(c.created_at) >= sevenDaysAgo)
  const previousChanges = allToolChanges.filter((c) =>
    new Date(c.created_at) >= fourteenDaysAgo && new Date(c.created_at) < sevenDaysAgo
  )

  const recentByEquipment = new Map<number, number>()
  const previousByEquipment = new Map<number, number>()

  recentChanges.forEach((c) => {
    recentByEquipment.set(c.equipment_number, (recentByEquipment.get(c.equipment_number) || 0) + 1)
  })
  previousChanges.forEach((c) => {
    previousByEquipment.set(c.equipment_number, (previousByEquipment.get(c.equipment_number) || 0) + 1)
  })

  const trendAlerts: { equipmentNumber: number; recentCount: number; previousCount: number; increaseRate: number }[] = []
  recentByEquipment.forEach((recentCount, equipmentNumber) => {
    const previousCount = previousByEquipment.get(equipmentNumber) || 0
    if (previousCount > 0) {
      const increaseRate = ((recentCount - previousCount) / previousCount) * 100
      if (increaseRate >= 20) {
        trendAlerts.push({ equipmentNumber, recentCount, previousCount, increaseRate: Math.round(increaseRate) })
      }
    }
  })

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
        minutesAgo: 0,
        color: 'blue'
      })
    })

  // 4. 재고 부족 경보 (자체 쿼리 - inventory 테이블)
  let alertInvQuery = supabase
    .from('inventory')
    .select('endmill_type_id, current_stock, min_stock, last_updated, factory_id')
  alertInvQuery = applyFactoryFilter(alertInvQuery, factoryId)
  const { data: inventory, error: invError } = await alertInvQuery

  if (!invError && inventory) {
    const criticalItems = inventory
      .filter((item: any) => item.current_stock < item.min_stock)
      .sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())

    const endmillStockMap = new Map(allEndmillTypes.map((et) => [et.id, et]))

    criticalItems.slice(0, MAX_ALERTS_PER_TYPE).forEach((item: any) => {
      const endmillType = endmillStockMap.get(item.endmill_type_id)
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

  return alerts
}

// Phase 4.1: 앤드밀별 사용 설비 개수
function getEndmillByEquipmentCount(
  allEquipment: any[],
  allToolPositions: any[],
  allEndmillTypes: any[],
  factoryId?: string
) {
  const equipmentIdSet = new Set(allEquipment.map((e) => e.id))
  if (factoryId && equipmentIdSet.size === 0) return []

  const filteredPositions = factoryId
    ? allToolPositions.filter((pos) => equipmentIdSet.has(pos.equipment_id))
    : allToolPositions
  const inUsePositions = filteredPositions.filter((pos) => pos.status === 'in_use')

  // endmill_type_id별로 고유한 equipment_id 개수 계산
  const endmillEquipmentCount: Record<string, Set<string>> = {}
  inUsePositions.forEach((pos) => {
    if (!pos.endmill_type_id) return
    if (!endmillEquipmentCount[pos.endmill_type_id]) endmillEquipmentCount[pos.endmill_type_id] = new Set()
    endmillEquipmentCount[pos.endmill_type_id].add(pos.equipment_id)
  })

  const endmillMap = new Map(allEndmillTypes.map((et) => [et.id, et]))

  return Object.entries(endmillEquipmentCount)
    .map(([endmillTypeId, equipmentSet]) => {
      const endmill = endmillMap.get(endmillTypeId)
      return {
        endmillCode: endmill?.code || 'Unknown',
        endmillName: endmill?.name || 'Unknown',
        equipmentCount: equipmentSet.size,
        totalPositions: inUsePositions.filter((p) => p.endmill_type_id === endmillTypeId).length
      }
    })
    .sort((a, b) => b.equipmentCount - a.equipmentCount)
    .slice(0, 10)
}

// Phase 4.1: 모델별 앤드밀 사용 현황 (CAM Sheet 기준, 자체 쿼리 - cam_sheets)
async function getModelEndmillUsage(
  supabase: any,
  allEquipment: any[],
  _factoryId?: string
) {
  // CAM Sheet에서 모델/공정별 T번호 개수 조회 (자체 쿼리)
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
    logger.error('cam_sheets 조회 오류:', camError)
    throw camError
  }

  const camSheetMap = new Map<string, number>()
  camSheets?.forEach((sheet: any) => {
    const key = `${sheet.model}-${sheet.process}`
    const tNumbers = new Set(sheet.cam_sheet_endmills?.map((e: any) => e.t_number) || [])
    camSheetMap.set(key, tNumbers.size)
  })

  const modelUsage = allEquipment.reduce((acc: Record<string, { equipmentIds: Set<string>; totalEndmills: number; processes: Set<string> }>, eq) => {
    const model = eq.current_model || 'Unknown'
    const process = eq.process || ''
    const key = `${model}-${process}`
    const tNumberCount = camSheetMap.get(key) || 0

    if (!acc[model]) acc[model] = { equipmentIds: new Set(), totalEndmills: 0, processes: new Set() }
    acc[model].equipmentIds.add(eq.id)
    acc[model].totalEndmills += tNumberCount
    acc[model].processes.add(process)
    return acc
  }, {})

  return Object.entries(modelUsage)
    .map(([model, data]) => {
      const equipmentCount = data.equipmentIds.size
      const endmillCount = data.totalEndmills
      return {
        model,
        equipmentCount,
        endmillCount,
        avgEndmillPerEquipment: equipmentCount > 0 ? Math.round((endmillCount / equipmentCount) * 10) / 10 : 0
      }
    })
    .filter((item) => item.equipmentCount > 0)
    .sort((a, b) => b.endmillCount - a.endmillCount)
}

// Phase 4.1: 설비별 교체 실적 통계 (실제 교체 건수 기준)
function getEquipmentLifeConsumption(allToolChanges: any[], allEquipment: any[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentChanges = allToolChanges.filter((change) => change.change_date >= thirtyDaysAgo)

  if (recentChanges.length === 0) return []

  // equipment_number별로 교체 건수 집계
  const changeCountByEquipment = recentChanges.reduce((acc: Record<number, number>, change) => {
    acc[change.equipment_number] = (acc[change.equipment_number] || 0) + 1
    return acc
  }, {})

  const equipmentMap = new Map(allEquipment.map((eq) => [eq.equipment_number, eq]))

  return Object.entries(changeCountByEquipment)
    .map(([equipmentNumber, changeCount]) => {
      const eqNum = Number(equipmentNumber)
      const eq = equipmentMap.get(eqNum)
      const toolCount = eq?.tool_position_count || 0
      const consumptionRate = Math.min(100, Math.round((changeCount / 30) * 100))

      return {
        equipmentNumber: eqNum,
        model: eq?.current_model || 'Unknown',
        process: eq?.process || '',
        changeCount,
        consumptionRate,
        toolCount
      }
    })
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 10)
}

// 최다 파손 교체 엔드밀 Top 3 (최근 30일 기준)
function getTopBrokenEndmills(allToolChanges: any[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const brokenChanges = allToolChanges.filter((change) =>
    change.change_date >= thirtyDaysAgo && change.change_reason === '파손'
  )

  if (brokenChanges.length === 0) return []

  const changeCountByCode = brokenChanges.reduce((acc: Record<string, number>, change) => {
    acc[change.endmill_code] = (acc[change.endmill_code] || 0) + 1
    return acc
  }, {})

  return Object.entries(changeCountByCode)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
}
