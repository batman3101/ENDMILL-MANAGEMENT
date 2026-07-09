// 프로브 외주/RBE 보증 분류 (순수 함수 — DB 접근 없음)
// 규칙(스펙 4.2): (프로브+업체) 단위. 활성 기간-원점(original_repair_id=null, status=completed,
// warranty_until >= occurredAt)이 보증수리 2회 미만이면 그 원점에 보증 청구. 아니면 새 원점.
export type RepairTypeForWarranty = 'internal' | 'external' | 'rbe'

export interface PriorRepair {
  id: string
  repair_type: RepairTypeForWarranty
  vendor_id: string | null
  status: string
  returned_at: string | null
  original_repair_id: string | null
  warranty_until: string | null
}

export interface WarrantyClassification {
  originalRepairId: string | null   // 연결할 기간-원점 (null = 새 원점)
  isWarrantyClaim: boolean
  claimSequence: number             // 청구면 1|2, 새 원점이면 0
  activePeriodOriginId: string | null
}

const NEW_PERIOD: WarrantyClassification = {
  originalRepairId: null, isWarrantyClaim: false, claimSequence: 0, activePeriodOriginId: null,
}

// priorSameProbeVendor: 동일 (probe, vendor)의 기존 external/rbe 수리들.
export function classifyExternalWarranty(
  priorSameProbeVendor: PriorRepair[],
  occurredAt: string
): WarrantyClassification {
  const completed = priorSameProbeVendor.filter(
    r => (r.repair_type === 'external' || r.repair_type === 'rbe') && r.status === 'completed'
  )
  // 후보 원점: original_repair_id=null, 창이 발생일에 열려 있음(warranty_until >= occurredAt)
  const origins = completed
    .filter(r => r.original_repair_id === null && r.warranty_until !== null && r.warranty_until >= occurredAt)
    .sort((a, b) => (b.returned_at ?? '').localeCompare(a.returned_at ?? '')) // 최근 반환일 우선

  for (const o of origins) {
    const claims = completed.filter(r => r.original_repair_id === o.id).length
    if (claims < 2) {
      return {
        originalRepairId: o.id, isWarrantyClaim: true,
        claimSequence: claims + 1, activePeriodOriginId: o.id,
      }
    }
  }
  return NEW_PERIOD
}
