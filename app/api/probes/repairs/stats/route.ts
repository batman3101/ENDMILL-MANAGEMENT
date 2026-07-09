import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/client'
import { authorizeFactory } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

// GET /api/probes/repairs/stats?factoryId=&months=12
// 수리 현황 페이지의 통계 리포트 섹션 전용: 월별 건수 / 고장유형 분포 / 모델별·장비별 빈도
export async function GET(request: NextRequest) {
  try {
    const factoryId = request.nextUrl.searchParams.get('factoryId')
    if (!factoryId) {
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const months = Number(request.nextUrl.searchParams.get('months') ?? 12)
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_probe_repair_stats', {
      p_factory_id: factoryId,
      p_months: months
    })
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/probes/repairs/stats error:', error)
    return NextResponse.json({ success: false, error: '수리 통계 조회 실패' }, { status: 500 })
  }
}
