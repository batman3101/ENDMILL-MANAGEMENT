import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { PROBE_STATUSES, PROBE_MODELS, ASSET_NUMBER_MAX_LENGTH } from '../../../../lib/types/probe'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from('probes').select('*').eq('id', params.id).single()
    if (error) return NextResponse.json({ success: false, error: '프로브를 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: '조회 실패' }, { status: 500 })
  }
}

const updateSchema = z.object({
  model: z.enum(PROBE_MODELS).optional(),
  equipment_id: z.string().uuid().nullable().optional(),
  status: z.enum(PROBE_STATUSES).optional(),
  renishaw_serial: z.string().max(50).nullable().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().nullable().optional(),
  // asset_number는 자산 표찰 재발행 등 예외적 정정만 허용 — 자유형식 그대로 저장
  asset_number: z.string().trim().min(1).max(ASSET_NUMBER_MAX_LENGTH).optional()
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = updateSchema.parse(await request.json())
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('probes')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: '해당 공장에 이미 같은 자산번호가 존재합니다.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값 오류' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: '수정 실패' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data: probe, error: fetchError } = await supabase
      .from('probes').select('id').eq('id', params.id).single()
    if (fetchError || !probe) {
      return NextResponse.json({ success: false, error: '프로브를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 검사 이력과 수리 이력 둘 다 확인 — 어느 한쪽이라도 있으면 감사추적 보존을 위해 삭제 거부
    // (Arbor는 검사 이력만 확인하지만, Probe는 D등급 폐기 예외가 없으므로 그대로 복제하지 않는다)
    const [{ count: inspectionCount, error: inspError }, { count: repairCount, error: repairError }] = await Promise.all([
      supabase.from('probe_inspections').select('id', { count: 'exact', head: true }).eq('probe_id', params.id),
      supabase.from('probe_repairs').select('id', { count: 'exact', head: true }).eq('probe_id', params.id)
    ])
    if (inspError || repairError) {
      return NextResponse.json({ success: false, error: '이력 확인 실패' }, { status: 500 })
    }
    if ((inspectionCount ?? 0) > 0 || (repairCount ?? 0) > 0) {
      return NextResponse.json(
        { success: false, error: '검사 또는 수리 이력이 있는 프로브는 삭제할 수 없습니다. 상태를 폐기(disposed)로 변경하세요.' },
        { status: 409 }
      )
    }

    const { error } = await supabase.from('probes').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 })
  }
}
