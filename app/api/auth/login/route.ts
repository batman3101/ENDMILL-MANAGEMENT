import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '../../../../lib/types/database'
import { z } from 'zod'
import { cookies } from 'next/headers'

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
    const cookieStore = cookies()

    // Supabase 클라이언트 생성 (SSR 지원)
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options) {
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
      
      let errorMessage = '로그인에 실패했습니다.'
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 완료되지 않았습니다.'
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 }
      )
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        {
          success: false,
          error: '로그인에 실패했습니다.',
        },
        { status: 401 }
      )
    }

    // 사용자 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles!user_profiles_role_id_fkey(
          id,
          name,
          type,
          permissions
        )
      `)
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('프로필 조회 오류:', profileError)
    }

    const userInfo = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || data.user.user_metadata?.name || '',
      department: profile?.department || data.user.user_metadata?.department || '',
      position: profile?.position || data.user.user_metadata?.position || '',
      shift: profile?.shift || data.user.user_metadata?.shift || '',
      role: profile?.user_roles?.type || data.user.user_metadata?.role || 'user',
      language: 'ko',
    }

    console.log('✅ 로그인 성공:', {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      role: userInfo.role,
    })

    // 응답 생성 및 쿠키 설정
    const response = NextResponse.json({
      success: true,
      message: '로그인 성공',
      user: userInfo,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    })

    return response
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