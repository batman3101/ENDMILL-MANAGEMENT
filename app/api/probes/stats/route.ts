import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { authorizeFactory } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const factoryId = request.nextUrl.searchParams.get('factoryId')
    if (!factoryId) {
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const intervalDays = Number(request.nextUrl.searchParams.get('intervalDays') ?? 90)
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_probe_stats', {
      p_factory_id: factoryId,
      p_interval_days: intervalDays
    })
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/probes/stats error:', error)
    return NextResponse.json({ success: false, error: '통계 조회 실패' }, { status: 500 })
  }
}
