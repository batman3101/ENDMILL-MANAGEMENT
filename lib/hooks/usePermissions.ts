import { useAuth } from './useAuth'
import { hasPermission, canAccessPage, isAdmin, isSystemAdmin, Permission, parsePermissionsFromDB } from '@/lib/auth/permissions'
import { Database } from '@/lib/types/database'

type UserRole = Database['public']['Enums']['user_role_type']

export function usePermissions() {
  const { user } = useAuth()

  const userRole = (user?.role as UserRole) || 'user'

  // 사용자 개별 권한을 Permission[] 배열로 변환
  const customPermissions = user?.permissions ? parsePermissionsFromDB(user.permissions) : undefined

  return {
    // 권한 검증 함수들 - customPermissions 전달
    hasPermission: (resource: string, action: Permission['action']) =>
      hasPermission(userRole, resource, action, customPermissions),

    canAccessPage: (pagePath: string) =>
      canAccessPage(userRole, pagePath, customPermissions),

    isAdmin: () => isAdmin(userRole),

    isSystemAdmin: () => isSystemAdmin(userRole),
    
    // 특정 리소스별 권한 확인 - customPermissions 전달
    canManageUsers: () => hasPermission(userRole, 'users', 'manage', customPermissions),
    canCreateUsers: () => hasPermission(userRole, 'users', 'create', customPermissions),
    canEditUsers: () => hasPermission(userRole, 'users', 'update', customPermissions),
    canDeleteUsers: () => hasPermission(userRole, 'users', 'delete', customPermissions),

    canManageEquipment: () => hasPermission(userRole, 'equipment', 'manage', customPermissions),
    canEditEquipment: () => hasPermission(userRole, 'equipment', 'update', customPermissions),

    canManageEndmills: () => hasPermission(userRole, 'endmills', 'manage', customPermissions),
    canEditEndmills: () => hasPermission(userRole, 'endmills', 'update', customPermissions),

    canManageInventory: () => hasPermission(userRole, 'inventory', 'manage', customPermissions),
    canEditInventory: () => hasPermission(userRole, 'inventory', 'update', customPermissions),

    canManageCamSheets: () => hasPermission(userRole, 'cam_sheets', 'manage', customPermissions),
    canEditCamSheets: () => hasPermission(userRole, 'cam_sheets', 'update', customPermissions),

    canCreateToolChanges: () => hasPermission(userRole, 'tool_changes', 'create', customPermissions),
    canManageToolChanges: () => hasPermission(userRole, 'tool_changes', 'manage', customPermissions),

    canManageSettings: () => hasPermission(userRole, 'settings', 'manage', customPermissions),
    
    // 현재 사용자 역할
    userRole,
    
    // 사용자 정보
    user,
  }
}

// 권한 기반 컴포넌트 래퍼
export function useRequirePermission(
  resource: string, 
  action: Permission['action'],
  redirectTo: string = '/dashboard'
) {
  const { hasPermission: checkPermission } = usePermissions()
  const { user } = useAuth()
  
  const hasRequiredPermission = checkPermission(resource, action)
  
  return {
    hasPermission: hasRequiredPermission,
    user,
    redirectTo: hasRequiredPermission ? null : redirectTo,
  }
}

// 관리자 권한 필요한 컴포넌트용 훅
export function useRequireAdmin(redirectTo: string = '/dashboard') {
  const { isAdmin: checkIsAdmin } = usePermissions()
  const { user } = useAuth()
  
  const isAdminUser = checkIsAdmin()
  
  return {
    isAdmin: isAdminUser,
    user,
    redirectTo: isAdminUser ? null : redirectTo,
  }
}

// 시스템 관리자 권한 필요한 컴포넌트용 훅
export function useRequireSystemAdmin(redirectTo: string = '/dashboard') {
  const { isSystemAdmin: checkIsSystemAdmin } = usePermissions()
  const { user } = useAuth()
  
  const isSystemAdminUser = checkIsSystemAdmin()
  
  return {
    isSystemAdmin: isSystemAdminUser,
    user,
    redirectTo: isSystemAdminUser ? null : redirectTo,
  }
}