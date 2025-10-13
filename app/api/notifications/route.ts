import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

// GET: 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const isRead = searchParams.get('is_read')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // 필터 적용
    if (userId) {
      query = query.eq('recipient_id', userId)
    }

    if (isRead !== null && isRead !== undefined) {
      query = query.eq('is_read', isRead === 'true')
    }

    if (type) {
      query = query.eq('type', type as any)
    }

    const { data: notifications, error } = await query

    if (error) {
      logger.error('알림 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '알림을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 읽지 않은 알림 수 계산
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId || '')
      .eq('is_read', false)

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: unreadCount || 0,
      total: notifications?.length || 0
    })
  } catch (error) {
    logger.error('알림 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 새 알림 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { recipient_id, type, title, message, data } = body

    if (!type || !title) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id,
        type,
        title,
        message,
        data,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      logger.error('알림 생성 오류:', error)
      return NextResponse.json(
        { success: false, error: '알림 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      notification
    }, { status: 201 })
  } catch (error) {
    logger.error('알림 생성 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 알림 읽음 처리
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { id, ids, is_read } = body

    if (!id && !ids) {
      return NextResponse.json(
        { success: false, error: '알림 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('notifications')
      .update({ is_read: is_read !== undefined ? is_read : true })

    if (id) {
      query = query.eq('id', id)
    } else if (ids && Array.isArray(ids)) {
      query = query.in('id', ids)
    }

    const { data, error } = await query.select()

    if (error) {
      logger.error('알림 업데이트 오류:', error)
      return NextResponse.json(
        { success: false, error: '알림 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: '알림이 성공적으로 업데이트되었습니다.'
    })
  } catch (error) {
    logger.error('알림 업데이트 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 알림 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '알림 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('알림 삭제 오류:', error)
      return NextResponse.json(
        { success: false, error: '알림 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '알림이 성공적으로 삭제되었습니다.'
    })
  } catch (error) {
    logger.error('알림 삭제 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
