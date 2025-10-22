/**
 * Natural Language Query Service
 * 자연어 질문을 SQL로 변환하고 실행하는 핵심 엔진
 *
 * 흐름:
 * 1. 캐시 확인
 * 2. Gemini로 SQL 생성
 * 3. SQL 검증
 * 4. Supabase 실행
 * 5. 결과를 자연어로 설명
 * 6. 캐싱
 */

import { supabase } from '@/lib/supabase/client'
import { getGeminiService } from './geminiService'
import { getCachedSchemaContext } from '@/lib/utils/schemaContext'
import { validateSQL, getSafetyScore, sanitizeSQL } from '@/lib/utils/sqlValidator'
import { getCachedQuery, cacheQuery } from '@/lib/utils/queryCache'

// 대화 히스토리 아이템 타입
export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

// 응답 타입
export interface NaturalLanguageQueryResponse {
  answer: string // 자연어 설명
  sql: string // 실행된 SQL
  data: any[] // 쿼리 결과
  cached: boolean // 캐시 사용 여부
  safetyScore: number // 안전성 점수 (0-100)
  responseTimeMs: number // 응답 시간
  question: string // 사용자 질문 (히스토리 추적용)
}

// 에러 타입
export class NaturalLanguageQueryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'NaturalLanguageQueryError'
  }
}

/**
 * 자연어 질문을 처리하여 SQL 실행 및 결과 설명
 * @param question 사용자 질문
 * @param userId 사용자 ID (선택)
 * @param chatHistory 이전 대화 히스토리 (선택)
 */
export async function executeNaturalLanguageQuery(
  question: string,
  _userId?: string,
  chatHistory: ChatHistoryItem[] = []
): Promise<NaturalLanguageQueryResponse> {
  const startTime = Date.now()

  try {
    // 입력 검증
    if (!question || question.trim().length < 3) {
      throw new NaturalLanguageQueryError(
        '질문이 너무 짧습니다. 최소 3자 이상 입력하세요.',
        'INVALID_QUESTION'
      )
    }

    if (question.length > 500) {
      throw new NaturalLanguageQueryError(
        '질문이 너무 깁니다. 최대 500자까지 입력 가능합니다.',
        'QUESTION_TOO_LONG'
      )
    }

    // 1단계: 캐시 확인
    const cachedResult = await getCachedQuery(question)
    if (cachedResult) {
      const responseTimeMs = Date.now() - startTime
      return {
        answer: cachedResult.answer,
        sql: cachedResult.sql_query,
        data: cachedResult.result_data,
        cached: true,
        safetyScore: getSafetyScore(cachedResult.sql_query),
        responseTimeMs,
        question,
      }
    }

    // 2단계: Gemini로 SQL 생성
    const geminiService = getGeminiService()
    const schemaContext = getCachedSchemaContext()

    // 대화 히스토리를 Gemini 형식으로 변환
    const geminiHistory = chatHistory.map(item => ({
      role: item.role === 'user' ? 'user' as const : 'assistant' as const,
      content: item.content
    }))

    const sqlGeneration = await geminiService.generateSQLFromNaturalLanguage(
      question,
      schemaContext,
      geminiHistory
    )

    const rawSQL = sqlGeneration.sql

    // 디버깅: 생성된 SQL 로그
    console.log('[AI Query] Generated SQL:', rawSQL)
    console.log('[AI Query] SQL length:', rawSQL.length)
    console.log('[AI Query] First 100 chars:', rawSQL.substring(0, 100))

    // 3단계: SQL 정리 및 검증
    const sql = sanitizeSQL(rawSQL) // 세미콜론 제거, 공백 정리 등
    console.log('[AI Query] Sanitized SQL:', sql)

    try {
      validateSQL(sql)
    } catch (error: any) {
      console.error('[AI Query] SQL Validation Error:', error.message)
      console.error('[AI Query] Failed SQL:', sql)
      throw new NaturalLanguageQueryError(
        `생성된 SQL이 안전하지 않습니다: ${error.message}`,
        'UNSAFE_SQL',
        { sql, validationError: error.message }
      )
    }

    // 안전성 점수 확인
    const safetyScore = getSafetyScore(sql)
    if (safetyScore < 50) {
      throw new NaturalLanguageQueryError(
        `SQL 안전성 점수가 너무 낮습니다: ${safetyScore}/100`,
        'LOW_SAFETY_SCORE',
        { sql, safetyScore }
      )
    }

    // 4단계: Supabase 실행
    // RPC 함수 사용하여 안전하게 실행
    // @ts-expect-error - RPC 함수가 아직 데이터베이스에 생성되지 않음
    const { data, error } = await supabase.rpc('execute_safe_query', {
      query: sql,
    }) as { data: any[] | null; error: any }

    if (error) {
      throw new NaturalLanguageQueryError(
        `쿼리 실행 중 오류가 발생했습니다: ${error.message}`,
        'QUERY_EXECUTION_ERROR',
        { sql, supabaseError: error }
      )
    }

    // 5단계: 결과를 자연어로 설명
    const answer = await geminiService.explainQueryResult(question, data || [])

    // 6단계: 캐싱
    await cacheQuery(question, answer, sql, data || [])

    const responseTimeMs = Date.now() - startTime

    return {
      answer,
      sql,
      data: data || [],
      cached: false,
      safetyScore,
      responseTimeMs,
      question,
    }
  } catch (error: any) {
    // 에러가 이미 NaturalLanguageQueryError인 경우 그대로 던짐
    if (error instanceof NaturalLanguageQueryError) {
      throw error
    }

    // 그 외의 에러는 래핑
    throw new NaturalLanguageQueryError(
      `자연어 쿼리 처리 중 오류가 발생했습니다: ${error.message}`,
      'UNEXPECTED_ERROR',
      { originalError: error }
    )
  }
}

/**
 * 여러 질문을 배치로 처리
 */
export async function executeBatchQueries(
  questions: string[],
  userId?: string
): Promise<NaturalLanguageQueryResponse[]> {
  // 병렬로 실행 (최대 5개씩)
  const batchSize = 5
  const results: NaturalLanguageQueryResponse[] = []

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(q => executeNaturalLanguageQuery(q, userId, []))
    )
    results.push(...batchResults)
  }

  return results
}

/**
 * 질문의 실행 가능성 확인 (실제 실행 없이)
 */
export async function validateQuestion(question: string): Promise<{
  isValid: boolean
  reason?: string
  sql?: string
}> {
  try {
    if (!question || question.trim().length < 3) {
      return {
        isValid: false,
        reason: '질문이 너무 짧습니다.',
      }
    }

    // SQL 생성만 시도
    const geminiService = getGeminiService()
    const schemaContext = getCachedSchemaContext()

    const sqlGeneration = await geminiService.generateSQLFromNaturalLanguage(
      question,
      schemaContext,
      [] // 빈 히스토리
    )

    const rawSQL = sqlGeneration.sql
    const sql = sanitizeSQL(rawSQL) // 세미콜론 제거, 공백 정리 등

    // 검증만 수행
    validateSQL(sql)

    const safetyScore = getSafetyScore(sql)
    if (safetyScore < 50) {
      return {
        isValid: false,
        reason: `안전성 점수가 낮습니다: ${safetyScore}/100`,
        sql,
      }
    }

    return {
      isValid: true,
      sql,
    }
  } catch (error: any) {
    return {
      isValid: false,
      reason: error.message,
    }
  }
}

export default executeNaturalLanguageQuery
