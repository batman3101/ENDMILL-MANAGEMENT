'use client'

import * as React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'
import {
  StatusBadge,
  statusVariantForReason,
} from '@/components/ui/status-badge'
import type { ToolChange } from '@/lib/hooks/useToolChanges'

interface ToolChangeListCardProps {
  change: ToolChange
  onEdit: (change: ToolChange) => void
  onDelete: (change: ToolChange) => void
  isDeleting: boolean
  reasonLabel: (reason: string) => string
}

function formatDateTime(change: ToolChange): string {
  const source = change.created_at || change.change_date
  if (!source) return '—'
  try {
    return new Date(source).toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return source
  }
}

function formatEquipmentNumber(change: ToolChange): string {
  if (change.equipment?.name) return change.equipment.name
  if (typeof change.equipment_number === 'number') {
    return `C${String(change.equipment_number).padStart(3, '0')}`
  }
  return '—'
}

function formatTNumber(t: number | null | undefined): string {
  if (typeof t !== 'number') return '—'
  return `T${String(t).padStart(2, '0')}`
}

export function ToolChangeListCard({
  change,
  onEdit,
  onDelete,
  isDeleting,
  reasonLabel,
}: ToolChangeListCardProps) {
  const equipmentLabel = formatEquipmentNumber(change)
  const reason = change.change_reason || change.reason || ''
  const reasonText = reason ? reasonLabel(reason) : '—'
  const variant = statusVariantForReason(reason)
  const toolLife = change.tool_life ?? change.old_life_hours ?? 0
  const endmillName =
    change.endmill_name ||
    change.endmill_type?.name ||
    change.endmill_type?.code ||
    '—'

  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-semibold text-ink no-break">
            {equipmentLabel}
          </h3>
          <p className="mt-0.5 text-caption text-ink-soft tabular">
            {formatDateTime(change)}
          </p>
        </div>
        <StatusBadge variant={variant} label={reasonText} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <MetaRow label="모델">
          <NoBreak>{change.production_model || '—'}</NoBreak>
        </MetaRow>
        <MetaRow label="공정">
          <NoBreak>{change.process || '—'}</NoBreak>
        </MetaRow>
        <MetaRow label="T번호">
          <NoBreak>{formatTNumber(change.t_number)}</NoBreak>
        </MetaRow>
        <MetaRow label="작업자">
          <span className="truncate">{change.user?.name || '—'}</span>
        </MetaRow>
        <MetaRow label="엔드밀" span={2}>
          <span className="truncate">
            <NoBreak>{change.endmill_code || '—'}</NoBreak>
            {endmillName !== '—' && (
              <>
                <span className="mx-1.5 text-ink-mute">·</span>
                <span className="text-ink-soft">{endmillName}</span>
              </>
            )}
          </span>
        </MetaRow>
        <MetaRow label="Tool Life" span={2}>
          <span className="font-medium tabular">{toolLife.toLocaleString()}</span>
          <span className="ml-1 text-caption text-ink-soft">회</span>
        </MetaRow>
      </dl>

      <footer className="mt-4 flex items-center justify-end gap-2 border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => onEdit(change)}
          className="inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
          수정
        </button>
        <button
          type="button"
          onClick={() => onDelete(change)}
          className={
            isDeleting
              ? 'inline-flex min-h-touch items-center gap-1 rounded-sm bg-signal-stop px-3 text-label font-medium text-paper transition-colors hover:bg-signal-stop-strong'
              : 'inline-flex min-h-touch items-center gap-1 rounded-sm px-3 text-label font-medium text-signal-stop transition-colors hover:bg-signal-stop-soft'
          }
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? '삭제 확인' : '삭제'}
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
      className={span === 2 ? 'col-span-2 flex items-baseline gap-2' : 'flex items-baseline gap-2'}
    >
      <dt className="flex-shrink-0 text-caption text-ink-soft no-break">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-ink">{children}</dd>
    </div>
  )
}
