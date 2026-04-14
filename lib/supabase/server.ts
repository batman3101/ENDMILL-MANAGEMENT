import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '../types/database'

/**
 * Server-side Supabase client for App Router
 * 서버 컴포넌트 및 API 라우트용 Supabase 클라이언트
 */
export function createClient() {
  const cookieStore = cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (_error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (_error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Server-side admin client with service role key.
 *
 * 반드시 @supabase/supabase-js 의 basic `createClient` + service role key 조합으로
 * 구성해야 한다. @supabase/ssr 의 `createServerClient` 는 쿠키에서 로그인 사용자의
 * JWT 를 읽어 Authorization 헤더를 덮어쓰므로, service role key 를 넘겨도
 * PostgREST 가 `auth.uid()` 를 해당 사용자로 평가해 RLS 를 우회하지 못한다.
 * 쿠키 바인딩 없는 basic client 만이 실제로 service role 로 동작한다.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. ' +
      '관리자 클라이언트는 service role key 없이 동작할 수 없습니다.'
    )
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            cache: 'no-store',
          })
        },
      },
    }
  )
}
