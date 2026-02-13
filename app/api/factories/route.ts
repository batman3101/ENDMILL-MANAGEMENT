import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// GET: 사용자가 접근 가능한 공장 목록 조회
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerClient()

    // RPC 함수로 사용자의 접근 가능한 공장 목록 조회
    const { data: factories, error } = await supabase
      .rpc('get_user_accessible_factories')

    if (error) {
      console.error('공장 목록 조회 오류:', error)
      return NextResponse.json(
        { error: '공장 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: factories || []
    })

  } catch (error) {
    console.error('공장 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
