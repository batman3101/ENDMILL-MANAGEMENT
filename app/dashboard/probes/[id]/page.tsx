'use client'

import React, { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useProbeDetail, useProbeInspections, useProbeRepairs, useProbeMovements } from '../../../../lib/hooks/useProbes'
import { useEquipment } from '../../../../lib/hooks/useEquipment'
import { useAuth } from '../../../../lib/hooks/useAuth'
import { PROBE_STATUSES } from '../../../../lib/types/probe'
import ProbeRepairModal from '../../../../components/features/probe/ProbeRepairModal'
import ProbeMoveModal from '../../../../components/features/probe/ProbeMoveModal'

function equipmentLabel(equipmentNumber: number): string {
  return `C${String(equipmentNumber).padStart(3, '0')}`
}

const RESULT_BADGE: Record<string, string> = {
  OK: 'bg-success/10 text-success',
  NG: 'bg-danger/10 text-danger'
}

export default function ProbeDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { equipments } = useEquipment()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin'
  const equipmentMap = useMemo(() => new Map(equipments.map(eq => [eq.id, eq])), [equipments])

  const { data: detail, isLoading, refetch } = useProbeDetail(params.id)
  const { data: inspectionsRes, refetch: refetchInspections } = useProbeInspections(params.id)
  const { data: repairsRes, refetch: refetchRepairs } = useProbeRepairs(params.id)
  const { data: movementsRes, refetch: refetchMovements } = useProbeMovements(params.id)

  const [tab, setTab] = useState<'inspections' | 'repairs' | 'movements'>('inspections')
  const [repairModal, setRepairModal] = useState<'register' | 'process' | null>(null)
  const [showMove, setShowMove] = useState(false)

  const probe = detail?.data
  const inspections = inspectionsRes?.data ?? []
  const repairs = repairsRes?.data ?? []
  const movements = movementsRes?.data ?? []
  // 프로브당 오픈 수리는 1건뿐 (사내수리는 등록 즉시 완료 고정이라 오픈 상태가 없음)
  const openRepair = repairs.find(r => r.status !== 'completed') ?? null

  const refreshAll = () => { refetch(); refetchInspections(); refetchRepairs(); refetchMovements() }

  if (isLoading) return <div className="p-6">{t('common.loading')}</div>
  if (!probe) return <div className="p-6">{t('probe.notFound')}</div>

  const eq = probe.equipment_id ? equipmentMap.get(probe.equipment_id) : undefined
  const eqLabelOf = (id: string | null): string =>
    id ? (equipmentMap.get(id) ? equipmentLabel(equipmentMap.get(id)!.equipment_number) : id) : t('probe.equipmentNotAssigned')

  const changeStatus = async (status: string) => {
    const res = await fetch(`/api/probes/${probe.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    const json = await res.json()
    if (json.success) location.reload()
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <button onClick={() => router.back()} className="text-sm text-secondary-600">← {t('common.back')}</button>

      <div className="rounded-md border border-divider bg-paper-warm p-6">
        <div className="flex items-center gap-4">
          <h1 className="font-mono text-2xl font-bold">{probe.asset_number}</h1>
          {probe.current_result
            ? <span className={`rounded px-3 py-1 text-lg font-bold ${RESULT_BADGE[probe.current_result]}`}>{probe.current_result}</span>
            : <span className="rounded bg-secondary-100 px-3 py-1 text-lg font-medium text-secondary-500">{t('probe.uninspected')}</span>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div><span className="text-secondary-500">{t('probe.renishawSerial')}</span><p className="font-mono">{probe.renishaw_serial ?? '—'}</p></div>
          <div><span className="text-secondary-500">{t('probe.modelLabel')}</span><p>{probe.model ?? '—'}</p></div>
          <div><span className="text-secondary-500">{t('probe.equipmentLabel')}</span><p>{eq ? equipmentLabel(eq.equipment_number) : t('probe.equipmentNotAssigned')}</p></div>
          <div><span className="text-secondary-500">{t('probe.colStatus')}</span><p>{t(`probe.status_${probe.status}`)}</p></div>
          <div><span className="text-secondary-500">{t('probe.colRepeatability')}</span><p>{probe.last_repeatability_um != null ? `${probe.last_repeatability_um}µm` : '—'}</p></div>
          <div><span className="text-secondary-500">{t('probe.colLastInspected')}</span><p>{probe.last_inspected_at?.slice(0, 10) ?? '—'}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-secondary-500">{t('probe.changeStatus')}</label>
          <select
            value={probe.status}
            onChange={e => changeStatus(e.target.value)}
            className="min-h-touch rounded border border-divider pl-3 pr-8"
          >
            {PROBE_STATUSES.map(s => <option key={s} value={s}>{t(`probe.status_${s}`)}</option>)}
          </select>
          <button
            onClick={() => setShowMove(true)}
            className="min-h-touch rounded border px-4"
          >
            {t('probe.moveButton')}
          </button>
          <button
            onClick={() => setRepairModal('register')}
            disabled={!!openRepair}
            className="min-h-touch rounded border px-4 disabled:opacity-40"
          >
            {t('probe.repairRegister')}
          </button>
          {/* 승인·발송·입고는 관리자만 진행 (수리요청은 user, 진행은 admin+) */}
          {openRepair && isAdmin && (
            <button
              onClick={() => setRepairModal('process')}
              className="min-h-touch rounded bg-primary px-4 text-white"
            >
              {t('probe.repairProcess')}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-divider bg-paper-warm p-6">
        <div className="mb-3 flex gap-2 border-b border-divider">
          <button
            onClick={() => setTab('inspections')}
            className={`px-3 py-2 text-sm font-medium ${tab === 'inspections' ? 'border-b-2 border-primary text-primary' : 'text-secondary-500'}`}
          >
            {t('probe.tabInspections')}
          </button>
          <button
            onClick={() => setTab('repairs')}
            className={`px-3 py-2 text-sm font-medium ${tab === 'repairs' ? 'border-b-2 border-primary text-primary' : 'text-secondary-500'}`}
          >
            {t('probe.tabRepairs')}
          </button>
          <button
            onClick={() => setTab('movements')}
            className={`px-3 py-2 text-sm font-medium ${tab === 'movements' ? 'border-b-2 border-primary text-primary' : 'text-secondary-500'}`}
          >
            {t('probe.tabMovements')}
          </button>
        </div>

        {tab === 'inspections' && (
          !inspections.length ? (
            <p className="text-sm text-secondary-500">{t('probe.noInspections')}</p>
          ) : (
            <ul className="space-y-2">
              {inspections.map(ins => (
                <li key={ins.id} className="flex flex-wrap items-center gap-3 border-b border-divider/60 pb-2 text-sm">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${RESULT_BADGE[ins.judged_result] ?? ''}`}>
                    {ins.judged_result}{ins.previous_result ? ` (← ${ins.previous_result})` : ''}
                  </span>
                  <span>{ins.repeatability_um}µm</span>
                  <span className="text-secondary-500">{t(`probe.trigger_${ins.trigger_reason}`)}</span>
                  <span className="text-secondary-500">{ins.inspected_at.slice(0, 16).replace('T', ' ')}</span>
                  <span className="text-secondary-500">{ins.inspected_by_profile?.name ?? ''}</span>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'repairs' && (
          !repairs.length ? (
            <p className="text-sm text-secondary-500">{t('probe.noRepairs')}</p>
          ) : (
            <ul className="space-y-2">
              {repairs.map(r => {
                const reRepairCount = repairs.filter(x => x.original_repair_id === r.id).length
                const original = r.original_repair_id ? repairs.find(x => x.id === r.original_repair_id) : null
                return (
                <li key={r.id} className="space-y-1 border-b border-divider/60 pb-2 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded bg-secondary-100 px-2 py-0.5 text-xs font-bold">{t(`probe.repairType_${r.repair_type}`)}</span>
                    <span className="text-xs text-secondary-500">{t(`probe.repairStatus_${r.status}`)}</span>
                    {r.failure_type && <span>{t(`probe.failureType_${r.failure_type}`)}</span>}
                    <span className="text-secondary-500">{r.occurred_at}</span>
                    {r.original_repair_id && (
                      <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-800">
                        {t('probe.reRepairBadge')}
                        {original?.returned_at ? ` · ${t('probe.reRepairOriginalReturned')} ${original.returned_at}` : ''}
                      </span>
                    )}
                    {reRepairCount > 0 && (
                      <span className="rounded bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                        {t('probe.reRepairCountBadge', { n: reRepairCount })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-secondary-600">
                    {r.approved_at && <span>{t('probe.repairStatus_approved')}: {r.approved_at}</span>}
                    {r.sent_at && <span>{t('probe.sentAt')}: {r.sent_at}</span>}
                    {r.returned_at && <span>{t('probe.returnedAt')}: {r.returned_at}</span>}
                    {r.completed_at && <span>{t('probe.completedAt')}: {r.completed_at}</span>}
                    {r.warranty_until && <span>{t('probe.warrantyUntil')}: {r.warranty_until}</span>}
                    {r.replaced_parts && <span>{t('probe.replacedParts')}: {r.replaced_parts}</span>}
                    {r.serial_after && <span>{t('probe.serialAfter')}: {r.serial_before ?? '—'} → {r.serial_after}</span>}
                  </div>
                  {r.notes && <p className="text-xs text-secondary-500">{r.notes}</p>}
                </li>
                )
              })}
            </ul>
          )
        )}

        {tab === 'movements' && (
          !movements.length ? (
            <p className="text-sm text-secondary-500">{t('probe.noMovements')}</p>
          ) : (
            <ul className="space-y-2">
              {movements.map(m => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 border-b border-divider/60 pb-2 text-sm">
                  <span className="text-secondary-500">{m.moved_at}</span>
                  <span className="font-medium">
                    {eqLabelOf(m.from_equipment_id)} → {eqLabelOf(m.to_equipment_id)}
                  </span>
                  {m.moved_by_profile?.name && <span className="text-xs text-secondary-500">{m.moved_by_profile.name}</span>}
                  {m.notes && <span className="text-xs text-secondary-500">{m.notes}</span>}
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {repairModal && (
        <ProbeRepairModal
          probeId={probe.id}
          factoryId={probe.factory_id}
          mode={repairModal}
          openRepair={repairModal === 'process' ? openRepair : undefined}
          repairHistory={repairs}
          onDone={() => { setRepairModal(null); refreshAll() }}
          onCancel={() => setRepairModal(null)}
        />
      )}

      {showMove && (
        <ProbeMoveModal
          probeId={probe.id}
          factoryId={probe.factory_id}
          currentEquipmentId={probe.equipment_id}
          onDone={() => { setShowMove(false); refreshAll() }}
          onCancel={() => setShowMove(false)}
        />
      )}
    </div>
  )
}
