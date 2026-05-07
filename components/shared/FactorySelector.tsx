'use client'

import { useState } from 'react'
import { useFactory } from '@/lib/hooks/useFactory'
import { Factory } from '@/lib/types/factory'
import { cn } from '@/lib/utils'
import { Building2, ChevronDown, Check } from 'lucide-react'

interface FactorySelectorProps {
  compact?: boolean
  showLabel?: boolean
  className?: string
}

export function FactorySelector({
  compact = false,
  showLabel = true,
  className,
}: FactorySelectorProps) {
  const { currentFactory, accessibleFactories, setCurrentFactory, isLoading } =
    useFactory()
  const [open, setOpen] = useState(false)

  if (isLoading || !currentFactory) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-sm bg-paper-warm border border-divider',
          compact ? 'h-10 w-20' : 'h-10 w-32',
          className
        )}
      />
    )
  }

  // 공장이 1개뿐이면 드롭다운 불필요 — 정적 칩 표시
  if (accessibleFactories.length <= 1) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 h-10 px-2.5 rounded-sm border border-divider bg-paper text-label font-medium text-ink no-break',
          className
        )}
      >
        <Building2 className="h-4 w-4 text-ink-soft" aria-hidden="true" />
        <span className="truncate">
          {compact ? currentFactory.code : currentFactory.name_ko}
        </span>
      </div>
    )
  }

  const handleSwitch = (factory: Factory) => {
    if (factory.id !== currentFactory.id) {
      setCurrentFactory(factory)
    }
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={currentFactory.name_ko}
        className="inline-flex items-center gap-1.5 h-10 px-2.5 rounded-sm border border-divider bg-paper text-label font-medium text-ink transition-colors hover:bg-paper-warm"
      >
        <Building2 className="h-4 w-4 text-ink-soft" aria-hidden="true" />
        <span className="truncate no-break">
          {compact ? currentFactory.code : currentFactory.name_ko}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-ink-soft transition-transform',
            open ? 'rotate-180' : ''
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            aria-label="Factory"
            className="absolute right-0 top-full mt-2 w-52 z-40 rounded-md border border-divider bg-paper shadow-hover-lift overflow-hidden"
          >
            {accessibleFactories.map(factory => {
              const isSelected = factory.id === currentFactory.id
              return (
                <li key={factory.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSwitch(factory)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 min-h-touch text-base transition-colors',
                      isSelected
                        ? 'bg-gauge-cobalt-soft text-gauge-cobalt-strong font-medium'
                        : 'text-ink hover:bg-paper-warm'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2
                        className="h-4 w-4 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 text-left">
                        <p className="truncate no-break">{factory.name_ko}</p>
                        <p className="text-caption text-ink-soft truncate no-break">
                          {factory.code}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check
                        className="h-4 w-4 flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
