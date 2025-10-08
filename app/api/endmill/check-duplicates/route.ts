import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { codes } = await request.json()

    if (!codes || !Array.isArray(codes)) {
      return NextResponse.json(
        { error: '유효하지 않은 코드 목록입니다.' },
        { status: 400 }
      )
    }

    // 기존 엔드밀 코드 확인
    const { data: existingEndmills, error } = await supabase
      .from('endmill_types')
      .select('code')
      .in('code', codes)

    if (error) {
      logger.error('엔드밀 중복 검사 오류:', error)
      return NextResponse.json(
        { error: '데이터베이스 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const existingCodes = existingEndmills?.map(item => item.code) || []
    const duplicates = codes.filter((code: string) => existingCodes.includes(code))
    const newCodes = codes.filter((code: string) => !existingCodes.includes(code))

    return NextResponse.json({
      success: true,
      duplicates,
      newCodes,
      totalChecked: codes.length,
      duplicateCount: duplicates.length,
      newCount: newCodes.length
    })

  } catch (error) {
    logger.error('엔드밀 중복 검사 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}