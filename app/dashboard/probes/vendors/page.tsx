'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useFactory } from '../../../../lib/hooks/useFactory'
import { useAuth } from '../../../../lib/hooks/useAuth'
import { useProbeVendors } from '../../../../lib/hooks/useProbeVendors'
import { ProbeVendor } from '../../../../lib/types/probe'
import ProbeVendorModal from '../../../../components/features/probe/ProbeVendorModal'
import ConfirmModal from '../../../../components/shared/ConfirmModal'
import { useToast } from '../../../../components/shared/Toast'

export default function ProbeVendorsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentFactory } = useFactory()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin'
  const { showError, showSuccess } = useToast()
  const factoryId = currentFactory?.id ?? null

  const { data: vendors = [], isLoading, refetch } = useProbeVendors(factoryId, undefined, false)

  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<ProbeVendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProbeVendor | null>(null)
  const [deleting, setDeleting] = useState(false)

  const refreshAll = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['probe-vendors'] })
  }

  const confirmDelete = async () => {
    const v = deleteTarget
    if (!v || !factoryId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/probe-vendors/${v.id}?factoryId=${factoryId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        showError(t('probe.vendorDeleteFailed'), json.error ?? '')
        return
      }
      showSuccess(t('probe.vendorDeleteSuccess'), v.name)
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
          <h1 className="text-2xl font-bold">{t('probe.vendorManage')}</h1>
          <p className="text-sm text-secondary-600">
            {t('probe.vendorTotalCount')}: {vendors.length.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/dashboard/probes')}
            className="min-h-touch rounded border px-4">
            {t('probe.title')}
          </button>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)}
              className="min-h-touch rounded bg-primary px-4 text-white">
              {t('probe.vendorAdd')}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-divider bg-paper-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <th className="p-3">{t('probe.vendorName')}</th>
              <th className="p-3">{t('probe.vendorRole')}</th>
              <th className="p-3">{t('probe.vendorContact')}</th>
              <th className="p-3">{t('probe.vendorPhone')}</th>
              <th className="p-3">{t('probe.vendorActive')}</th>
              <th className="p-3 text-right">{t('probe.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && vendors.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-secondary-500">{t('common.loading')}</td></tr>
            ) : vendors.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-secondary-500">{t('probe.vendorEmptyList')}</td></tr>
            ) : vendors.map(v => (
              <tr key={v.id} className="border-b border-divider/60">
                <td className="p-3">{v.name}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {v.is_repair_vendor && (
                      <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-800">
                        {t('probe.roleRepair')}
                      </span>
                    )}
                    {v.is_parts_vendor && (
                      <span className="rounded bg-secondary-100 px-1.5 py-0.5 text-[10px] font-medium text-secondary-700">
                        {t('probe.roleParts')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">{v.contact_name ?? '—'}</td>
                <td className="p-3">{v.phone ?? '—'}</td>
                <td className="p-3">
                  {v.is_active ? (
                    <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      {t('probe.vendorActive')}
                    </span>
                  ) : (
                    <span className="rounded bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-500">
                      {t('probe.vendorInactive')}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {isAdmin ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditTarget(v)}
                        className="rounded border border-secondary-400 px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
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

      {showAdd && (
        <ProbeVendorModal
          factoryId={factoryId}
          onDone={() => { setShowAdd(false); refreshAll() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {editTarget && (
        <ProbeVendorModal
          factoryId={factoryId}
          editVendor={editTarget}
          onDone={() => { setEditTarget(null); refreshAll() }}
          onCancel={() => setEditTarget(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        variant="danger"
        title={t('probe.vendorDeleteConfirm')}
        message={deleteTarget?.name}
        confirmLabel={t('common.delete')}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
