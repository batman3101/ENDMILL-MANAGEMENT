'use client'

import * as React from 'react'

export type SummaryTone = 'default' | 'go' | 'watch' | 'stop' | 'cobalt'

interface ReportSummaryCardProps {
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  tone?: SummaryTone
}

const valueToneClass: Record<SummaryTone, string> = {
  default: 'text-ink',
  go: 'text-signal-go-strong',
  watch: 'text-signal-watch-strong',
  stop: 'text-signal-stop-strong',
  cobalt: 'text-gauge-cobalt-strong',
}

export function ReportSummaryCard({
  label,
  value,
  caption,
  tone = 'default',
}: ReportSummaryCardProps) {
  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4">
      <p className="text-caption text-ink-soft no-break">{label}</p>
      <p className={`mt-1 text-headline font-semibold tabular ${valueToneClass[tone]}`}>
        {value}
      </p>
      {caption && (
        <p className="mt-1 text-caption text-ink-mute tabular">{caption}</p>
      )}
    </article>
  )
}
