'use client'

import * as React from 'react'
import { Pencil } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/status-badge'

export interface EquipmentListCardItem {
  id: string
  equipmentLabel: string
  location: string | null
  status: string | null
  currentModel: string | null
  process: string | null
  usedToolPositions: number
  totalToolPositions: number
  toolUsagePercentage: number
}

export interface EquipmentListCardLabels {
  location: string
  model: string
  process: string
  endmillUsage: string
  edit: string
  // 상태 변환 라벨 (UI 텍스트, 매핑 기준 한국어 enum)
  statusOperating: string
  statusMaintenance: string
  statusSetup: string
}

interface EquipmentListCardProps {
  item: EquipmentListCardItem
  labels: EquipmentListCardLabels
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  statusDropdown?: React.ReactNode
}

function statusVariant(status: string | null | undefined): StatusBadgeVariant {
  if (status === '가동중') return 'go'
  if (status === '점검중') return 'stop'
  if (status === '셋업중') return 'watch'
  return 'neutral'
}

function statusLabel(status: string | null | undefined, labels: EquipmentListCardLabels): string {
  if (status === '가동중') return labels.statusOperating
  if (status === '점검중') return labels.statusMaintenance
  if (status === '셋업중') return labels.statusSetup
  return status || '—'
}

function usageColor(percent: number): string {
  if (percent >= 80) return 'bg-signal-stop'
  if (percent >= 60) return 'bg-signal-watch'
  return 'bg-signal-go'
}

export function EquipmentListCard({
  item,
  labels,
  onOpen,
  onEdit,
  statusDropdown,
}: EquipmentListCardProps) {
  const variant = statusVariant(item.status)
  const usagePct = Math.max(0, Math.min(100, item.toolUsagePercentage || 0))
  const colorClass = usageColor(usagePct)

  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="text-title font-semibold text-gauge-cobalt-strong tabular no-break transition-colors hover:underline">
            <NoBreak>{item.equipmentLabel}</NoBreak>
          </h3>
        </button>
        <StatusBadge variant={variant} label={statusLabel(item.status, labels)} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <MetaRow label={labels.location}>
          {item.location ? (
            <span className="inline-flex items-center rounded-sm border border-divider bg-paper px-2 py-0.5 text-caption font-medium text-ink-soft no-break">
              <NoBreak>{item.location}</NoBreak>
            </span>
          ) : (
            <span className="text-ink-mute">—</span>
          )}
        </MetaRow>
        <MetaRow label={labels.model}>
          <span className="font-medium text-ink no-break">
            <NoBreak>{item.currentModel || '—'}</NoBreak>
          </span>
        </MetaRow>
        <MetaRow label={labels.process}>
          <span className="text-ink no-break">
            <NoBreak>{item.process || '—'}</NoBreak>
          </span>
        </MetaRow>
        <MetaRow label={labels.endmillUsage}>
          <span className="text-ink tabular no-break">
            <NoBreak>
              {item.usedToolPositions} / {item.totalToolPositions}
            </NoBreak>
          </span>
        </MetaRow>
      </dl>

      <div className="mt-3 h-1.5 w-full rounded-full bg-paper">
        <div
          className={`h-1.5 rounded-full ${colorClass}`}
          style={{ width: `${usagePct}%` }}
          aria-hidden="true"
        />
      </div>

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-divider pt-3">
        {statusDropdown ?? <div />}
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          aria-label={labels.edit}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
          {labels.edit}
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
