import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../../lib/supabase/client'
import { FAILURE_TYPES } from '../../../../../lib/types/probe'
import { authorizeFactory, isAdminRole } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/probes/[id]/repairs — 해당 프로브의 수리 이력 (최근 100건)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('probe_repairs')
      .select('*')
      .eq('probe_id', params.id)
      .order('occurred_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('GET probe repairs error:', error)
    return NextResponse.json({ success: false, error: '수리 이력 조회 실패' }, { status: 500 })
  }
}

// 유형 인지 discriminated union: internal은 등록 즉시 완료 고정(completed_at·replaced_parts 필수),
// external/rbe는 reported(요청)로 시작 — 승인·발송·입고는 PUT 액션(관리자)으로만 전이
const baseFields = {
  factoryId: z.string().uuid(),
  failure_type: z.enum(FAILURE_TYPES),
  occurred_at: z.string().regex(DATE_RE),
  original_repair_id: z.string().uuid().optional(),
  notes: z.string().optional()
}

const repairCreateSchema = z.discriminatedUnion('repair_type', [
  z.object({
    repair_type: z.literal('internal'),
    completed_at: z.string().regex(DATE_RE),
    replaced_parts: z.string().trim().min(1),
    ...baseFields
  }),
  z.object({ repair_type: z.literal('external'), ...baseFields }),
  z.object({ repair_type: z.literal('rbe'), ...baseFields })
])

// POST /api/probes/[id]/repairs — 수리 요청/등록 (검사입력·수리요청은 user 권한 허용)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = repairCreateSchema.parse(await request.json())

    // 인증 + 공장 접근 (수리 요청은 user 이상 허용)
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const me = auth.me

    const supabase = createServerClient()

    const { data: probe, error: probeError } = await supabase
      .from('probes')
      .select('id, factory_id, status, renishaw_serial')
      .eq('id', params.id)
      .single()
    if (probeError || !probe) {
      return NextResponse.json({ success: false, error: '프로브를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (probe.factory_id !== body.factoryId) {
      return NextResponse.json({ success: false, error: '선택한 공장의 프로브가 아닙니다.' }, { status: 403 })
    }
    if (probe.status === 'disposed' || probe.status === 'lost') {
      return NextResponse.json({ success: false, error: '폐기 또는 분실된 프로브는 수리를 등록할 수 없습니다.' }, { status: 409 })
    }

    // 보증 내 재수리 연결: 같은 probe_id + 원 수리 입고일 이후 + 보증만료일 이전인지 서버 검증 (DB 트리거와 이중화)
    if (body.original_repair_id) {
      const { data: original, error: originalError } = await supabase
        .from('probe_repairs')
        .select('id, probe_id, returned_at, warranty_until')
        .eq('id', body.original_repair_id)
        .maybeSingle()
      if (originalError || !original) {
        return NextResponse.json({ success: false, error: '연결할 원 수리 건을 찾을 수 없습니다.' }, { status: 400 })
      }
      if (original.probe_id !== probe.id) {
        return NextResponse.json({ success: false, error: '원 수리 건이 동일한 프로브 소속이 아닙니다.' }, { status: 400 })
      }
      if (original.returned_at && body.occurred_at < original.returned_at) {
        return NextResponse.json({ success: false, error: '재수리 발생일은 원 수리의 입고일 이후여야 합니다.' }, { status: 400 })
      }
      if (!original.warranty_until || original.warranty_until < body.occurred_at) {
        return NextResponse.json({ success: false, error: '보증기간이 만료된 수리 건입니다.' }, { status: 400 })
      }
    }

    const isInternal = body.repair_type === 'internal'
    const { data, error } = await supabase
      .from('probe_repairs')
      .insert({
        probe_id: probe.id,
        factory_id: probe.factory_id,
        repair_type: body.repair_type,
        failure_type: body.failure_type,
        occurred_at: body.occurred_at,
        original_repair_id: body.original_repair_id ?? null,
        requested_by: me.profileId,
        notes: body.notes ?? null,
        // 사내수리: 등록 즉시 완료 고정 / 외주·RBE: 요청(reported) 상태로 시작
        status: isInternal ? 'completed' : 'reported',
        completed_at: isInternal ? body.completed_at : null,
        replaced_parts: isInternal ? body.replaced_parts : null,
        // RBE: 등록 시점의 마스터 시리얼을 스냅샷 보존
        serial_before: body.repair_type === 'rbe' ? probe.renishaw_serial : null
      })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: '이미 진행 중인 수리 건이 있습니다.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    }
    console.error('POST probe repair error:', error)
    return NextResponse.json({ success: false, error: '수리 등록 실패' }, { status: 500 })
  }
}

const repairUpdateSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    factoryId: z.string().uuid(),
    repair_id: z.string().uuid()
  }),
  z.object({
    action: z.literal('send'),
    factoryId: z.string().uuid(),
    repair_id: z.string().uuid(),
    sent_at: z.string().regex(DATE_RE)
  }),
  z.object({
    action: z.literal('close'),
    factoryId: z.string().uuid(),
    repair_id: z.string().uuid(),
    returned_at: z.string().regex(DATE_RE),
    serial_after: z.string().max(50).optional()
  }),
  z.object({
    action: z.literal('update'),
    factoryId: z.string().uuid(),
    repair_id: z.string().uuid(),
    failure_type: z.enum(FAILURE_TYPES),
    occurred_at: z.string().regex(DATE_RE),
    notes: z.string().optional(),
    completed_at: z.string().regex(DATE_RE).optional(),
    replaced_parts: z.string().trim().min(1).optional(),
    sent_at: z.string().regex(DATE_RE).optional(),
    returned_at: z.string().regex(DATE_RE).optional()
  })
])

// PUT /api/probes/[id]/repairs — 승인/발송/입고 마감/기록 정정. 모두 관리자(admin+) 전용.
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = repairUpdateSchema.parse(await request.json())

    // 공장 접근 + 관리자 권한 (승인·발송·입고·정정은 admin 이상)
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const me = auth.me
    if (!isAdminRole(me.role)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const supabase = createServerClient()

    const { data: repair, error: repairError } = await supabase
      .from('probe_repairs')
      .select('id, probe_id, factory_id, repair_type, status')
      .eq('id', body.repair_id)
      .single()
    if (repairError || !repair) {
      return NextResponse.json({ success: false, error: '수리 건을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (repair.probe_id !== params.id) {
      return NextResponse.json({ success: false, error: '해당 프로브의 수리 건이 아닙니다.' }, { status: 403 })
    }
    if (repair.factory_id !== body.factoryId) {
      return NextResponse.json({ success: false, error: '선택한 공장의 수리 건이 아닙니다.' }, { status: 403 })
    }

    // 기록 정정: 상태 전이 없이 필드 값만 수정
    if (body.action === 'update') {
      const patch: Record<string, string | null> = {
        failure_type: body.failure_type,
        occurred_at: body.occurred_at,
        notes: body.notes?.trim() || null,
        updated_at: new Date().toISOString()
      }
      if (repair.repair_type === 'internal') {
        if (body.completed_at) patch.completed_at = body.completed_at
        if (body.replaced_parts) patch.replaced_parts = body.replaced_parts
      } else {
        // CHECK 제약 준수: sent_at은 발송(sent) 이후에만, returned_at은 완료 상태에서만 정정
        if (body.sent_at) {
          if (repair.status !== 'sent' && repair.status !== 'completed') {
            return NextResponse.json({ success: false, error: '발송된 수리 건만 발송일을 정정할 수 있습니다.' }, { status: 409 })
          }
          patch.sent_at = body.sent_at
        }
        if (body.returned_at) {
          if (repair.status !== 'completed') {
            return NextResponse.json({ success: false, error: '완료된 수리 건만 입고일을 정정할 수 있습니다.' }, { status: 409 })
          }
          patch.returned_at = body.returned_at // 보증만료일은 GENERATED 컬럼이 자동 재계산
        }
      }
      const { data: updated, error: updError } = await supabase
        .from('probe_repairs')
        .update(patch)
        .eq('id', repair.id)
        .select()
        .single()
      if (updError) throw updError
      return NextResponse.json({ success: true, data: updated })
    }

    if (repair.repair_type === 'internal') {
      return NextResponse.json({ success: false, error: '사내수리는 등록 즉시 완료되어 상태 전이가 없습니다.' }, { status: 400 })
    }

    // 승인: reported → approved (관리자)
    if (body.action === 'approve') {
      if (repair.status !== 'reported') {
        return NextResponse.json({ success: false, error: '요청(reported) 상태의 수리 건만 승인할 수 있습니다.' }, { status: 409 })
      }
      const now = new Date().toISOString()
      const { data: updated, error: updError } = await supabase
        .from('probe_repairs')
        .update({ status: 'approved', approved_at: now.slice(0, 10), approved_by: me.profileId, updated_at: now })
        .eq('id', repair.id)
        .select()
        .single()
      if (updError) throw updError
      return NextResponse.json({ success: true, data: updated })
    }

    // 발송: approved → sent (관리자). 프로브 상태를 in_repair로 전환.
    if (body.action === 'send') {
      if (repair.status !== 'approved') {
        return NextResponse.json({ success: false, error: '승인(approved) 상태의 수리 건만 발송 처리할 수 있습니다.' }, { status: 409 })
      }
      const now = new Date().toISOString()
      const { data: updated, error: updError } = await supabase
        .from('probe_repairs')
        .update({ status: 'sent', sent_at: body.sent_at, updated_at: now })
        .eq('id', repair.id)
        .select()
        .single()
      if (updError) throw updError

      const { error: probeUpdError } = await supabase
        .from('probes')
        .update({ status: 'in_repair', updated_at: now })
        .eq('id', repair.probe_id)
      if (probeUpdError) {
        // 보상 롤백: 프로브 상태 갱신 실패 시 발송 처리도 되돌린다 (approved로 복귀)
        await supabase.from('probe_repairs').update({ status: 'approved', sent_at: null }).eq('id', repair.id)
        throw probeUpdError
      }
      return NextResponse.json({ success: true, data: updated })
    }

    // 입고 마감: sent → completed (관리자)
    if (repair.status !== 'sent') {
      return NextResponse.json({ success: false, error: '발송(sent) 상태의 수리 건만 입고 마감할 수 있습니다.' }, { status: 409 })
    }
    if (repair.repair_type === 'rbe' && !body.serial_after) {
      return NextResponse.json({ success: false, error: 'RBE 입고 마감은 신규 시리얼이 필요합니다.' }, { status: 400 })
    }

    const { data: probe, error: probeError } = await supabase
      .from('probes').select('equipment_id').eq('id', repair.probe_id).single()
    if (probeError || !probe) {
      return NextResponse.json({ success: false, error: '프로브를 찾을 수 없습니다.' }, { status: 404 })
    }
    const probeStatus = probe.equipment_id ? 'in_use' : 'spare'

    // 외주/RBE 입고 마감: repair 갱신 + RBE 시리얼 교체 + probes.status 복귀를 단일 트랜잭션(RPC)으로 원자화
    const { error: closeError } = await supabase.rpc('close_probe_repair', {
      p_repair_id: repair.id,
      p_returned_at: body.returned_at,
      p_serial_after: body.serial_after ?? undefined,
      p_probe_status: probeStatus
    })
    if (closeError) throw closeError

    const { data: closed, error: fetchError } = await supabase
      .from('probe_repairs').select('*').eq('id', repair.id).single()
    if (fetchError) throw fetchError

    return NextResponse.json({ success: true, data: closed })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    }
    console.error('PUT probe repair error:', error)
    return NextResponse.json({ success: false, error: '수리 갱신 실패' }, { status: 500 })
  }
}

