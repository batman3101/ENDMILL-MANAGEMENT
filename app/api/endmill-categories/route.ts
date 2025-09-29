import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    const { data: categories, error } = await supabase
      .from('endmill_categories')
      .select('*')
      .order('name_ko', { ascending: true })

    if (error) {
      console.error('앤드밀 카테고리 조회 오류:', error)
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
    console.error('앤드밀 카테고리 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}