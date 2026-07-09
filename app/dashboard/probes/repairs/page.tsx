'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Probe, ProbeRepair } from '../../../../lib/types/probe'
import { useFactory } from '../../../../lib/hooks/useFactory'
import { useAuth } from '../../../../lib/hooks/useAuth'
import { useProbeRepairs } from '../../../../lib/hooks/useProbes'
import { useToast } from '../../../../components/shared/Toast'
import { exportProbeRepairsToExcel } from '../../../../lib/utils/probeExcelTemplate'
import ProbeRepairModal from '../../../../components/features/probe/ProbeRepairModal'
import ProbeRepairStatsSection from '../../../../components/features/probe/ProbeRepairStatsSection'
import ConfirmModal from '../../../../components/shared/ConfirmModal'

type RepairRow = ProbeRepair & {
  probe?: { asset_number?: string; model?: string; equipment_id?: string | null } | null
  // 재수리 행이 참조하는 원 수리 건 (보증 재수리 뱃지의 날짜 표시용)
  original?: { occurred_at: string; returned_at: string | null; warranty_until: string | null } | null
  // 이 건을 원 수리로 참조하는 재수리 건수
  reRepairCount?: number
}

type RepairFilter = 'all' | 'open' | 'overdue' | 'warranty' | 'completed'

const FILTERS: { key: RepairFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'probe.repairsAll' },
  { key: 'open', labelKey: 'probe.repairsInProgress' },
  { key: 'overdue', labelKey: 'probe.repairsOverdue' },
  { key: 'warranty', labelKey: 'probe.repairsWarrantyEligible' },
  { key: 'completed', labelKey: 'probe.repairStatus_completed' }
]

// 필터 키 → GET /api/probes/repairs 쿼리 파라미터 매핑
function filterParams(filter: RepairFilter): Record<string, string> {
  switch (filter) {
    case 'open': return { status: 'open' }
    case 'overdue': return { overdueOnly: 'true' }
    case 'warranty': return { warrantyRerepair: 'true' }
    case 'completed': return { status: 'completed' }
    default: return {}
  }
}

const STATUS_COLOR: Record<string, string> = {
  reported: 'bg-secondary-100 text-secondary-700',
  approved: 'bg-primary-100 text-primary-800',
  sent: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success'
}

const PAGE_SIZE = 50

