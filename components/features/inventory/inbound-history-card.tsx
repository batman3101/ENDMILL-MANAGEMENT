'use client'

import * as React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'

interface InboundHistoryCardItem {
  id: string
  endmillCode: string
  endmillName: string
  supplier: string
  quantity: number
  unitPrice: number
  totalPrice: number
  processedAt: string
  processedBy: string
}

interface InboundHistoryCardLabels {
  totalAmount: string
  supplier: string
  quantityUnitPrice: string
  processor: string
  edit: string
  delete: string
}

interface InboundHistoryCardProps {
  item: InboundHistoryCardItem
  labels: InboundHistoryCardLabels
  onEdit: (item: InboundHistoryCardItem) => void
  onDelete: (id: string) => void
}

export function InboundHistoryCard({
  item,
  labels,
  onEdit,
  onDelete,
}: InboundHistoryCardProps) {
  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-semibold text-ink no-break tabular">
            <NoBreak>{item.endmillCode}</NoBreak>
          </h3>
          <p className="mt-0.5 text-caption text-ink-soft truncate">{item.endmillName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-caption text-ink-mute">{labels.totalAmount}</p>
          <p className="text-title font-semibold text-gauge-cobalt-strong tabular">
            {item.totalPrice.toLocaleString()}
            <span className="ml-1 text-caption font-normal text-ink-soft">VND</span>
          </p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-base">
        <MetaRow label={labels.supplier}>
          <span className="truncate text-ink">{item.supplier || '—'}</span>
        </MetaRow>
        <MetaRow label={labels.quantityUnitPrice}>
          <span className="tabular text-ink">
            {item.quantity} × {item.unitPrice.toLocaleString()}
          </span>
        </MetaRow>
        <MetaRow label={labels.processor} span={2}>
          <span className="text-ink">{item.processedBy || '—'}</span>
          <span className="text-ink-mute"> · </span>
          <span className="text-ink-soft tabular">{item.processedAt}</span>
        </MetaRow>
      </dl>

      <footer className="mt-4 flex items-center justify-end gap-2 border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => onEdit(item)}
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
    <div className={span === 2 ? 'col-span-2 flex items-baseline gap-2' : 'flex items-baseline gap-2'}>
      <dt className="flex-shrink-0 text-caption text-ink-mute no-break">{label}</dt>
      <dd className="min-w-0 flex-1 truncate">{children}</dd>
    </div>
  )
}
