/**
 * Query Cache Utility
 * 자연어 쿼리 결과를 캐싱하여 응답 속도 향상 및 API 비용 절감
 */

import { supabase } from '@/lib/supabase/client'
import { createHash } from 'crypto'

// 캐시 TTL (초) - 환경 변수에서 가져오거나 기본값 300초 (5분)
const CACHE_TTL_SECONDS =
  parseInt(process.env.AI_CACHE_TTL_SECONDS || '300') || 300

// 캐시 결과 타입
export interface CachedQuery {
  id: string
  query_hash: string
  question: string
  answer: string
  sql_query: string
  result_data: any
  created_at: string
  expires_at: string
  hit_count: number
}

/**
 * 질문을 해시로 변환
 * 동일한 질문은 동일한 해시를 생성하여 캐시 키로 사용
 */
export function hashQuestion(question: string, factoryId?: string): string {
  // 대소문자 구분 없이, 공백 정규화
  const normalized = question.trim().toLowerCase().replace(/\s+/g, ' ')
  const input = factoryId ? `${normalized}::${factoryId}` : normalized

  // SHA-256 해시 생성
  const hash = createHash('sha256').update(input, 'utf8').digest('hex')

  return hash
}

/**
 * 캐시에서 질문에 대한 결과 조회
 * 만료되지 않은 캐시만 반환
 */
export async function getCachedQuery(
  question: string,
  factoryId?: string
): Promise<CachedQuery | null> {
  try {
    const queryHash = hashQuestion(question, factoryId)

    // Supabase RPC 함수 사용 (hit_count 자동 증가)
    // @ts-expect-error - RPC 함수가 아직 데이터베이스에 생성되지 않음
    const { data, error } = await supabase.rpc('get_cached_query', {
      p_query_hash: queryHash,
    }) as { data: CachedQuery[] | null; error: any }

    if (error) {
      console.error('캐시 조회 오류:', error)
      return null
    }

    // 데이터가 없거나 만료된 경우
    if (!data || data.length === 0) {
      return null
    }

    return data[0]
  } catch (error) {
    console.error('캐시 조회 중 예외 발생:', error)
    return null
  }
}

/**
 * 쿼리 결과를 캐시에 저장
 */
export async function cacheQuery(
  question: string,
  answer: string,
  sqlQuery: string,
  resultData: any,
  factoryId?: string
): Promise<boolean> {
  try {
    const queryHash = hashQuestion(question, factoryId)

    // 만료 시간 계산
    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000)

    // 캐시에 저장
    // @ts-expect-error - AI 캐시 테이블이 아직 데이터베이스에 생성되지 않음
    const { error } = await (supabase.from('ai_query_cache') as any).upsert(
      {
        query_hash: queryHash,
        question: question.trim(),
        answer: answer,
        sql_query: sqlQuery,
        result_data: resultData,
        expires_at: expiresAt.toISOString(),
        hit_count: 0, // 새로 저장하면 hit_count는 0
      },
      {
        onConflict: 'query_hash', // query_hash가 동일하면 업데이트
      }
    )

    if (error) {
      console.error('캐시 저장 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('캐시 저장 중 예외 발생:', error)
    return false
  }
}

/**
 * 만료된 캐시 삭제
 * 주기적으로 호출하거나, Supabase cron job으로 처리 가능
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    // Supabase RPC 함수 사용
    // @ts-expect-error - RPC 함수가 아직 데이터베이스에 생성되지 않음
    const { data, error } = await supabase.rpc('delete_expired_cache') as { data: number | null; error: any }

    if (error) {
      console.error('만료된 캐시 삭제 오류:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('만료된 캐시 삭제 중 예외 발생:', error)
    return 0
  }
}

/**
 * 특정 질문의 캐시 삭제
 */
export async function invalidateCache(question: string): Promise<boolean> {
  try {
    const queryHash = hashQuestion(question)

    // @ts-expect-error - AI 캐시 테이블이 아직 데이터베이스에 생성되지 않음
    const { error } = await (supabase.from('ai_query_cache') as any)
      .delete()
      .eq('query_hash', queryHash)

    if (error) {
      console.error('캐시 무효화 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('캐시 무효화 중 예외 발생:', error)
    return false
  }
}

/**
 * 모든 캐시 삭제
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    // @ts-expect-error - AI 캐시 테이블이 아직 데이터베이스에 생성되지 않음
    const { error } = await (supabase.from('ai_query_cache') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000') // 모든 레코드 삭제

    if (error) {
      console.error('전체 캐시 삭제 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('전체 캐시 삭제 중 예외 발생:', error)
    return false
  }
}

/**
 * 캐시 통계 조회
 */
export async function getCacheStats(): Promise<{
  totalEntries: number
  totalHits: number
  avgHitCount: number
  expiredEntries: number
}> {
  try {
    // 전체 캐시 통계
    // @ts-expect-error - AI 캐시 테이블이 아직 데이터베이스에 생성되지 않음
    const { data: allData, error: allError } = await (supabase.from('ai_query_cache') as any)
      .select('hit_count, expires_at')

    if (allError || !allData) {
      throw allError
    }

    const now = new Date()
    const expiredEntries = allData.filter(
      (entry: any) => new Date(entry.expires_at) < now
    ).length

    const totalHits = allData.reduce(
      (sum: number, entry: any) => sum + (entry.hit_count || 0),
      0
    )

    const avgHitCount =
      allData.length > 0 ? totalHits / allData.length : 0

    return {
      totalEntries: allData.length,
      totalHits,
      avgHitCount: Math.round(avgHitCount * 10) / 10,
      expiredEntries,
    }
  } catch (error) {
    console.error('캐시 통계 조회 오류:', error)
    return {
      totalEntries: 0,
      totalHits: 0,
      avgHitCount: 0,
      expiredEntries: 0,
    }
  }
}

const queryCacheUtils = {
  hashQuestion,
  getCachedQuery,
  cacheQuery,
  clearExpiredCache,
  invalidateCache,
  clearAllCache,
  getCacheStats,
}

export default queryCacheUtils
