import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { isAdmin, isSystemAdmin } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// GET /api/roles/[id] - 특정 역할 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const roleId = params.id

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

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (관리자만 가능)
    const userRole = (currentUserProfile as any).user_roles.type
    if (!isAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // 역할 조회
    const { data: role, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (error || !role) {
      logger.error('Error fetching role:', error)
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // 이 역할을 사용하는 사용자 수
    const { count } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', roleId)

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        userCount: count || 0
      }
    })

  } catch (error: any) {
    logger.error('Unexpected error in GET /api/roles/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/roles/[id] - 역할 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const roleId = params.id

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

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (시스템 관리자만 가능)
    const userRole = (currentUserProfile as any).user_roles.type
    if (!isSystemAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: System admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, type, description, permissions, isActive } = body

    // 대상 역할 조회
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // 역할 타입 검증 (변경하는 경우)
    if (type) {
      const validTypes = ['system_admin', 'admin', 'user']
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: 'Invalid role type. Must be one of: system_admin, admin, user' },
          { status: 400 }
        )
      }
    }

    // 업데이트 데이터 구성
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (description !== undefined) updateData.description = description
    if (permissions !== undefined) updateData.permissions = permissions
    if (isActive !== undefined) updateData.is_active = isActive

    // 역할 업데이트
    const { data: updatedRole, error: updateError } = await supabase
      .from('user_roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update role', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully'
    })

  } catch (error: any) {
    logger.error('Unexpected error in PUT /api/roles/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/roles/[id] - 역할 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const roleId = params.id

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

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (시스템 관리자만 가능)
    const userRole = (currentUserProfile as any).user_roles.type
    if (!isSystemAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: System admin access required' },
        { status: 403 }
      )
    }

    // 대상 역할 조회
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // 기본 역할(시스템 역할) 삭제 방지
    if (existingRole.type === 'system_admin') {
      return NextResponse.json(
        { error: 'Cannot delete system admin role' },
        { status: 403 }
      )
    }

    // 이 역할을 사용하는 사용자가 있는지 확인
    const { count } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', roleId)

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete role: ${count} user(s) are using this role` },
        { status: 409 }
      )
    }

    // 역할 삭제
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId)

    if (deleteError) {
      logger.error('Error deleting role:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete role', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    })

  } catch (error: any) {
    logger.error('Unexpected error in DELETE /api/roles/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
