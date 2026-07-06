'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useArbors, useArborStats } from '../../../lib/hooks/useArbors'
import { Arbor, ArborGrade, ArborListParams, ArborStatus, ARBOR_GRADES, ARBOR_STATUSES } from '../../../lib/types/arbor'
import { useFactory } from '../../../lib/hooks/useFactory'
import { exportArborsToExcel } from '../../../lib/utils/arborExcelTemplate'
import ArborReferencePanel from '../../../components/features/arbor/ArborReferencePanel'
import ArborCreateModal from '../../../components/features/arbor/ArborCreateModal'
import ConfirmModal from '../../../components/shared/ConfirmModal'
import { useToast } from '../../../components/shared/Toast'

const ArborExcelUploader = dynamic(
  () => import('../../../components/features/arbor/ArborExcelUploader'),
  { ssr: false }
)

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-success/10 text-success', B: 'bg-primary-100 text-primary-800',
  C: 'bg-warning/10 text-warning', D: 'bg-danger/10 text-danger'
}

export default function ArborsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { currentFactory } = useFactory()
  const { showError, showSuccess } = useToast()
  const [showUploader, setShowUploader] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Arbor | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [params, setParams] = useState<ArborListParams>({
    page: 1, pageSize: 50, sortBy: 'serial_number', sortDir: 'asc'
  })

  // 검색 디바운스 300ms — 타이핑마다 요청 방지
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(p => ({ ...p, page: 1, search: searchInput.toUpperCase() || undefined }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, refetch } = useArbors(params)
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / params.pageSize))

  const { data: statsRes, refetch: refetchStats } = useArborStats()
  const stats = statsRes?.data

  // 재검사: 검사 모드로 해당 시리얼을 미리 조회한 상태로 진입
  const goReInspect = (a: Arbor) => {
    router.push(`/dashboard/arbors/inspect?serial=${encodeURIComponent(a.serial_number)}`)
  }

  // 삭제: D등급(폐기)은 이력이 있어도 삭제, 그 외 이력 보유 건은 서버가 409로 거부
  const confirmDelete = async () => {
    const a = pendingDelete
    if (!a) return
    setDeletingId(a.id)
    try {
      const res = await fetch(`/api/arbors/${a.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { showError(t('arbor.deleteFailed'), json.error ?? ''); return }
      showSuccess(t('arbor.deleteSuccess'), a.serial_number)
      refetch()
      refetchStats() // 등급별 수량 카드 갱신 (삭제 반영)
    } finally {
      setDeletingId(null)
      setPendingDelete(null)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t('arbor.title')}</h1>
          <p className="text-sm text-secondary-600">
            {t('arbor.totalRegistered')}: {total.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/dashboard/arbors/inspect')}
            className="min-h-touch rounded border border-primary px-4 text-primary">
            {t('arbor.inspectMode')}
          </button>
          <button
            disabled={exporting}
            onClick={async () => {
              if (!currentFactory?.id) return
              setExporting(true)
              try {
                await exportArborsToExcel(
                  currentFactory.id,
                  { grade: params.grade, status: params.status, search: params.search }
                )
              } catch {
                showError(t('arbor.exportFailed'), '')
              } finally {
                setExporting(false)
              }
            }}
            className="min-h-touch rounded border px-4 disabled:opacity-40"
          >
            {t('arbor.exportExcel')}
          </button>
          <button onClick={() => setShowCreate(true)}
            className="min-h-touch rounded border px-4">
            {t('arbor.createNew')}
          </button>
          <button onClick={() => setShowUploader(true)}
            className="min-h-touch rounded bg-primary px-4 text-white">
            {t('arbor.bulkUploadTitle')}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([['A', stats.gradeA], ['B', stats.gradeB], ['C', stats.gradeC], ['D', stats.gradeD]] as const).map(([g, n]) => (
            <div key={g} className="rounded-md border border-divider bg-paper-warm p-3 text-center">
              <p className="text-xs text-secondary-500">{g}{t('arbor.gradeSuffix')}</p>
              <p className="text-xl font-bold">{n.toLocaleString()}</p>
            </div>
          ))}
          <div className="rounded-md border border-divider bg-paper-warm p-3 text-center">
            <p className="text-xs text-secondary-500">{t('arbor.uninspected')}</p>
            <p className="text-xl font-bold">{stats.uninspected.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-warning bg-warning/5 p-3 text-center">
            <p className="text-xs text-warning">{t('arbor.overdue')}</p>
            <p className="text-xl font-bold text-warning">{stats.overdue.toLocaleString()}</p>
          </div>
        </div>
      )}

      <ArborReferencePanel />

      <div className="flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder={t('arbor.searchPlaceholder')}
          className="min-h-touch w-56 rounded border border-divider px-3"
        />
        <select
          value={params.grade ?? ''}
          onChange={e => setParams(p => ({ ...p, page: 1, grade: (e.target.value || undefined) as ArborGrade | undefined }))}
          className="min-h-touch rounded border border-divider pl-3 pr-8"
        >
          <option value="">{t('arbor.allGrades')}</option>
          {ARBOR_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={params.status ?? ''}
          onChange={e => setParams(p => ({ ...p, page: 1, status: (e.target.value || undefined) as ArborStatus | undefined }))}
          className="min-h-touch rounded border border-divider pl-3 pr-8"
        >
          <option value="">{t('arbor.allStatuses')}</option>
          {ARBOR_STATUSES.map(s => <option key={s} value={s}>{t(`arbor.status_${s}`)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-divider bg-paper-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <th className="p-3">{t('arbor.colSerial')}</th>
              <th className="p-3">{t('arbor.colModel')}</th>
              <th className="p-3">{t('arbor.colToolDiameter')}</th>
              <th className="p-3">{t('arbor.colRunout')}</th>
              <th className="p-3">{t('arbor.colTaperStatus')}</th>
              <th className="p-3">{t('arbor.colGrade')}</th>
              <th className="p-3">{t('arbor.colLastInspected')}</th>
              <th className="p-3 text-right">{t('arbor.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-secondary-500">{t('common.loading')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-secondary-500">{t('arbor.emptyList')}</td></tr>
            ) : rows.map(a => (
              <tr key={a.id}
                onClick={() => router.push(`/dashboard/arbors/${a.id}`)}
                className="cursor-pointer border-b border-divider/60 hover:bg-secondary-50">
                <td className="p-3 font-mono">{a.serial_number}</td>
                <td className="p-3">{a.arbor_model ?? '—'}</td>
                <td className="p-3">{a.tool_diameter ?? '—'}</td>
                <td className="p-3">{a.last_runout_um != null ? `${a.last_runout_um}µm` : '—'}</td>
                <td className="p-3">{a.last_taper_condition ?? '—'}</td>
                <td className="p-3">
                  {a.current_grade
                    ? <span className={`rounded px-2 py-0.5 text-xs font-bold ${GRADE_COLOR[a.current_grade]}`}>{a.current_grade}</span>
                    : <span className="text-xs text-secondary-400">{t('arbor.uninspected')}</span>}
                </td>
                <td className="p-3">{a.last_inspected_at ? a.last_inspected_at.slice(0, 10) : '—'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); goReInspect(a) }}
                      className="rounded border border-primary px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50"
                    >
                      {t('arbor.reInspect')}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setPendingDelete(a) }}
                      disabled={deletingId === a.id}
                      className="rounded border border-danger px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-40"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
        <ArborCreateModal
          onCreated={() => { setShowCreate(false); refetch(); refetchStats() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {showUploader && (
        <ArborExcelUploader
          onUploadSuccess={() => { refetch(); refetchStats() }}
          onCancel={() => setShowUploader(false)}
        />
      )}

      <ConfirmModal
        open={!!pendingDelete}
        variant="danger"
        title={t('arbor.deleteConfirm')}
        message={pendingDelete?.serial_number}
        confirmLabel={t('common.delete')}
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
