import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { ARBOR_SERIAL_REGEX, TAPER_CONDITIONS } from '../../../../lib/types/arbor'

export const maxDuration = 300 // 대량 배치 대비 (equipment 패턴과 동일)

const rowSchema = z.object({
  serial_number: z.string().regex(ARBOR_SERIAL_REGEX),
  arbor_model: z.string().max(50).optional(),
  tool_diameter: z.string().max(20).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  initial_grade: z.enum(['A', 'B', 'C', 'D']).optional(),
  runout_um: z.number().min(0).optional(),
  taper_condition: z.enum(TAPER_CONDITIONS).optional(),
  notes: z.string().optional()
})

const bodySchema = z.object({
  factoryId: z.string().uuid(),
  arbors: z.array(rowSchema).min(1).max(1000) // 요청당 1,000행 (클라이언트가 청크 분할)
})

const INSERT_CHUNK = 500

// GET: 업로더의 템플릿 안내용 메타 (equipment 패턴 유지)
export async function GET() {
  return NextResponse.json({
    success: true,
    template: { maxRowsPerRequest: 1000, requiredColumns: ['시리얼번호'] }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { factoryId, arbors } = bodySchema.parse(await request.json())
    const supabase = createServerClient()

    const results = {
      success: [] as string[],
      failed: [] as { serial_number: string; reason: string }[],
      duplicates: [] as string[],
      inspectionsCreated: 0
    }

    // 1) 이 배치의 시리얼만 대상으로 기존 중복 조회 (IN 절 — 전체 30K 프리페치 금지)
    const serials = arbors.map(a => a.serial_number.toUpperCase())
    // Sub-batch the dedup SELECT to keep the .in() query string under gateway
    // request-line limits (~8KB) — a single 1000-serial .in() can 414 at scale.
    const DEDUP_CHUNK = 200
    const existingSet = new Set<string>()
    for (let i = 0; i < serials.length; i += DEDUP_CHUNK) {
      const slice = serials.slice(i, i + DEDUP_CHUNK)
      const { data: existing, error: dupError } = await supabase
        .from('arbors')
        .select('serial_number')
        .eq('factory_id', factoryId)
        .in('serial_number', slice)
      if (dupError) throw dupError
      for (const e of existing ?? []) existingSet.add(e.serial_number)
    }

    const fresh = arbors.filter(a => {
      const s = a.serial_number.toUpperCase()
      if (existingSet.has(s)) { results.duplicates.push(s); return false }
      return true
    })

    // 2) 500행 단위 배열 insert. 청크 실패 시 개별 insert로 강등해 행 단위 사유 수집
    for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
      const chunk = fresh.slice(i, i + INSERT_CHUNK)
      const payload = chunk.map(a => ({
        factory_id: factoryId,
        serial_number: a.serial_number.toUpperCase(),
        arbor_model: a.arbor_model ?? null,
        tool_diameter: a.tool_diameter ?? null,
        purchase_date: a.purchase_date ?? null,
        notes: a.notes ?? null,
        current_grade: a.initial_grade ?? null,
        last_runout_um: a.runout_um ?? null,
        last_taper_condition: a.taper_condition ?? null,
        last_inspected_at: a.initial_grade ? new Date().toISOString() : null
      }))

      const { data: inserted, error } = await supabase
        .from('arbors')
        .insert(payload)
        .select('id, serial_number')

      if (error) {
        for (const row of payload) { // 개별 강등
          const { data: one, error: oneError } = await supabase
            .from('arbors').insert(row).select('id, serial_number').single()
          if (oneError) {
            results.failed.push({
              serial_number: row.serial_number,
              reason: oneError.code === '23505' ? '이미 존재하는 시리얼' : oneError.message
            })
          } else if (one) {
            results.success.push(one.serial_number)
            await createImportInspection(supabase, factoryId, one.id, chunk, one.serial_number, results)
          }
        }
        continue
      }

      results.success.push(...(inserted ?? []).map(r => r.serial_number))

      // 3) 초기 등급+측정값이 모두 있는 행은 검사 이력도 생성 (이관 데이터 보존)
      const idBySerial = new Map((inserted ?? []).map(r => [r.serial_number, r.id]))
      const inspections = chunk
        .filter(a => a.initial_grade && a.runout_um !== undefined)
        .map(a => ({
          arbor_id: idBySerial.get(a.serial_number.toUpperCase())!,
          factory_id: factoryId,
          runout_um: a.runout_um!,
          taper_condition: a.taper_condition ?? null,
          judged_grade: a.initial_grade!,
          previous_grade: null,
          rule_snapshot: { source: 'excel_import' },
          notes: 'Excel 일괄 등록 이관'
        }))
        .filter(r => r.arbor_id)
      if (inspections.length > 0) {
        const { error: insError } = await supabase.from('arbor_inspections').insert(inspections)
        if (insError) console.error('bulk-upload: inspection insert failed:', insError.message)
        else results.inspectionsCreated += inspections.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `총 ${arbors.length}건 중 ${results.success.length}건 등록 (중복 ${results.duplicates.length}, 실패 ${results.failed.length})`,
      results
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력 형식 오류', details: error.issues.slice(0, 5) }, { status: 400 })
    }
    console.error('POST /api/arbors/bulk-upload error:', error)
    return NextResponse.json({ success: false, error: '일괄 등록 실패' }, { status: 500 })
  }
}

// 개별 강등 경로에서도 이관 검사 이력 생성
async function createImportInspection(
  supabase: ReturnType<typeof createServerClient>,
  factoryId: string,
  arborId: string,
  chunk: z.infer<typeof rowSchema>[],
  serial: string,
  results: { inspectionsCreated: number }
): Promise<void> {
  const src = chunk.find(c => c.serial_number.toUpperCase() === serial)
  if (!src?.initial_grade || src.runout_um === undefined) return
  const { error } = await supabase.from('arbor_inspections').insert({
    arbor_id: arborId,
    factory_id: factoryId,
    runout_um: src.runout_um,
    taper_condition: src.taper_condition ?? null,
    judged_grade: src.initial_grade,
    previous_grade: null,
    rule_snapshot: { source: 'excel_import' },
    notes: 'Excel 일괄 등록 이관'
  })
  if (error) console.error('bulk-upload: inspection insert failed (single):', error.message)
  else results.inspectionsCreated += 1
}
