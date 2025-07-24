import { Database } from '@/lib/types/database'

type UserRole = Database['public']['Enums']['user_role_type']

// 권한 타입 정의
export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
}

// 기본 권한 설정
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  system_admin: [
    // 시스템 관리자는 모든 권한
    { resource: '*', action: 'manage' },
  ],
  admin: [
    // 관리자 권한
    { resource: 'users', action: 'manage' },
    { resource: 'equipment', action: 'manage' },
    { resource: 'endmills', action: 'manage' },
    { resource: 'inventory', action: 'manage' },
    { resource: 'cam_sheets', action: 'manage' },
    { resource: 'tool_changes', action: 'manage' },
    { resource: 'reports', action: 'read' },
    { resource: 'settings', action: 'manage' },
  ],
  user: [
    // 일반 사용자 권한
    { resource: 'equipment', action: 'read' },
    { resource: 'endmills', action: 'read' },
    { resource: 'inventory', action: 'read' },
    { resource: 'cam_sheets', action: 'read' },
    { resource: 'tool_changes', action: 'create' },
    { resource: 'tool_changes', action: 'read' },
    { resource: 'reports', action: 'read' },
  ],
}

// 권한 검증 함수
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action'],
  customPermissions?: Permission[]
): boolean {
  // 커스텀 권한이 있으면 우선 사용
  const permissions = customPermissions || DEFAULT_PERMISSIONS[userRole] || []
  
  // 시스템 관리자는 모든 권한
  if (userRole === 'system_admin') {
    return true
  }
  
  // 권한 확인
  return permissions.some(permission => {
    // 전체 리소스 관리 권한
    if (permission.resource === '*' && permission.action === 'manage') {
      return true
    }
    
    // 특정 리소스 관리 권한
    if (permission.resource === resource && permission.action === 'manage') {
      return true
    }
    
    // 특정 리소스의 특정 액션 권한
    if (permission.resource === resource && permission.action === action) {
      return true
    }
    
    return false
  })
}

// 페이지 접근 권한 검증
export function canAccessPage(userRole: UserRole, pagePath: string): boolean {
  const pagePermissions: Record<string, { resource: string; action: Permission['action'] }> = {
    '/dashboard': { resource: 'dashboard', action: 'read' },
    '/equipment': { resource: 'equipment', action: 'read' },
    '/endmills': { resource: 'endmills', action: 'read' },
    '/inventory': { resource: 'inventory', action: 'read' },
    '/cam-sheets': { resource: 'cam_sheets', action: 'read' },
    '/tool-changes': { resource: 'tool_changes', action: 'read' },
    '/reports': { resource: 'reports', action: 'read' },
    '/settings': { resource: 'settings', action: 'read' },
    '/users': { resource: 'users', action: 'read' },
  }
  
  const pagePermission = pagePermissions[pagePath]
  if (!pagePermission) {
    // 정의되지 않은 페이지는 기본적으로 접근 허용
    return true
  }
  
  return hasPermission(userRole, pagePermission.resource, pagePermission.action)
}

// 관리자 권한 확인
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'system_admin' || userRole === 'admin'
}

// 시스템 관리자 권한 확인
export function isSystemAdmin(userRole: UserRole): boolean {
  return userRole === 'system_admin'
}

// 권한 레벨 비교 (높을수록 더 많은 권한)
export function getRoleLevel(userRole: UserRole): number {
  const levels: Record<UserRole, number> = {
    user: 1,
    admin: 2,
    system_admin: 3,
  }
  
  return levels[userRole] || 0
}

// 더 높은 권한인지 확인
export function hasHigherRole(userRole: UserRole, targetRole: UserRole): boolean {
  return getRoleLevel(userRole) > getRoleLevel(targetRole)
}