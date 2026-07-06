import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../../lib/supabase/client'
import { judgeArborGrade, ArborGradeRules } from '../../../../../lib/utils/arborGrade'
import { TAPER_CONDITIONS } from '../../../../../lib/types/arbor'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '../../../../../lib/types/database'

export const dynamic = 'force-dynamic'

// GET /api/arbors/[id]/inspections — 해당 Arbor의 이력만 (최근 100건)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('arbor_inspections')
      .select('*, inspected_by_profile:user_profiles!arbor_inspections_inspected_by_fkey(name)')
      .eq('arbor_id', params.id)
      .order('inspected_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('GET inspections error:', error)
    return NextResponse.json({ success: false, error: '검사 이력 조회 실패' }, { status: 500 })
  }
}

const inspectionSchema = z.object({
  factoryId: z.string().uuid(),
  runout_um: z.number().min(0).max(9999),
  taper_condition: z.enum(TAPER_CONDITIONS).optional(),
  notes: z.string().optional()
})

const DEFAULT_RULES: ArborGradeRules = {
  runoutThresholds: { A: 10, B: 30, C: 50 }
}

async function loadRules(supabase: ReturnType<typeof createServerClient>): Promise<ArborGradeRules> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('category', 'arbor')
    .eq('key', 'gradeRules')
    .maybeSingle()
  return (data?.value as ArborGradeRules | null) ?? DEFAULT_RULES
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = inspectionSchema.parse(await request.json())
    const supabase = createServerClient()

    // 대상 arbor 확인 + fail-closed 공장 검증
    const { data: arbor, error: arborError } = await supabase
      .from('arbors')
      .select('id, factory_id, current_grade, status')
      .eq('id', params.id)
      .single()
    if (arborError || !arbor) {
      return NextResponse.json({ success: false, error: 'Arbor를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (arbor.factory_id !== body.factoryId) {
      return NextResponse.json({ success: false, error: '선택한 공장의 Arbor가 아닙니다.' }, { status: 403 })
    }
    if (arbor.status === 'disposed') {
      return NextResponse.json({ success: false, error: '폐기된 Arbor는 검사할 수 없습니다.' }, { status: 409 })
    }

    // 검사자 식별 (없어도 저장은 진행 — 기록용)
    const authClient = createClient()
    const { data: { user } } = await authClient.auth.getUser()
    let inspectedBy: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles').select('id').eq('user_id', user.id).maybeSingle()
      inspectedBy = profile?.id ?? null
    }

    const rules = await loadRules(supabase)
    const judged = judgeArborGrade(body.runout_um, rules)
    const now = new Date().toISOString()

    // 1) 이력 insert
    const { data: inspection, error: insError } = await supabase
      .from('arbor_inspections')
      .insert({
        arbor_id: arbor.id,
        factory_id: arbor.factory_id,
        runout_um: body.runout_um,
        taper_condition: body.taper_condition ?? null,
        judged_grade: judged,
        previous_grade: arbor.current_grade,
        rule_snapshot: rules as unknown as Json,
        inspected_by: inspectedBy,
        inspected_at: now,
        notes: body.notes ?? null
      })
      .select('id')
      .single()
    if (insError) throw insError

    // 2) 마스터 갱신 — 실패 시 이력 삭제(보상 롤백, 재고 outbound 패턴)
    const { error: updError } = await supabase
      .from('arbors')
      .update({
        current_grade: judged,
        last_runout_um: body.runout_um,
        last_taper_condition: body.taper_condition ?? null,
        last_inspected_at: now,
        updated_at: now
      })
      .eq('id', arbor.id)
    if (updError) {
      await supabase.from('arbor_inspections').delete().eq('id', inspection.id)
      throw updError
    }

    return NextResponse.json({
      success: true,
      data: { judged_grade: judged, previous_grade: arbor.current_grade, rule_snapshot: rules }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값 오류' }, { status: 400 })
    }
    console.error('POST inspection error:', error)
    return NextResponse.json({ success: false, error: '검사 저장 실패' }, { status: 500 })
  }
}
