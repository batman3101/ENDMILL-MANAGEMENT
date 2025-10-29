import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 활성 상태인 모든 사용자 프로필 조회 (RLS 적용됨)
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