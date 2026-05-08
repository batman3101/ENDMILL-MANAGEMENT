'use client'

import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/status-badge'

export interface EndmillListCardItem {
  id: string
  code: string
  category: string
  name: string
  usedEquipmentCount: number
  status: 'new' | 'active' | 'warning' | 'critical'
}

export interface EndmillListCardLabels {
  category: string
  name: string
  usedEquipment: string
  detailView: string
  statusNew: string
  statusActive: string
  statusWarning: string
  statusCritical: string
  statusUnknown: string
}

interface EndmillListCardProps {
  item: EndmillListCardItem
  labels: EndmillListCardLabels
  onOpen: (item: EndmillListCardItem) => void
}

function statusVariant(status: EndmillListCardItem['status']): StatusBadgeVariant {
  switch (status) {
    case 'active':
      return 'go'
    case 'warning':
      return 'watch'
    case 'critical':
      return 'stop'
    case 'new':
    default:
      return 'neutral'
  }
}

function statusLabel(
  status: EndmillListCardItem['status'],
  labels: EndmillListCardLabels
): string {
  switch (status) {
    case 'new':
      return labels.statusNew
    case 'active':
      return labels.statusActive
    case 'warning':
      return labels.statusWarning
    case 'critical':
      return labels.statusCritical
    default:
      return labels.statusUnknown
  }
}

export function EndmillListCard({ item, labels, onOpen }: EndmillListCardProps) {
  const variant = statusVariant(item.status)

  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="text-title font-semibold text-gauge-cobalt-strong tabular no-break transition-colors hover:underline">
            <NoBreak>{item.code}</NoBreak>
          </h3>
        </button>
        <StatusBadge variant={variant} label={statusLabel(item.status, labels)} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <MetaRow label={labels.category}>
          {item.category && item.category !== 'N/A' ? (
            <span className="inline-flex items-center rounded-sm border border-divider bg-paper px-2 py-0.5 text-caption font-medium text-ink-soft no-break">
              <NoBreak>{item.category}</NoBreak>
            </span>
          ) : (
            <span className="text-ink-mute">—</span>
          )}
        </MetaRow>
        <MetaRow label={labels.usedEquipment}>
          <span className="font-medium text-ink tabular no-break">
            <NoBreak>{item.usedEquipmentCount}</NoBreak>
          </span>
        </MetaRow>
        <MetaRow label={labels.name} span={2}>
          <span className="text-ink no-break">
            <NoBreak>{item.name || '—'}</NoBreak>
          </span>
        </MetaRow>
      </dl>

      <footer className="mt-4 flex items-center justify-end border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-gauge-cobalt-strong transition-colors hover:bg-paper hover:text-gauge-cobalt"
        >
          {labels.detailView}
          <ChevronRight className="h-4 w-4" />
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
