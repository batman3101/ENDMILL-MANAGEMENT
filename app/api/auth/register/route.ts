import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '../../../../lib/types/database'
import { z } from 'zod'
import { logger } from '../../../../lib/utils/logger'

// 회원가입 요청 스키마
const registerSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  name: z.string().min(1, '이름을 입력해주세요.'),
  department: z.string().optional(),
  position: z.string().optional(),
  shift: z.string().optional(),
  role: z.enum(['system_admin', 'admin', 'manager', 'operator']).default('operator'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 입력 데이터 유효성 검증
    const validationResult = registerSchema.safeParse(body)
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

    const { email, password, name, department, position, shift, role } = validationResult.data

    // Supabase 클라이언트 생성 (서버 사이드)
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )

    // 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        department,
        position,
        shift,
        role,
      },
      email_confirm: true, // 이메일 확인 없이 바로 활성화
    })

    if (authError) {
      logger.error('사용자 생성 오류:', authError)

      let errorMessage = '회원가입 중 오류가 발생했습니다.'
      if (authError.message.includes('already registered')) {
        errorMessage = '이미 등록된 이메일입니다.'
      } else if (authError.message.includes('Password should be')) {
        errorMessage = '비밀번호가 보안 요구사항을 충족하지 않습니다.'
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: '사용자 생성에 실패했습니다.',
        },
        { status: 500 }
      )
    }

    // 역할 타입 매핑 (데이터베이스 스키마의 타입에 맞게)
    const roleTypeMap: Record<string, Database['public']['Enums']['user_role_type']> = {
      'system_admin': 'system_admin',
      'admin': 'admin',
      'manager': 'user', // manager는 user 타입으로 매핑
      'operator': 'user', // operator는 user 타입으로 매핑
    }

    const mappedRole = roleTypeMap[role] || 'user'

    // 기본 역할 조회 (user 타입)
    const { data: defaultRole, error: roleQueryError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('type', mappedRole)
      .eq('is_active', true)
      .single()

    if (roleQueryError) {
      logger.error('역할 조회 오류:', roleQueryError)
      // 사용자 삭제
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        {
          success: false,
          error: '사용자 역할을 찾을 수 없습니다.',
        },
        { status: 500 }
      )
    }

    // user_profiles 테이블에 프로필 정보 저장
    const validShift = (shift === 'A' || shift === 'B' || shift === 'C') ? shift : 'A'

    const { error: profileError } = await (supabase as any)
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        employee_id: `EMP${Date.now()}`,
        name,
        department: department || '',
        position: position || '',
        shift: validShift,
        role_id: (defaultRole as any).id,
        is_active: true,
      })

    if (profileError) {
      logger.error('프로필 생성 오류:', profileError)
      // 사용자는 생성되었지만 프로필 생성 실패 - 사용자 삭제
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        {
          success: false,
          error: '사용자 프로필 생성에 실패했습니다.',
        },
        { status: 500 }
      )
    }

    logger.log('✅ 사용자 생성 성공:', {
      id: authData.user.id,
      email: authData.user.email,
      name,
      role,
    })

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        department,
        position,
        shift,
        role,
      },
    })
  } catch (error) {
    logger.error('회원가입 API 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}