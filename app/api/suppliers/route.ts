import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // 활성화된 공급업체 목록 조회
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name')

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