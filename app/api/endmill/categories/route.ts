import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

// Vercel 동적 렌더링 강제 설정
export const dynamic = 'force-dynamic'

// Supabase 클라이언트 생성 (Service Role)
const supabase = createServerClient()

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('endmill_categories')
      .select('id, code, name_ko, name_vi, description')
      .order('code')

    if (error) {
      logger.error('Error fetching endmill categories:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch endmill categories'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    logger.error('Error in endmill categories API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}