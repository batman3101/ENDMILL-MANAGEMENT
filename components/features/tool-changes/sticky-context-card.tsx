'use client'

import { Clock, Repeat, X } from 'lucide-react'
import type { ToolChangeStickyContext } from '@/lib/hooks/useStickyContext'

interface StickyContextCardProps {
  context: ToolChangeStickyContext
  minutesAgo: number
  onClear: () => void
}

function formatTimeAgo(min: number): string {
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}시간 전` : `${h}시간 ${m}분 전`
}

export function StickyContextCard({
  context,
  minutesAgo,
  onClear,
}: StickyContextCardProps) {
  return (
    <div
      role="region"
      aria-label="직전 컨텍스트"
      className="rounded-md border border-gauge-cobalt-soft bg-gauge-cobalt-soft/40 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Repeat className="h-4 w-4 flex-shrink-0 text-gauge-cobalt-strong" />
            <span className="text-caption font-semibold text-gauge-cobalt-strong">
              직전 컨텍스트 사용 중
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-body text-ink">
            <span className="no-break">
              <span className="mr-1 text-caption text-ink-soft">설비</span>
              <span className="font-medium">{context.equipment_number}</span>
            </span>
            <span className="no-break">
              <span className="mr-1 text-caption text-ink-soft">모델</span>
              <span className="font-medium">{context.production_model || '—'}</span>
            </span>
            <span className="no-break">
              <span className="mr-1 text-caption text-ink-soft">공정</span>
              <span className="font-medium">{context.process || '—'}</span>
            </span>
            {context.changed_by_name && (
              <span className="no-break">
                <span className="mr-1 text-caption text-ink-soft">작업자</span>
                <span className="font-medium">{context.changed_by_name}</span>
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-caption text-ink-soft">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(minutesAgo)} 입력</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="touch-target -m-2 inline-flex items-center justify-center rounded-sm p-2 text-ink-soft transition-colors hover:bg-paper"
          aria-label="컨텍스트 지우기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
