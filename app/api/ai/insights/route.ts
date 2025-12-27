/**
 * AI Insights API Endpoint
 * 자동으로 데이터를 분석하여 인사이트 제공
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGeminiService } from '@/lib/services/geminiService'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'
import { getFactoryToday, getFactoryDayRange } from '@/lib/utils/dateUtils'

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

// Vercel 서버리스 함수 타임아웃 설정 (최대 60초)
export const maxDuration = 60

/**
 * GET /api/ai/insights
 * 자동 인사이트 생성 (최근 7일 데이터 기반)
 */
export async function GET(_request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(type, permissions)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRoleData = (currentUserProfile as any).user_roles
    const userRole = userRoleData.type
    const rolePermissions = (userRoleData?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUse = hasPermission(userRole, 'ai_insights', 'use', customPermissions)
    if (!canUse) {
      return NextResponse.json(
        { error: 'AI 인사이트 기능을 사용할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 4. 최근 7일 데이터 조회 (공장 근무시간 기준)
    const factoryToday = getFactoryToday()
    const todayDate = new Date(factoryToday + 'T00:00:00Z')
    const sevenDaysAgo = new Date(todayDate)
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)

    // 7일 전 08:00 베트남 시간부터 조회
    const { start: dateFrom } = getFactoryDayRange(sevenDaysAgo.toISOString().split('T')[0])
    const { end: dateTo } = getFactoryDayRange(factoryToday)

    // 4-1. 전체 통계 조회 (정확한 COUNT) - created_at 사용
    const { count: totalChangesCount } = await supabase
      .from('tool_changes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFrom)
      .lt('created_at', dateTo)

    // 교체 사유별 통계
    const { data: reasonStats } = await supabase
      .from('tool_changes')
      .select('change_reason')
      .gte('created_at', dateFrom)
      .lt('created_at', dateTo)

    const reasonCounts = (reasonStats || []).reduce((acc: Record<string, number>, item: any) => {
      const reason = item.change_reason || 'Unknown'
      acc[reason] = (acc[reason] || 0) + 1
      return acc
    }, {})

    // 모델별 파손 통계 (production_model 컬럼 사용)
    const { data: modelDamageStats } = await supabase
      .from('tool_changes')
      .select('production_model')
      .gte('created_at', dateFrom)
      .lt('created_at', dateTo)
      .eq('change_reason', '파손')
      .not('production_model', 'is', null)

    const damageByModel = (modelDamageStats || []).reduce((acc: Record<string, number>, item: any) => {
      const model = item.production_model || 'Unknown'
      acc[model] = (acc[model] || 0) + 1
      return acc
    }, {})

    // 엔드밀별 파손 통계 (상위 10개)
    const { data: endmillDamageStats } = await supabase
      .from('tool_changes')
      .select('endmill_code, endmill_name')
      .gte('created_at', dateFrom)
      .lt('created_at', dateTo)
      .eq('change_reason', '파손')

    const damageByEndmill = (endmillDamageStats || []).reduce((acc: Record<string, { count: number; name: string }>, item: any) => {
      const code = item.endmill_code || 'Unknown'
      if (!acc[code]) {
        acc[code] = { count: 0, name: item.endmill_name || code }
      }
      acc[code].count += 1
      return acc
    }, {})

    const topDamagedEndmills = Object.entries(damageByEndmill)
      .map(([code, data]) => ({ code, count: (data as any).count, name: (data as any).name }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 재고 부족 통계
    const { count: lowStockCount } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .in('status', ['low', 'critical'])

    const { data: inventoryStats } = await supabase
      .from('inventory')
      .select('status')
      .in('status', ['low', 'critical'])

    const criticalCount = (inventoryStats || []).filter((inv: any) => inv.status === 'critical').length
    const lowCount = (inventoryStats || []).filter((inv: any) => inv.status === 'low').length

    // 재고 부족 품목 상세 (상위 20개)
    const { data: inventoryItems } = await supabase
      .from('inventory')
      .select(`
        id,
        current_stock,
        min_stock,
        status,
        endmill_types (
          code,
          name,
          unit_cost
        )
      `)
      .in('status', ['low', 'critical'])
      .order('current_stock', { ascending: true })
      .limit(20)

    // 실제 통계 값
    const totalChanges = totalChangesCount || 0
    const damageCount = reasonCounts['파손'] || 0
    const wearCount = reasonCounts['마모'] || 0
    const modelChangeCount = reasonCounts['모델변경'] || 0

    // 요약된 데이터 구성 (정확한 통계 기반)
    const summarizedData = {
      period: {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: factoryToday,
      },
      toolChanges: {
        total: totalChanges,
        damageCount,
        wearCount,
        modelChangeCount,
        damageRate: totalChanges > 0 ? Math.round((damageCount / totalChanges) * 100) : 0,
        reasonBreakdown: reasonCounts,
      },
      damageByModel,
      topDamagedEndmills,
      inventory: {
        totalLowStock: lowStockCount || 0,
        criticalCount,
        lowCount,
        items: (inventoryItems || []).map((inv: any) => ({
          code: (inv as any).endmill_types?.code,
          name: (inv as any).endmill_types?.name,
          currentStock: inv.current_stock,
          minStock: inv.min_stock,
          status: inv.status,
        })),
      },
    }

    const recentData = {
      toolChanges: [],
      inventory: inventoryItems || [],
      summary: {
        totalChanges,
        damageCount,
        lowStockCount: lowStockCount || 0,
      },
    }

    // 5. Gemini로 인사이트 분석 (요약된 데이터 사용)
    const geminiService = getGeminiService()
    const insights = await geminiService.analyzeDataForInsights(summarizedData as any)

    return NextResponse.json({
      insights,
      dataRange: {
        from: dateFrom,
        to: dateTo,
      },
      summary: recentData.summary,
    })
  } catch (error: any) {
    console.error('AI Insights API Error:', error)

    return NextResponse.json(
      {
        error: '인사이트 생성 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/insights
 * 특정 데이터에 대한 인사이트 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(type, permissions)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRoleData = (currentUserProfile as any).user_roles
    const userRole = userRoleData.type
    const rolePermissions = (userRoleData?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUse = hasPermission(userRole, 'ai_insights', 'use', customPermissions)
    if (!canUse) {
      return NextResponse.json(
        { error: 'AI 인사이트 기능을 사용할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 4. 요청 바디에서 데이터 추출
    const body = await request.json()
    const { data } = body

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: '분석할 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 5. Gemini로 인사이트 분석
    const geminiService = getGeminiService()
    const insights = await geminiService.analyzeDataForInsights(data)

    return NextResponse.json({
      insights,
      dataCount: data.length,
    })
  } catch (error: any) {
    console.error('AI Insights POST API Error:', error)

    return NextResponse.json(
      {
        error: '인사이트 생성 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
