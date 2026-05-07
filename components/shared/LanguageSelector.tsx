'use client'

import { useState } from 'react'
import { ChevronDown, Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Language = 'ko' | 'vi'

interface Option {
  value: Language
  label: string
  short: string
}

const OPTIONS: Option[] = [
  { value: 'ko', label: '한국어', short: 'KR' },
  { value: 'vi', label: 'Tiếng Việt', short: 'VN' },
]

interface LanguageSelectorProps {
  currentLanguage: Language
  onChange: (lang: Language) => void
  className?: string
}

export function LanguageSelector({
  currentLanguage,
  onChange,
  className,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find(o => o.value === currentLanguage) ?? OPTIONS[0]

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current.label}
        className="inline-flex items-center gap-1.5 h-10 px-2.5 rounded-sm border border-divider bg-paper text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="tabular no-break">{current.short}</span>
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
            aria-label="Language"
            className="absolute right-0 top-full mt-2 w-44 z-40 rounded-md border border-divider bg-paper shadow-hover-lift overflow-hidden"
          >
            {OPTIONS.map(opt => {
              const isSelected = opt.value === currentLanguage
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 min-h-touch text-base transition-colors',
                      isSelected
                        ? 'bg-gauge-cobalt-soft text-gauge-cobalt-strong font-medium'
                        : 'text-ink hover:bg-paper-warm'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
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
