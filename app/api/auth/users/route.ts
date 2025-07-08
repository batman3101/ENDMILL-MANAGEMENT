import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { z } from 'zod'

// 사용자 생성 스키마
const createUserSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  name: z.string().min(1, '이름을 입력해주세요.'),
  employeeId: z.string().min(1, '사번을 입력해주세요.'),
  department: z.string().min(1, '부서를 선택해주세요.'),
  position: z.string().min(1, '직위를 입력해주세요.'),
  shift: z.string().min(1, '교대를 선택해주세요.'),
  phone: z.string().optional(),
})

// 사용자 업데이트 스키마
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  employeeId: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  shift: z.string().min(1).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
})

// 권한 체크 함수 (간단한 구현)
async function checkAdminPermission(request: NextRequest): Promise<boolean> {
  // TODO: 실제 권한 체크 로직 구현
  // 현재는 임시로 true 반환
  return true
}

// GET: 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 권한 체크
    const hasPermission = await checkAdminPermission(request)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    
    // auth.users 테이블에서 사용자 목록 조회
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('사용자 목록 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '사용자 목록 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata,
        email_confirmed_at: user.email_confirmed_at,
      })),
      count: data.users.length,
    })

  } catch (error) {
    console.error('사용자 목록 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 새 사용자 생성
export async function POST(request: NextRequest) {
  try {
    // 권한 체크
    const hasPermission = await checkAdminPermission(request)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // 입력 데이터 유효성 검증
    const validationResult = createUserSchema.safeParse(body)
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

    const { email, password, name, employeeId, department, position, shift, phone } = validationResult.data

    const supabase = createServerClient()

    // 사용자 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증을 자동으로 완료
      user_metadata: {
        name,
        employeeId,
        department,
        position,
        shift,
        phone,
        isActive: true,
        createdBy: 'admin', // TODO: 실제 관리자 ID로 변경
      },
    })

    if (error) {
      console.error('사용자 생성 오류:', error)
      
      let errorMessage = '사용자 생성에 실패했습니다.'
      if (error.message.includes('already registered')) {
        errorMessage = '이미 등록된 이메일 주소입니다.'
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '사용자가 성공적으로 생성되었습니다.',
      data: {
        id: data.user?.id,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata,
      },
    })

  } catch (error) {
    console.error('사용자 생성 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 사용자 정보 업데이트
export async function PUT(request: NextRequest) {
  try {
    // 권한 체크
    const hasPermission = await checkAdminPermission(request)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, ...updateData } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 입력 데이터 유효성 검증
    const validationResult = updateUserSchema.safeParse(updateData)
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

    const supabase = createServerClient()

    // 현재 사용자 정보 조회
    const { data: currentUser, error: fetchError } = await supabase.auth.admin.getUserById(userId)
    if (fetchError || !currentUser.user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 메타데이터 업데이트
    const updatedMetadata = {
      ...currentUser.user.user_metadata,
      ...validationResult.data,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin', // TODO: 실제 관리자 ID로 변경
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
    })

    if (error) {
      console.error('사용자 업데이트 오류:', error)
      return NextResponse.json(
        { success: false, error: '사용자 정보 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '사용자 정보가 성공적으로 업데이트되었습니다.',
      data: {
        id: data.user?.id,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata,
      },
    })

  } catch (error) {
    console.error('사용자 업데이트 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 사용자 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 권한 체크
    const hasPermission = await checkAdminPermission(request)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // 사용자 삭제
    const { data, error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error('사용자 삭제 오류:', error)
      return NextResponse.json(
        { success: false, error: '사용자 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '사용자가 성공적으로 삭제되었습니다.',
    })

  } catch (error) {
    console.error('사용자 삭제 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 