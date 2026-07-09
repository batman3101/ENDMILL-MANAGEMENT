import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { PROBE_MODELS, PROBE_STATUSES, PROBE_RESULTS, ASSET_NUMBER_MAX_LENGTH } from '../../../../lib/types/probe'
import { authorizeFactory } from '@/lib/auth/serverRole'

export const maxDuration = 300 // 대량 배치 대비 (Arbor 패턴과 동일)

const rowSchema = z.object({
  asset_number: z.string().trim().min(1).max(ASSET_NUMBER_MAX_LENGTH),
  renishaw_serial: z.string().max(50).optional(),
  model: z.enum(PROBE_MODELS).optional(),
  equipment_code: z.string().max(20).optional(),
  status: z.enum(PROBE_STATUSES).optional(),
  initial_result: z.enum(PROBE_RESULTS).optional(),
  repeatability_um: z.number().min(0).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional()
})

const bodySchema = z.object({
  factoryId: z.string().uuid(),
  probes: z.array(rowSchema).min(1).max(1000) // 요청당 1,000행 (클라이언트가 청크 분할)
})

const INSERT_CHUNK = 500
const DEDUP_CHUNK = 200

// 설비 코드("C001" 등)를 equipment_number로 정규화 (EquipmentService.getById와 동일 로직)
function toEquipmentNumber(code: string): number | null {
  const stripped = code.replace(/^C/i, '')
  if (!/^\d+$/.test(stripped)) return null
  return parseInt(stripped, 10)
}

