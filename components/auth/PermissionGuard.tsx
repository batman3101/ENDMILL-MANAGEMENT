'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions, useRequirePermission, useRequireAdmin, useRequireSystemAdmin } from '@/lib/hooks/usePermissions'
import { Permission } from '@/lib/auth/permissions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ShieldX } from 'lucide-react'

interface PermissionGuardProps {
  children: ReactNode
  resource: string
  action: Permission['action']
  fallback?: ReactNode
  redirectTo?: string
  showAlert?: boolean
}

// 권한 기반 컴포넌트 가드
export function PermissionGuard({
  children,
  resource,
  action,
  fallback,
  redirectTo,
  showAlert = true,
}: PermissionGuardProps) {
  const router = useRouter()
  const { hasPermission, redirectTo: shouldRedirect } = useRequirePermission(
    resource,
    action,
    redirectTo
  )

  useEffect(() => {
    if (shouldRedirect && redirectTo) {
      router.push(redirectTo)
    }
  }, [shouldRedirect, redirectTo, router])

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showAlert) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <ShieldX className="h-4 w-4" />
            <AlertDescription className="mt-2">
              이 기능에 접근할 권한이 없습니다.
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                >
                  이전 페이지로
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return null
  }

  return <>{children}</>
}

// 관리자 권한 가드
interface AdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
  showAlert?: boolean
}

export function AdminGuard({
  children,
  fallback,
  redirectTo,
  showAlert = true,
}: AdminGuardProps) {
  const router = useRouter()
  const { isAdmin, redirectTo: shouldRedirect } = useRequireAdmin(redirectTo)

  useEffect(() => {
    if (shouldRedirect && redirectTo) {
      router.push(redirectTo)
    }
  }, [shouldRedirect, redirectTo, router])

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showAlert) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <ShieldX className="h-4 w-4" />
            <AlertDescription className="mt-2">
              관리자 권한이 필요합니다.
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                >
                  이전 페이지로
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return null
  }

  return <>{children}</>
}

// 시스템 관리자 권한 가드
interface SystemAdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
  showAlert?: boolean
}

export function SystemAdminGuard({
  children,
  fallback,
  redirectTo,
  showAlert = true,
}: SystemAdminGuardProps) {
  const router = useRouter()
  const { isSystemAdmin, redirectTo: shouldRedirect } = useRequireSystemAdmin(redirectTo)

  useEffect(() => {
    if (shouldRedirect && redirectTo) {
      router.push(redirectTo)
    }
  }, [shouldRedirect, redirectTo, router])

  if (!isSystemAdmin) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showAlert) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <ShieldX className="h-4 w-4" />
            <AlertDescription className="mt-2">
              시스템 관리자 권한이 필요합니다.
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                >
                  이전 페이지로
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return null
  }

  return <>{children}</>
}

// 조건부 렌더링을 위한 권한 체크 컴포넌트
interface CanProps {
  children: ReactNode
  resource: string
  action: Permission['action']
  fallback?: ReactNode
}

export function Can({ children, resource, action, fallback }: CanProps) {
  const { hasPermission } = usePermissions()

  if (!hasPermission(resource, action)) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

// 관리자만 볼 수 있는 컴포넌트
interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  const { isAdmin } = usePermissions()

  if (!isAdmin()) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

// 시스템 관리자만 볼 수 있는 컴포넌트
interface SystemAdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function SystemAdminOnly({ children, fallback }: SystemAdminOnlyProps) {
  const { isSystemAdmin } = usePermissions()

  if (!isSystemAdmin()) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}