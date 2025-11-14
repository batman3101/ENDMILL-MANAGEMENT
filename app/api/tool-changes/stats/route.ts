import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../../lib/services/supabaseService'
import { logger } from '../../../../lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

// 동적 라우트로 명시적 설정
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canRead = hasPermission(userRole, 'tool_changes', 'read', customPermissions)
    if (!canRead) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD 형식

    // 오늘 날짜 기본값
    const targetDate = date || new Date().toISOString().split('T')[0]

    logger.log('GET /api/tool-changes/stats - date:', targetDate)

    // 전체 교체 실적 조회 (오늘 날짜 기준)
    const result = await serverSupabaseService.toolChange.getFiltered({
      startDate: targetDate,
      endDate: targetDate
    })

    // 통계 계산
    const stats = {
      todayTotal: result.length,
      regularReplacement: result.filter((tc: any) => tc.change_reason === '정기교체').length,
      broken: result.filter((tc: any) => tc.change_reason === '파손').length,
      wear: result.filter((tc: any) => tc.change_reason === '마모').length,
      modelChange: result.filter((tc: any) => tc.change_reason === '모델변경').length,
      qualityDefect: result.filter((tc: any) => tc.change_reason === '품질불량').length,
      topModelToday: getTopModel(result),
      topProcessToday: getTopProcess(result)
    }

    return NextResponse.json({
      success: true,
      data: stats,
      date: targetDate
    })
  } catch (error: any) {
    logger.error('Error fetching tool change stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tool change stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 가장 많은 교체가 발생한 모델 찾기
function getTopModel(toolChanges: any[]): { name: string; count: number } {
  if (toolChanges.length === 0) {
    return { name: '없음', count: 0 }
  }

  const modelCounts = toolChanges.reduce((acc: Record<string, number>, tc) => {
    const model = tc.production_model || 'Unknown'
    acc[model] = (acc[model] || 0) + 1
    return acc
  }, {})

  const topEntry = Object.entries(modelCounts).reduce((a, b) => a[1] > b[1] ? a : b)
  return { name: topEntry[0], count: topEntry[1] }
}

// 가장 많은 교체가 발생한 공정 찾기
function getTopProcess(toolChanges: any[]): { name: string; count: number } {
  if (toolChanges.length === 0) {
    return { name: '없음', count: 0 }
  }

  const processCounts = toolChanges.reduce((acc: Record<string, number>, tc) => {
    const process = tc.process || 'Unknown'
    acc[process] = (acc[process] || 0) + 1
    return acc
  }, {})

  const topEntry = Object.entries(processCounts).reduce((a, b) => a[1] > b[1] ? a : b)
  return { name: topEntry[0], count: topEntry[1] }
}