// DELETE /api/probes/[id]/repairs?repairId=&factoryId= — 수리 기록 삭제 (관리자 전용)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sp = request.nextUrl.searchParams
    const repairId = sp.get('repairId')
    const factoryId = sp.get('factoryId')
    if (!repairId || !factoryId) {
      return NextResponse.json({ success: false, error: 'repairId와 factoryId가 필요합니다.' }, { status: 400 })
    }
    // 공장 접근 + 관리자 권한
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    if (!isAdminRole(auth.me.role)) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }
    const supabase = createServerClient()

    const { data: repair, error: repairError } = await supabase
      .from('probe_repairs')
      .select('id, probe_id, factory_id, repair_type, status')
      .eq('id', repairId)
      .single()
    if (repairError || !repair) {
      return NextResponse.json({ success: false, error: '수리 건을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (repair.probe_id !== params.id) {
      return NextResponse.json({ success: false, error: '해당 프로브의 수리 건이 아닙니다.' }, { status: 403 })
    }
    if (repair.factory_id !== factoryId) {
      return NextResponse.json({ success: false, error: '선택한 공장의 수리 건이 아닙니다.' }, { status: 403 })
    }

    // 이 건을 원 수리로 참조하는 보증 재수리가 있으면 삭제 거부 (FK 무결성)
    const { count: childCount, error: childError } = await supabase
      .from('probe_repairs')
      .select('id', { count: 'exact', head: true })
      .eq('original_repair_id', repair.id)
    if (childError) throw childError
    if ((childCount ?? 0) > 0) {
      return NextResponse.json({ success: false, error: '연결된 보증 재수리 건이 있어 삭제할 수 없습니다.' }, { status: 409 })
    }

    const { error: deleteError } = await supabase
      .from('probe_repairs')
      .delete()
      .eq('id', repair.id)
    if (deleteError) throw deleteError

    // 오픈(발송) 건을 삭제하면 프로브의 '수리중' 상태를 장비 장착 여부에 따라 복귀
    if (repair.status === 'sent') {
      const { data: probe } = await supabase
        .from('probes').select('equipment_id, status').eq('id', repair.probe_id).single()
      if (probe && probe.status === 'in_repair') {
        await supabase
          .from('probes')
          .update({ status: probe.equipment_id ? 'in_use' : 'spare', updated_at: new Date().toISOString() })
          .eq('id', repair.probe_id)
      }
    }

    return NextResponse.json({ success: true, data: { id: repair.id } })
  } catch (error) {
    console.error('DELETE probe repair error:', error)
    return NextResponse.json({ success: false, error: '수리 삭제 실패' }, { status: 500 })
  }
}
