/**
 * AI Insights API Endpoint
 * 자동으로 데이터를 분석하여 인사이트 제공
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGeminiService } from '@/lib/services/geminiService'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

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

    // 4. 최근 7일 데이터 조회
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 공구 교체 데이터
    const { data: toolChanges } = await supabase
      .from('tool_changes')
      .select(
        `
        id,
        equipment_number,
        model,
        process,
        t_number,
        endmill_code,
        endmill_name,
        change_date,
        change_reason,
        tool_life
      `
      )
      .gte('change_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('change_date', { ascending: false })
      .limit(200)

    // 재고 데이터
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select(
        `
        id,
        current_stock,
        min_stock,
        status,
        endmill_types (
          code,
          name,
          unit_cost
        )
      `
      )
      .in('status', ['low', 'critical'])
      .limit(50)

    // 데이터 정리 및 요약 (Gemini API 응답 시간 최적화)
    const toolChangesData = toolChanges || []
    const inventoryItems = inventoryData || []

    // 파손 건수 계산
    const damageCount = toolChangesData.filter((tc: any) => tc.change_reason === '파손').length

    // 모델별 파손 통계
    const damageByModel: Record<string, number> = {}
    toolChangesData
      .filter((tc: any) => tc.change_reason === '파손')
      .forEach((tc: any) => {
        const model = tc.model || 'Unknown'
        damageByModel[model] = (damageByModel[model] || 0) + 1
      })

    // 엔드밀별 파손 통계 (상위 10개)
    const damageByEndmill: Record<string, number> = {}
    toolChangesData
      .filter((tc: any) => tc.change_reason === '파손')
      .forEach((tc: any) => {
        const code = tc.endmill_code || 'Unknown'
        damageByEndmill[code] = (damageByEndmill[code] || 0) + 1
      })
    const topDamagedEndmills = Object.entries(damageByEndmill)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // 요약된 데이터 구성 (원본 데이터 대신 통계만 전달)
    const summarizedData = {
      period: {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
      },
      toolChanges: {
        total: toolChangesData.length,
        damageCount,
        normalLifeCount: toolChangesData.filter((tc: any) => tc.change_reason === '수명완료').length,
        prematureCount: toolChangesData.filter((tc: any) => tc.change_reason === '조기교체').length,
        damageRate: toolChangesData.length > 0 ? Math.round((damageCount / toolChangesData.length) * 100) : 0,
      },
      damageByModel,
      topDamagedEndmills,
      inventory: {
        lowStockCount: inventoryItems.length,
        criticalItems: inventoryItems.filter((inv: any) => inv.status === 'critical').length,
        lowItems: inventoryItems.filter((inv: any) => inv.status === 'low').length,
        items: inventoryItems.slice(0, 20).map((inv: any) => ({
          code: (inv as any).endmill_types?.code,
          name: (inv as any).endmill_types?.name,
          currentStock: inv.current_stock,
          minStock: inv.min_stock,
          status: inv.status,
        })),
      },
    }

    const recentData = {
      toolChanges: toolChangesData,
      inventory: inventoryItems,
      summary: {
        totalChanges: toolChangesData.length,
        damageCount,
        lowStockCount: inventoryItems.length,
      },
    }

    // 5. Gemini로 인사이트 분석 (요약된 데이터 사용)
    const geminiService = getGeminiService()
    const insights = await geminiService.analyzeDataForInsights(summarizedData as any)

    return NextResponse.json({
      insights,
      dataRange: {
        from: sevenDaysAgo.toISOString(),
        to: new Date().toISOString(),
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
