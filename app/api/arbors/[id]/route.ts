import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { ARBOR_STATUSES } from '../../../../lib/types/arbor'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from('arbors').select('*').eq('id', params.id).single()
    if (error) return NextResponse.json({ success: false, error: 'Arbor를 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: '조회 실패' }, { status: 500 })
  }
}

const updateSchema = z.object({
  arbor_model: z.string().max(50).nullable().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(ARBOR_STATUSES).optional(),
  notes: z.string().nullable().optional()
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = updateSchema.parse(await request.json())
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('arbors')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
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
    // 등급 확인 — D등급은 실제 폐기 대상이므로 이력이 있어도 하드 삭제 허용
    const { data: arbor, error: fetchError } = await supabase
      .from('arbors').select('current_grade').eq('id', params.id).single()
    if (fetchError || !arbor) {
      return NextResponse.json({ success: false, error: 'Arbor를 찾을 수 없습니다.' }, { status: 404 })
    }
    const { count, error: countError } = await supabase
      .from('arbor_inspections').select('id', { count: 'exact', head: true }).eq('arbor_id', params.id)
    if (countError) return NextResponse.json({ success: false, error: '검사 이력 확인 실패' }, { status: 500 })
    const hasHistory = (count ?? 0) > 0

    // 검사 이력이 있어도 D등급(폐기 대상)은 삭제 허용 → DB/목록 행 수 감소
    // 그 외 등급의 이력 보유 Arbor는 감사 추적 보존을 위해 삭제 거부
    if (hasHistory && arbor.current_grade !== 'D') {
      return NextResponse.json(
        { success: false, error: '검사 이력이 있는 Arbor는 D등급(폐기 대상)만 삭제할 수 있습니다. 상태를 폐기(disposed)로 변경하세요.' },
        { status: 409 }
      )
    }
    // FK(NO ACTION)이므로 검사 이력을 먼저 삭제한 뒤 Arbor 삭제
    if (hasHistory) {
      const { error: insError } = await supabase.from('arbor_inspections').delete().eq('arbor_id', params.id)
      if (insError) throw insError
    }
    const { error } = await supabase.from('arbors').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 })
  }
}
