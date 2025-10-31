import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // 공급업체 목록 조회
    let query = supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: suppliers, error } = await query

    if (error) {
      logger.error('공급업체 조회 오류:', error)
      return NextResponse.json(
        { error: '공급업체 목록을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: suppliers || [],
      count: suppliers?.length || 0
    })

  } catch (error) {
    logger.error('공급업체 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // 필수 필드 검증
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: '공급업체명과 코드는 필수입니다.' },
        { status: 400 }
      )
    }

    // 중복 검사 (code)
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('code', body.code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 공급업체 코드입니다.' },
        { status: 409 }
      )
    }

    // 공급업체 추가
    const { data: newSupplier, error } = await supabase
      .from('suppliers')
      .insert({
        code: body.code,
        name: body.name,
        contact_info: body.contact_info || {},
        quality_rating: body.quality_rating || 8,
        is_active: body.is_active !== false
      })
      .select()
      .single()

    if (error) {
      logger.error('공급업체 추가 오류:', error)
      return NextResponse.json(
        { error: '공급업체 추가 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newSupplier,
      message: '공급업체가 추가되었습니다.'
    })

  } catch (error) {
    logger.error('공급업체 추가 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: '공급업체 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 공급업체 수정
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.code !== undefined) updateData.code = body.code
    if (body.contact_info !== undefined) updateData.contact_info = body.contact_info
    if (body.quality_rating !== undefined) updateData.quality_rating = body.quality_rating
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data: updatedSupplier, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('공급업체 수정 오류:', error)
      return NextResponse.json(
        { error: '공급업체 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSupplier,
      message: '공급업체가 수정되었습니다.'
    })

  } catch (error) {
    logger.error('공급업체 수정 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '공급업체 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 소프트 삭제 (is_active = false)
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('공급업체 삭제 오류:', error)
      return NextResponse.json(
        { error: '공급업체 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '공급업체가 삭제되었습니다.'
    })

  } catch (error) {
    logger.error('공급업체 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}