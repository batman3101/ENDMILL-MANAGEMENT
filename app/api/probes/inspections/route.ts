import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { authorizeFactory } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

// GET /api/probes/inspections?factoryId=&page=1&pageSize=50&result=OK|NG
// 공장 전체 검사 이력 조회 (관리 이력 Excel 내보내기용). 프로브 시리얼/모델 조인.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const factoryId = sp.get('factoryId')
    if (!factoryId) {
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const page = Math.max(1, Number(sp.get('page') ?? 1))
    const pageSize = Math.min(1000, Math.max(1, Number(sp.get('pageSize') ?? 50)))
    const result = sp.get('result') // 'OK' | 'NG'

    const supabase = createServerClient()
    let query = supabase
      .from('probe_inspections')
      .select('*, probe:probes!probe_inspections_probe_id_fkey(asset_number, model), inspected_by_profile:user_profiles!probe_inspections_inspected_by_fkey(name)', { count: 'exact' })
      .eq('factory_id', factoryId)

    if (result === 'OK' || result === 'NG') query = query.eq('judged_result', result)

    const from = (page - 1) * pageSize
    const { data, count, error } = await query
      .order('inspected_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: { page, pageSize, total: count ?? 0 }
    })
  } catch (error) {
    console.error('GET /api/probes/inspections error:', error)
    return NextResponse.json({ success: false, error: '검사 이력 조회 실패' }, { status: 500 })
  }
}
