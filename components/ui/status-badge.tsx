import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatusBadgeVariant = 'go' | 'watch' | 'stop' | 'neutral'

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: StatusBadgeVariant
  label: string
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  go: 'bg-signal-go-soft text-signal-go-strong',
  watch: 'bg-signal-watch-soft text-signal-watch-strong',
  stop: 'bg-signal-stop-soft text-signal-stop-strong',
  neutral: 'bg-paper-warm text-ink-soft',
}

function VariantIcon({ variant }: { variant: StatusBadgeVariant }) {
  if (variant === 'go') {
    return (
      <svg className="h-2 w-2 flex-shrink-0" viewBox="0 0 8 8" aria-hidden="true">
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
    )
  }
  if (variant === 'watch') {
    return (
      <svg className="h-2 w-2 flex-shrink-0" viewBox="0 0 8 8" aria-hidden="true">
        <polygon points="4,1 7,7 1,7" fill="currentColor" />
      </svg>
    )
  }
  if (variant === 'stop') {
    return (
      <svg className="h-2 w-2 flex-shrink-0" viewBox="0 0 8 8" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className="h-2 w-2 flex-shrink-0" viewBox="0 0 8 8" aria-hidden="true">
      <line x1="1" y1="4" x2="7" y2="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ variant, label, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium no-break',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <VariantIcon variant={variant} />
      <span>{label}</span>
    </span>
  )
)
StatusBadge.displayName = 'StatusBadge'

export function statusVariantForReason(reason: string): StatusBadgeVariant {
  if (!reason) return 'neutral'
  const lowered = reason.toLowerCase()
  if (
    reason.includes('파손') ||
    reason.includes('품질불량') ||
    reason.includes('품질테스트') ||
    lowered.includes('error') ||
    lowered.includes('fail')
  ) {
    return 'stop'
  }
  if (
    reason.includes('마모') ||
    reason.includes('수명완료') ||
    reason.includes('Tool Life') ||
    lowered.includes('warn')
  ) {
    return 'watch'
  }
  return 'go'
}
