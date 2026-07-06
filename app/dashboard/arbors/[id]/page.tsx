'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useArborDetail, useArborInspections } from '../../../../lib/hooks/useArbors'
import { ARBOR_STATUSES } from '../../../../lib/types/arbor'

export default function ArborDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: detail, isLoading } = useArborDetail(params.id)
  const { data: history } = useArborInspections(params.id)

  if (isLoading) return <div className="p-6">{t('common.loading')}</div>
  const arbor = detail?.data
  if (!arbor) return <div className="p-6">{t('arbor.notFound')}</div>

  const changeStatus = async (status: string) => {
    const res = await fetch(`/api/arbors/${arbor.id}`, {
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
          <h1 className="font-mono text-2xl font-bold">{arbor.serial_number}</h1>
          <span className="rounded bg-primary-100 px-3 py-1 text-lg font-bold text-primary-800">
            {arbor.current_grade ?? t('arbor.uninspected')}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div><span className="text-secondary-500">{t('arbor.colModel')}</span><p>{arbor.arbor_model ?? '—'}</p></div>
          <div><span className="text-secondary-500">{t('arbor.colToolDiameter')}</span><p>{arbor.tool_diameter ?? '—'}</p></div>
          <div><span className="text-secondary-500">{t('arbor.colStatus')}</span><p>{t(`arbor.status_${arbor.status}`)}</p></div>
          <div><span className="text-secondary-500">{t('arbor.colRunout')}</span><p>{arbor.last_runout_um != null ? `${arbor.last_runout_um}µm` : '—'}</p></div>
          <div><span className="text-secondary-500">{t('arbor.colLastInspected')}</span><p>{arbor.last_inspected_at?.slice(0, 10) ?? '—'}</p></div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <label className="text-sm text-secondary-500">{t('arbor.changeStatus')}</label>
          <select
            value={arbor.status}
            onChange={e => changeStatus(e.target.value)}
            className="min-h-touch rounded border border-divider pl-3 pr-8"
          >
            {ARBOR_STATUSES.map(s => <option key={s} value={s}>{t(`arbor.status_${s}`)}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-md border border-divider bg-paper-warm p-6">
        <h2 className="mb-3 text-lg font-bold">{t('arbor.inspectionHistory')}</h2>
        {!history?.data?.length ? (
          <p className="text-sm text-secondary-500">{t('arbor.noInspections')}</p>
        ) : (
          <ul className="space-y-2">
            {history.data.map(ins => (
              <li key={ins.id} className="flex flex-wrap items-center gap-3 border-b border-divider/60 pb-2 text-sm">
                <span className="w-24 font-bold">{ins.judged_grade}{ins.previous_grade ? ` (← ${ins.previous_grade})` : ''}</span>
                <span>{ins.runout_um}µm</span>
                <span>{ins.taper_condition}</span>
                <span className="text-secondary-500">{ins.inspected_at.slice(0, 16).replace('T', ' ')}</span>
                <span className="text-secondary-500">{ins.inspected_by_profile?.name ?? ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
