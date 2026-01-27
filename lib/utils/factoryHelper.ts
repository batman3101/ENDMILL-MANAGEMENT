import { NextRequest } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * API 요청에서 factory_id 추출
 * 우선순위: query param > header > user default
 */
export async function getFactoryIdFromRequest(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<string | null> {
  // 1. Query parameter에서 추출
  const url = new URL(request.url)
  const factoryIdFromQuery = url.searchParams.get('factory_id')
  if (factoryIdFromQuery) {
    return factoryIdFromQuery
  }

  // 2. Header에서 추출
  const factoryIdFromHeader = request.headers.get('X-Factory-ID')
  if (factoryIdFromHeader) {
    return factoryIdFromHeader
  }

  // 3. 사용자 기본 공장 조회 (RPC)
  try {
    const { data: defaultFactoryId } = await supabase.rpc('get_user_default_factory')
    return defaultFactoryId || null
  } catch (error) {
    console.error('기본 공장 조회 실패:', error)
    return null
  }
}

/**
 * 사용자가 특정 공장에 접근할 수 있는지 확인
 */
export async function verifyFactoryAccess(
  supabase: SupabaseClient,
  factoryId: string
): Promise<boolean> {
  try {
    const { data: hasAccess } = await supabase.rpc('user_has_factory_access', {
      p_factory_id: factoryId
    })
    return hasAccess === true
  } catch (error) {
    console.error('공장 접근 권한 확인 실패:', error)
    return false
  }
}

/**
 * API 요청에 대한 공장 권한 검증 및 factory_id 반환
 * 권한이 없으면 null 반환
 */
export async function validateFactoryRequest(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<{ factoryId: string | null; error?: string }> {
  const factoryId = await getFactoryIdFromRequest(request, supabase)

  if (!factoryId) {
    return { factoryId: null, error: '공장 정보를 확인할 수 없습니다.' }
  }

  const hasAccess = await verifyFactoryAccess(supabase, factoryId)
  if (!hasAccess) {
    return { factoryId: null, error: '이 공장에 대한 접근 권한이 없습니다.' }
  }

  return { factoryId }
}

/**
 * API 응답에 factory_id 관련 헤더 추가
 */
export function addFactoryHeaders(headers: Headers, factoryId: string): void {
  headers.set('X-Factory-ID', factoryId)
}
