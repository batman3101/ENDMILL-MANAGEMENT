'use client'

import * as React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'

export type SortOrder = 'asc' | 'desc'

interface ReportSortHeaderProps<F extends string> {
  label: string
  field: F
  currentField: F
  currentOrder: SortOrder
  onSort: (field: F) => void
  align?: 'left' | 'right'
}

export function ReportSortHeader<F extends string>({
  label,
  field,
  currentField,
  currentOrder,
  onSort,
  align = 'left',
}: ReportSortHeaderProps<F>) {
  const isActive = currentField === field
  return (
    <th
      scope="col"
      className={`px-4 py-3 ${
        align === 'right' ? 'text-right' : 'text-left'
      } text-label font-medium text-ink-soft cursor-pointer transition-colors hover:bg-paper-warm hover:text-ink no-break`}
      onClick={() => onSort(field)}
    >
      <div
        className={`inline-flex items-center gap-1 ${
          align === 'right' ? 'justify-end' : ''
        }`}
      >
        <NoBreak>{label}</NoBreak>
        {isActive &&
          (currentOrder === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
          ))}
      </div>
    </th>
  )
}
