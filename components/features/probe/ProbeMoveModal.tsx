'use client'

import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useEquipment } from '../../../lib/hooks/useEquipment'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import { SmartDropdown, type SmartDropdownOption } from '@/components/ui/smart-dropdown'

interface ProbeMoveModalProps {
  probeId: string
  factoryId: string
  currentEquipmentId: string | null
  onDone: () => void
  onCancel: () => void
}

const WAREHOUSE = '' // 창고 회수(미장착)

export default function ProbeMoveModal({
  probeId, factoryId, currentEquipmentId, onDone, onCancel
}: ProbeMoveModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const { equipments } = useEquipment()
  const dragRef = useDraggableModal()

  const [target, setTarget] = useState<string>(currentEquipmentId ?? WAREHOUSE)
  const [movedAt, setMovedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const options: SmartDropdownOption[] = useMemo(() => [
    { value: WAREHOUSE, label: t('probe.moveToWarehouse') },
    ...equipments.map(eq => ({
      value: eq.id,
      label: `C${String(eq.equipment_number).padStart(3, '0')}`,
      description: [eq.current_model, eq.process].filter(Boolean).join(' · ') || undefined
    }))
  ], [equipments, t])

  // 현재 위치와 동일하면 이동 불가
  const changed = (target || null) !== (currentEquipmentId ?? null)

  const submit = async () => {
    if (!changed) return
    setSaving(true)
    try {
      const res = await fetch(`/api/probes/${probeId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId,
          to_equipment_id: target || null,
          moved_at: movedAt || undefined,
          notes: notes.trim() || undefined
        })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        showError(t('probe.moveFailed'), json.error ?? '')
        return
      }
      showSuccess(t('probe.moveSuccess'), '')
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dragRef} className="w-full max-w-md rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">{t('probe.moveTitle')}</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.moveTargetLabel')}</label>
            <SmartDropdown
              title={t('probe.moveTargetLabel')}
              options={options}
              value={target}
              onChange={setTarget}
              placeholder={t('probe.moveTargetLabel')}
              className="bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('probe.movedAt')} <span className="text-xs font-normal text-secondary-400">({t('probe.optional')})</span>
            </label>
            <input type="date" value={movedAt} onChange={e => setMovedAt(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('probe.notes')} <span className="text-xs font-normal text-secondary-400">({t('probe.optional')})</span>
            </label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="min-h-touch rounded border px-4">{t('common.cancel')}</button>
          <button
            onClick={submit}
            disabled={saving || !changed}
            className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('probe.moveSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
