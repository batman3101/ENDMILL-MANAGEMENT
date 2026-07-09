import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../../lib/supabase/client'
import { authorizeFactory } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/probes/[id]/move — 장비 이동 이력 (최근 100건). 장비번호는 프론트에서 equipment 맵으로 해석.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('probe_movements')
      .select('*, moved_by_profile:user_profiles!probe_movements_moved_by_fkey(name)')
      .eq('probe_id', params.id)
      .order('moved_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('GET probe movements error:', error)
    return NextResponse.json({ success: false, error: '이동 이력 조회 실패' }, { status: 500 })
  }
}

const moveSchema = z.object({
  factoryId: z.string().uuid(),
  to_equipment_id: z.string().uuid().nullable().optional(), // null/미지정 = 창고 회수(미장착)
  moved_at: z.string().regex(DATE_RE).optional(),
  notes: z.string().optional()
})

// POST /api/probes/[id]/move — 장비간 이동 (현장 재배치이므로 user 이상 허용)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = moveSchema.parse(await request.json())

    // 인증 + 공장 접근 권한 (현장 재배치는 user 이상 허용)
    const authz = await authorizeFactory(body.factoryId)
    if (!authz.ok) return NextResponse.json({ success: false, error: authz.error }, { status: authz.status })
    const me = authz.me

    const supabase = createServerClient()
    const { data: probe, error: probeError } = await supabase
      .from('probes')
      .select('id, factory_id, equipment_id, status')
      .eq('id', params.id)
      .single()
    if (probeError || !probe) {
      return NextResponse.json({ success: false, error: '프로브를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (probe.factory_id !== body.factoryId) {
      return NextResponse.json({ success: false, error: '선택한 공장의 프로브가 아닙니다.' }, { status: 403 })
    }
    if (probe.status === 'disposed' || probe.status === 'lost') {
      return NextResponse.json({ success: false, error: '폐기 또는 분실된 프로브는 이동할 수 없습니다.' }, { status: 409 })
    }
    if (probe.status === 'in_repair') {
      return NextResponse.json({ success: false, error: '수리중인 프로브는 이동할 수 없습니다.' }, { status: 409 })
    }

    const toEquipmentId = body.to_equipment_id ?? null
    if (toEquipmentId === probe.equipment_id) {
      return NextResponse.json({ success: false, error: '현재 장착 위치와 동일합니다.' }, { status: 400 })
    }

    // 대상 장비가 같은 공장 소속인지 검증 (id + factory_id 동시 필터)
    if (toEquipmentId) {
      const { data: eq } = await supabase
        .from('equipment').select('id').eq('id', toEquipmentId).eq('factory_id', body.factoryId).maybeSingle()
      if (!eq) {
        return NextResponse.json({ success: false, error: '대상 장비가 올바르지 않습니다.' }, { status: 400 })
      }
    }

    const movedAt = body.moved_at ?? new Date().toISOString().slice(0, 10)

    // 이동 이력 기록
    const { data: movement, error: mvError } = await supabase
      .from('probe_movements')
      .insert({
        probe_id: probe.id,
        factory_id: probe.factory_id,
        from_equipment_id: probe.equipment_id,
        to_equipment_id: toEquipmentId,
        moved_at: movedAt,
        moved_by: me.profileId,
        notes: body.notes ?? null
      })
      .select()
      .single()
    if (mvError) throw mvError

    // 마스터 equipment_id/status 갱신 (장비 있음=in_use, 없음=spare) — 실패 시 이력 삭제(보상 롤백)
    const newStatus = toEquipmentId ? 'in_use' : 'spare'
    const { error: updError } = await supabase
      .from('probes')
      .update({ equipment_id: toEquipmentId, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', probe.id)
    if (updError) {
      await supabase.from('probe_movements').delete().eq('id', movement.id)
      throw updError
    }

    return NextResponse.json({ success: true, data: movement }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    }
    console.error('POST probe move error:', error)
    return NextResponse.json({ success: false, error: '장비 이동 실패' }, { status: 500 })
  }
}
