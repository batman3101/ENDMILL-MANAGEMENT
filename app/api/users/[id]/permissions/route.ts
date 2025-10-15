import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServerClient as createAdminClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// GET /api/users/[id]/permissions - 사용자의 권한 매트릭스 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Supabase 클라이언트 생성
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const userId = params.id

    // 현재 사용자 세션 확인
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const user = session.user

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      logger.error('Error fetching current user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      )
    }

    if (!currentUserProfile) {
      logger.error('Current user profile not found for user_id:', user.id)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!currentUserProfile.user_roles) {
      logger.error('User roles not found for profile:', currentUserProfile.id)
      return NextResponse.json(
        { error: 'User role not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (관리자만 가능)
    const userRole = currentUserProfile.user_roles.type
    logger.info('GET permissions - Current user role:', { userId: user.id, profileId: currentUserProfile.id, role: userRole })

    if (!isAdmin(userRole)) {
      logger.warn('GET permissions - Access denied - not admin:', { userId: user.id, role: userRole })
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // 대상 사용자 프로필 조회
    const { data: targetProfile, error } = await supabase
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
    // Supabase 클라이언트 생성
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const userId = params.id

    // 현재 사용자 세션 확인
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const user = session.user

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      logger.error('Error fetching current user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      )
    }

    if (!currentUserProfile) {
      logger.error('Current user profile not found for user_id:', user.id)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!currentUserProfile.user_roles) {
      logger.error('User roles not found for profile:', currentUserProfile.id)
      return NextResponse.json(
        { error: 'User role not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (관리자만 가능)
    const userRole = currentUserProfile.user_roles.type
    logger.info('PUT permissions - Current user role:', { userId: user.id, profileId: currentUserProfile.id, role: userRole })

    if (!isAdmin(userRole)) {
      logger.warn('PUT permissions - Access denied - not admin:', { userId: user.id, role: userRole })
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
    const { data: targetProfile } = await supabase
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

    // 사용자 개인 권한 업데이트 (Service Role 사용)
    const adminSupabase = createAdminClient()

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
    // Supabase 클라이언트 생성
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const userId = params.id

    // 현재 사용자 세션 확인
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const user = session.user

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      logger.error('Error fetching current user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile', details: profileError.message },
        { status: 500 }
      )
    }

    if (!currentUserProfile) {
      logger.error('Current user profile not found for user_id:', user.id)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!currentUserProfile.user_roles) {
      logger.error('User roles not found for profile:', currentUserProfile.id)
      return NextResponse.json(
        { error: 'User role not found' },
        { status: 404 }
      )
    }

    // 권한 확인 (관리자만 가능)
    const userRole = currentUserProfile.user_roles.type
    logger.info('POST permissions - Current user role:', { userId: user.id, profileId: currentUserProfile.id, role: userRole })

    if (!isAdmin(userRole)) {
      logger.warn('POST permissions - Access denied - not admin:', { userId: user.id, role: userRole })
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

    // 사용자의 역할을 템플릿 역할로 변경 (Service Role 사용)
    const adminSupabase = createAdminClient()

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
