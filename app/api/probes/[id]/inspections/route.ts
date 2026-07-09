import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../../lib/supabase/client'
import { judgeProbeResult, ProbeResultRules, DEFAULT_PROBE_RESULT_RULES } from '../../../../../lib/utils/probeResult'
import { INSPECTION_TRIGGERS } from '../../../../../lib/types/probe'
import { authorizeFactory } from '@/lib/auth/serverRole'
import type { Json } from '../../../../../lib/types/database'

export const dynamic = 'force-dynamic'

// GET /api/probes/[id]/inspections — 해당 프로브의 이력만 (최근 100건)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('probe_inspections')
      .select('*, inspected_by_profile:user_profiles!probe_inspections_inspected_by_fkey(name)')
      .eq('probe_id', params.id)
      .order('inspected_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('GET probe inspections error:', error)
    return NextResponse.json({ success: false, error: '검사 이력 조회 실패' }, { status: 500 })
  }
}

const inspectionSchema = z.object({
  factoryId: z.string().uuid(),
  repeatability_um: z.number().min(0).max(9999),
  trigger_reason: z.enum(INSPECTION_TRIGGERS),
  notes: z.string().optional()
})

// 판정 임계값(µm)을 app_settings(category='probe', key='repeatabilityThreshold')에서 로드. 미설정 시 기본 5µm.
async function loadResultRules(supabase: ReturnType<typeof createServerClient>): Promise<ProbeResultRules> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('category', 'probe')
    .eq('key', 'repeatabilityThreshold')
    .maybeSingle()
  const v = data?.value as unknown
  const threshold = typeof v === 'number'
    ? v
    : (v && typeof v === 'object' && 'repeatabilityThreshold' in v)
      ? Number((v as { repeatabilityThreshold: unknown }).repeatabilityThreshold)
      : NaN
  if (Number.isFinite(threshold) && threshold > 0) return { repeatabilityThreshold: threshold }
  return DEFAULT_PROBE_RESULT_RULES
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = inspectionSchema.parse(await request.json())
    // 인증 + 공장 접근 권한 (검사 입력은 user 이상 허용, 미인증 차단)
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const supabase = createServerClient()

    // 대상 프로브 확인 + fail-closed 공장 검증
    const { data: probe, error: probeError } = await supabase
      .from('probes')
      .select('id, factory_id, current_result, status')
      .eq('id', params.id)
      .single()
    if (probeError || !probe) {
      return NextResponse.json({ success: false, error: '프로브를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (probe.factory_id !== body.factoryId) {
      return NextResponse.json({ success: false, error: '선택한 공장의 프로브가 아닙니다.' }, { status: 403 })
    }
    if (probe.status === 'disposed' || probe.status === 'lost') {
      return NextResponse.json({ success: false, error: '폐기 또는 분실된 프로브는 검사할 수 없습니다.' }, { status: 409 })
    }

    const rules = await loadResultRules(supabase)
    const judged = judgeProbeResult(body.repeatability_um, rules) // 반복 정밀도 ≤ 임계값 → OK, 초과 → NG

    const inspectedBy = auth.me.profileId
    const now = new Date().toISOString()

    // 1) 이력 insert
    const { data: inspection, error: insError } = await supabase
      .from('probe_inspections')
      .insert({
        probe_id: probe.id,
        factory_id: probe.factory_id,
        repeatability_um: body.repeatability_um,
        judged_result: judged,
        previous_result: probe.current_result,
        rule_snapshot: rules as unknown as Json,
        trigger_reason: body.trigger_reason,
        inspected_by: inspectedBy,
        inspected_at: now,
        notes: body.notes ?? null
      })
      .select('id')
      .single()
    if (insError) throw insError

    // 2) 마스터 갱신 — 실패 시 이력 삭제(보상 롤백)
    const { error: updError } = await supabase
      .from('probes')
      .update({
        current_result: judged,
        last_repeatability_um: body.repeatability_um,
        last_inspected_at: now,
        updated_at: now
      })
      .eq('id', probe.id)
    if (updError) {
      await supabase.from('probe_inspections').delete().eq('id', inspection.id)
      throw updError
    }

    return NextResponse.json({
      success: true,
      data: { judged_result: judged, previous_result: probe.current_result, rule_snapshot: rules }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값 오류' }, { status: 400 })
    }
    console.error('POST probe inspection error:', error)
    return NextResponse.json({ success: false, error: '검사 저장 실패' }, { status: 500 })
  }
}
