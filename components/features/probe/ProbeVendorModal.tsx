'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import { ProbeVendor } from '@/lib/types/probe'

interface ProbeVendorModalProps {
  factoryId: string
  editVendor?: ProbeVendor | null
  onDone: () => void
  onCancel: () => void
}

export default function ProbeVendorModal({
  factoryId, editVendor, onDone, onCancel
}: ProbeVendorModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const dragRef = useDraggableModal()

  const [name, setName] = useState(editVendor?.name ?? '')
  const [isRepair, setIsRepair] = useState(editVendor?.is_repair_vendor ?? false)
  const [isParts, setIsParts] = useState(editVendor?.is_parts_vendor ?? false)
  const [contactName, setContactName] = useState(editVendor?.contact_name ?? '')
  const [phone, setPhone] = useState(editVendor?.phone ?? '')
  const [notes, setNotes] = useState(editVendor?.notes ?? '')
  const [isActive, setIsActive] = useState(editVendor?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  const valid = name.trim().length > 0 && (isRepair || isParts)

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      const url = editVendor ? `/api/probe-vendors/${editVendor.id}` : '/api/probe-vendors'
      const res = await fetch(url, {
        method: editVendor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId, name: name.trim(), is_repair_vendor: isRepair, is_parts_vendor: isParts,
          contact_name: contactName.trim() || undefined, phone: phone.trim() || undefined,
          notes: notes.trim() || undefined, ...(editVendor ? { is_active: isActive } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) { showError(t('probe.vendorSaveFailed'), json.error ?? ''); return }
      showSuccess(t('probe.vendorSaveSuccess'), name.trim())
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dragRef} className="w-full max-w-md rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">
          {editVendor ? t('probe.vendorEditTitle') : t('probe.vendorAddTitle')}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('probe.vendorName')} <span className="text-danger">*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.vendorRole')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isRepair} onChange={e => setIsRepair(e.target.checked)} />
                {t('probe.roleRepair')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isParts} onChange={e => setIsParts(e.target.checked)} />
                {t('probe.roleParts')}
              </label>
            </div>
            {!isRepair && !isParts && (
              <p className="mt-1 text-xs text-danger">{t('probe.vendorRoleRequired')}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('probe.vendorContact')} <span className="text-xs font-normal text-secondary-400">({t('probe.optional')})</span>
            </label>
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('probe.vendorPhone')} <span className="text-xs font-normal text-secondary-400">({t('probe.optional')})</span>
            </label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('probe.notes')} <span className="text-xs font-normal text-secondary-400">({t('probe.optional')})</span>
            </label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>

          {editVendor && (
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                {t('probe.vendorActive')}
              </label>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="min-h-touch rounded border px-4">{t('common.cancel')}</button>
          <button
            onClick={save}
            disabled={saving || !valid}
            className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
