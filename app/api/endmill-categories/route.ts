import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

// GET: 모든 카테고리 조회
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerClient()

    const { data: categories, error } = await supabase
      .from('endmill_categories')
      .select('*')
      .order('name_ko', { ascending: true })

    if (error) {
      logger.error('앤드밀 카테고리 조회 오류:', error)
      return NextResponse.json(
        { error: '앤드밀 카테고리 정보를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
      count: categories?.length || 0
    })

  } catch (error) {
    logger.error('앤드밀 카테고리 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 새 카테고리 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { code, name_ko, name_vi, description } = body

    // 필수 필드 확인
    if (!code || !name_ko) {
      return NextResponse.json(
        { error: 'code와 name_ko는 필수 항목입니다.' },
        { status: 400 }
      )
    }

    // 중복 코드 확인
    const { data: existing } = await supabase
      .from('endmill_categories')
      .select('code')
      .eq('code', code)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 카테고리 코드입니다.' },
        { status: 409 }
      )
    }

    // 카테고리 추가
    const { data: newCategory, error } = await supabase
      .from('endmill_categories')
      .insert({
        code,
        name_ko,
        name_vi: name_vi || name_ko,
        description: description || `${name_ko} 엔드밀`
      })
      .select()
      .single()

    if (error) {
      logger.error('카테고리 추가 오류:', error)
      return NextResponse.json(
        { error: '카테고리 추가 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newCategory,
      message: '카테고리가 성공적으로 추가되었습니다.'
    })

  } catch (error) {
    logger.error('카테고리 추가 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 카테고리 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { id, code, name_ko, name_vi, description } = body

    // 필수 필드 확인
    if (!id) {
      return NextResponse.json(
        { error: 'id는 필수 항목입니다.' },
        { status: 400 }
      )
    }

    // 업데이트할 데이터 준비
    const updateData: any = {}
    if (code) updateData.code = code
    if (name_ko) updateData.name_ko = name_ko
    if (name_vi) updateData.name_vi = name_vi
    if (description !== undefined) updateData.description = description

    // 카테고리 업데이트
    const { data: updatedCategory, error } = await supabase
      .from('endmill_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('카테고리 업데이트 오류:', error)
      return NextResponse.json(
        { error: '카테고리 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: '카테고리가 성공적으로 업데이트되었습니다.'
    })

  } catch (error) {
    logger.error('카테고리 업데이트 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 카테고리 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 해당 카테고리를 사용하는 엔드밀 타입이 있는지 확인
    const { data: endmillTypes } = await supabase
      .from('endmill_types')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (endmillTypes && endmillTypes.length > 0) {
      return NextResponse.json(
        { error: '이 카테고리를 사용하는 엔드밀이 존재하여 삭제할 수 없습니다.' },
        { status: 409 }
      )
    }

    // 카테고리 삭제
    const { error } = await supabase
      .from('endmill_categories')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('카테고리 삭제 오류:', error)
      return NextResponse.json(
        { error: '카테고리 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '카테고리가 성공적으로 삭제되었습니다.'
    })

  } catch (error) {
    logger.error('카테고리 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}