// GET: 업로더의 템플릿 안내용 메타
export async function GET() {
  return NextResponse.json({
    success: true,
    template: { maxRowsPerRequest: 1000, requiredColumns: ['자산번호'] }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { factoryId, probes } = bodySchema.parse(await request.json())
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const supabase = createServerClient()

    const results = {
      success: [] as string[],
      failed: [] as { asset_number: string; reason: string }[],
      duplicates: [] as string[],
      inspectionsCreated: 0
    }

    // 1) 이 배치의 자산번호만 대상으로 기존 중복 조회 (IN 절 청크 — 게이트웨이 request-line 한도 대비)
    const assetNumbers = probes.map(p => p.asset_number)
    const existingSet = new Set<string>()
    for (let i = 0; i < assetNumbers.length; i += DEDUP_CHUNK) {
      const slice = assetNumbers.slice(i, i + DEDUP_CHUNK)
      const { data: existing, error: dupError } = await supabase
        .from('probes')
        .select('asset_number')
        .eq('factory_id', factoryId)
        .in('asset_number', slice)
      if (dupError) throw dupError
      for (const e of existing ?? []) existingSet.add(e.asset_number)
    }

    const fresh = probes.filter(p => {
      if (existingSet.has(p.asset_number)) { results.duplicates.push(p.asset_number); return false }
      return true
    })

    // 2) 장착장비코드 → equipment_id 일괄 조회 (행별 단건 조회 금지)
    const equipmentNumbers = Array.from(new Set(
      fresh
        .map(p => (p.equipment_code ? toEquipmentNumber(p.equipment_code) : null))
        .filter((n): n is number => n !== null)
    ))
    const equipmentIdByNumber = new Map<number, string>()
    for (let i = 0; i < equipmentNumbers.length; i += DEDUP_CHUNK) {
      const slice = equipmentNumbers.slice(i, i + DEDUP_CHUNK)
      const { data: equipmentRows, error: equipError } = await supabase
        .from('equipment')
        .select('id, equipment_number')
        .eq('factory_id', factoryId)
        .in('equipment_number', slice)
      if (equipError) throw equipError
      for (const e of equipmentRows ?? []) equipmentIdByNumber.set(e.equipment_number, e.id)
    }

    const resolveEquipmentId = (code?: string): string | null => {
      if (!code) return null
      const num = toEquipmentNumber(code)
      if (num === null) return null
      return equipmentIdByNumber.get(num) ?? null
    }

    const buildPayload = (row: z.infer<typeof rowSchema>) => {
      const equipmentId = resolveEquipmentId(row.equipment_code)
      const hasInitialInspection = row.initial_result !== undefined && row.repeatability_um !== undefined
      return {
        factory_id: factoryId,
        asset_number: row.asset_number,
        renishaw_serial: row.renishaw_serial ?? null,
        model: row.model ?? null, // 모델은 nullable (미기입 허용, 사후 지정 가능)
        equipment_id: equipmentId,
        status: row.status ?? (equipmentId ? 'in_use' : 'spare'),
        purchase_date: row.purchase_date ?? null,
        notes: row.notes ?? null,
        current_result: row.initial_result ?? null,
        last_repeatability_um: row.repeatability_um ?? null,
        last_inspected_at: hasInitialInspection ? new Date().toISOString() : null
      }
    }

    // 3) 500행 단위 배열 insert. 청크 실패 시 개별 insert로 강등해 행 단위 사유 수집
    for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
      const chunk = fresh.slice(i, i + INSERT_CHUNK)
      const payload = chunk.map(buildPayload)

      const { data: inserted, error } = await supabase
        .from('probes')
        .insert(payload)
        .select('id, asset_number')

      if (error) {
        for (let j = 0; j < chunk.length; j++) {
          const { data: one, error: oneError } = await supabase
            .from('probes').insert(payload[j]).select('id, asset_number').single()
          if (oneError) {
            results.failed.push({
              asset_number: chunk[j].asset_number,
              reason: oneError.code === '23505' ? '이미 존재하는 자산번호' : oneError.message
            })
          } else if (one) {
            results.success.push(one.asset_number)
            await createImportInspection(supabase, factoryId, one.id, chunk[j], results)
          }
        }
        continue
      }

      results.success.push(...(inserted ?? []).map(r => r.asset_number))

      // 4) 초기 등급+측정값이 모두 있는 행은 검사 이력도 생성 (이관 데이터 보존)
      const idByAsset = new Map((inserted ?? []).map(r => [r.asset_number, r.id]))
      const inspections = chunk
        .filter(p => p.initial_result !== undefined && p.repeatability_um !== undefined)
        .map(p => ({
          probe_id: idByAsset.get(p.asset_number),
          factory_id: factoryId,
          repeatability_um: p.repeatability_um!,
          judged_result: p.initial_result!,
          previous_result: null,
          rule_snapshot: { source: 'excel_import' },
          trigger_reason: 'periodic' as const,
          notes: 'Excel 일괄 등록 이관'
        }))
        .filter((r): r is typeof r & { probe_id: string } => !!r.probe_id)
      if (inspections.length > 0) {
        const { error: insError } = await supabase.from('probe_inspections').insert(inspections)
        if (insError) console.error('bulk-upload: inspection insert failed:', insError.message)
        else results.inspectionsCreated += inspections.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `총 ${probes.length}건 중 ${results.success.length}건 등록 (중복 ${results.duplicates.length}, 실패 ${results.failed.length})`,
      results
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력 형식 오류', details: error.issues.slice(0, 5) }, { status: 400 })
    }
    console.error('POST /api/probes/bulk-upload error:', error)
    return NextResponse.json({ success: false, error: '일괄 등록 실패' }, { status: 500 })
  }
}

// 개별 강등 경로에서도 이관 검사 이력 생성
async function createImportInspection(
  supabase: ReturnType<typeof createServerClient>,
  factoryId: string,
  probeId: string,
  row: z.infer<typeof rowSchema>,
  results: { inspectionsCreated: number }
): Promise<void> {
  if (row.initial_result === undefined || row.repeatability_um === undefined) return
  const { error } = await supabase.from('probe_inspections').insert({
    probe_id: probeId,
    factory_id: factoryId,
    repeatability_um: row.repeatability_um,
    judged_result: row.initial_result,
    previous_result: null,
    rule_snapshot: { source: 'excel_import' },
    trigger_reason: 'periodic',
    notes: 'Excel 일괄 등록 이관'
  })
  if (error) console.error('bulk-upload: inspection insert failed (single):', error.message)
  else results.inspectionsCreated += 1
}
