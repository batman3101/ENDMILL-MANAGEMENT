import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// GET /api/users/[id] - 특정 사용자 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
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
      .select('*, user_roles(type, permissions)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canRead = hasPermission(userRole, 'users', 'read', customPermissions)
    if (!canRead) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    // 사용자 프로필 조회
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      logger.error('Error fetching user:', error)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 이메일 정보 가져오기
    let email = ''
    if (profile.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
      email = authUser?.user?.email || ''
    }

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        email
      }
    })

  } catch (error: any) {
    logger.error('Unexpected error in GET /api/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - 사용자 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
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
      .select('*, user_roles(type, permissions)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUpdate = hasPermission(userRole, 'users', 'update', customPermissions)
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      email,
      employeeId,
      department,
      position,
      shift,
      roleId,
      phone,
      isActive
    } = body

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

    // 사번 중복 확인 (자신 제외)
    if (employeeId && employeeId !== targetProfile.employee_id) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('employee_id', employeeId)
        .neq('id', userId)
        .single()

      if (existingProfile) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        )
      }
    }

    // 프로필 업데이트 데이터 구성
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (name !== undefined) updateData.name = name
    if (employeeId !== undefined) updateData.employee_id = employeeId
    if (department !== undefined) updateData.department = department
    if (position !== undefined) updateData.position = position
    if (shift !== undefined) updateData.shift = shift
    if (roleId !== undefined) updateData.role_id = roleId
    if (phone !== undefined) updateData.phone = phone
    if (isActive !== undefined) updateData.is_active = isActive

    // 프로필 업데이트
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*, user_roles(*)')
      .single()

    if (updateError) {
      logger.error('Error updating user profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user', details: updateError.message },
        { status: 500 }
      )
    }

    // 이메일 업데이트 (Auth 사용자가 있는 경우)
    if (email && targetProfile.user_id) {
      const { error: emailUpdateError } = await supabase.auth.admin.updateUserById(
        targetProfile.user_id,
        { email }
      )

      if (emailUpdateError) {
        logger.warn('Failed to update email:', emailUpdateError)
      }
    }

    // 최신 이메일 정보 가져오기
    let currentEmail = ''
    if (updatedProfile.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(updatedProfile.user_id)
      currentEmail = authUser?.user?.email || ''
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedProfile,
        email: currentEmail
      },
      message: 'User updated successfully'
    })

  } catch (error: any) {
    logger.error('Unexpected error in PUT /api/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - 사용자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
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
      .select('*, user_roles(type, permissions)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canDelete = hasPermission(userRole, 'users', 'delete', customPermissions)
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    // 자기 자신 삭제 방지
    if (currentUserProfile.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
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

    // Auth 사용자 먼저 삭제 (있는 경우)
    // 이 순서가 중요: Auth를 먼저 삭제해야 나중에 같은 이메일로 재가입 가능
    if (targetProfile.user_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        targetProfile.user_id
      )

      if (authDeleteError) {
        logger.error('Failed to delete auth user:', authDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete auth user', details: authDeleteError.message },
          { status: 500 }
        )
      }
      logger.log('Auth user deleted successfully:', targetProfile.user_id)
    }

    // 프로필 삭제
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      logger.error('Error deleting user profile:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user profile', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error: any) {
    logger.error('Unexpected error in DELETE /api/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
