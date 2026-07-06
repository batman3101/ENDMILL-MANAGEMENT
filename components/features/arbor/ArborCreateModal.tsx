'use client'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useFactory } from '../../../lib/hooks/useFactory'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import { ARBOR_SERIAL_REGEX } from '../../../lib/types/arbor'

const DEFAULT_ARBOR_MODELS = ['BT30', 'BT40', 'BT50']
const DEFAULT_ARBOR_DIAMETERS = ['Ø10', 'Ø8', 'Ø6', 'Ø5', 'Ø4', 'Ø3']

interface ArborCreateModalProps {
  onCreated: () => void
  onCancel: () => void
}

export default function ArborCreateModal({ onCreated, onCancel }: ArborCreateModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const { currentFactory } = useFactory()
  const { settings } = useSettings()
  const dragRef = useDraggableModal()
  const models = settings.arbor?.models ?? DEFAULT_ARBOR_MODELS
  const diameters = settings.arbor?.toolDiameters ?? DEFAULT_ARBOR_DIAMETERS

  const [serial, setSerial] = useState('')
  const [model, setModel] = useState('BT30')
  const [diameter, setDiameter] = useState('Ø10')

  // 규격 목록 로드 시 현재 선택값이 목록에 없으면 첫 항목으로 보정
  useEffect(() => {
    if (models.length && !models.includes(model)) setModel(models[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models])

  // 공구경 목록 로드 시 현재 선택값이 목록에 없으면 첫 항목으로 보정
  useEffect(() => {
    if (diameters.length && !diameters.includes(diameter)) setDiameter(diameters[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diameters])
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const serialValid = ARBOR_SERIAL_REGEX.test(serial.trim().toUpperCase())

  const submit = async () => {
    if (!currentFactory?.id) {
      showError(t('arbor.noFactory'), t('arbor.selectFactoryFirst'))
      return
    }
    if (!serialValid) {
      showError(t('arbor.createInvalidSerial'), serial)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/arbors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: currentFactory.id,
          serial_number: serial.trim().toUpperCase(),
          arbor_model: model.trim() || undefined,
          tool_diameter: diameter.trim() || undefined,
          purchase_date: purchaseDate || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        if (res.status === 409) showError(t('arbor.createDuplicate'), serial)
        else showError(t('arbor.createFailed'), json.error ?? '')
        return
      }
      showSuccess(t('arbor.createSuccess'), serial.trim().toUpperCase())
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dragRef} className="w-full max-w-md rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">{t('arbor.createTitle')}</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('arbor.colSerial')} <span className="text-danger">*</span>
            </label>
            <input
              value={serial}
              onChange={e => setSerial(e.target.value)}
              placeholder="ALT-00001"
              className="min-h-touch w-full rounded border border-divider px-3 font-mono"
            />
            {serial !== '' && !serialValid && (
              <p className="mt-1 text-xs text-danger">{t('arbor.createSerialHint')}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('arbor.colModel')}</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="min-h-touch w-full rounded border border-divider bg-white pl-3 pr-8"
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('arbor.colToolDiameter')}</label>
            <select
              value={diameter}
              onChange={e => setDiameter(e.target.value)}
              className="min-h-touch w-full rounded border border-divider bg-white pl-3 pr-8"
            >
              {diameters.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('arbor.purchaseDate')}</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('arbor.notes')}</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="min-h-touch rounded border px-4">{t('common.cancel')}</button>
          <button
            onClick={submit}
            disabled={saving || !serialValid}
            className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('arbor.createSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
