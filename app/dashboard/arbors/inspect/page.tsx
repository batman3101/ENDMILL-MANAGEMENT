'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useFactory } from '../../../../lib/hooks/useFactory'
import { useSettings } from '../../../../lib/hooks/useSettings'
import { useToast } from '../../../../components/shared/Toast'
import { Arbor, ArborGrade, TaperCondition, TAPER_CONDITIONS } from '../../../../lib/types/arbor'
import { judgeArborGrade } from '../../../../lib/utils/arborGrade'

const GRADE_STYLE: Record<ArborGrade, string> = {
  A: 'bg-success text-white', B: 'bg-primary-600 text-white',
  C: 'bg-warning text-white', D: 'bg-danger text-white'
}

export default function ArborInspectPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentFactory } = useFactory()
  const { settings } = useSettings()
  const { showError } = useToast()
  const queryClient = useQueryClient()
  const scanRef = useRef<HTMLInputElement>(null)

  const [serialInput, setSerialInput] = useState('')
  const [arbor, setArbor] = useState<Arbor | null>(null)
  const [runout, setRunout] = useState('')
  const [taper, setTaper] = useState<TaperCondition | null>(null)
  const [result, setResult] = useState<ArborGrade | null>(null)
  const [saving, setSaving] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)

  // 런아웃 단독 기준 실시간 자동 등급 (입력 즉시 산정 — Samsung 정밀도 점검 표준)
  const runoutNum = runout === '' ? NaN : Number(runout)
  const liveGrade: ArborGrade | null =
    runout !== '' && !Number.isNaN(runoutNum) && runoutNum >= 0
      ? judgeArborGrade(runoutNum, { runoutThresholds: settings.arbor?.gradeRules?.runoutThresholds ?? { A: 10, B: 30, C: 50 } })
      : null

  const resetForNext = useCallback(() => {
    setSerialInput(''); setArbor(null); setRunout(''); setTaper(null); setResult(null)
    setTimeout(() => scanRef.current?.focus(), 50) // 다음 스캔 대기
  }, [])

  const performLookup = useCallback(async (rawInput: string) => {
    const raw = rawInput.trim()
    if (!currentFactory?.id || !raw) return
    setResult(null)
    // 숫자만 입력하면 시리얼 끝자리 번호로 조회 (예: "1" → AL-00001), 그 외엔 시리얼 정확 일치
    const numericOnly = /^\d+$/.test(raw)
    const lookupParam = numericOnly
      ? `serialNum=${encodeURIComponent(raw)}`
      : `serial=${encodeURIComponent(raw.toUpperCase())}`
    const res = await fetch(
      `/api/arbors?factoryId=${currentFactory.id}&${lookupParam}&page=1&pageSize=1`
    )
    const json = await res.json()
    if (!json.success || json.data.length === 0) {
      showError(t('arbor.notFound'), raw)
      setSerialInput('')
      return
    }
    setArbor(json.data[0])
  }, [currentFactory?.id, showError, t])

  const lookupSerial = (e: React.FormEvent) => {
    e.preventDefault()
    performLookup(serialInput)
  }

  // 목록의 "재검사" 진입 시 ?serial= 로 자동 조회
  useEffect(() => {
    const preset = searchParams.get('serial')
    if (preset && currentFactory?.id) {
      setSerialInput(preset)
      performLookup(preset)
    }
  }, [searchParams, currentFactory?.id, performLookup])

  const save = async () => {
    // result !== null 가드: 저장 성공 후 1200ms 리셋 대기 동안의 중복 저장 방지
    if (!arbor || !currentFactory?.id || runout === '' || liveGrade === null || result !== null) return
    setSaving(true)
    try {
      const res = await fetch(`/api/arbors/${arbor.id}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: currentFactory.id,
          runout_um: Number(runout),
          taper_condition: taper ?? undefined // Taper 외관은 선택(관찰) 항목
        })
      })
      const json = await res.json()
      if (!json.success) { showError(t('arbor.saveFailed'), json.error ?? ''); return }
      setResult(json.data.judged_grade)
      setSessionCount(c => c + 1)
      // 목록/통계 캐시 무효화 (등급 분포·검사 지연 최신화)
      queryClient.invalidateQueries({ queryKey: ['arbor-stats'] })
      queryClient.invalidateQueries({ queryKey: ['arbors'] })
      setTimeout(resetForNext, 1200) // 등급 확인 시간 후 다음 건
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard/arbors')}
        className="flex items-center gap-1 text-sm text-secondary-600 transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('arbor.inspectMode')}</h1>
        <span className="text-sm text-secondary-600">{t('arbor.sessionCount')}: {sessionCount}</span>
      </div>

      <form onSubmit={lookupSerial}>
        <input
          ref={scanRef}
          autoFocus
          value={serialInput}
          onChange={e => setSerialInput(e.target.value)}
          placeholder={t('arbor.scanPlaceholder')}
          className="min-h-touch w-full rounded border-2 border-primary px-4 font-mono text-lg"
        />
      </form>

      {arbor && (
        <div className="space-y-4 rounded-md border border-divider bg-paper-warm p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xl font-bold">{arbor.serial_number}</span>
            <span className="text-sm text-secondary-600">
              {t('arbor.currentGrade')}: {arbor.current_grade ?? t('arbor.uninspected')}
            </span>
          </div>
          {arbor.tool_diameter && (
            <span className="text-xs text-secondary-500">{t('arbor.colToolDiameter')}: {arbor.tool_diameter}</span>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Runout (µm)</label>
            <input
              type="number" inputMode="decimal" min="0" step="0.1"
              value={runout}
              onChange={e => setRunout(e.target.value)}
              disabled={result !== null}
              className="min-h-touch w-full rounded border border-divider px-4 text-lg disabled:opacity-60"
            />
          </div>

          {/* 런아웃 입력 시 실시간 자동 등급 표시 */}
          {liveGrade && result === null && (
            <div className={`flex items-center justify-between rounded-md px-4 py-3 ${GRADE_STYLE[liveGrade]}`}>
              <span className="text-sm">{t('arbor.autoGrade')}</span>
              <span className="text-3xl font-black">{liveGrade}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('arbor.taperGradeLabel')} <span className="text-xs font-normal text-secondary-400">({t('arbor.optional')})</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TAPER_CONDITIONS.map(c => (
                <button key={c} type="button"
                  onClick={() => setTaper(prev => prev === c ? null : c)}
                  disabled={result !== null}
                  className={`min-h-touch rounded border px-2 py-3 text-sm font-medium disabled:opacity-60
                    ${taper === c ? 'border-primary bg-primary-100 text-primary-800' : 'border-divider'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || runout === '' || liveGrade === null || result !== null}
            className="min-h-touch w-full rounded bg-primary py-3 text-lg font-bold text-white disabled:opacity-40"
          >
            {saving ? t('common.saving') : t('arbor.saveInspection')}
          </button>
        </div>
      )}

      {result && (
        <div className={`rounded-md p-8 text-center ${GRADE_STYLE[result]}`}>
          <p className="text-sm">{t('arbor.judgedGrade')}</p>
          <p className="text-6xl font-black">{result}</p>
        </div>
      )}
    </div>
  )
}
