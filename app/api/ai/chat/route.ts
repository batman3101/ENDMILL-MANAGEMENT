/**
 * AI Chat API Endpoint
 * 대화형 AI 채팅 (히스토리 기반)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getGeminiService } from '@/lib/services/geminiService'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

// 요청 바디 스키마
const requestSchema = z.object({
  sessionId: z.string().uuid('올바른 세션 ID가 아닙니다.'),
  message: z
    .string()
    .min(1, '메시지를 입력하세요.')
    .max(1000, '메시지는 최대 1000자까지 입력 가능합니다.'),
})

// Rate limit (query API와 동일)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1분
const MAX_REQUESTS_PER_WINDOW =
  parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '10') || 10

function checkRateLimit(userId: string): {
  allowed: boolean
  remaining: number
} {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || userLimit.resetAt < now) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
    }
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
    }
  }

  userLimit.count++
  rateLimitMap.set(userId, userLimit)

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - userLimit.count,
  }
}

/**
 * POST /api/ai/chat
 * 대화형 채팅 메시지 처리
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. 인증 확인
    const supabase = await createClient()
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
        { error: 'AI 채팅 기능을 사용할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 4. Rate limiting
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: '요청 한도를 초과했습니다.' },
        { status: 429 }
      )
    }

    // 5. 요청 검증
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: '잘못된 요청입니다.',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { sessionId, message } = validation.data

    // 6. 대화 히스토리 로드 (최근 5개)
    const { data: historyData } = await supabase
      .from('ai_chat_history' as any)
      .select('message_type, content')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10) // 최근 10개 (user 5개 + ai 5개)

    const history = (historyData || [])
      .reverse()
      .map((h: any) => ({
        role: h.message_type === 'user' ? ('user' as const) : ('model' as const),
        parts: h.content,
      }))

    // 7. Gemini 채팅
    const geminiService = getGeminiService()
    const aiResponse = await geminiService.chat(message, history)

    const responseTimeMs = Date.now() - startTime

    // 8. 사용자 메시지 저장
    await supabase.from('ai_chat_history' as any).insert({
      user_id: user.id,
      session_id: sessionId,
      message_type: 'user',
      content: message,
      response_time_ms: 0,
    } as any)

    // 9. AI 응답 저장
    await supabase.from('ai_chat_history' as any).insert({
      user_id: user.id,
      session_id: sessionId,
      message_type: 'ai',
      content: aiResponse,
      response_time_ms: responseTimeMs,
    } as any)

    // 10. 응답
    return NextResponse.json({
      message: aiResponse,
      sessionId,
      responseTimeMs,
    })
  } catch (error: any) {
    console.error('AI Chat API Error:', error)

    return NextResponse.json(
      {
        error: '채팅 처리 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/chat?sessionId={uuid}
 * 세션의 채팅 히스토리 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 히스토리 조회
    const { data: history, error } = await supabase
      .from('ai_chat_history' as any)
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      sessionId,
      messages: history || [],
    })
  } catch (error: any) {
    console.error('Get Chat History Error:', error)

    return NextResponse.json(
      {
        error: '채팅 히스토리 조회 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
