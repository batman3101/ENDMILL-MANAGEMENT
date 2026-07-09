'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useFactory } from '../../../../lib/hooks/useFactory'
import { useSettings } from '../../../../lib/hooks/useSettings'
import { useToast } from '../../../../components/shared/Toast'
import { Probe, ProbeResult, InspectionTrigger, INSPECTION_TRIGGERS, DEFAULT_REPEATABILITY_THRESHOLD_UM } from '../../../../lib/types/probe'
import { judgeProbeResult } from '../../../../lib/utils/probeResult'

const RESULT_STYLE: Record<ProbeResult, string> = {
  OK: 'bg-success text-white', NG: 'bg-danger text-white'
}

export default function ProbeInspectPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentFactory } = useFactory()
  const { settings } = useSettings()
  const { showError } = useToast()
  const queryClient = useQueryClient()
  const scanRef = useRef<HTMLInputElement>(null)

  const [assetInput, setAssetInput] = useState('')
  const [probe, setProbe] = useState<Probe | null>(null)
  const [candidates, setCandidates] = useState<Probe[]>([])
  const [repeatability, setRepeatability] = useState('')
  const [trigger, setTrigger] = useState<InspectionTrigger | ''>('')
  const [result, setResult] = useState<ProbeResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)

  const rules = { repeatabilityThreshold: settings.probe?.repeatabilityThreshold ?? DEFAULT_REPEATABILITY_THRESHOLD_UM }
  const repeatNum = repeatability === '' ? NaN : Number(repeatability)
  const repeatEntered = repeatability !== '' && !Number.isNaN(repeatNum) && repeatNum >= 0
  // 반복도 입력 즉시 실시간 판정 (모델 무관 단일 임계값 — 항상 OK/NG 중 하나로 판정된다)
  const liveResult: ProbeResult | null =
    probe && repeatEntered ? judgeProbeResult(repeatNum, rules) : null

  const resetForNext = useCallback(() => {
    setAssetInput(''); setProbe(null); setCandidates([]); setRepeatability('')
    setTrigger(''); setResult(null)
    setTimeout(() => scanRef.current?.focus(), 50) // 다음 스캔 대기
  }, [])

  const performLookup = useCallback(async (rawInput: string) => {
    const raw = rawInput.trim()
    if (!currentFactory?.id || !raw) return
    setResult(null)
    setCandidates([])
    // 1) 자산번호 정확일치(asset=) 우선 조회 (자유형식 — 대문자 변환 없음)
    const res = await fetch(
      `/api/probes?factoryId=${currentFactory.id}&asset=${encodeURIComponent(raw)}&page=1&pageSize=1`
    )
    const json = await res.json()
    if (json.success && json.data.length > 0) {
      setProbe(json.data[0])
      return
    }
    // 2) 숫자만 입력한 경우: 접두사(ATP-/AVP-) 없이 끝번호로 매칭 (zero-pad 무관, 공장 스코핑)
    if (/^\d+$/.test(raw)) {
      const resNum = await fetch(
        `/api/probes?factoryId=${currentFactory.id}&assetNum=${encodeURIComponent(raw)}`
      )
      const jsonNum = await resNum.json()
      if (jsonNum.success && jsonNum.data.length === 1) { setProbe(jsonNum.data[0]); return }
      if (jsonNum.success && jsonNum.data.length > 1) { setCandidates(jsonNum.data); return }
    }
    // 3) 전방일치 후보 목록 제시
    const resPrefix = await fetch(
      `/api/probes?factoryId=${currentFactory.id}&search=${encodeURIComponent(raw)}&page=1&pageSize=20`
    )
    const jsonPrefix = await resPrefix.json()
    if (jsonPrefix.success && jsonPrefix.data.length > 0) {
      setCandidates(jsonPrefix.data)
    } else {
      showError(t('probe.notFound'), raw)
      setAssetInput('')
    }
  }, [currentFactory?.id, showError, t])

  const lookupAsset = (e: React.FormEvent) => {
    e.preventDefault()
    performLookup(assetInput)
  }

  const selectCandidate = (p: Probe) => {
    setProbe(p)
    setCandidates([])
  }

  // 목록의 "재검사" 진입 시 ?asset= 로 자동 조회
  useEffect(() => {
    const preset = searchParams.get('asset')
    if (preset && currentFactory?.id) {
      setAssetInput(preset)
      performLookup(preset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentFactory?.id])

  const save = async () => {
    // result !== null 가드: 저장 성공 후 1200ms 리셋 대기 동안의 중복 저장 방지
    if (!probe || !currentFactory?.id || !repeatEntered || !trigger || result !== null) return
    setSaving(true)
    try {
      const res = await fetch(`/api/probes/${probe.id}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: currentFactory.id,
          repeatability_um: Number(repeatability),
          trigger_reason: trigger,
        })
      })
      const json = await res.json()
      if (!json.success) { showError(t('probe.saveFailed'), json.error ?? ''); return }
      setResult(json.data.judged_result)
      setSessionCount(c => c + 1)
      // 목록/통계 캐시 무효화 (등급 분포·검사 지연 최신화)
      queryClient.invalidateQueries({ queryKey: ['probe-stats'] })
      queryClient.invalidateQueries({ queryKey: ['probes'] })
      setTimeout(resetForNext, 1200) // 등급 확인 시간 후 다음 건
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard/probes')}
        className="flex items-center gap-1 text-sm text-secondary-600 transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('probe.inspectMode')}</h1>
        <span className="text-sm text-secondary-600">{t('probe.sessionCount')}: {sessionCount}</span>
      </div>

      <form onSubmit={lookupAsset}>
        <input
          ref={scanRef}
          autoFocus
          value={assetInput}
          onChange={e => setAssetInput(e.target.value)}
          placeholder={t('probe.scanPlaceholder')}
          className="min-h-touch w-full rounded border-2 border-primary px-4 font-mono text-lg"
        />
      </form>

      {candidates.length > 0 && (
        <div className="space-y-2 rounded-md border border-divider bg-paper-warm p-4">
          <p className="text-sm font-medium">{t('probe.scanCandidates')}</p>
          <ul className="space-y-1">
            {candidates.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectCandidate(c)}
                  className="min-h-touch w-full rounded border border-divider px-3 py-2 text-left font-mono hover:bg-primary-50"
                >
                  {c.asset_number} <span className="ml-2 text-xs text-secondary-500">{c.model}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {probe && (
        <div className="space-y-4 rounded-md border border-divider bg-paper-warm p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xl font-bold">{probe.asset_number}</span>
            <span className="text-sm text-secondary-600">
              {t('probe.currentGrade')}: {probe.current_result ?? t('probe.uninspected')}
            </span>
          </div>
          <span className="text-xs text-secondary-500">{t('probe.modelLabel')}: {probe.model ?? '—'}</span>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.repeatabilityLabel')}</label>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={repeatability}
              onChange={e => setRepeatability(e.target.value)}
              disabled={result !== null}
              className="min-h-touch w-full rounded border border-divider px-4 text-lg disabled:opacity-60"
            />
          </div>

          {/* 반복도 입력 시 실시간 자동 판정 표시 (모델 무관 단일 임계값) */}
          {liveResult && result === null && (
            <div className={`flex items-center justify-between rounded-md px-4 py-3 ${RESULT_STYLE[liveResult]}`}>
              <span className="text-sm">{t('probe.autoGrade')}</span>
              <span className="text-3xl font-black">{liveResult}</span>
            </div>
          )}
          {liveResult === 'NG' && result === null && (
            <p className="text-xs text-danger">{t('probe.ngHint')}</p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">{t('probe.inspectionTriggerLabel')}</label>
            <select
              value={trigger}
              onChange={e => setTrigger(e.target.value as InspectionTrigger)}
              disabled={result !== null}
              className="min-h-touch w-full rounded border border-divider bg-white pl-3 pr-8 disabled:opacity-60"
            >
              <option value="">{t('common.select')}</option>
              {INSPECTION_TRIGGERS.map(tr => (
                <option key={tr} value={tr}>{t(`probe.trigger_${tr}`)}</option>
              ))}
            </select>
          </div>

          <button
            onClick={save}
            disabled={saving || !repeatEntered || !trigger || result !== null}
            className="min-h-touch w-full rounded bg-primary py-3 text-lg font-bold text-white disabled:opacity-40"
          >
            {saving ? t('common.saving') : t('probe.saveInspection')}
          </button>
        </div>
      )}

      {result && (
        <div className={`rounded-md p-8 text-center ${RESULT_STYLE[result]}`}>
          <p className="text-sm">{t('probe.judgedGrade')}</p>
          <p className="text-6xl font-black">{result}</p>
        </div>
      )}
    </div>
  )
}
