import { Database } from '@/lib/types/database'

type UserRole = Database['public']['Enums']['user_role_type']

// 권한 타입 정의
export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'use'
}

// 기본 권한 설정
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  system_admin: [
    // 시스템 관리자는 모든 권한
    { resource: '*', action: 'manage' },
  ],
  admin: [
    // 관리자 권한
    { resource: 'dashboard', action: 'read' },
    { resource: 'users', action: 'manage' },
    { resource: 'equipment', action: 'manage' },
    { resource: 'endmills', action: 'manage' },
    { resource: 'inventory', action: 'manage' },
    { resource: 'cam_sheets', action: 'manage' },
    { resource: 'tool_changes', action: 'manage' },
    { resource: 'endmill_disposals', action: 'manage' },
    { resource: 'reports', action: 'read' },
    { resource: 'settings', action: 'manage' },
    { resource: 'ai_insights', action: 'manage' },
  ],
  user: [
    // 일반 사용자 권한
    { resource: 'dashboard', action: 'read' },
    { resource: 'equipment', action: 'read' },
    { resource: 'endmills', action: 'read' },
    { resource: 'inventory', action: 'read' },
    { resource: 'cam_sheets', action: 'read' },
    { resource: 'tool_changes', action: 'create' },
    { resource: 'tool_changes', action: 'read' },
    { resource: 'endmill_disposals', action: 'read' },
    { resource: 'reports', action: 'read' },
    { resource: 'ai_insights', action: 'use' },
  ],
}

// 권한 검증 함수 (DB 권한 우선 사용)
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action'],
  customPermissions?: Permission[]
): boolean {
  // 시스템 관리자는 모든 권한
  if (userRole === 'system_admin') {
    return true
  }

  // customPermissions가 배열이고 비어있지 않으면 우선 사용
  // 그렇지 않으면 DEFAULT_PERMISSIONS 사용 (폴백)
  const permissions = (customPermissions && Array.isArray(customPermissions) && customPermissions.length > 0)
    ? customPermissions
    : (DEFAULT_PERMISSIONS[userRole] || [])

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
export function canAccessPage(
  userRole: UserRole,
  pagePath: string,
  customPermissions?: Permission[]
): boolean {
  const pagePermissions: Record<string, { resource: string; action: Permission['action'] }> = {
    '/dashboard': { resource: 'dashboard', action: 'read' },
    '/equipment': { resource: 'equipment', action: 'read' },
    '/endmills': { resource: 'endmills', action: 'read' },
    '/inventory': { resource: 'inventory', action: 'read' },
    '/cam-sheets': { resource: 'cam_sheets', action: 'read' },
    '/tool-changes': { resource: 'tool_changes', action: 'read' },
    '/endmill-disposal': { resource: 'endmill_disposals', action: 'read' },
    '/reports': { resource: 'reports', action: 'read' },
    '/settings': { resource: 'settings', action: 'read' },
    '/users': { resource: 'users', action: 'read' },
    '/ai-insights': { resource: 'ai_insights', action: 'use' },
  }

  const pagePermission = pagePermissions[pagePath]
  if (!pagePermission) {
    // 정의되지 않은 페이지는 기본적으로 접근 허용
    return true
  }

  return hasPermission(userRole, pagePermission.resource, pagePermission.action, customPermissions)
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

// 데이터베이스 권한 객체를 Permission[] 배열로 변환
export function parsePermissionsFromDB(dbPermissions: any): Permission[] {
  if (!dbPermissions || typeof dbPermissions !== 'object') {
    return []
  }

  const permissions: Permission[] = []

  for (const [resource, actions] of Object.entries(dbPermissions)) {
    if (Array.isArray(actions)) {
      for (const action of actions) {
        if (['create', 'read', 'update', 'delete', 'manage', 'use'].includes(action)) {
          permissions.push({
            resource,
            action: action as Permission['action']
          })
        }
      }
    }
  }

  return permissions
}

// 권한 매트릭스에서 특정 리소스의 액션 확인
export function hasPermissionInMatrix(
  permissionMatrix: Record<string, string[]>,
  resource: string,
  action: Permission['action']
): boolean {
  const resourcePermissions = permissionMatrix[resource] || []

  // 'manage' 권한이 있으면 모든 액션 허용
  if (resourcePermissions.includes('manage')) {
    return true
  }

  // 특정 액션 확인
  return resourcePermissions.includes(action)
}

// 권한 매트릭스 초기화 (기본 권한 설정)
export function getDefaultPermissionMatrix(userRole: UserRole): Record<string, string[]> {
  const permissions = DEFAULT_PERMISSIONS[userRole] || []
  const matrix: Record<string, string[]> = {}

  for (const permission of permissions) {
    if (!matrix[permission.resource]) {
      matrix[permission.resource] = []
    }
    if (!matrix[permission.resource].includes(permission.action)) {
      matrix[permission.resource].push(permission.action)
    }
  }

  return matrix
}

// 권한 매트릭스 병합 (커스텀 권한 + 기본 권한)
export function mergePermissionMatrices(
  customMatrix: Record<string, string[]>,
  defaultMatrix: Record<string, string[]>
): Record<string, string[]> {
  const merged: Record<string, string[]> = { ...defaultMatrix }

  for (const [resource, actions] of Object.entries(customMatrix)) {
    if (!merged[resource]) {
      merged[resource] = []
    }

    for (const action of actions) {
      if (!merged[resource].includes(action)) {
        merged[resource].push(action)
      }
    }
  }

  return merged
}

// 모든 가능한 리소스 목록
export const AVAILABLE_RESOURCES = [
  'dashboard',
  'equipment',
  'endmills',
  'inventory',
  'cam_sheets',
  'tool_changes',
  'endmill_disposals',
  'reports',
  'settings',
  'users',
  'ai_insights'
] as const

// 모든 가능한 액션 목록
export const AVAILABLE_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'use'
] as const

// 리소스별 사용 가능한 액션 정의
export const RESOURCE_AVAILABLE_ACTIONS: Record<string, Permission['action'][]> = {
  dashboard: ['read'],
  equipment: ['create', 'read', 'update', 'delete', 'manage'],
  endmills: ['create', 'read', 'update', 'delete', 'manage'],
  inventory: ['create', 'read', 'update', 'delete', 'manage'],
  cam_sheets: ['create', 'read', 'update', 'delete', 'manage'],
  tool_changes: ['create', 'read', 'update', 'delete', 'manage'],
  endmill_disposals: ['create', 'read', 'update', 'delete', 'manage'],
  reports: ['read', 'manage'],
  settings: ['read', 'update', 'manage'],
  users: ['create', 'read', 'update', 'delete', 'manage'],
  ai_insights: ['use', 'manage']
}