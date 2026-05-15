'use client'

import * as React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTrigger,
} from './bottom-sheet'

export interface SmartDropdownOption {
  value: string
  label: string
  description?: string
}

interface SmartDropdownProps {
  options: SmartDropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  title?: string
  threshold?: number
  recentValues?: string[]
}

const TouchSelect = React.forwardRef<HTMLSelectElement, {
  options: SmartDropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}>(({ options, value, onChange, placeholder, disabled, required, className }, ref) => (
  <select
    ref={ref}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    required={required}
    className={cn(
      'flex h-11 w-full rounded-sm border border-input bg-background px-3 py-2 pr-8 text-base ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
))
TouchSelect.displayName = 'TouchSelect'

export const SmartDropdown = React.forwardRef<HTMLDivElement, SmartDropdownProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder,
      disabled,
      required,
      className,
      title,
      threshold = 10,
      recentValues = [],
    },
    ref
  ) => {
    const { t } = useTranslation()
    const useNative = options.length < threshold
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')

    if (useNative) {
      return (
        <TouchSelect
          options={options}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={className}
        />
      )
    }

    const selected = options.find((o) => o.value === value)
    const filtered = search.trim()
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            o.value.toLowerCase().includes(search.toLowerCase())
        )
      : options

    const recentOptions =
      !search.trim() && recentValues.length
        ? recentValues
            .map((v) => options.find((o) => o.value === v))
            .filter((o): o is SmartDropdownOption => Boolean(o))
        : []
    const recentValueSet = new Set(recentOptions.map((o) => o.value))
    const restOptions = filtered.filter((o) => !recentValueSet.has(o.value))

    const handleSelect = (next: string) => {
      onChange(next)
      setOpen(false)
      setSearch('')
    }

    return (
      <div ref={ref}>
        <BottomSheet open={open} onOpenChange={setOpen}>
          <BottomSheetTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(
                'flex h-11 w-full items-center justify-between rounded-sm border border-input bg-background px-3 py-2 text-base ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                !selected && 'text-ink-mute',
                className
              )}
            >
              <span className="truncate text-left">
                {selected?.label ?? placeholder ?? t('common.select')}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 text-ink-soft" />
            </button>
          </BottomSheetTrigger>
          <BottomSheetContent title={title ?? placeholder ?? t('common.select')}>
            <div className="sticky top-0 z-10 border-b border-divider bg-paper p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('common.search')}
                  className="h-11 w-full rounded-sm border border-divider bg-paper-warm pl-9 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {recentOptions.length > 0 && (
              <div className="border-b border-divider">
                <div className="px-4 pt-3 pb-1 text-caption font-semibold text-ink-soft">
                  {t('common.recent')}
                </div>
                <ul role="listbox" className="pb-2">
                  {recentOptions.map((opt) => (
                    <DropdownItem
                      key={`recent-${opt.value}`}
                      option={opt}
                      selected={opt.value === value}
                      onSelect={handleSelect}
                    />
                  ))}
                </ul>
              </div>
            )}

            <ul role="listbox" className="py-2">
              {restOptions.length === 0 && recentOptions.length === 0 ? (
                <li className="px-4 py-8 text-center text-ink-mute">{t('common.noResults')}</li>
              ) : (
                restOptions.map((opt) => (
                  <DropdownItem
                    key={opt.value}
                    option={opt}
                    selected={opt.value === value}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </ul>
          </BottomSheetContent>
        </BottomSheet>
      </div>
    )
  }
)
SmartDropdown.displayName = 'SmartDropdown'

function DropdownItem({
  option,
  selected,
  onSelect,
}: {
  option: SmartDropdownOption
  selected: boolean
  onSelect: (value: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => onSelect(option.value)}
        className={cn(
          'flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left text-base transition-colors',
          selected
            ? 'bg-gauge-cobalt-soft font-medium text-gauge-cobalt-strong'
            : 'text-ink hover:bg-paper-warm'
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate">{option.label}</div>
          {option.description && (
            <div className="truncate text-caption text-ink-soft">
              {option.description}
            </div>
          )}
        </div>
        {selected && <Check className="h-4 w-4 flex-shrink-0" />}
      </button>
    </li>
  )
}
