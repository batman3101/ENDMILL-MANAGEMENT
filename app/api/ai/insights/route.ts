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

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
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

    // 데이터 정리
    const recentData = {
      toolChanges: toolChanges || [],
      inventory: inventoryData || [],
      summary: {
        totalChanges: toolChanges?.length || 0,
        damageCount:
          toolChanges?.filter(tc => tc.change_reason === '파손').length || 0,
        lowStockCount: inventoryData?.length || 0,
      },
    }

    // 5. Gemini로 인사이트 분석
    const geminiService = getGeminiService()
    const insights = await geminiService.analyzeDataForInsights(recentData as any)

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

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
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
