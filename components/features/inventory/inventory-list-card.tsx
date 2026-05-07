'use client'

import * as React from 'react'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'
import { StatusBadge } from '@/components/ui/status-badge'
import type { StatusBadgeVariant } from '@/components/ui/status-badge'

interface InventoryListCardItem {
  itemId: string
  code: string
  name: string
  category: string
  totalCurrentStock: number
  minStock: number
  overallStatus: 'sufficient' | 'low' | 'critical'
  unitPrice: number
}

interface InventoryListCardLabels {
  category: string
  currentStockMin: string
  unitPriceVND: string
  detail: string
  edit: string
  delete: string
}

interface InventoryListCardProps {
  item: InventoryListCardItem
  labels: InventoryListCardLabels
  onDetail: (itemId: string) => void
  onEdit: (itemId: string) => void
  onDelete: (itemId: string) => void
  statusText: (status: 'sufficient' | 'low' | 'critical') => string
}

function statusVariant(status: 'sufficient' | 'low' | 'critical'): StatusBadgeVariant {
  if (status === 'critical') return 'stop'
  if (status === 'low') return 'watch'
  return 'go'
}

export function InventoryListCard({
  item,
  labels,
  onDetail,
  onEdit,
  onDelete,
  statusText,
}: InventoryListCardProps) {
  const stockPercent = item.minStock > 0
    ? Math.min((item.totalCurrentStock / item.minStock) * 100, 100)
    : 100
  const progressColor =
    item.overallStatus === 'critical' ? 'bg-signal-stop' :
    item.overallStatus === 'low' ? 'bg-signal-watch' : 'bg-signal-go'

  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-semibold text-ink no-break tabular">
            <NoBreak>{item.code}</NoBreak>
          </h3>
          <p className="mt-0.5 text-caption text-ink-soft truncate">{item.name}</p>
        </div>
        <StatusBadge
          variant={statusVariant(item.overallStatus)}
          label={statusText(item.overallStatus)}
        />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <MetaRow label={labels.category}>
          <span className="truncate">{item.category || '—'}</span>
        </MetaRow>
        <MetaRow label={labels.currentStockMin}>
          <span className="font-medium tabular text-ink">
            {item.totalCurrentStock} / {item.minStock}
          </span>
        </MetaRow>
        <MetaRow label={labels.unitPriceVND} span={2}>
          <span className="font-medium tabular">
            {item.unitPrice > 0 ? item.unitPrice.toLocaleString() : '—'}
          </span>
        </MetaRow>
      </dl>

      {/* 재고 프로그레스 바 */}
      <div className="mt-3 w-full rounded-full bg-paper h-1.5">
        <div
          className={`h-1.5 rounded-full ${progressColor}`}
          style={{ width: `${stockPercent}%` }}
        />
      </div>

      <footer className="mt-4 flex items-center justify-end gap-2 border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => onDetail(item.itemId)}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Eye className="h-4 w-4" />
          {labels.detail}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item.itemId)}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
          {labels.edit}
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.itemId)}
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
      <dt className="flex-shrink-0 text-caption text-ink-soft no-break">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-ink">{children}</dd>
    </div>
  )
}
