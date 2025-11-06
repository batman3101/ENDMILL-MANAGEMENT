/**
 * AI Query API Endpoint
 * 자연어 질문을 받아서 SQL 쿼리로 변환하고 실행
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  executeNaturalLanguageQuery,
  NaturalLanguageQueryError,
} from '@/lib/services/naturalLanguageQuery'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

// 대화 히스토리 아이템 스키마
const chatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.number().optional(),
})

// 요청 바디 스키마
const requestSchema = z.object({
  question: z
    .string()
    .min(3, '질문은 최소 3자 이상이어야 합니다.')
    .max(500, '질문은 최대 500자까지 입력 가능합니다.'),
  chatHistory: z.array(chatHistoryItemSchema).optional().default([]),
})

// Rate limit 체크 (간단한 메모리 기반)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1분
const MAX_REQUESTS_PER_WINDOW =
  parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '10') || 10

function checkRateLimit(userId: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  // 새 사용자이거나 윈도우가 초기화된 경우
  if (!userLimit || userLimit.resetAt < now) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }
  }

  // 제한 초과
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: userLimit.resetAt,
    }
  }

  // 카운트 증가
  userLimit.count++
  rateLimitMap.set(userId, userLimit)

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - userLimit.count,
    resetAt: userLimit.resetAt,
  }
}

/**
 * POST /api/ai/query
 * 자연어 질문을 처리하여 결과 반환
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(type, permissions)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRoleData = (currentUserProfile as any).user_roles
    const userRole = userRoleData.type
    const rolePermissions = (userRoleData?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUse = hasPermission(userRole, 'ai_insights', 'use', customPermissions)
    if (!canUse) {
      return NextResponse.json(
        { error: 'AI 인사이트 기능을 사용할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 4. Rate limiting 체크
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      )
    }

    // 5. 요청 바디 검증
    const body = await request.json()

    // console.log('[AI Query API] 받은 요청 바디:', JSON.stringify(body, null, 2))

    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      // console.error('[AI Query API] 검증 실패:', validation.error.errors)
      return NextResponse.json(
        {
          error: '잘못된 요청입니다.',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    // console.log('[AI Query API] 검증 성공:', validation.data)

    const { question, chatHistory } = validation.data

    // 6. 자연어 쿼리 실행 (대화 히스토리 포함)
    const result = await executeNaturalLanguageQuery(question, user.id, chatHistory)

    // 7. 사용 로그 기록 (선택사항, 나중에 추가 가능)
    // await logAIUsage(user.id, question, result)

    // 8. 응답 반환
    return NextResponse.json(
      {
        answer: result.answer,
        sql: result.sql,
        data: result.data,
        cached: result.cached,
        safetyScore: result.safetyScore,
        responseTimeMs: result.responseTimeMs,
        question: result.question,
      },
      {
        headers: {
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  } catch (error: any) {
    console.error('AI Query API Error:', error)

    // NaturalLanguageQueryError 처리
    if (error instanceof NaturalLanguageQueryError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 400 }
      )
    }

    // 일반 에러
    return NextResponse.json(
      {
        error: '요청 처리 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/query
 * API 상태 확인 및 정보
 */
export async function GET() {
  return NextResponse.json({
    service: 'AI Query API',
    version: '1.0.0',
    status: 'operational',
    rateLimit: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: MAX_REQUESTS_PER_WINDOW,
    },
  })
}
