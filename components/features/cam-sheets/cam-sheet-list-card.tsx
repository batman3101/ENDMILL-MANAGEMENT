'use client'

import * as React from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NoBreak } from '@/components/ui/no-break'

function resolveDateLocale(language: string | undefined): string {
  if (!language) return 'ko-KR'
  if (language.toLowerCase().startsWith('vi')) return 'vi-VN'
  return 'ko-KR'
}

export interface CAMSheetListCardItem {
  id: string
  model: string
  process: string
  camVersion: string
  versionDate: string | null
  endmillCount: number
  tNumberMin: number | null
  tNumberMax: number | null
  updatedAt: string | null
}

export interface CAMSheetListCardLabels {
  process: string
  endmillCount: string
  tNumberRange: string
  lastModified: string
  detail: string
  edit: string
  delete: string
  itemsUnit: string
}

interface CAMSheetListCardProps {
  item: CAMSheetListCardItem
  labels: CAMSheetListCardLabels
  onDetail: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function formatTNumberRange(min: number | null, max: number | null): string {
  if (min == null || max == null) return '—'
  const fmt = (n: number) => `T${String(n).padStart(2, '0')}`
  if (min === max) return fmt(min)
  return `${fmt(min)}–${fmt(max)}`
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export function CAMSheetListCard({
  item,
  labels,
  onDetail,
  onEdit,
  onDelete,
}: CAMSheetListCardProps) {
  const { i18n } = useTranslation()
  const dateLocale = resolveDateLocale(i18n.language)

  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-semibold text-ink no-break">
            <NoBreak>{item.model}</NoBreak>
            <span className="mx-1.5 text-ink-mute">·</span>
            <NoBreak>{item.camVersion}</NoBreak>
          </h3>
          <p className="mt-0.5 text-caption text-ink-soft tabular">
            {formatDate(item.versionDate, dateLocale)}
          </p>
        </div>
        <span className="inline-flex items-center rounded-sm border border-divider bg-paper px-2 py-1 text-caption font-medium text-ink-soft no-break">
          <NoBreak>{item.process}</NoBreak>
        </span>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <MetaRow label={labels.endmillCount}>
          <span className="font-medium tabular text-ink">
            {item.endmillCount}
            <span className="ml-1 text-caption font-normal text-ink-soft">{labels.itemsUnit}</span>
          </span>
        </MetaRow>
        <MetaRow label={labels.tNumberRange}>
          <span className="font-medium tabular text-ink no-break">
            <NoBreak>{formatTNumberRange(item.tNumberMin, item.tNumberMax)}</NoBreak>
          </span>
        </MetaRow>
        <MetaRow label={labels.lastModified} span={2}>
          <span className="tabular text-ink-soft">
            {formatDate(item.updatedAt, dateLocale)}
          </span>
        </MetaRow>
      </dl>

      <footer className="mt-4 flex items-center justify-end gap-2 border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => onDetail(item.id)}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Eye className="h-4 w-4" />
          {labels.detail}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
          {labels.edit}
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-signal-stop transition-colors hover:bg-signal-stop-soft"
        >
          <Trash2 className="h-4 w-4" />
          {labels.delete}
        </button>
      </footer>
    </article>
  )
}

interface MetaRowProps {
  label: string
  span?: 1 | 2
  children: React.ReactNode
}

function MetaRow({ label, span = 1, children }: MetaRowProps) {
  return (
    <div
      className={
        span === 2
          ? 'col-span-2 flex items-baseline gap-2'
          : 'flex items-baseline gap-2'
      }
    >
      <dt className="flex-shrink-0 text-caption text-ink-soft no-break">{label}</dt>
      <dd className="min-w-0 flex-1 truncate">{children}</dd>
    </div>
  )
}
