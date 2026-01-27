'use client'

import { ReactNode } from 'react'
import { FactoryContext, useFactoryProvider } from '@/lib/hooks/useFactory'

interface FactoryProviderProps {
  children: ReactNode
}

export function FactoryProvider({ children }: FactoryProviderProps) {
  const factoryState = useFactoryProvider()

  return (
    <FactoryContext.Provider value={factoryState}>
      {children}
    </FactoryContext.Provider>
  )
}
