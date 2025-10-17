import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 현재 사용자 세션 확인
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      logger.error('세션 조회 오류:', error)
      return NextResponse.json(
        {
          success: false,
          error: '세션 조회 중 오류가 발생했습니다.',
        },
        { status: 500 }
      )
    }

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: '인증되지 않은 사용자입니다.',
        },
        { status: 401 }
      )
    }

    // 사용자 정보 반환
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at,
        last_sign_in_at: session.user.last_sign_in_at,
        user_metadata: session.user.user_metadata,
      },
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at,
      },
    })

  } catch (error) {
    logger.error('사용자 정보 조회 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
} 