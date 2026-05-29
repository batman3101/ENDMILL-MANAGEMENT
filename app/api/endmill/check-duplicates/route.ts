import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

export async function POST(request: NextRequest) {
  try {
    // 쿠키 바인딩 클라이언트로 요청자 JWT 세션 검증
    const authClient = createClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: currentUserProfile } = await authClient
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()
    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)
    if (!hasPermission(userRole, 'endmills', 'read', customPermissions)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { codes } = await request.json()

    if (!codes || !Array.isArray(codes)) {
      return NextResponse.json(
        { error: '유효하지 않은 코드 목록입니다.' },
        { status: 400 }
      )
    }

    // 기존 엔드밀 코드 확인
    const { data: existingEndmills, error } = await supabase
      .from('endmill_types')
      .select('code')
      .in('code', codes)

    if (error) {
      logger.error('엔드밀 중복 검사 오류:', error)
      return NextResponse.json(
        { error: '데이터베이스 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const existingCodes = existingEndmills?.map(item => item.code) || []
    const duplicates = codes.filter((code: string) => existingCodes.includes(code))
    const newCodes = codes.filter((code: string) => !existingCodes.includes(code))

    return NextResponse.json({
      success: true,
      duplicates,
      newCodes,
      totalChecked: codes.length,
      duplicateCount: duplicates.length,
      newCount: newCodes.length
    })

  } catch (error) {
    logger.error('엔드밀 중복 검사 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}