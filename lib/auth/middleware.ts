import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { hasPermission, parsePermissionsFromDB, Permission } from './permissions'
import { Database } from '@/lib/types/database'

type UserRole = Database['public']['Enums']['user_role_type']

export interface AuthContext {
  user: {
    id: string
    email?: string
  }
  profile: {
    id: string
    name: string
    employee_id: string
    department: string
    position: string
    role_id: string
    user_id: string
    is_active: boolean
  }
  role: {
    id: string
    name: string
    type: UserRole
    permissions: any
  }
}

/**
 * API 라우트에서 인증 확인 및 사용자 정보 가져오기
 */
export async function withAuth(
  _request: NextRequest
): Promise<{ success: true; context: AuthContext } | { success: false; response: NextResponse }> {
  try {
    const supabase = createServerClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || !profile.user_roles) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }
    }

    // 비활성 사용자 차단
    if (!profile.is_active) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Account is inactive' },
          { status: 403 }
        )
      }
    }

    return {
      success: true,
      context: {
        user: {
          id: user.id,
          email: user.email
        },
        profile: {
          id: profile.id,
          name: profile.name,
          employee_id: profile.employee_id,
          department: profile.department,
          position: profile.position,
          role_id: profile.role_id || '',
          user_id: profile.user_id || '',
          is_active: profile.is_active
        },
        role: {
          id: profile.user_roles.id,
          name: profile.user_roles.name,
          type: profile.user_roles.type,
          permissions: profile.user_roles.permissions
        }
      }
    }
  } catch (error: any) {
    console.error('Error in withAuth middleware:', error)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      )
    }
  }
}

/**
 * 권한 확인 미들웨어
 */
export async function withPermission(
  request: NextRequest,
  resource: string,
  action: Permission['action']
): Promise<{ success: true; context: AuthContext } | { success: false; response: NextResponse }> {
  // 먼저 인증 확인
  const authResult = await withAuth(request)
  if (!authResult.success) {
    return authResult
  }

  const { context } = authResult

  // 데이터베이스 권한 파싱
  const customPermissions = parsePermissionsFromDB(context.role.permissions)

  // 권한 확인
  const hasAccess = hasPermission(
    context.role.type,
    resource,
    action,
    customPermissions
  )

  if (!hasAccess) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }
  }

  return {
    success: true,
    context
  }
}

/**
 * 관리자 권한 확인 미들웨어
 */
export async function withAdminPermission(
  request: NextRequest
): Promise<{ success: true; context: AuthContext } | { success: false; response: NextResponse }> {
  // 먼저 인증 확인
  const authResult = await withAuth(request)
  if (!authResult.success) {
    return authResult
  }

  const { context } = authResult

  // 관리자 권한 확인
  const isAdmin = context.role.type === 'system_admin' || context.role.type === 'admin'

  if (!isAdmin) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }
  }

  return {
    success: true,
    context
  }
}

/**
 * 시스템 관리자 권한 확인 미들웨어
 */
export async function withSystemAdminPermission(
  request: NextRequest
): Promise<{ success: true; context: AuthContext } | { success: false; response: NextResponse }> {
  // 먼저 인증 확인
  const authResult = await withAuth(request)
  if (!authResult.success) {
    return authResult
  }

  const { context } = authResult

  // 시스템 관리자 권한 확인
  if (context.role.type !== 'system_admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: System admin access required' },
        { status: 403 }
      )
    }
  }

  return {
    success: true,
    context
  }
}

/**
 * 에러 응답 생성 헬퍼
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details })
    },
    { status }
  )
}

/**
 * 성공 응답 생성 헬퍼
 */
export function createSuccessResponse(
  data: any,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data
    },
    { status }
  )
}
