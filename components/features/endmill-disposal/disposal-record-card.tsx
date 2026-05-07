'use client'

import * as React from 'react'
import NextImage from 'next/image'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function resolveDateLocale(language: string | undefined): string {
  if (!language) return 'ko-KR'
  if (language.toLowerCase().startsWith('vi')) return 'vi-VN'
  return 'ko-KR'
}

export interface DisposalRecordCardItem {
  id: string
  disposalDate: string
  quantity: number
  weightKg: number
  inspector: string
  reviewer: string
  imageUrl: string | null
  notes: string | null
}

export interface DisposalRecordCardLabels {
  quantity: string
  quantityUnit: string
  weight: string
  weightUnit: string
  inspector: string
  reviewer: string
  notes: string
  thumbnailAlt: string
  edit: string
  delete: string
}

interface DisposalRecordCardProps {
  item: DisposalRecordCardItem
  labels: DisposalRecordCardLabels
  canUpdate: boolean
  canDelete: boolean
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function formatDate(value: string, locale: string): string {
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

export function DisposalRecordCard({
  item,
  labels,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: DisposalRecordCardProps) {
  const { i18n } = useTranslation()
  const dateLocale = resolveDateLocale(i18n.language)
  const showActions = canUpdate || canDelete

  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-semibold text-ink no-break tabular">
            {formatDate(item.disposalDate, dateLocale)}
          </h3>
        </div>
        {item.imageUrl ? (
          <a
            href={item.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm border border-divider bg-paper transition-shadow hover:shadow-hover-lift"
            aria-label={labels.thumbnailAlt}
          >
            <NextImage
              src={item.imageUrl}
              alt={labels.thumbnailAlt}
              fill
              sizes="48px"
              className="object-cover"
            />
          </a>
        ) : (
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm border border-dashed border-divider bg-paper"
            aria-hidden="true"
          >
            <span className="text-caption text-ink-mute">—</span>
          </div>
        )}
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <MetaRow label={labels.quantity}>
          <span className="font-medium tabular text-ink">
            {item.quantity.toLocaleString()}
            <span className="ml-1 text-caption font-normal text-ink-soft">
              {labels.quantityUnit}
            </span>
          </span>
        </MetaRow>
        <MetaRow label={labels.weight}>
          <span className="font-medium tabular text-ink">
            {item.weightKg.toFixed(2)}
            <span className="ml-1 text-caption font-normal text-ink-soft">
              {labels.weightUnit}
            </span>
          </span>
        </MetaRow>
        <MetaRow label={labels.inspector}>
          <span className="truncate text-ink">{item.inspector || '—'}</span>
        </MetaRow>
        <MetaRow label={labels.reviewer}>
          <span className="truncate text-ink">{item.reviewer || '—'}</span>
        </MetaRow>
        {item.notes && (
          <MetaRow label={labels.notes} span={2}>
            <span className="text-ink-soft">{item.notes}</span>
          </MetaRow>
        )}
      </dl>

      {showActions && (
        <footer className="mt-4 flex items-center justify-end gap-2 border-t border-divider pt-3">
          {canUpdate && (
            <button
              type="button"
              onClick={() => onEdit(item.id)}
              className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
              {labels.edit}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-signal-stop transition-colors hover:bg-signal-stop-soft"
            >
              <Trash2 className="h-4 w-4" />
              {labels.delete}
            </button>
          )}
        </footer>
      )}
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
