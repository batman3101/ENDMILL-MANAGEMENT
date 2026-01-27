'use client'

import { useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useFactory } from '@/lib/hooks/useFactory'

export function useFactoryPermission() {
  const { user } = useAuth()
  const { currentFactory, accessibleFactories } = useFactory()

  // 접근 가능한 공장 ID 목록
  const accessibleFactoryIds = useMemo(() => {
    return accessibleFactories.map(f => f.id)
  }, [accessibleFactories])

  // 특정 공장에 대한 접근 권한 확인
  const hasFactoryAccess = useCallback((factoryId: string) => {
    return accessibleFactoryIds.includes(factoryId)
  }, [accessibleFactoryIds])

  // 현재 선택된 공장에 대한 접근 권한 확인
  const canAccessCurrentFactory = useMemo(() => {
    return currentFactory ? hasFactoryAccess(currentFactory.id) : false
  }, [currentFactory, hasFactoryAccess])

  // 시스템 관리자인지 확인 (모든 공장 접근 가능)
  const isSystemAdmin = useMemo(() => {
    return user?.role === 'system_admin'
  }, [user])

  return {
    hasFactoryAccess,
    canAccessCurrentFactory,
    accessibleFactoryIds,
    isSystemAdmin
  }
}
