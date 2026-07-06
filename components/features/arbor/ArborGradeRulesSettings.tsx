'use client'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useToast } from '../../shared/Toast'
import { useSettings } from '../../../lib/hooks/useSettings'

const DEFAULT_MODELS = ['BT30', 'BT40', 'BT50']
const DEFAULT_DIAMETERS = ['Ø10', 'Ø8', 'Ø6', 'Ø5', 'Ø4', 'Ø3']

export default function ArborGradeRulesSettings() {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const { settings } = useSettings()

  const [thresholds, setThresholds] = useState({ A: 10, B: 30, C: 50 })
  const [intervalDays, setIntervalDays] = useState(180)
  const [models, setModels] = useState<string[]>(DEFAULT_MODELS)
  const [newModel, setNewModel] = useState('')
  const [diameters, setDiameters] = useState<string[]>(DEFAULT_DIAMETERS)
  const [newDiameter, setNewDiameter] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const a = settings.arbor
    if (a?.gradeRules?.runoutThresholds) setThresholds(a.gradeRules.runoutThresholds)
    if (a?.inspectionIntervalDays != null) setIntervalDays(a.inspectionIntervalDays)
    if (a?.models?.length) setModels(a.models)
    if (a?.toolDiameters?.length) setDiameters(a.toolDiameters)
  }, [settings.arbor])

  const addModel = () => {
    const m = newModel.trim().toUpperCase()
    if (!m || models.includes(m)) { setNewModel(''); return }
    setModels(prev => [...prev, m])
    setNewModel('')
  }
  const removeModel = (m: string) => setModels(prev => prev.filter(x => x !== m))

  const addDiameter = () => {
    const d = newDiameter.trim()
    if (!d || diameters.includes(d)) { setNewDiameter(''); return }
    setDiameters(prev => [...prev, d])
    setNewDiameter('')
  }
  const removeDiameter = (d: string) => setDiameters(prev => prev.filter(x => x !== d))

  const save = async () => {
    if (!(thresholds.A < thresholds.B && thresholds.B < thresholds.C)) {
      showError(t('arbor.rulesInvalid'), t('arbor.thresholdOrderError'))
      return
    }
    if (models.length === 0) {
      showError(t('arbor.rulesInvalid'), t('arbor.modelsEmpty'))
      return
    }
    if (diameters.length === 0) {
      showError(t('arbor.rulesInvalid'), t('arbor.diametersEmpty'))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'arbor',
          updates: {
            gradeRules: { runoutThresholds: thresholds },
            inspectionIntervalDays: intervalDays,
            models,
            toolDiameters: diameters
          }
        })
      })
      const json = await res.json()
      if (json.success) showSuccess(t('common.saved'), t('arbor.rulesSaved'))
      else showError(t('arbor.saveFailed'), json.error ?? '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-md border border-divider bg-paper-warm p-6">
      <h2 className="mb-1 text-lg font-bold">{t('arbor.gradeRulesTitle')}</h2>
      <p className="mb-4 text-xs text-secondary-500">{t('arbor.gradeRulesRunoutOnly')}</p>

      <div className="mb-2 grid grid-cols-3 gap-3">
        {(['A', 'B', 'C'] as const).map(g => (
          <div key={g}>
            <label className="mb-1 block text-sm">{g} {t('arbor.maxRunout')} (µm)</label>
            <input type="number" min="0" step="0.1" value={thresholds[g]}
              onChange={e => setThresholds(v => ({ ...v, [g]: Number(e.target.value) }))}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>
        ))}
      </div>
      <p className="mb-4 text-xs text-secondary-500">{t('arbor.dGradeNote')}</p>

      {/* 규격(BT) 목록 — 신규 등록 시 선택 드롭다운에 사용 */}
      <div className="mb-4">
        <label className="mb-1 block text-sm">{t('arbor.modelsLabel')}</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {models.map(m => (
            <span key={m} className="inline-flex items-center gap-1 rounded border border-divider bg-white px-2 py-1 text-sm">
              {m}
              <button type="button" onClick={() => removeModel(m)} className="text-secondary-400 hover:text-danger" aria-label={`remove ${m}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {models.length === 0 && <span className="text-xs text-secondary-400">{t('arbor.modelsEmpty')}</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModel() } }}
            placeholder="BT40"
            className="min-h-touch w-40 rounded border border-divider px-3"
          />
          <button type="button" onClick={addModel} className="min-h-touch rounded border px-3 text-sm">
            {t('arbor.modelsAdd')}
          </button>
        </div>
      </div>

      {/* 공구경 목록 — 신규 등록 시 선택 드롭다운에 사용 */}
      <div className="mb-4">
        <label className="mb-1 block text-sm">{t('arbor.toolDiametersLabel')}</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {diameters.map(d => (
            <span key={d} className="inline-flex items-center gap-1 rounded border border-divider bg-white px-2 py-1 text-sm">
              {d}
              <button type="button" onClick={() => removeDiameter(d)} className="text-secondary-400 hover:text-danger" aria-label={`remove ${d}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {diameters.length === 0 && <span className="text-xs text-secondary-400">{t('arbor.diametersEmpty')}</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={newDiameter}
            onChange={e => setNewDiameter(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDiameter() } }}
            placeholder="Ø6"
            className="min-h-touch w-40 rounded border border-divider px-3"
          />
          <button type="button" onClick={addDiameter} className="min-h-touch rounded border px-3 text-sm">
            {t('arbor.modelsAdd')}
          </button>
        </div>
      </div>

      <div className="mb-4 w-48">
        <label className="mb-1 block text-sm">{t('arbor.inspectionInterval')} ({t('common.days')})</label>
        <input type="number" min="1" value={intervalDays}
          onChange={e => setIntervalDays(Number(e.target.value))}
          className="min-h-touch w-full rounded border border-divider px-3" />
      </div>

      <button onClick={save} disabled={saving}
        className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50">
        {saving ? t('common.saving') : t('common.save')}
      </button>
    </section>
  )
}
