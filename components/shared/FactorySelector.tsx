'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const buttonRef = useRef<HTMLButtonElement>(null)
  // 드롭다운은 Portal(document.body)로 렌더하므로 버튼 위치를 직접 계산한다.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  const updatePos = useCallback(() => {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // right-0 정렬과 동일하게, 메뉴 우측을 버튼 우측에 맞춘다.
    setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
  }, [])

  // 열릴 때 위치 계산 + 스크롤/리사이즈에 따라 추종
  useLayoutEffect(() => {
    if (!open) return
    updatePos()
    window.addEventListener('resize', updatePos)
    // capture=true: 내부 스크롤 컨테이너 스크롤도 추종
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [open, updatePos])

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

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
        ref={buttonRef}
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

      {/* 드롭다운/백드롭은 Portal 로 body 에 렌더 — sticky 헤더(z-30)가 만든
          stacking context 를 탈출해 고정 액션바(z-40)·하단 네비(z-50) 위로 올라간다.
          이전에는 헤더 내부에 갇혀 태블릿에서 액션바에 가려져 선택이 막히는 버그가 있었다. */}
      {open && pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[65]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <ul
              role="listbox"
              aria-label="Factory"
              style={{ top: pos.top, right: pos.right }}
              className="fixed w-52 z-[70] rounded-md border border-divider bg-paper shadow-hover-lift overflow-hidden"
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
          </>,
          document.body
        )}
    </div>
  )
}
