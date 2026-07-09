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
    // status 확인 — 폐기(disposed)는 실제 폐기 대상이므로 이력이 있어도 하드 삭제 허용 (Arbor D등급과 동일 정책)
    const { data: probe, error: fetchError } = await supabase
      .from('probes').select('status').eq('id', params.id).single()
    if (fetchError || !probe) {
      return NextResponse.json({ success: false, error: '프로브를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 검사 이력과 수리 이력 둘 다 확인
    const [{ count: inspectionCount, error: inspError }, { count: repairCount, error: repairError }] = await Promise.all([
      supabase.from('probe_inspections').select('id', { count: 'exact', head: true }).eq('probe_id', params.id),
      supabase.from('probe_repairs').select('id', { count: 'exact', head: true }).eq('probe_id', params.id)
    ])
    if (inspError || repairError) {
      return NextResponse.json({ success: false, error: '이력 확인 실패' }, { status: 500 })
    }
    const hasHistory = (inspectionCount ?? 0) > 0 || (repairCount ?? 0) > 0

    // 이력이 있어도 폐기(disposed) 상태면 삭제 허용 → DB/목록 행 수 감소.
    // 그 외 상태의 이력 보유 프로브는 감사 추적 보존을 위해 삭제 거부.
    if (hasHistory && probe.status !== 'disposed') {
      return NextResponse.json(
        { success: false, error: '검사 또는 수리 이력이 있는 프로브는 삭제할 수 없습니다. 상태를 폐기(disposed)로 변경하세요.' },
        { status: 409 }
      )
    }

    // FK(NO ACTION)이므로 자식 이력을 먼저 삭제한 뒤 프로브를 삭제한다.
    // (probe_repairs.original_repair_id 자기참조도 동일 probe_id 벌크 삭제로 문 종료 시 함께 해소됨)
    if (hasHistory) {
      const { error: repDelError } = await supabase.from('probe_repairs').delete().eq('probe_id', params.id)
      if (repDelError) throw repDelError
      const { error: insDelError } = await supabase.from('probe_inspections').delete().eq('probe_id', params.id)
      if (insDelError) throw insDelError
    }

    const { error } = await supabase.from('probes').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 })
  }
}
