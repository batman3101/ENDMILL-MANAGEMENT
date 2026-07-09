import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/client'

export type Role = 'system_admin' | 'admin' | 'user'

export interface CurrentUser {
  userId: string | null
  profileId: string | null
  role: Role | null
}

/**
 * API 라우트에서 호출자의 역할·프로필 ID를 조회한다 (쿠키 세션 기반).
 * 인증 세션이 없으면 role/userId 모두 null.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { userId: null, profileId: null, role: null }

  const admin = createServerClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, user_roles(type)')
    .eq('user_id', user.id)
    .maybeSingle()

  const roleType = ((profile?.user_roles as unknown) as { type?: string } | null)?.type ?? null
  return {
    userId: user.id,
    profileId: profile?.id ?? null,
    role: (roleType as Role | null) ?? 'user'
  }
}

/** admin 이상(관리자/시스템 관리자) 여부 */
export function isAdminRole(role: Role | null): boolean {
  return role === 'admin' || role === 'system_admin'
}

export type FactoryAuthResult =
  | { ok: true; me: CurrentUser }
  | { ok: false; status: number; error: string }

/**
 * API 라우트 공통 인가: 로그인 필수 + 해당 공장 접근 권한 확인.
 * system_admin은 전 공장 허용, 그 외는 user_factory_access로 스코핑(fail-closed).
 * 서비스 롤 클라이언트로 DB를 직접 접근하는 라우트는 RLS 우회이므로 이 가드가 필수다.
 */
export async function authorizeFactory(factoryId: string): Promise<FactoryAuthResult> {
  const me = await getCurrentUser()
  if (!me.role || !me.userId) {
    return { ok: false, status: 401, error: '로그인이 필요합니다.' }
  }
  if (me.role !== 'system_admin') {
    // user_factory_access는 생성된 database.ts 타입에 누락돼 있어 테이블명을 캐스트로 우회
    const admin = createServerClient()
    const { data } = await admin
      .from('user_factory_access' as never)
      .select('factory_id')
      .eq('user_id', me.userId)
      .eq('factory_id', factoryId)
      .maybeSingle() as { data: { factory_id: string } | null }
    if (!data) {
      return { ok: false, status: 403, error: '해당 공장에 대한 접근 권한이 없습니다.' }
    }
  }
  return { ok: true, me }
}
