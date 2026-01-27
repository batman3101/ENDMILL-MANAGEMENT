'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Factory, FactoryContextType, UserFactoryAccess } from '@/lib/types/factory'

const FactoryContext = createContext<FactoryContextType | undefined>(undefined)

const STORAGE_KEY = 'currentFactoryId'

export function useFactory() {
  const context = useContext(FactoryContext)
  if (context === undefined) {
    throw new Error('useFactory must be used within a FactoryProvider')
  }
  return context
}

export function useFactoryProvider() {
  const queryClient = useQueryClient()
  const supabase = createBrowserClient()
  const { isAuthenticated } = useAuth()
  const [currentFactory, setCurrentFactoryState] = useState<Factory | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // RPC로 접근 가능한 공장 목록 조회 (인증된 경우에만)
  const { data: accessibleFactories = [], isLoading, error } = useQuery({
    queryKey: ['accessible-factories'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_accessible_factories')
      if (error) throw error
      return (data || []) as UserFactoryAccess[]
    },
    staleTime: 5 * 60 * 1000, // 5분
    enabled: isAuthenticated,
  })

  // 초기 공장 설정
  useEffect(() => {
    if (accessibleFactories.length > 0 && !isInitialized) {
      const savedFactoryId = localStorage.getItem(STORAGE_KEY)
      const savedFactory = savedFactoryId
        ? accessibleFactories.find(f => f.factory_id === savedFactoryId)
        : null
      const defaultFactory = accessibleFactories.find(f => f.is_default) || accessibleFactories[0]

      const factory = savedFactory || defaultFactory
      if (factory) {
        setCurrentFactoryState({
          id: factory.factory_id,
          code: factory.code,
          name: factory.name,
          name_ko: factory.name_ko,
          name_vi: factory.name_vi,
          country: factory.country,
          timezone: factory.timezone,
          is_active: true,
          created_at: '',
          updated_at: ''
        })
      }
      setIsInitialized(true)
    }
  }, [accessibleFactories, isInitialized])

  // 공장 전환 함수 (캐시 무효화 포함)
  const setCurrentFactory = useCallback(async (factory: Factory) => {
    setCurrentFactoryState(factory)
    localStorage.setItem(STORAGE_KEY, factory.id)

    // TanStack Query 캐시 무효화
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey as string[]
        return [
          'dashboard',
          'equipment',
          'tool-changes',
          'inventory',
          'cam-sheets',
          'reports',
          'endmill-disposals',
          'endmill-types',
          'users'
        ].some(key => queryKey.includes(key))
      }
    })

    // 활성 쿼리 refetch
    await queryClient.refetchQueries({
      queryKey: ['dashboard'],
      type: 'active'
    })
  }, [queryClient])

  // Factory 형태로 변환
  const factories: Factory[] = accessibleFactories.map(f => ({
    id: f.factory_id,
    code: f.code,
    name: f.name,
    name_ko: f.name_ko,
    name_vi: f.name_vi,
    country: f.country,
    timezone: f.timezone,
    is_active: true,
    created_at: '',
    updated_at: ''
  }))

  return {
    currentFactory,
    accessibleFactories: factories,
    setCurrentFactory,
    isLoading,
    error: error as Error | null
  }
}

export { FactoryContext }
