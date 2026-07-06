'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Ruler } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Samsung CNC 설비 정밀도 점검(홀더) 표준
// - 샹크경별 런아웃 측정 위치 a = 3×D
// - 런아웃 평가 기준: A ≤10 / B ≤30 / C ≤50 / D >50 (µm)
const SHANK_POSITIONS: Array<{ dia: string; pos: string }> = [
  { dia: 'Ø10', pos: '30mm' },
  { dia: 'Ø8', pos: '24mm' },
  { dia: 'Ø6', pos: '18mm' },
  { dia: 'Ø5', pos: '15mm' },
  { dia: 'Ø4', pos: '12mm' },
  { dia: 'Ø3', pos: '9mm' },
]

const RUNOUT_CRITERIA: Array<{ grade: string; range: string; color: string }> = [
  { grade: 'A', range: '≤ 10µm', color: 'text-success' },
  { grade: 'B', range: '≤ 30µm', color: 'text-primary-700' },
  { grade: 'C', range: '≤ 50µm', color: 'text-warning' },
  { grade: 'D', range: '> 50µm', color: 'text-danger' },
]

export default function ArborReferencePanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-md border border-divider bg-paper-warm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Ruler className="h-4 w-4 text-primary" />
          {t('arbor.refTitle')}
          <span className="text-xs font-normal text-secondary-500">— {t('arbor.refNote')}</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="grid grid-cols-1 items-center gap-4 border-t border-divider p-4 md:grid-cols-[auto_1fr_1fr]">
          {/* 측정 위치 이미지 (왼쪽 끝) — 실제 BT 홀더 런아웃 측정 도해 */}
          <div className="flex shrink-0 justify-center md:justify-start">
            <Image
              src="/images/runout.png"
              alt={t('arbor.refNote')}
              width={281}
              height={680}
              className="h-40 w-auto"
              priority
            />
          </div>

          {/* 샹크경별 측정 위치 */}
          <div>
            <p className="mb-2 text-xs font-medium text-secondary-600">
              {t('arbor.refMeasurePos')} <span className="text-secondary-400">(a = 3×D)</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-secondary-50">
                    <th className="border border-divider px-2 py-1 font-medium">{t('arbor.refShankDia')}</th>
                    {SHANK_POSITIONS.map(s => (
                      <th key={s.dia} className="border border-divider px-2 py-1 font-medium">{s.dia}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-divider px-2 py-1 text-secondary-500">a</td>
                    {SHANK_POSITIONS.map(s => (
                      <td key={s.dia} className="border border-divider px-2 py-1 font-mono">{s.pos}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 런아웃 평가 기준 */}
          <div>
            <p className="mb-2 text-xs font-medium text-secondary-600">
              {t('arbor.refCriteria')} <span className="text-secondary-400">({t('arbor.colRunout')})</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="bg-secondary-50">
                    {RUNOUT_CRITERIA.map(c => (
                      <th key={c.grade} className="border border-divider px-2 py-1 font-bold">{c.grade}{t('arbor.gradeSuffix')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {RUNOUT_CRITERIA.map(c => (
                      <td key={c.grade} className={`border border-divider px-2 py-1 font-mono font-medium ${c.color}`}>{c.range}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