// 수리 등록 대상 프로브 검색·선택 모달 (현황 페이지는 프로브 컨텍스트가 없으므로 먼저 개체를 고른다)
function ProbePickerModal({ factoryId, onPick, onCancel }: {
  factoryId: string
  onPick: (probe: Probe) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data } = useQuery({
    queryKey: ['probe-picker', factoryId, search],
    queryFn: async () => {
      const sp = new URLSearchParams({ factoryId, page: '1', pageSize: '20' })
      if (search) sp.set('search', search)
      const res = await fetch(`/api/probes?${sp.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'probe search failed')
      return json.data as Probe[]
    }
  })
  const candidates = data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">{t('probe.probePickerTitle')}</h2>
        <input
          autoFocus
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder={t('probe.probePickerPlaceholder')}
          className="min-h-touch mb-3 w-full rounded border border-divider px-3"
        />
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="p-3 text-center text-sm text-secondary-500">{t('probe.probePickerEmpty')}</p>
          ) : candidates.map(p => (
            <button key={p.id} onClick={() => onPick(p)}
              className="flex w-full items-center justify-between rounded border border-divider px-3 py-2 text-left text-sm hover:bg-secondary-50">
              <span className="font-mono">{p.asset_number}</span>
              <span className="text-xs text-secondary-500">{p.model} · {t(`probe.status_${p.status}`)}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onCancel} className="min-h-touch rounded border px-4">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

export default function ProbeRepairsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentFactory } = useFactory()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin'
  const { showError, showSuccess } = useToast()
  const factoryId = currentFactory?.id

  const [filter, setFilter] = useState<RepairFilter>('all')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [registerTarget, setRegisterTarget] = useState<Probe | null>(null)
  const [processTarget, setProcessTarget] = useState<RepairRow | null>(null)
  const [editTarget, setEditTarget] = useState<RepairRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RepairRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['probe-repairs-all', factoryId, filter, page],
    enabled: !!factoryId,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const sp = new URLSearchParams({
        factoryId: factoryId as string,
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...filterParams(filter)
      })
      const res = await fetch(`/api/probes/repairs?${sp.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'repairs fetch failed')
      return json as { data: RepairRow[]; pagination: { total: number } }
    }
  })

  // 등록 모달의 보증 재수리 후보 탐색용 — 선택된 프로브의 이력만 지연 로드
  const { data: registerHistoryRes } = useProbeRepairs(registerTarget?.id ?? null)

  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const refreshAll = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['probe-repair-stats'] })
    queryClient.invalidateQueries({ queryKey: ['probe-stats'] })
    queryClient.invalidateQueries({ queryKey: ['probes'] })
  }

  const handleExport = async () => {
    if (!factoryId) return
    setExporting(true)
    try {
      const p = filterParams(filter)
      await exportProbeRepairsToExcel(factoryId, {
        status: p.status,
        overdueOnly: p.overdueOnly === 'true',
        warrantyRerepair: p.warrantyRerepair === 'true'
      })
    } catch {
      showError(t('probe.exportFailed'), '')
    } finally {
      setExporting(false)
    }
  }

  const confirmDelete = async () => {
    const r = deleteTarget
    if (!r || !factoryId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/probes/${r.probe_id}/repairs?repairId=${r.id}&factoryId=${factoryId}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (!json.success) {
        showError(t('probe.repairFailed'), json.error ?? '')
        return
      }
      showSuccess(t('probe.repairDeleteSuccess'), r.probe?.asset_number ?? '')
      refreshAll()
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (!factoryId) {
    return (
      <div className="p-6 text-center text-secondary-500">
        {t('probe.selectFactoryFirst')}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t('probe.repairsPageTitle')}</h1>
          <p className="text-sm text-secondary-600">
            {t('probe.repairsTotalCount')}: {total.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/dashboard/probes')}
            className="min-h-touch rounded border px-4">
            {t('probe.title')}
          </button>
          <button onClick={() => setShowPicker(true)}
            className="min-h-touch rounded bg-primary px-4 text-white">
            {t('probe.repairRegister')}
          </button>
          <button
            disabled={exporting}
            onClick={handleExport}
            className="min-h-touch rounded border px-4 disabled:opacity-40"
          >
            {t('probe.exportExcel')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1) }}
            className={`min-h-touch rounded-full border px-4 text-sm ${
              filter === f.key
                ? 'border-primary bg-primary text-white'
                : 'border-divider bg-paper-warm text-secondary-700'
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-divider bg-paper-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <th className="p-3">{t('probe.colAsset')}</th>
              <th className="p-3">{t('probe.colModel')}</th>
              <th className="p-3">{t('probe.repairType')}</th>
              <th className="p-3">{t('probe.failureType')}</th>
              <th className="p-3">{t('probe.colStatus')}</th>
              <th className="p-3">{t('probe.occurredAt')}</th>
              <th className="p-3">{t('probe.sentAt')}</th>
              <th className="p-3">{t('probe.returnedAt')}</th>
              <th className="p-3">{t('probe.warrantyUntil')}</th>
              <th className="p-3 text-right">{t('probe.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr><td colSpan={10} className="p-6 text-center text-secondary-500">{t('common.loading')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="p-6 text-center text-secondary-500">{t('probe.repairsEmptyList')}</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}
                onClick={() => router.push(`/dashboard/probes/${r.probe_id}`)}
                className="cursor-pointer border-b border-divider/60 hover:bg-secondary-50">
                <td className="p-3 font-mono">{r.probe?.asset_number ?? '—'}</td>
                <td className="p-3">{r.probe?.model ?? '—'}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <span>{t(`probe.repairType_${r.repair_type}`)}</span>
                    {r.original_repair_id && (
                      <span className="inline-flex w-fit items-center rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-800">
                        {t('probe.reRepairBadge')}
                        {r.original?.returned_at ? ` · ${t('probe.reRepairOriginalReturned')} ${r.original.returned_at}` : ''}
                      </span>
                    )}
                    {(r.reRepairCount ?? 0) > 0 && (
                      <span className="inline-flex w-fit items-center rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                        {t('probe.reRepairCountBadge', { n: r.reRepairCount })}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{r.failure_type ? t(`probe.failureType_${r.failure_type}`) : '—'}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                    {t(`probe.repairStatus_${r.status}`)}
                  </span>
                </td>
                <td className="p-3">{r.occurred_at}</td>
                <td className="p-3">{r.sent_at ?? '—'}</td>
                <td className="p-3">{r.returned_at ?? r.completed_at ?? '—'}</td>
                <td className="p-3">{r.warranty_until ?? '—'}</td>
                <td className="p-3">
                  {/* 승인·발송·입고·수정·삭제는 관리자 전용 (수리 요청은 사용자 가능) */}
                  {isAdmin ? (
                    <div className="flex justify-end gap-2">
                      {r.status !== 'completed' && (
                        <button
                          onClick={e => { e.stopPropagation(); setProcessTarget(r) }}
                          className="rounded border border-primary px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50"
                        >
                          {t('probe.repairProcess')}
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setEditTarget(r) }}
                        className="rounded border border-secondary-400 px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(r) }}
                        className="rounded border border-danger px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  ) : (
                    <span className="block text-right text-xs text-secondary-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button disabled={page <= 1}
          onClick={() => setPage(p => p - 1)}
          className="min-h-touch rounded border px-3 disabled:opacity-40">{t('common.prev')}</button>
        <span className="text-sm">{page} / {lastPage}</span>
        <button disabled={page >= lastPage}
          onClick={() => setPage(p => p + 1)}
          className="min-h-touch rounded border px-3 disabled:opacity-40">{t('common.next')}</button>
      </div>

      <ProbeRepairStatsSection />

      {showPicker && (
        <ProbePickerModal
          factoryId={factoryId}
          onPick={p => { setShowPicker(false); setRegisterTarget(p) }}
          onCancel={() => setShowPicker(false)}
        />
      )}

      {registerTarget && (
        <ProbeRepairModal
          probeId={registerTarget.id}
          factoryId={factoryId}
          mode="register"
          repairHistory={registerHistoryRes?.data ?? []}
          onDone={() => { setRegisterTarget(null); refreshAll() }}
          onCancel={() => setRegisterTarget(null)}
        />
      )}

      {processTarget && (
        <ProbeRepairModal
          probeId={processTarget.probe_id}
          factoryId={factoryId}
          mode="process"
          openRepair={processTarget}
          onDone={() => { setProcessTarget(null); refreshAll() }}
          onCancel={() => setProcessTarget(null)}
        />
      )}

      {editTarget && (
        <ProbeRepairModal
          probeId={editTarget.probe_id}
          factoryId={factoryId}
          mode="edit"
          editRepair={editTarget}
          onDone={() => { setEditTarget(null); refreshAll() }}
          onCancel={() => setEditTarget(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('probe.repairDeleteConfirm')}
        message={deleteTarget ? `${deleteTarget.probe?.asset_number ?? ''} · ${t(`probe.repairType_${deleteTarget.repair_type}`)} · ${deleteTarget.occurred_at}` : ''}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
