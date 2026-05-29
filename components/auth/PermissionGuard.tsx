'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'

interface PermissionGuardProps {
  children: ReactNode
  resource?: string
  action?: string
  fallback?: ReactNode
}

// 단순화된 권한 기반 컴포넌트 가드 - 로그인 여부만 체크
export function PermissionGuard({
  children,
  fallback,
}: PermissionGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return <>{children}</>
}

// 관리자 권한 가드 (단순화)
interface AdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminGuard({
  children,
  fallback,
}: AdminGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 내부 시스템이므로 로그인한 모든 사용자가 관리자로 간주
  if (!user) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}