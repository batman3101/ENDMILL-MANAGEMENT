'use client'

import { Clock, Repeat, X } from 'lucide-react'
import type { ToolChangeStickyContext } from '@/lib/hooks/useStickyContext'
import { useTranslations } from '@/lib/hooks/useTranslations'

interface StickyContextCardProps {
  context: ToolChangeStickyContext
  minutesAgo: number
  onClear: () => void
}

export function StickyContextCard({
  context,
  minutesAgo,
  onClear,
}: StickyContextCardProps) {
  const { t } = useTranslations()

  const formatTimeAgo = (min: number): string => {
    if (min < 1) return t('toolChanges.timeJustNow')
    if (min < 60) return t('toolChanges.timeMinutesAgo', { count: min })
    const h = Math.floor(min / 60)
    const m = min % 60
    return m === 0
      ? t('toolChanges.timeHoursAgo', { count: h })
      : t('toolChanges.timeHoursMinutesAgo', { h, m })
  }

  return (
    <div
      role="region"
      aria-label={t('toolChanges.stickyRegionLabel')}
      className="rounded-md border border-gauge-cobalt-soft bg-gauge-cobalt-soft/40 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Repeat className="h-4 w-4 flex-shrink-0 text-gauge-cobalt-strong" />
            <span className="text-caption font-semibold text-gauge-cobalt-strong">
              {t('toolChanges.stickyUsingLabel')}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-body text-ink">
            <span className="no-break">
              <span className="mr-1 text-caption text-ink-soft">{t('toolChanges.stickyEquipmentShort')}</span>
              <span className="font-medium">{context.equipment_number}</span>
            </span>
            <span className="no-break">
              <span className="mr-1 text-caption text-ink-soft">{t('toolChanges.stickyModelShort')}</span>
              <span className="font-medium">{context.production_model || '—'}</span>
            </span>
            <span className="no-break">
              <span className="mr-1 text-caption text-ink-soft">{t('toolChanges.stickyProcessShort')}</span>
              <span className="font-medium">{context.process || '—'}</span>
            </span>
            {context.changed_by_name && (
              <span className="no-break">
                <span className="mr-1 text-caption text-ink-soft">{t('toolChanges.stickyWorkerShort')}</span>
                <span className="font-medium">{context.changed_by_name}</span>
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-caption text-ink-soft">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(minutesAgo)} {t('toolChanges.stickyInputAt')}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="touch-target -m-2 inline-flex items-center justify-center rounded-sm p-2 text-ink-soft transition-colors hover:bg-paper"
          aria-label={t('toolChanges.stickyClear')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
