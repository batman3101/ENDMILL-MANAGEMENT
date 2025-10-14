import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth-client'
import { createServerClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// GET /api/users/[id]/permissions - 사용자의 권한 매트릭스 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 사용자 인증용 클라이언트 (쿠키에서 세션 읽기)
    const authClient = await createAuthClient()

    const userId = params.id

    // 현재 사용자 세션 확인
    const { data: { session }, error: authError } = await authClient.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const user = session.user

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await authClient
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (관리자만 가능)
    const userRole = currentUserProfile.user_roles.type
    if (!isAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // 대상 사용자 프로필 조회
    const { data: targetProfile, error } = await authClient
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('id', userId)
      .single()

    if (error || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 역할 기반 권한 반환 (user_roles.permissions 사용)
    const permissions = targetProfile.user_roles?.permissions || {}

    return NextResponse.json({
      success: true,
      data: {
        userId: targetProfile.id,
        userName: targetProfile.name,
        roleId: targetProfile.user_roles?.id || '',
        roleName: targetProfile.user_roles?.name || '',
        roleType: targetProfile.user_roles?.type || '',
        permissions
      }
    })

  } catch (error: any) {
    logger.error('Unexpected error in GET /api/users/[id]/permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id]/permissions - 사용자의 권한 매트릭스 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 사용자 인증용 클라이언트 (쿠키에서 세션 읽기)
    const authClient = await createAuthClient()

    const userId = params.id

    // 현재 사용자 세션 확인
    const { data: { session }, error: authError } = await authClient.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const user = session.user

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await authClient
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (관리자만 가능)
    const userRole = currentUserProfile.user_roles.type
    if (!isAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { permissions } = body

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { error: 'Invalid permissions data' },
        { status: 400 }
      )
    }

    // 대상 사용자 프로필 조회
    const { data: targetProfile } = await authClient
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 시스템 관리자의 권한은 수정 불가
    if (targetProfile.user_roles?.type === 'system_admin') {
      return NextResponse.json(
        { error: 'Cannot modify system admin permissions' },
        { status: 403 }
      )
    }

    // 사용자 개인 권한 업데이트 (Service Role 사용)
    const adminSupabase = createServerClient()

    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('user_profiles')
      .update({
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*, user_roles(*)')
      .single()

    if (updateError) {
      logger.error('Error updating user permissions:', updateError)
      return NextResponse.json(
        { error: 'Failed to update permissions', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: updatedProfile.id,
        userName: updatedProfile.name,
        roleId: updatedProfile.user_roles?.id || '',
        roleName: updatedProfile.user_roles?.name || '',
        roleType: updatedProfile.user_roles?.type || '',
        permissions: permissions
      },
      message: 'Permissions updated successfully'
    })

  } catch (error: any) {
    logger.error('Unexpected error in PUT /api/users/[id]/permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/permissions - 권한 템플릿 적용
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 사용자 인증용 클라이언트 (쿠키에서 세션 읽기)
    const authClient = await createAuthClient()

    const userId = params.id

    // 현재 사용자 세션 확인
    const { data: { session }, error: authError } = await authClient.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const user = session.user

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await authClient
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (관리자만 가능)
    const userRole = currentUserProfile.user_roles.type
    if (!isAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { templateRoleId } = body

    if (!templateRoleId) {
      return NextResponse.json(
        { error: 'Template role ID is required' },
        { status: 400 }
      )
    }

    // 템플릿 역할 조회
    const { data: templateRole, error: templateError } = await authClient
      .from('user_roles')
      .select('*')
      .eq('id', templateRoleId)
      .single()

    if (templateError || !templateRole) {
      return NextResponse.json(
        { error: 'Template role not found' },
        { status: 404 }
      )
    }

    // 대상 사용자 조회
    const { data: targetProfile } = await authClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 사용자의 역할을 템플릿 역할로 변경 (Service Role 사용)
    const adminSupabase = createServerClient()

    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('user_profiles')
      .update({
        role_id: templateRoleId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*, user_roles(*)')
      .single()

    if (updateError) {
      logger.error('Error applying template:', updateError)
      return NextResponse.json(
        { error: 'Failed to apply template', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: updatedProfile.id,
        userName: updatedProfile.name,
        roleId: updatedProfile.user_roles?.id || '',
        roleName: updatedProfile.user_roles?.name || '',
        roleType: updatedProfile.user_roles?.type || '',
        permissions: updatedProfile.user_roles?.permissions || []
      },
      message: 'Template applied successfully'
    })

  } catch (error: any) {
    logger.error('Unexpected error in POST /api/users/[id]/permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
