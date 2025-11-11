import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// POST /api/users/cleanup - soft delete된 Auth 사용자 영구 삭제
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 이메일로 Auth 사용자 조회 (soft deleted 포함)
    logger.log('🔍 이메일로 Auth 사용자 조회:', email)

    // Admin API를 사용해서 soft deleted된 사용자도 조회
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      logger.error('사용자 목록 조회 실패:', listError)
      return NextResponse.json(
        { error: 'Failed to list users', details: listError.message },
        { status: 500 }
      )
    }

    // 이메일로 사용자 찾기 (deleted 포함)
    const user = users.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json(
        { error: '해당 이메일의 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    logger.log('✅ 사용자 발견:', { id: user.id, email: user.email, deleted_at: user.deleted_at })

    // soft delete된 사용자만 영구 삭제 가능
    if (!user.deleted_at) {
      return NextResponse.json(
        { error: '삭제되지 않은 사용자입니다. 먼저 일반 삭제를 수행해주세요.' },
        { status: 400 }
      )
    }

    // 영구 삭제
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id,
      false // shouldSoftDelete = false
    )

    if (deleteError) {
      logger.error('영구 삭제 실패:', deleteError)
      return NextResponse.json(
        { error: 'Failed to permanently delete user', details: deleteError.message },
        { status: 500 }
      )
    }

    logger.log('✅ 사용자 영구 삭제 완료:', email)

    return NextResponse.json({
      success: true,
      message: `${email} 사용자가 영구 삭제되었습니다. 이제 같은 이메일로 재가입할 수 있습니다.`
    })

  } catch (error: any) {
    logger.error('Unexpected error in POST /api/users/cleanup:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
