'use client'

import * as React from 'react'
import { useTranslation } from 'react-i18next'

function resolveDateLocale(language: string | undefined): string {
  if (!language) return 'ko-KR'
  if (language.toLowerCase().startsWith('vi')) return 'vi-VN'
  return 'ko-KR'
}

export interface DailyTrendPoint {
  date: string
  quantity: number
}

interface DailyTrendChartProps {
  title: string
  caption: string
  emptyMessage: string
  peakLabel: string
  unit: string
  points: DailyTrendPoint[]
}

export function DailyTrendChart({
  title,
  caption,
  emptyMessage,
  peakLabel,
  unit,
  points,
}: DailyTrendChartProps) {
  const { i18n } = useTranslation()
  const dateLocale = resolveDateLocale(i18n.language)

  const chartHeight = 80
  const chartWidth = 320
  const max = points.reduce((m, p) => Math.max(m, p.quantity), 0)
  const peak = points.reduce<DailyTrendPoint | null>(
    (best, p) => (best == null || p.quantity > best.quantity ? p : best),
    null
  )

  const barCount = Math.max(points.length, 1)
  const slot = chartWidth / barCount
  const barWidth = Math.max(slot * 0.7, 1.5)

  const formattedPeakDate = peak
    ? (() => {
        try {
          return new Date(peak.date).toLocaleDateString(dateLocale, {
            month: 'numeric',
            day: 'numeric',
          })
        } catch {
          return peak.date
        }
      })()
    : '—'

  return (
    <section className="rounded-md border border-divider bg-paper-warm p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-title font-semibold text-ink no-break">{title}</h3>
          <p className="mt-0.5 text-caption text-ink-soft">{caption}</p>
        </div>
        {peak && peak.quantity > 0 && (
          <div className="text-right shrink-0">
            <p className="text-caption text-ink-mute no-break">{peakLabel}</p>
            <p className="mt-0.5 text-label font-medium text-ink tabular no-break">
              {formattedPeakDate}
              <span className="mx-1 text-ink-mute">·</span>
              <span className="text-gauge-cobalt-strong">
                {peak.quantity.toLocaleString()}
              </span>
              <span className="ml-0.5 text-caption font-normal text-ink-soft">
                {unit}
              </span>
            </p>
          </div>
        )}
      </header>

      <div className="mt-4">
        {points.length === 0 || max === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-sm border border-dashed border-divider bg-paper">
            <p className="text-caption text-ink-mute">{emptyMessage}</p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="h-20 w-full"
            role="img"
            aria-label={title}
          >
            {/* baseline */}
            <line
              x1="0"
              y1={chartHeight - 0.5}
              x2={chartWidth}
              y2={chartHeight - 0.5}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-divider"
            />
            {points.map((p, idx) => {
              const h = max > 0 ? (p.quantity / max) * (chartHeight - 4) : 0
              const x = idx * slot + (slot - barWidth) / 2
              const y = chartHeight - h
              const isPeak = peak != null && p.date === peak.date && p.quantity > 0
              return (
                <rect
                  key={p.date}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={Math.min(0.5, barWidth / 4)}
                  fill="currentColor"
                  className={
                    isPeak ? 'text-gauge-cobalt-strong' : 'text-gauge-cobalt'
                  }
                />
              )
            })}
          </svg>
        )}
      </div>
    </section>
  )
}
