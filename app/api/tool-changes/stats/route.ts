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
    const dateParam = searchParams.get('date') // YYYY-MM-DD 형식

    // 베트남 시간대(UTC+7) 기준, 08시를 기준으로 하루 구분
    const vietnamOffset = 7 * 60 // UTC+7 (분 단위)
    const now = new Date()
    const vietnamTime = new Date(now.getTime() + vietnamOffset * 60 * 1000)

    let targetDate: Date

    if (dateParam) {
      // 특정 날짜가 지정된 경우
      targetDate = new Date(dateParam + 'T00:00:00Z')
    } else {
      // 현재 베트남 시간 기준
      targetDate = new Date(vietnamTime)

      // 현재 시각이 08시 이전이면 전날로 설정
      const currentHour = vietnamTime.getUTCHours()
      if (currentHour < 8) {
        targetDate.setUTCDate(targetDate.getUTCDate() - 1)
      }
    }

    // 시작: targetDate 08:00 (베트남 시간)
    // 종료: targetDate+1일 08:00 (베트남 시간)
    const startDate = new Date(targetDate)
    startDate.setUTCHours(8 - vietnamOffset / 60, 0, 0, 0) // 베트남 08:00 = UTC 01:00

    const endDate = new Date(targetDate)
    endDate.setUTCDate(endDate.getUTCDate() + 1)
    endDate.setUTCHours(8 - vietnamOffset / 60, 0, 0, 0) // 다음날 베트남 08:00

    const startDateTime = startDate.toISOString()
    const endDateTime = endDate.toISOString()

    logger.log('GET /api/tool-changes/stats - 조회 기간:', {
      targetDate: targetDate.toISOString().split('T')[0],
      startDateTime,
      endDateTime,
      vietnamTime: vietnamTime.toISOString()
    })

    // created_at 기준으로 필터링 (시간 정보 포함)
    const { data: toolChanges, error } = await supabase
      .from('tool_changes')
      .select('*')
      .gte('created_at', startDateTime)
      .lt('created_at', endDateTime)

    if (error) {
      logger.error('Tool changes 조회 오류:', error)
      throw error
    }

    const result = toolChanges || []

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
      date: targetDate.toISOString().split('T')[0],
      period: {
        start: startDateTime,
        end: endDateTime
      }
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
