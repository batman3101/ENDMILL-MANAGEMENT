'use client'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useToast } from '../../shared/Toast'
import { useSettings } from '../../../lib/hooks/useSettings'
import { DEFAULT_REPEATABILITY_THRESHOLD_UM } from '../../../lib/types/probe'

const DEFAULT_MODELS = ['OMP40-2', 'OMP400']
const DEFAULT_INTERVAL_DAYS = 90

export default function ProbeGradeRulesSettings() {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const { settings } = useSettings()

  const [threshold, setThreshold] = useState(DEFAULT_REPEATABILITY_THRESHOLD_UM)
  const [intervalDays, setIntervalDays] = useState(DEFAULT_INTERVAL_DAYS)
  const [models, setModels] = useState<string[]>(DEFAULT_MODELS)
  const [newModel, setNewModel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const p = settings.probe
    if (p?.repeatabilityThreshold != null) setThreshold(p.repeatabilityThreshold)
    if (p?.inspectionIntervalDays != null) setIntervalDays(p.inspectionIntervalDays)
    if (p?.models?.length) setModels(p.models)
  }, [settings.probe])

  const addModel = () => {
    const m = newModel.trim()
    if (!m || models.includes(m)) { setNewModel(''); return }
    setModels(prev => [...prev, m])
    setNewModel('')
  }

  const removeModel = (m: string) => setModels(prev => prev.filter(x => x !== m))

  const save = async () => {
    if (!(threshold > 0)) {
      showError(t('probe.rulesInvalid'), t('probe.thresholdRangeError'))
      return
    }
    if (models.length === 0) {
      showError(t('probe.rulesInvalid'), t('probe.modelsEmpty'))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'probe',
          updates: {
            repeatabilityThreshold: threshold,
            inspectionIntervalDays: intervalDays,
            models
          }
        })
      })
      const json = await res.json()
      if (json.success) showSuccess(t('common.saved'), t('probe.rulesSaved'))
      else showError(t('probe.saveFailed'), json.error ?? '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-md border border-divider bg-paper-warm p-6">
      <h2 className="mb-4 text-lg font-bold">{t('probe.settingsTitle')}</h2>

      <div className="mb-4 w-64">
        <label className="mb-1 block text-sm">{t('probe.thresholdLabel')}</label>
        <input type="number" min="0" step="0.01" value={threshold}
          onChange={e => setThreshold(Number(e.target.value))}
          className="min-h-touch w-full rounded border border-divider px-3" />
        <p className="mt-1 text-xs text-secondary-500">{t('probe.thresholdHelp')}</p>
      </div>

      <div className="mb-4 w-64">
        <label className="mb-1 block text-sm">{t('probe.inspectionInterval')}</label>
        <input type="number" min="1" value={intervalDays}
          onChange={e => setIntervalDays(Number(e.target.value))}
          className="min-h-touch w-full rounded border border-divider px-3" />
        <p className="mt-1 text-xs text-secondary-500">{t('probe.inspectionIntervalHelp')}</p>
      </div>

      {/* 모델 목록 — 신규 등록 시 선택 드롭다운에 사용 */}
      <div className="mb-4">
        <label className="mb-1 block text-sm">{t('probe.modelsAddLabel')}</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {models.map(m => (
            <span key={m} className="inline-flex items-center gap-1 rounded border border-divider bg-white px-2 py-1 text-sm">
              {m}
              <button type="button" onClick={() => removeModel(m)} className="text-secondary-400 hover:text-danger" aria-label={`remove ${m}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {models.length === 0 && <span className="text-xs text-secondary-400">{t('probe.modelsEmpty')}</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
            placeholder="OMP600"
            className="min-h-touch w-40 rounded border border-divider px-3"
          />
          <button type="button" onClick={addModel} className="min-h-touch rounded border px-3 text-sm">
            {t('probe.modelsAdd')}
          </button>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50">
        {saving ? t('common.saving') : t('common.save')}
      </button>
    </section>
  )
}
