import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { authorizeFactory } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

const OPEN_STATUSES = ['reported', 'sent'] as const
const DEFAULT_OVERDUE_DAYS = 30

// GET /api/probes/repairs?factoryId=&page=1&pageSize=50&status=open|completed&overdueOnly=true&overdueDays=30&warrantyRerepair=true
// 개별 프로브 상세(/api/probes/[id]/repairs)가 아닌, 공장 전체 수리 이력을 조회하는 수리 현황 페이지 전용 엔드포인트
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const factoryId = sp.get('factoryId')
    if (!factoryId) { // fail-closed
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    const page = Math.max(1, Number(sp.get('page') ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 50)))
    const status = sp.get('status') // 'open' | 'completed'
    const overdueOnly = sp.get('overdueOnly') === 'true'
    const overdueDays = Math.max(1, Number(sp.get('overdueDays') ?? DEFAULT_OVERDUE_DAYS))
    const warrantyRerepair = sp.get('warrantyRerepair') === 'true'

    const supabase = createServerClient()

    let query = supabase
      .from('probe_repairs')
      // probes 조인으로 자산번호/모델 표시에 필요한 필드만 가져온다 (FK: probe_repairs_probe_id_fkey)
      .select('*, probe:probes!probe_repairs_probe_id_fkey(asset_number, model, equipment_id), vendor:probe_vendors(id, name)', { count: 'exact' })
      .eq('factory_id', factoryId)

    if (status === 'open') query = query.in('status', OPEN_STATUSES)
    else if (status === 'completed') query = query.eq('status', 'completed')

    if (warrantyRerepair) query = query.not('original_repair_id', 'is', null)

    const vendorId = sp.get('vendorId')
    if (vendorId) query = query.eq('vendor_id', vendorId)

    // 지연: 발송(sent) 상태로 overdueDays일 넘게 입고되지 않은 건
    if (overdueOnly) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - overdueDays)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      query = query.eq('status', 'sent').lt('sent_at', cutoffStr)
    }

    const from = (page - 1) * pageSize
    const { data, count, error } = await query
      .order('occurred_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    const pageRows = data ?? []
    const rowIds = pageRows.map(r => r.id)

    // 재수리 횟수: 이 페이지 행들을 원 수리로 참조하는 건수 (페이지네이션 안전 — 현재 페이지 행에 대해서만 집계)
    const reRepairCounts: Record<string, number> = {}
    if (rowIds.length > 0) {
      const { data: children, error: childError } = await supabase
        .from('probe_repairs')
        .select('original_repair_id')
        .in('original_repair_id', rowIds)
      if (childError) throw childError
      for (const c of children ?? []) {
        if (c.original_repair_id) {
          reRepairCounts[c.original_repair_id] = (reRepairCounts[c.original_repair_id] ?? 0) + 1
        }
      }
    }

    // 재수리 행의 원 수리 날짜: original_repair_id로 참조되는 원 건을 한 번에 조회
    const originalIds = Array.from(new Set(pageRows.map(r => r.original_repair_id).filter((v): v is string => !!v)))
    const originalsMap: Record<string, { occurred_at: string; returned_at: string | null; warranty_until: string | null }> = {}
    if (originalIds.length > 0) {
      const { data: originals, error: originalError } = await supabase
        .from('probe_repairs')
        .select('id, occurred_at, returned_at, warranty_until')
        .in('id', originalIds)
      if (originalError) throw originalError
      for (const o of originals ?? []) {
        originalsMap[o.id] = { occurred_at: o.occurred_at, returned_at: o.returned_at, warranty_until: o.warranty_until }
      }
    }

    const rows = pageRows.map(r => ({
      ...r,
      reRepairCount: reRepairCounts[r.id] ?? 0,
      original: r.original_repair_id ? originalsMap[r.original_repair_id] ?? null : null
    }))

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: { page, pageSize, total: count ?? 0 }
    })
  } catch (error) {
    console.error('GET /api/probes/repairs error:', error)
    return NextResponse.json({ success: false, error: '수리 현황 조회 실패' }, { status: 500 })
  }
}
