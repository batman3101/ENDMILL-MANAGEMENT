import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// 로그인 요청 스키마
const loginSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 입력 데이터 유효성 검증
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '입력 데이터가 올바르지 않습니다.',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

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

    // 로그인 시도
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('로그인 오류:', error)
      
      // 에러 메시지 처리
      let errorMessage = '로그인에 실패했습니다.'
      switch (error.message) {
        case 'Invalid login credentials':
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
          break
        case 'Email not confirmed':
          errorMessage = '이메일 인증이 완료되지 않았습니다.'
          break
        case 'Too many requests':
          errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
          break
        default:
          errorMessage = error.message
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 }
      )
    }

    // 로그인 성공
    return NextResponse.json({
      success: true,
      message: '로그인에 성공했습니다.',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        last_sign_in_at: data.user?.last_sign_in_at,
      },
    })

  } catch (error) {
    console.error('로그인 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
} 