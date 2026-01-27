// 사용자 역할 타입
export type UserRoleType = 'system_admin' | 'admin' | 'user'

// 권한 액션 타입
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage'

// 모듈별 권한 타입
export interface ModulePermissions {
  dashboard: PermissionAction[]
  equipment: PermissionAction[]
  endmill: PermissionAction[]
  inventory: PermissionAction[]
  camSheets: PermissionAction[]
  toolChanges: PermissionAction[]
  reports: PermissionAction[]
  settings: PermissionAction[]
  users: PermissionAction[]
}

// 사용자 역할 정의
export interface UserRole {
  id: string
  name: string
  type: UserRoleType
  description: string
  permissions: ModulePermissions
  isSystemRole: boolean // 시스템 기본 역할인지 (수정 불가)
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

// 사용자 정보
export interface User {
  id: string
  email: string
  name: string
  employeeId: string // 사번
  department: string
  position: string // 직위
  roleId: string // 역할 ID 참조
  shift: string // 교대
  phone?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string | null
  updatedAt: string | null
  createdBy?: string
  permissions?: Record<string, string[]> // 사용자 개인 권한 (역할 권한 오버라이드)
  // 공장 관련 필드
  defaultFactoryId?: string // 기본 공장 ID
  accessibleFactories?: Array<{
    factory_id: string
    code: string
    name: string
    name_ko: string
    name_vi: string
    country: string
    timezone: string
    is_default: boolean
  }>
}

// 사용자 통계
export interface UserStats {
  total: number
  systemAdmins: number
  admins: number
  users: number
  activeUsers: number
  inactiveUsers: number
  departmentStats: Record<string, number>
  shiftStats: Record<string, number>
}

// 사용자 필터
export interface UserFilter {
  role?: UserRoleType
  department?: string
  shift?: string
  position?: string
  isActive?: boolean
  search?: string
}

// 권한 검사 결과
export interface PermissionCheck {
  hasPermission: boolean
  module: keyof ModulePermissions
  action: PermissionAction
  reason?: string
}

// 기본 권한 템플릿
export const DEFAULT_PERMISSIONS: Record<UserRoleType, ModulePermissions> = {
  system_admin: {
    dashboard: ['read'],
    equipment: ['create', 'read', 'update', 'delete', 'manage'],
    endmill: ['create', 'read', 'update', 'delete', 'manage'],
    inventory: ['create', 'read', 'update', 'delete', 'manage'],
    camSheets: ['create', 'read', 'update', 'delete', 'manage'],
    toolChanges: ['create', 'read', 'update', 'delete', 'manage'],
    reports: ['create', 'read', 'update', 'delete', 'manage'],
    settings: ['create', 'read', 'update', 'delete', 'manage'],
    users: ['create', 'read', 'update', 'delete', 'manage']
  },
  admin: {
    dashboard: ['read'],
    equipment: ['create', 'read', 'update', 'delete'],
    endmill: ['create', 'read', 'update', 'delete'],
    inventory: ['create', 'read', 'update', 'delete'],
    camSheets: ['create', 'read', 'update', 'delete'],
    toolChanges: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    settings: ['read'], // 설정 페이지 제한
    users: ['create', 'read', 'update', 'delete']
  },
  user: {
    dashboard: ['read'],
    equipment: ['read', 'update'], // 설비 관리 모듈 사용 가능
    endmill: ['read'],
    inventory: ['create', 'read', 'update'], // 재고 관리 모듈 사용 가능
    camSheets: ['read'],
    toolChanges: ['create', 'read', 'update'], // 교체 실적 모듈 사용 가능
    reports: ['read'],
    settings: [], // 설정 페이지 접근 제한
    users: ['read'] // 본인 정보만 조회
  }
}

// 역할 이름 매핑
export const ROLE_NAMES: Record<UserRoleType, string> = {
  system_admin: '시스템 관리자',
  admin: '관리자',
  user: '사용자'
}

// 권한 액션 이름 매핑
export const PERMISSION_ACTION_NAMES: Record<PermissionAction, string> = {
  create: '생성',
  read: '조회',
  update: '수정',
  delete: '삭제',
  manage: '관리'
}

// 모듈 이름 매핑
export const MODULE_NAMES: Record<keyof ModulePermissions, string> = {
  dashboard: '대시보드',
  equipment: '설비 관리',
  endmill: '앤드밀 관리',
  inventory: '재고 관리',
  camSheets: 'CAM Sheet',
  toolChanges: '교체 실적',
  reports: '보고서',
  settings: '시스템 설정',
  users: '사용자 관리'
} 