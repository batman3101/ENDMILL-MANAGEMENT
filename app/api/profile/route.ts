import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, department, position, shift, language } = body

    // 쿠키 스토어 가져오기
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

    // 현재 사용자 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = session.user

    // 사용자 정보 업데이트 (users 테이블)
    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({
        name,
        department,
        position,
        shift,
        language,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    // 이메일이 변경된 경우 Supabase Auth 업데이트
    if (email !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email
      })

      if (authError) {
        console.error('Error updating email:', authError)
        return NextResponse.json(
          { success: false, error: authError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
