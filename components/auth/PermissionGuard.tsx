'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'

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
  const { isAdmin } = usePermissions()
  const router = useRouter()

  // 관리자(admin/system_admin)만 접근 허용 — 메뉴 숨김과 별개로 URL 직접 진입도 차단
  const allowed = !loading && !!user && isAdmin()

  // 로그인했으나 관리자가 아니면 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user && !allowed) {
      router.replace('/dashboard')
    }
  }, [loading, user, allowed, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!allowed) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}