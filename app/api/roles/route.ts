import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { isAdmin, isSystemAdmin } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// GET /api/roles - 모든 역할 조회
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerClient()

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

    // 역할 목록 조회
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Error fetching roles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch roles', details: error.message },
        { status: 500 }
      )
    }

    // 각 역할을 사용하는 사용자 수 계산
    const rolesWithCount = await Promise.all(
      (roles || []).map(async (role) => {
        const { count } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role_id', role.id)

        return {
          ...role,
          userCount: count || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: rolesWithCount,
      count: rolesWithCount.length
    })

  } catch (error: any) {
    logger.error('Unexpected error in GET /api/roles:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/roles - 새 역할 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

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

    // 권한 확인 (시스템 관리자만 가능)
    const userRole = currentUserProfile.user_roles.type
    if (!isSystemAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: System admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, type, description, permissions, isActive = true } = body

    // 필수 필드 검증
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      )
    }

    // 역할 타입 검증
    const validTypes = ['system_admin', 'admin', 'user']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid role type. Must be one of: system_admin, admin, user' },
        { status: 400 }
      )
    }

    // 역할 생성
    const { data: newRole, error: createError } = await supabase
      .from('user_roles')
      .insert({
        name,
        type,
        description: description || '',
        permissions: permissions || {},
        is_active: isActive
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating role:', createError)
      return NextResponse.json(
        { error: 'Failed to create role', details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Unexpected error in POST /api/roles:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
