'use client'

import React from 'react'

interface SortableTableHeaderProps {
  label: string
  field: string
  currentSortField: string
  currentSortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
  className?: string
}

export default function SortableTableHeader({
  label,
  field,
  currentSortField,
  currentSortOrder,
  onSort,
  className = ''
}: SortableTableHeaderProps) {
  const isActive = currentSortField === field

  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer transition-colors hover:bg-paper-warm hover:text-ink ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center">
        {label}
        <span className="ml-1">
          {isActive && (currentSortOrder === 'asc' ? '↑' : '↓')}
        </span>
      </div>
    </th>
  )
}