'use client'

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useProbes, useProbeStats, useProbeRepairs } from '../../../lib/hooks/useProbes'
import {
  Probe, ProbeResult, ProbeListParams, ProbeStatus, PROBE_RESULTS, PROBE_STATUSES, PROBE_MODELS
} from '../../../lib/types/probe'
import { useFactory } from '../../../lib/hooks/useFactory'
import { useAuth } from '../../../lib/hooks/useAuth'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useEquipment } from '../../../lib/hooks/useEquipment'
import { exportProbesToExcel } from '../../../lib/utils/probeExcelTemplate'
import ProbeCreateModal from '../../../components/features/probe/ProbeCreateModal'
import ProbeRepairModal from '../../../components/features/probe/ProbeRepairModal'
import ConfirmModal from '../../../components/shared/ConfirmModal'
import { useToast } from '../../../components/shared/Toast'

const ProbeExcelUploader = dynamic(
  () => import('../../../components/features/probe/ProbeExcelUploader'),
  { ssr: false }
)

const RESULT_COLOR: Record<ProbeResult, string> = {
  OK: 'bg-success/10 text-success', NG: 'bg-danger/10 text-danger'
}

// 설비번호는 DB에 숫자로 저장되고 화면 표기는 C001 형식(tool-changes 등록 화면과 동일 관례)
function equipmentLabel(equipmentNumber: number): string {
  return `C${String(equipmentNumber).padStart(3, '0')}`
}

