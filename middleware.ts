import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js App Router 표준 미들웨어
 * - /dashboard/* 와 /api/*(auth 제외) 경로에서 Supabase 세션 검증
 * - 미인증 시 /login?redirect=<원경로> 로 redirect
 * - 세션 토큰 자동 갱신 (쿠키 업데이트)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 응답 객체 생성 (쿠키 갱신을 위해 NextResponse.next() 사용)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabase SSR 클라이언트 생성 (미들웨어용)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 검증 (토큰 자동 갱신 포함)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isApiRoute = pathname.startsWith('/api/')
  const isDashboardRoute = pathname.startsWith('/dashboard')

  // 미인증 사용자 처리
  if (!session) {
    if (isDashboardRoute) {
      // 대시보드 접근 차단 → /login?redirect=<원경로>
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (isApiRoute) {
      // API 접근 차단 → 401 JSON 응답
      return NextResponse.json(
        { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
  }

  // 이미 로그인된 사용자가 인증 페이지 접근 시 /dashboard 로 redirect
  if (session) {
    const authPaths = ['/login', '/forgot-password', '/reset-password']
    if (authPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 다음 경로에만 미들웨어 적용:
     * - /dashboard/* (대시보드 전체)
     * - /api/* (단, /api/auth/* 제외 — 로그인/로그아웃 API는 인증 없이 접근 가능해야 함)
     * - /login, /forgot-password, /reset-password (이미 로그인 시 redirect)
     *
     * 제외:
     * - /_next/* (Next.js 정적 자산)
     * - /icons/*, /images/*, *.png, *.webp 등 정적 파일
     * - /api/auth/* (인증 API 자체)
     */
    '/dashboard/:path*',
    '/api/((?!auth/).*)',
    '/login',
    '/forgot-password',
    '/reset-password',
  ],
}
