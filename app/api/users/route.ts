import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// GET /api/users - 모든 사용자 조회
export async function GET(request: NextRequest) {
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

    if (!hasPermission(userRole, 'users', 'read', customPermissions)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    // URL 파라미터에서 필터 정보 가져오기
    const searchParams = request.nextUrl.searchParams
    const department = searchParams.get('department')
    const shift = searchParams.get('shift')
    const roleId = searchParams.get('roleId')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    // 사용자 프로필 조회 (user_id 통해 auth.users의 email 조인)
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles(*),
        auth_user:user_id(email)
      `)
      .order('created_at', { ascending: false })

    // 필터 적용
    if (department) query = query.eq('department', department)
    if (shift && ['A', 'B', 'C'].includes(shift)) query = query.eq('shift', shift as 'A' | 'B' | 'C')
    if (roleId) query = query.eq('role_id', roleId)
    if (isActive !== null) query = query.eq('is_active', isActive === 'true')

    const { data: profiles, error } = await query

    if (error) {
      logger.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: error.message },
        { status: 500 }
      )
    }

    // 검색어 필터링 (클라이언트 사이드)
    let filteredProfiles = profiles || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredProfiles = filteredProfiles.filter(profile =>
        profile.name?.toLowerCase().includes(searchLower) ||
        profile.employee_id?.toLowerCase().includes(searchLower) ||
        profile.department?.toLowerCase().includes(searchLower) ||
        profile.position?.toLowerCase().includes(searchLower)
      )
    }

    // auth.users 테이블에서 이메일 정보 가져오기
    const usersWithEmail = await Promise.all(
      filteredProfiles.map(async (profile) => {
        if (!profile.user_id) {
          return {
            ...profile,
            email: ''
          }
        }

        const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id)
        return {
          ...profile,
          email: authUser?.user?.email || ''
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: usersWithEmail,
      count: usersWithEmail.length
    })

  } catch (error: any) {
    logger.error('Unexpected error in GET /api/users:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/users - 새 사용자 생성
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

    if (!hasPermission(userRole, 'users', 'create', customPermissions)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      employeeId,
      department,
      position,
      shift,
      roleId,
      phone,
      isActive = true
    } = body

    // 필수 필드 검증
    if (!name || !email || !password || !employeeId || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, password, employeeId, roleId' },
        { status: 400 }
      )
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // 사번 중복 확인
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('employee_id', employeeId)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Employee ID already exists' },
        { status: 409 }
      )
    }

    // Supabase Auth를 통해 사용자 생성 (Admin API 사용)
    const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 확인 없이 바로 활성화
      user_metadata: {
        name,
        employee_id: employeeId
      }
    })

    if (authCreateError || !authData.user) {
      logger.error('Error creating auth user:', authCreateError)
      return NextResponse.json(
        { error: 'Failed to create user account', details: authCreateError?.message },
        { status: 500 }
      )
    }

    // user_profiles 테이블에 프로필 생성
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        name,
        employee_id: employeeId,
        department: department || '',
        position: position || '',
        shift: shift || 'A',
        role_id: roleId,
        phone: phone || null,
        is_active: isActive
      })
      .select('*, user_roles(*)')
      .single()

    if (profileError) {
      logger.error('Error creating user profile:', profileError)

      // 프로필 생성 실패 시 Auth 사용자 삭제 (롤백)
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: 'Failed to create user profile', details: profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        email
      },
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Unexpected error in POST /api/users:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
