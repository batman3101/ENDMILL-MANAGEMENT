import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 권한 레벨 정의
const ROLE_LEVELS = {
  user: 1,
  admin: 2,
  system_admin: 3,
} as const

type UserRole = keyof typeof ROLE_LEVELS

// 경로별 필요 권한 정의
const ROUTE_PERMISSIONS: Record<string, { minRole: UserRole; exact?: boolean }> = {
  '/dashboard': { minRole: 'user' },
  '/equipment': { minRole: 'user' },
  '/endmills': { minRole: 'user' },
  '/inventory': { minRole: 'user' },
  '/cam-sheets': { minRole: 'user' },
  '/tool-changes': { minRole: 'user' },
  '/reports': { minRole: 'user' },
  '/settings': { minRole: 'admin' },
  '/users': { minRole: 'admin' },
  '/settings/system': { minRole: 'system_admin', exact: true },
}

function hasPermission(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_LEVELS[userRole as UserRole] || 0
  const requiredLevel = ROLE_LEVELS[requiredRole]
  return userLevel >= requiredLevel
}

function getRequiredRole(pathname: string): UserRole | null {
  // 정확한 경로 매칭 우선
  for (const [route, config] of Object.entries(ROUTE_PERMISSIONS)) {
    if (config.exact && pathname === route) {
      return config.minRole
    }
  }
  
  // 접두사 매칭
  for (const [route, config] of Object.entries(ROUTE_PERMISSIONS)) {
    if (!config.exact && pathname.startsWith(route)) {
      return config.minRole
    }
  }
  
  return null
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // API 라우트는 별도 처리하지 않음
  if (pathname.startsWith('/api/')) {
    return response
  }

  // 세션 확인
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('미들웨어 세션 확인 오류:', error)
  }

  // 필요한 권한 확인
  const requiredRole = getRequiredRole(pathname)

  // 보호된 경로인 경우
  if (requiredRole) {
    if (!session) {
      // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // 사용자 역할 확인 (프로필에서 가져오거나 메타데이터에서 가져옴)
    let userRole = session.user?.user_metadata?.role || 'user'
    
    // 데이터베이스에서 사용자 프로필 조회 시도
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select(`
          user_roles!user_profiles_role_id_fkey(
            type
          )
        `)
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single()

      if (profile?.user_roles?.type) {
        userRole = profile.user_roles.type
      }
    } catch (profileError) {
      console.error('프로필 조회 오류:', profileError)
    }

    // 권한 확인
    if (!hasPermission(userRole, requiredRole)) {
      console.log(`권한 부족: ${userRole} -> ${requiredRole} (${pathname})`)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 로그인 페이지에 이미 인증된 사용자가 접근하는 경우
  if (pathname === '/login' && session) {
    const redirect = request.nextUrl.searchParams.get('redirect')
    const redirectTo = redirect && redirect.startsWith('/') ? redirect : '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // 루트 경로 접근 시 적절한 페이지로 리다이렉트
  if (pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|images|icons).*)',
  ],
}