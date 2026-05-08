'use client'

import * as React from 'react'
import { Eye, Pencil, Lock, Trash2, RotateCcw } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/status-badge'

export type UserListCardRoleType = 'system_admin' | 'admin' | 'user' | 'unknown'

export interface UserListCardItem {
  id: string
  name: string
  email: string
  employeeId: string
  department: string | null
  position: string | null
  isActive: boolean
  roleType: UserListCardRoleType
  roleLabel: string
}

export interface UserListCardLabels {
  employeeId: string
  email: string
  department: string
  position: string
  role: string
  detail: string
  edit: string
  permissions: string
  delete: string
  toggleActivate: string
  toggleDeactivate: string
  statusActive: string
  statusInactive: string
}

interface UserListCardProps {
  item: UserListCardItem
  labels: UserListCardLabels
  canEditPermissions: boolean
  onViewDetail: (id: string) => void
  onEdit: (id: string) => void
  onEditPermissions: (id: string) => void
  onToggleStatus: (id: string) => void
  onDelete: (id: string) => void
}

function statusVariant(isActive: boolean): StatusBadgeVariant {
  return isActive ? 'go' : 'neutral'
}

function roleBadgeClass(roleType: UserListCardRoleType): string {
  switch (roleType) {
    case 'system_admin':
      return 'bg-gauge-cobalt-soft text-gauge-cobalt-strong'
    case 'admin':
      return 'bg-signal-watch-soft text-signal-watch-strong'
    case 'user':
      return 'bg-paper text-ink-soft border border-divider'
    default:
      return 'bg-paper-warm text-ink-mute border border-divider'
  }
}

export function UserListCard({
  item,
  labels,
  canEditPermissions,
  onViewDetail,
  onEdit,
  onEditPermissions,
  onToggleStatus,
  onDelete,
}: UserListCardProps) {
  return (
    <article className="rounded-md border border-divider bg-paper-warm p-4 transition-shadow hover:shadow-hover-lift">
      <header className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onViewDetail(item.id)}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="text-title font-semibold text-gauge-cobalt-strong no-break transition-colors hover:underline">
            <NoBreak>{item.name}</NoBreak>
          </h3>
          <p className="mt-0.5 text-caption text-ink-soft truncate">{item.email}</p>
        </button>
        <StatusBadge
          variant={statusVariant(item.isActive)}
          label={item.isActive ? labels.statusActive : labels.statusInactive}
        />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <MetaRow label={labels.employeeId}>
          <span className="text-base text-ink tabular no-break">
            <NoBreak>{item.employeeId || '—'}</NoBreak>
          </span>
        </MetaRow>
        <MetaRow label={labels.role}>
          <span
            className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(
              item.roleType
            )}`}
          >
            <NoBreak>{item.roleLabel}</NoBreak>
          </span>
        </MetaRow>
        <MetaRow label={labels.department}>
          <span className="text-base text-ink no-break">
            <NoBreak>{item.department || '—'}</NoBreak>
          </span>
        </MetaRow>
        <MetaRow label={labels.position}>
          <span className="text-base text-ink no-break">
            <NoBreak>{item.position || '—'}</NoBreak>
          </span>
        </MetaRow>
      </dl>

      <footer className="mt-4 grid grid-cols-2 gap-2 border-t border-divider pt-3 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => onViewDetail(item.id)}
          className="inline-flex min-h-touch items-center justify-center gap-1 rounded-sm px-2 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Eye className="h-4 w-4" />
          <span className="truncate">{labels.detail}</span>
        </button>
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          className="inline-flex min-h-touch items-center justify-center gap-1 rounded-sm px-2 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
          <span className="truncate">{labels.edit}</span>
        </button>
        {canEditPermissions && (
          <button
            type="button"
            onClick={() => onEditPermissions(item.id)}
            className="inline-flex min-h-touch items-center justify-center gap-1 rounded-sm px-2 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
          >
            <Lock className="h-4 w-4" />
            <span className="truncate">{labels.permissions}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onToggleStatus(item.id)}
          className="inline-flex min-h-touch items-center justify-center gap-1 rounded-sm px-2 text-label font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="truncate">
            {item.isActive ? labels.toggleDeactivate : labels.toggleActivate}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="inline-flex min-h-touch items-center justify-center gap-1 rounded-sm px-2 text-label font-medium text-signal-stop-strong transition-colors hover:bg-signal-stop-soft"
        >
          <Trash2 className="h-4 w-4" />
          <span className="truncate">{labels.delete}</span>
        </button>
      </footer>
    </article>
  )
}

interface MetaRowProps {
  label: string
  children: React.ReactNode
}

function MetaRow({ label, children }: MetaRowProps) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="flex-shrink-0 text-caption text-ink-soft no-break">{label}</dt>
      <dd className="min-w-0 flex-1 truncate">{children}</dd>
    </div>
  )
}
