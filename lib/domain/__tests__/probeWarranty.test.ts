import { classifyExternalWarranty, PriorRepair } from '../probeWarranty'

const origin = (over: Partial<PriorRepair>): PriorRepair => ({
  id: 'r0', repair_type: 'external', vendor_id: 'V', status: 'completed',
  returned_at: '2026-01-10', original_repair_id: null, warranty_until: '2026-07-10', ...over,
})

describe('classifyExternalWarranty', () => {
  it('이력 없으면 새 원점(청구 아님)', () => {
    const r = classifyExternalWarranty([], '2026-02-01')
    expect(r).toEqual({ originalRepairId: null, isWarrantyClaim: false, claimSequence: 0, activePeriodOriginId: null })
  })

  it('창 내 1회차는 보증 청구(seq 1)', () => {
    const r = classifyExternalWarranty([origin({})], '2026-03-01')
    expect(r).toEqual({ originalRepairId: 'r0', isWarrantyClaim: true, claimSequence: 1, activePeriodOriginId: 'r0' })
  })

  it('창 내 2회차는 보증 청구(seq 2)', () => {
    const prior = [
      origin({}),
      { id: 'w1', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-03-05', original_repair_id: 'r0', warranty_until: '2026-09-05' },
    ]
    const r = classifyExternalWarranty(prior, '2026-05-01')
    expect(r.isWarrantyClaim).toBe(true)
    expect(r.claimSequence).toBe(2)
    expect(r.originalRepairId).toBe('r0')
  })

  it('창 내 3회차는 새 원점(리셋)', () => {
    const prior = [
      origin({}),
      { id: 'w1', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-03-05', original_repair_id: 'r0', warranty_until: '2026-09-05' },
      { id: 'w2', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-05-04', original_repair_id: 'r0', warranty_until: '2026-11-04' },
    ]
    const r = classifyExternalWarranty(prior, '2026-06-01')
    expect(r).toEqual({ originalRepairId: null, isWarrantyClaim: false, claimSequence: 0, activePeriodOriginId: null })
  })

  it('창 만료 후에는 새 원점', () => {
    const r = classifyExternalWarranty([origin({ warranty_until: '2026-07-10' })], '2026-08-01')
    expect(r.isWarrantyClaim).toBe(false)
    expect(r.originalRepairId).toBeNull()
  })

  it('미완료(open) 원점은 후보 아님 → 새 원점', () => {
    const r = classifyExternalWarranty([origin({ status: 'sent', returned_at: null, warranty_until: null })], '2026-03-01')
    expect(r.isWarrantyClaim).toBe(false)
  })

  it('가장 최근 활성 원점을 사용(리셋 이후 새 원점 우선)', () => {
    const prior = [
      origin({ id: 'r0', returned_at: '2026-01-10', warranty_until: '2026-07-10' }),
      { id: 'w1', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-03-05', original_repair_id: 'r0', warranty_until: '2026-09-05' },
      { id: 'w2', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-05-04', original_repair_id: 'r0', warranty_until: '2026-11-04' },
      origin({ id: 'r1', returned_at: '2026-06-05', warranty_until: '2026-12-05' }),
    ]
    const r = classifyExternalWarranty(prior, '2026-07-01')
    expect(r.originalRepairId).toBe('r1')
    expect(r.claimSequence).toBe(1)
  })
})
