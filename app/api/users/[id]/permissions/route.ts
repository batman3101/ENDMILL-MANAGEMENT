import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { hasPermission, isAdmin } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// GET /api/users/[id]/permissions - 사용자의 권한 매트릭스 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const userId = params.id

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
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

    // 대상 사용자의 역할 정보 조회
    const { data: targetProfile, error } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('id', userId)
      .single()

    if (error || !targetProfile || !targetProfile.user_roles) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 권한 매트릭스 반환
    const permissions = targetProfile.user_roles.permissions || {}

    return NextResponse.json({
      success: true,
      data: {
        userId: targetProfile.id,
        userName: targetProfile.name,
        roleId: targetProfile.user_roles.id,
        roleName: targetProfile.user_roles.name,
        roleType: targetProfile.user_roles.type,
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
    const supabase = createServerClient()
    const userId = params.id

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
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

    // 대상 사용자의 역할 정보 조회
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('id', userId)
      .single()

    if (!targetProfile || !targetProfile.user_roles) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 시스템 관리자의 권한은 수정 불가
    if (targetProfile.user_roles.type === 'system_admin') {
      return NextResponse.json(
        { error: 'Cannot modify system admin permissions' },
        { status: 403 }
      )
    }

    // 역할의 권한 업데이트
    const { data: updatedRole, error: updateError } = await supabase
      .from('user_roles')
      .update({
        permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetProfile.user_roles.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating role permissions:', updateError)
      return NextResponse.json(
        { error: 'Failed to update permissions', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: targetProfile.id,
        userName: targetProfile.name,
        roleId: updatedRole.id,
        roleName: updatedRole.name,
        roleType: updatedRole.type,
        permissions: updatedRole.permissions
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
    const supabase = createServerClient()
    const userId = params.id

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
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
    const { data: templateRole, error: templateError } = await supabase
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
    const { data: targetProfile } = await supabase
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

    // 사용자의 역할을 템플릿 역할로 변경
    const { data: updatedProfile, error: updateError } = await supabase
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
