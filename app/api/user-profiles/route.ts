import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export async function GET(_request: NextRequest) {
  try {
    // 활성 상태인 모든 사용자 프로필 조회
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, name, employee_id, department, position, shift')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    logger.error('User profiles API 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user profiles'
      },
      { status: 500 }
    )
  }
}