'use client'

import { useState } from 'react'
import { ChevronDown, Sun, Moon, Monitor, Check, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSettings } from '@/lib/hooks/useSettings'
import { useTheme } from '@/lib/providers/ThemeProvider'

type ThemePreference = 'light' | 'dark' | 'auto'

interface Option {
  value: ThemePreference
  labelKey: string
  Icon: LucideIcon
}

const OPTIONS: Option[] = [
  { value: 'light', labelKey: 'settings.themeLight', Icon: Sun },
  { value: 'dark', labelKey: 'settings.themeDark', Icon: Moon },
  { value: 'auto', labelKey: 'settings.themeSystem', Icon: Monitor },
]

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { t } = useTranslation()
  const { settings, updateSetting } = useSettings()
  const { effective } = useTheme()
  const [open, setOpen] = useState(false)

  // settings.ui.theme이 'system' 같은 legacy 값이면 'auto'로 정규화
  const rawPreference = settings?.ui?.theme as string | undefined
  const currentValue: ThemePreference =
    rawPreference === 'light' || rawPreference === 'dark' ? rawPreference : 'auto'

  const current = OPTIONS.find(o => o.value === currentValue) ?? OPTIONS[2]

  // 트리거 아이콘은 effective theme(실제 적용된 테마) 기반
  // — auto일 때 사용자에게 "지금 어떤 모드가 적용 중인가"를 시각적으로 보여주기 위함
  const TriggerIcon = currentValue === 'auto' ? Monitor : effective === 'dark' ? Moon : Sun

  const handleSelect = async (value: ThemePreference) => {
    setOpen(false)
    if (value === currentValue) return
    try {
      await updateSetting('ui', 'theme', value)
    } catch {
      // updateSetting 내부에서 에러 처리 — UI는 다음 settings 동기화 시점에 자연 복구
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t(current.labelKey)}
        title={t(current.labelKey)}
        className="inline-flex items-center gap-1.5 h-10 px-2.5 rounded-sm border border-divider bg-paper text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
      >
        <TriggerIcon className="h-4 w-4" aria-hidden="true" />
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
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
            aria-label="Theme"
            className="absolute right-0 top-full mt-2 w-44 z-40 rounded-md border border-divider bg-paper shadow-hover-lift overflow-hidden"
          >
            {OPTIONS.map(opt => {
              const isSelected = opt.value === currentValue
              const OptIcon = opt.Icon
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 min-h-touch text-base transition-colors',
                      isSelected
                        ? 'bg-gauge-cobalt-soft text-gauge-cobalt-strong font-medium'
                        : 'text-ink hover:bg-paper-warm'
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <OptIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{t(opt.labelKey)}</span>
                    </span>
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
