import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '../../../../lib/types/database'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: '로그아웃이 완료되었습니다.',
    })

    // Supabase 클라이언트 생성
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // 로그아웃 실행
    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('로그아웃 오류:', error)
      return NextResponse.json(
        {
          success: false,
          error: '로그아웃 중 오류가 발생했습니다.',
        },
        { status: 500 }
      )
    }

    // 로그아웃 성공
    return response

  } catch (error) {
    logger.error('로그아웃 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
} 
