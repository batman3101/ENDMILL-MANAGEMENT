'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useFactory } from '../../../lib/hooks/useFactory'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useEquipment } from '../../../lib/hooks/useEquipment'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import { SmartDropdown, type SmartDropdownOption } from '@/components/ui/smart-dropdown'
import { PROBE_MODELS, ASSET_NUMBER_MAX_LENGTH } from '../../../lib/types/probe'

interface ProbeCreateModalProps {
  onCreated: () => void
  onCancel: () => void
}

const NO_EQUIPMENT = ''
const NO_MODEL = '' // 모델은 선택 사항 — 사전 등록 시리얼은 모델 미지정 가능

export default function ProbeCreateModal({ onCreated, onCancel }: ProbeCreateModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const { currentFactory } = useFactory()
  const { settings } = useSettings()
  const { equipments } = useEquipment()
  const dragRef = useDraggableModal()
  const models = settings.probe?.models ?? [...PROBE_MODELS]

  const [assetNumber, setAssetNumber] = useState('')
  const [model, setModel] = useState(NO_MODEL)
  const [equipmentId, setEquipmentId] = useState(NO_EQUIPMENT)
  const [renishawSerial, setRenishawSerial] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // 모델 목록 로드 시 현재 선택값이 목록에 없으면 미선택으로 보정 (모델은 선택 사항)
  useEffect(() => {
    if (model && models.length && !models.includes(model)) setModel(NO_MODEL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models])

  const equipmentOptions: SmartDropdownOption[] = useMemo(() => [
    { value: NO_EQUIPMENT, label: t('probe.equipmentNotAssigned') },
    ...equipments.map(eq => ({
      value: eq.id,
      label: `C${String(eq.equipment_number).padStart(3, '0')}`,
      description: [eq.current_model, eq.process].filter(Boolean).join(' · ') || undefined
    }))
  ], [equipments, t])

  const trimmedAsset = assetNumber.trim()
  const assetValid = trimmedAsset.length > 0 && trimmedAsset.length <= ASSET_NUMBER_MAX_LENGTH

  const submit = async () => {
    if (!currentFactory?.id) {
      showError(t('probe.noFactory'), t('probe.selectFactoryFirst'))
      return
    }
    if (!assetValid) {
      showError(t('probe.createAssetRequired'), trimmedAsset)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/probes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: currentFactory.id,
          asset_number: trimmedAsset,
          model: model || undefined,
          equipment_id: equipmentId || undefined,
          renishaw_serial: renishawSerial.trim() || undefined,
          purchase_date: purchaseDate || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        if (res.status === 409) showError(t('probe.createDuplicate'), trimmedAsset)
        else showError(t('probe.createFailed'), json.error ?? '')
        return
      }
      showSuccess(t('probe.createSuccess'), trimmedAsset)
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dragRef} className="w-full max-w-md rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">{t('probe.createTitle')}</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('probe.assetNumber')} <span className="text-danger">*</span>
            </label>
            <input
              value={assetNumber}
              onChange={e => setAssetNumber(e.target.value)}
              placeholder="PRB-00001"
              maxLength={ASSET_NUMBER_MAX_LENGTH}
              className="min-h-touch w-full rounded border border-divider px-3 font-mono"
            />
            {assetNumber !== '' && !assetValid && (
              <p className="mt-1 text-xs text-danger">{t('probe.createAssetRequired')}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.modelLabel')}</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="min-h-touch w-full rounded border border-divider bg-white pl-3 pr-8"
            >
              <option value={NO_MODEL}>{t('probe.modelNotSelected')}</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.equipmentLabel')}</label>
            <SmartDropdown
              title={t('probe.equipmentLabel')}
              options={equipmentOptions}
              value={equipmentId}
              onChange={setEquipmentId}
              placeholder={t('probe.equipmentSelectPlaceholder')}
              className="bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.renishawSerial')}</label>
            <input
              value={renishawSerial}
              onChange={e => setRenishawSerial(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3 font-mono"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.purchaseDate')}</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.notes')}</label>
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
            disabled={saving || !assetValid}
            className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('probe.createSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
