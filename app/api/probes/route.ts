import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../lib/supabase/client'
import { PROBE_RESULTS, PROBE_STATUSES, PROBE_MODELS, ASSET_NUMBER_MAX_LENGTH } from '../../../lib/types/probe'
import { authorizeFactory } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

const SORTABLE = ['asset_number', 'current_result', 'status', 'last_inspected_at', 'model', 'created_at'] as const

// GET /api/probes?factoryId=&page=1&pageSize=50&result=&status=&model=&equipmentId=&search=&asset=&sortBy=&sortDir=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const factoryId = sp.get('factoryId')
    if (!factoryId) { // fail-closed
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    // 인증 + 공장 접근 권한 (서비스 롤 접근이므로 라우트 가드 필수)
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const page = Math.max(1, Number(sp.get('page') ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 50)))
    const result = sp.get('result')
    const status = sp.get('status')
    const model = sp.get('model')
    const equipmentId = sp.get('equipmentId')
    // 자산번호는 자유형식이라 대소문자 변환 없이 원문 그대로 매칭한다 (Arbor의 toUpperCase 미복제)
    const search = sp.get('search')
    const asset = sp.get('asset') // 정확 일치 (검사 모드 스캔용)
    const assetNum = sp.get('assetNum') // 접두사 없이 번호만으로 검색 (검사 모드 숫자 스캔, zero-pad 무관)
    const sortBy = (SORTABLE as readonly string[]).includes(sp.get('sortBy') ?? '')
      ? (sp.get('sortBy') as string) : 'asset_number'
    const sortDir = sp.get('sortDir') === 'desc' ? false : true

    const supabase = createServerClient()

    // 번호 스캔: asset_number 끝자리 숫자가 일치하는 프로브를 공장 스코핑 RPC로 조회
    if (assetNum && /^\d+$/.test(assetNum)) {
      const { data: byNum, error: numError } = await supabase.rpc('find_probes_by_number', {
        p_factory_id: factoryId,
        p_number: Number(assetNum)
      })
      if (numError) throw numError
      const rows = byNum ?? []
      return NextResponse.json({
        success: true,
        data: rows,
        pagination: { page: 1, pageSize: rows.length, total: rows.length }
      })
    }

    let query = supabase
      .from('probes')
      .select('*', { count: 'exact' })
      .eq('factory_id', factoryId)

    if (result && (PROBE_RESULTS as readonly string[]).includes(result)) query = query.eq('current_result', result)
    if (result === 'none') query = query.is('current_result', null) // 미검사 필터
    if (status && (PROBE_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status)
    if (model && (PROBE_MODELS as readonly string[]).includes(model)) query = query.eq('model', model)
    if (equipmentId) query = query.eq('equipment_id', equipmentId)
    if (asset) query = query.eq('asset_number', asset)
    else if (search) query = query.ilike('asset_number', `${search}%`)

    const from = (page - 1) * pageSize
    const { data, count, error } = await query
      .order(sortBy, { ascending: sortDir })
      .range(from, from + pageSize - 1)

    if (error) throw error
    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: { page, pageSize, total: count ?? 0 }
    })
  } catch (error) {
    console.error('GET /api/probes error:', error)
    return NextResponse.json({ success: false, error: '프로브 목록 조회 실패' }, { status: 500 })
  }
}

const createSchema = z.object({
  factoryId: z.string().uuid(),
  asset_number: z.string().trim().min(1).max(ASSET_NUMBER_MAX_LENGTH),
  model: z.enum(PROBE_MODELS).optional(),
  equipment_id: z.string().uuid().optional(),
  renishaw_serial: z.string().max(50).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional()
})

// POST /api/probes — 단건 등록
export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json())
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('probes')
      .insert({
        factory_id: body.factoryId,
        asset_number: body.asset_number,
        model: body.model ?? null,
        equipment_id: body.equipment_id ?? null,
        // 장착 장비 유무로 초기 상태 자동 결정 (장비 있음=in_use, 없음=spare)
        status: body.equipment_id ? 'in_use' : 'spare',
        renishaw_serial: body.renishaw_serial ?? null,
        purchase_date: body.purchase_date ?? null,
        notes: body.notes ?? null
      })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: '해당 공장에 이미 같은 자산번호가 존재합니다.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    }
    console.error('POST /api/probes error:', error)
    return NextResponse.json({ success: false, error: '프로브 등록 실패' }, { status: 500 })
  }
}
