import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const factoryId = request.nextUrl.searchParams.get('factoryId')
    if (!factoryId) {
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const intervalDays = Number(request.nextUrl.searchParams.get('intervalDays') ?? 180)
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_arbor_stats', {
      p_factory_id: factoryId,
      p_interval_days: intervalDays
    })
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/arbors/stats error:', error)
    return NextResponse.json({ success: false, error: '통계 조회 실패' }, { status: 500 })
  }
}
