'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY_PREFIX = 'tool-changes-sticky-context'
const EXPIRY_MS = 12 * 60 * 60 * 1000

export interface ToolChangeStickyContext {
  equipment_number: string
  production_model: string
  process: string
  changed_by: string
  changed_by_name?: string
  savedAt: number
}

const storageKey = (userId: string) => `${STORAGE_KEY_PREFIX}::${userId}`

const isExpired = (savedAt: number) => Date.now() - savedAt > EXPIRY_MS

export function useStickyContext(userId: string | undefined) {
  const [context, setContextState] = useState<ToolChangeStickyContext | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!userId) {
      setHydrated(true)
      return
    }
    try {
      const raw = window.localStorage.getItem(storageKey(userId))
      if (raw) {
        const parsed = JSON.parse(raw) as ToolChangeStickyContext
        if (isExpired(parsed.savedAt)) {
          window.localStorage.removeItem(storageKey(userId))
        } else {
          setContextState(parsed)
        }
      }
    } catch {
      // ignore corrupt storage; treat as no context
    } finally {
      setHydrated(true)
    }
  }, [userId])

  const saveContext = useCallback(
    (next: Omit<ToolChangeStickyContext, 'savedAt'>) => {
      if (!userId) return
      const withTimestamp: ToolChangeStickyContext = { ...next, savedAt: Date.now() }
      try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(withTimestamp))
      } catch {
        // ignore quota errors
      }
      setContextState(withTimestamp)
    },
    [userId]
  )

  const clearContext = useCallback(() => {
    if (!userId) return
    try {
      window.localStorage.removeItem(storageKey(userId))
    } catch {
      // ignore
    }
    setContextState(null)
  }, [userId])

  const minutesAgo = context ? Math.floor((Date.now() - context.savedAt) / 60000) : null

  return {
    context,
    hasContext: context !== null,
    minutesAgo,
    hydrated,
    saveContext,
    clearContext,
  }
}