export default function ProbesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { currentFactory } = useFactory()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin'
  const { settings } = useSettings()
  const { showError, showSuccess } = useToast()
  const { equipments } = useEquipment()
  const models = settings.probe?.models ?? [...PROBE_MODELS]

  const equipmentMap = useMemo(
    () => new Map(equipments.map(eq => [eq.id, eq])),
    [equipments]
  )

  const [showUploader, setShowUploader] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Probe | null>(null)
  const [repairTarget, setRepairTarget] = useState<Probe | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [params, setParams] = useState<ProbeListParams>({
    page: 1, pageSize: 50, sortBy: 'asset_number', sortDir: 'asc'
  })

  // 검색 디바운스 300ms — 타이핑마다 요청 방지 (자산번호는 자유형식이라 대소문자 변환하지 않음)
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(p => ({ ...p, page: 1, search: searchInput.trim() || undefined }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, refetch } = useProbes(params)
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / params.pageSize))

  const { data: statsRes, refetch: refetchStats } = useProbeStats()
  const stats = statsRes?.data

  // 수리 등록 모달의 보증 재수리 후보 판단용 — 대상 프로브의 수리 이력만 지연 로드
  const { data: repairHistoryRes } = useProbeRepairs(repairTarget?.id ?? null)

  const goReInspect = (p: Probe) => {
    router.push(`/dashboard/probes/inspect?asset=${encodeURIComponent(p.asset_number)}`)
  }

  const confirmDelete = async () => {
    const p = pendingDelete
    if (!p) return
    setDeletingId(p.id)
    try {
      const res = await fetch(`/api/probes/${p.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { showError(t('probe.deleteFailed'), json.error ?? ''); return }
      showSuccess(t('probe.deleteSuccess'), p.asset_number)
      refetch()
      refetchStats()
    } finally {
      setDeletingId(null)
      setPendingDelete(null)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t('probe.title')}</h1>
          <p className="text-sm text-secondary-600">
            {t('probe.totalRegistered')}: {total.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/dashboard/probes/inspect')}
            className="min-h-touch rounded border border-primary px-4 text-primary">
            {t('probe.inspectMode')}
          </button>
          <button onClick={() => router.push('/dashboard/probes/repairs')}
            className="min-h-touch rounded border px-4">
            {t('probe.repairsPageTitle')}
          </button>
          {isAdmin && (
            <button onClick={() => router.push('/dashboard/probes/vendors')}
              className="min-h-touch rounded border px-4">
              {t('probe.vendorManage')}
            </button>
          )}
          <button onClick={() => setShowCreate(true)}
            className="min-h-touch rounded border px-4">
            {t('probe.createNew')}
          </button>
          <button onClick={() => setShowUploader(true)}
            className="min-h-touch rounded bg-primary px-4 text-white">
            {t('probe.bulkUploadTitle')}
          </button>
          <button
            disabled={exporting}
            onClick={async () => {
              if (!currentFactory?.id) return
              setExporting(true)
              try {
                await exportProbesToExcel(
                  currentFactory.id,
                  { result: params.result, status: params.status, model: params.model, search: params.search },
                  equipmentMap
                )
              } catch {
                showError(t('probe.exportFailed'), '')
              } finally {
                setExporting(false)
              }
            }}
            className="min-h-touch rounded border px-4 disabled:opacity-40"
          >
            {t('probe.exportExcel')}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-md border border-success bg-success/5 p-3 text-center">
            <p className="text-xs text-success">OK</p>
            <p className="text-xl font-bold text-success">{stats.ok.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-danger bg-danger/5 p-3 text-center">
            <p className="text-xs text-danger">NG</p>
            <p className="text-xl font-bold text-danger">{stats.ng.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-divider bg-paper-warm p-3 text-center">
            <p className="text-xs text-secondary-500">{t('probe.uninspected')}</p>
            <p className="text-xl font-bold">{stats.uninspected.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-divider bg-paper-warm p-3 text-center">
            <p className="text-xs text-secondary-500">{t('probe.inRepairCount')}</p>
            <p className="text-xl font-bold">{stats.inRepair.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-warning bg-warning/5 p-3 text-center">
            <p className="text-xs text-warning">{t('probe.overdue')}</p>
            <p className="text-xl font-bold text-warning">{stats.overdue.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder={t('probe.searchPlaceholder')}
          className="min-h-touch w-56 rounded border border-divider px-3"
        />
        <select
          value={params.result ?? ''}
          onChange={e => setParams(p => ({ ...p, page: 1, result: (e.target.value || undefined) as ProbeResult | undefined }))}
          className="min-h-touch rounded border border-divider pl-3 pr-8"
        >
          <option value="">{t('probe.allGrades')}</option>
          {PROBE_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="none">{t('probe.uninspected')}</option>
        </select>
        <select
          value={params.status ?? ''}
          onChange={e => setParams(p => ({ ...p, page: 1, status: (e.target.value || undefined) as ProbeStatus | undefined }))}
          className="min-h-touch rounded border border-divider pl-3 pr-8"
        >
          <option value="">{t('probe.allStatuses')}</option>
          {PROBE_STATUSES.map(s => <option key={s} value={s}>{t(`probe.status_${s}`)}</option>)}
        </select>
        <select
          value={params.model ?? ''}
          onChange={e => setParams(p => ({ ...p, page: 1, model: e.target.value || undefined }))}
          className="min-h-touch rounded border border-divider pl-3 pr-8"
        >
          <option value="">{t('probe.allModels')}</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-divider bg-paper-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <th className="p-3">{t('probe.colAsset')}</th>
              <th className="p-3">{t('probe.colSerial')}</th>
              <th className="p-3">{t('probe.colModel')}</th>
              <th className="p-3">{t('probe.colEquipment')}</th>
              <th className="p-3">{t('probe.colGrade')}</th>
              <th className="p-3">{t('probe.colRepeatability')}</th>
              <th className="p-3">{t('probe.colLastInspected')}</th>
              <th className="p-3">{t('probe.colStatus')}</th>
              <th className="p-3 text-right">{t('probe.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-secondary-500">{t('common.loading')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-secondary-500">{t('probe.emptyList')}</td></tr>
            ) : rows.map(p => {
              const eq = p.equipment_id ? equipmentMap.get(p.equipment_id) : undefined
              return (
                <tr key={p.id}
                  onClick={() => router.push(`/dashboard/probes/${p.id}`)}
                  className="cursor-pointer border-b border-divider/60 hover:bg-secondary-50">
                  <td className="p-3 font-mono">{p.asset_number}</td>
                  <td className="p-3 font-mono text-xs">{p.renishaw_serial ?? '—'}</td>
                  <td className="p-3">{p.model ?? '—'}</td>
                  <td className="p-3">{eq ? equipmentLabel(eq.equipment_number) : t('probe.equipmentNotAssigned')}</td>
                  <td className="p-3">
                    {p.current_result
                      ? <span
                          title={p.current_result === 'NG' ? t('probe.ngHint') : undefined}
                          className={`rounded px-2 py-0.5 text-xs font-bold ${RESULT_COLOR[p.current_result]}`}
                        >
                          {p.current_result}
                        </span>
                      : <span className="text-xs text-secondary-400">{t('probe.uninspected')}</span>}
                  </td>
                  <td className="p-3">{p.last_repeatability_um != null ? `${p.last_repeatability_um}µm` : '—'}</td>
                  <td className="p-3">{p.last_inspected_at ? p.last_inspected_at.slice(0, 10) : '—'}</td>
                  <td className="p-3">{t(`probe.status_${p.status}`)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); goReInspect(p) }}
                        className="rounded border border-primary px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50"
                      >
                        {t('probe.reInspect')}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setRepairTarget(p) }}
                        className="rounded border border-secondary-400 px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                      >
                        {t('probe.repairRegister')}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setPendingDelete(p) }}
                        disabled={deletingId === p.id}
                        className="rounded border border-danger px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-40"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button disabled={params.page <= 1}
          onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
          className="min-h-touch rounded border px-3 disabled:opacity-40">{t('common.prev')}</button>
        <span className="text-sm">{params.page} / {lastPage}</span>
        <button disabled={params.page >= lastPage}
          onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
          className="min-h-touch rounded border px-3 disabled:opacity-40">{t('common.next')}</button>
      </div>

      {showCreate && (
        <ProbeCreateModal
          onCreated={() => { setShowCreate(false); refetch(); refetchStats() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {showUploader && (
        <ProbeExcelUploader
          onUploadSuccess={() => { refetch(); refetchStats() }}
          onCancel={() => setShowUploader(false)}
        />
      )}

      {repairTarget && currentFactory?.id && (
        <ProbeRepairModal
          probeId={repairTarget.id}
          factoryId={currentFactory.id}
          mode="register"
          repairHistory={repairHistoryRes?.data ?? []}
          onDone={() => { setRepairTarget(null); refetch(); refetchStats() }}
          onCancel={() => setRepairTarget(null)}
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        variant="danger"
        title={t('probe.deleteConfirm')}
        message={pendingDelete?.asset_number}
        confirmLabel={t('common.delete')}
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
