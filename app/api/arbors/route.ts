import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../lib/supabase/client'
import { ARBOR_GRADES, ARBOR_STATUSES, ARBOR_SERIAL_REGEX } from '../../../lib/types/arbor'

export const dynamic = 'force-dynamic'

const SORTABLE = ['serial_number', 'current_grade', 'status', 'last_inspected_at', 'arbor_model', 'created_at'] as const

// GET /api/arbors?factoryId=&page=1&pageSize=50&grade=&status=&search=&serial=&sortBy=&sortDir=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const factoryId = sp.get('factoryId')
    if (!factoryId) { // fail-closed (PRD §4.4-4)
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const page = Math.max(1, Number(sp.get('page') ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 50)))
    const grade = sp.get('grade')
    const status = sp.get('status')
    const search = sp.get('search')?.toUpperCase()
    const serial = sp.get('serial')?.toUpperCase() // 정확 일치 (검사 모드 스캔용)
    const serialNum = sp.get('serialNum') // 숫자만 입력 시 시리얼 끝자리 번호로 조회 (검사 모드)
    const sortBy = (SORTABLE as readonly string[]).includes(sp.get('sortBy') ?? '')
      ? (sp.get('sortBy') as string) : 'serial_number'
    const sortDir = sp.get('sortDir') === 'desc' ? false : true

    const supabase = createServerClient()

    // 숫자만 입력된 스캔 조회: 시리얼 끝자리 숫자를 정수로 매칭 (zero-pad 폭 무관)
    if (serialNum && /^\d+$/.test(serialNum)) {
      const { data: found, error: rpcError } = await supabase.rpc('find_arbors_by_number', {
        p_factory_id: factoryId,
        p_num: Number(serialNum)
      })
      if (rpcError) throw rpcError
      const rows = found ?? []
      return NextResponse.json({
        success: true,
        data: rows,
        pagination: { page: 1, pageSize: rows.length, total: rows.length }
      })
    }

    let query = supabase
      .from('arbors')
      .select('*', { count: 'exact' })
      .eq('factory_id', factoryId)

    if (grade && (ARBOR_GRADES as readonly string[]).includes(grade)) query = query.eq('current_grade', grade)
    if (grade === 'none') query = query.is('current_grade', null) // 미검사 필터
    if (status && (ARBOR_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status)
    if (serial) query = query.eq('serial_number', serial)
    else if (search) query = query.ilike('serial_number', `${search}%`)

    const from = (page - 1) * pageSize
    const { data, count, error } = await query
      .order(sortBy, { ascending: sortDir })
      .range(from, from + pageSize - 1) // ← 브라우저에는 페이지 분량만 전송

    if (error) throw error
    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: { page, pageSize, total: count ?? 0 }
    })
  } catch (error) {
    console.error('GET /api/arbors error:', error)
    return NextResponse.json({ success: false, error: 'Arbor 목록 조회 실패' }, { status: 500 })
  }
}

const createSchema = z.object({
  factoryId: z.string().uuid(),
  serial_number: z.string().regex(ARBOR_SERIAL_REGEX),
  arbor_model: z.string().max(50).optional(),
  tool_diameter: z.string().max(20).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional()
})

// POST /api/arbors — 단건 수기 등록 (보조 경로)
export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json())
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('arbors')
      .insert({
        factory_id: body.factoryId,
        serial_number: body.serial_number.toUpperCase(),
        arbor_model: body.arbor_model ?? null,
        tool_diameter: body.tool_diameter ?? null,
        purchase_date: body.purchase_date ?? null,
        notes: body.notes ?? null
      })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: '해당 공장에 이미 같은 시리얼이 존재합니다.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    }
    console.error('POST /api/arbors error:', error)
    return NextResponse.json({ success: false, error: 'Arbor 등록 실패' }, { status: 500 })
  }
}
