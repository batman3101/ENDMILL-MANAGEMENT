'use client'

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users,
  UserCheck,
  Lock,
  Plus,
  Upload,
  X,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Save,
  UserPlus,
  Building2,
  CalendarClock,
  Target,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { useUsers } from '../../../lib/hooks/useUsers'
import { User, UserRole } from '../../../lib/types/users'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import { AdminGuard } from '../../../components/auth/PermissionGuard'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'
import { AVAILABLE_RESOURCES } from '../../../lib/auth/permissions'
import { useAuth } from '../../../lib/hooks/useAuth'
import type { BulkUploadResult } from '../../../lib/utils/userExcelTemplate'
// userExcelTemplate functions are dynamically imported when needed
import { useFactory } from '../../../lib/hooks/useFactory'
import { StatusBadge } from '@/components/ui/status-badge'
import { NoBreak } from '@/components/ui/no-break'
import {
  UserListCard,
  type UserListCardItem,
  type UserListCardLabels,
  type UserListCardRoleType,
} from '@/components/features/users/user-list-card'

type PermissionFormState = Record<string, string[]>

type ActionKey = 'create' | 'read' | 'update' | 'delete' | 'manage'

const ACTION_KEYS: ActionKey[] = ['create', 'read', 'update', 'delete', 'manage']

function ActionIcon({ action, className }: { action: string; className?: string }) {
  const cls = className ?? 'h-4 w-4'
  switch (action) {
    case 'create':
      return <Plus className={cls} aria-hidden="true" />
    case 'read':
      return <Eye className={cls} aria-hidden="true" />
    case 'update':
      return <Pencil className={cls} aria-hidden="true" />
    case 'delete':
      return <Trash2 className={cls} aria-hidden="true" />
    case 'manage':
      return <RotateCcw className={cls} aria-hidden="true" />
    default:
      return <span className={cls} aria-hidden="true">·</span>
  }
}

function actionTone(action: string): string {
  switch (action) {
    case 'create':
      return 'text-gauge-cobalt-strong'
    case 'read':
      return 'text-signal-go-strong'
    case 'update':
      return 'text-signal-watch-strong'
    case 'delete':
      return 'text-ink-soft'
    case 'manage':
      return 'text-gauge-cobalt-strong'
    default:
      return 'text-ink-mute'
  }
}

function roleType(roleId: string, roles: UserRole[]): UserListCardRoleType {
  const role = roles.find(r => r.id === roleId)
  if (!role) return 'unknown'
  if (role.type === 'system_admin') return 'system_admin'
  if (role.type === 'admin') return 'admin'
  if (role.type === 'user') return 'user'
  return 'unknown'
}

function roleBadgeClass(t: UserListCardRoleType): string {
  switch (t) {
    case 'system_admin':
      return 'bg-gauge-cobalt-soft text-gauge-cobalt-strong'
    case 'admin':
      return 'bg-signal-watch-soft text-signal-watch-strong'
    case 'user':
      return 'bg-paper text-ink-soft border border-divider'
    default:
      return 'bg-paper-warm text-ink-mute border border-divider'
  }
}

export default function UsersPage() {
  return (
    <AdminGuard>
      <UsersPageContent />
    </AdminGuard>
  )
}

function UsersPageContent() {
  const { t } = useTranslation()
  const {
    getUserStats,
    getFilteredUsers,
    roles,
    isLoading,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    loadUsers,
  } = useUsers()

  const confirmation = useConfirmation()
  const { showSuccess, showError } = useToast()
  const { user: currentUser, refreshSession } = useAuth()
  const { currentFactory } = useFactory()

  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // 모달 상태
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // 권한 편집 모달 상태
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedUserForPermission, setSelectedUserForPermission] = useState<User | null>(null)
  const [permissionFormData, setPermissionFormData] = useState<PermissionFormState>({})

  // 권한 템플릿 관련 상태
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<UserRole | null>(null)
  const [selectedUsersForTemplate, setSelectedUsersForTemplate] = useState<string[]>([])

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'list' | 'permissions'>('list')

  // 폼 상태
  const [editFormData, setEditFormData] = useState<Partial<User>>({})
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    department: '',
    position: '',
    roleId: '',
    shift: '',
    phone: '',
    isActive: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 일괄 등록 상태
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null)
  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [bulkUploadResult, setBulkUploadResult] = useState<BulkUploadResult | null>(null)
  const [bulkValidationErrors, setBulkValidationErrors] = useState<string[]>([])

  // 정렬 상태
  const [sortField, setSortField] = useState<string>('department')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // 정렬 핸들러
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
      setCurrentPage(1)
    },
    [sortField]
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="rounded-md border border-divider bg-paper-warm px-6 py-8 text-center">
            <Users className="h-8 w-8 text-gauge-cobalt-strong mx-auto mb-3" aria-hidden="true" />
            <p className="text-base text-ink-soft">{t('users.loadingData')}</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = getUserStats()

  // 필터링된 사용자 목록 가져오기
  const allUsers = getFilteredUsers()

  // 클라이언트 사이드 필터링
  const filteredUsers = allUsers.filter(user => {
    const userRole = roles.find(role => role.id === user.roleId)

    const matchesSearch =
      searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = departmentFilter === '' || user.department === departmentFilter
    const matchesRole = roleFilter === '' || (userRole && userRole.type === roleFilter)
    const matchesStatus =
      statusFilter === '' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive)

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus
  })

  // 정렬 적용
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortField as keyof User] || ''
    const bValue = b[sortField as keyof User] || ''

    if (sortField === 'roleId') {
      const aRole = roles.find(r => r.id === a.roleId)
      const bRole = roles.find(r => r.id === b.roleId)
      const aRoleName = aRole ? aRole.name : ''
      const bRoleName = bRole ? bRole.name : ''
      if (sortDirection === 'asc') return aRoleName.localeCompare(bRoleName, 'ko')
      return bRoleName.localeCompare(aRoleName, 'ko')
    }

    if (sortDirection === 'asc') return String(aValue).localeCompare(String(bValue), 'ko')
    return String(bValue).localeCompare(String(aValue), 'ko')
  })

  // 페이지네이션 적용
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex)

  const getUserRole = (roleId: string) => roles.find(role => role.id === roleId)

  const getRoleName = (typeStr: string) => {
    switch (typeStr) {
      case 'system_admin':
        return t('users.roleSystemAdmin')
      case 'admin':
        return t('users.roleAdmin')
      case 'user':
        return t('users.roleUser')
      default:
        return t('users.roleUnknown')
    }
  }

  // CRUD 핸들러 함수들
  const handleViewDetail = (user: User) => {
    setSelectedUser(user)
    setShowDetailModal(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setEditFormData(user)
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const updatedUser = await updateUser(selectedUser.id, editFormData)
      if (updatedUser) {
        showSuccess(
          t('users.editComplete'),
          `${updatedUser?.name || ''} ${t('users.editComplete')}`
        )
        setShowEditModal(false)
        setSelectedUser(null)
        setEditFormData({})
      } else {
        showError(t('users.editFailed'), t('users.editError'))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('users.editError')
      showError(t('users.editFailed'), message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (user: User) => {
    const confirmed = await confirmation.showConfirmation({
      type: 'delete',
      title: t('users.deleteTitle'),
      message: (
        <div>
          <p className="mb-2 text-base text-ink">
            {t('users.deleteConfirmPrefix')}
            <strong>{user.name}</strong>
            {t('users.deleteConfirmSuffix')}
          </p>
          <p className="text-caption text-ink-soft">{t('users.deleteWarning')}</p>
        </div>
      ),
      confirmText: t('users.actionDelete'),
      cancelText: t('users.cancel'),
      isDangerous: true,
    })

    if (confirmed) {
      try {
        const success = await deleteUser(user.id)
        if (success) {
          showSuccess(t('users.deleteComplete'), `${user.name} - ${t('users.deleteSuccess')}`)
        } else {
          showError(t('users.deleteFailed'), t('users.deleteError'))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t('users.deleteError')
        showError(t('users.deleteFailed'), message)
      }
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!addFormData.name.trim()) return showError(t('users.inputError'), t('users.nameRequired'))
    if (!addFormData.email.trim()) return showError(t('users.inputError'), t('users.emailRequired'))
    if (!addFormData.password.trim())
      return showError(t('users.inputError'), t('users.passwordRequired'))
    if (addFormData.password.length < 6)
      return showError(t('users.inputError'), t('users.passwordMin'))
    if (!addFormData.employeeId.trim())
      return showError(t('users.inputError'), t('users.employeeIdRequired'))
    if (!addFormData.roleId) return showError(t('users.inputError'), t('users.roleRequired'))

    setIsSubmitting(true)
    try {
      const newUser = await createUser({
        ...addFormData,
        createdBy: 'admin',
      })

      showSuccess(t('users.addComplete'), `${newUser.name} - ${t('users.addSuccess')}`)
      setShowAddModal(false)
      setAddFormData({
        name: '',
        email: '',
        password: '',
        employeeId: '',
        department: '',
        position: '',
        roleId: '',
        shift: '',
        phone: '',
        isActive: true,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('users.addError')
      showError(t('users.addFailed'), message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      showError(t('users.bulkNoFileTitle'), t('users.bulkNoFile'))
      return
    }

    setIsBulkUploading(true)
    setBulkUploadResult(null)
    setBulkValidationErrors([])

    try {
      const { parseUserExcel, validateUserData } = await import(
        '../../../lib/utils/userExcelTemplate'
      )
      const parsedData = await parseUserExcel(bulkUploadFile)
      if (parsedData.length === 0) {
        showError(t('users.bulkNoDataTitle'), t('users.bulkNoData'))
        setIsBulkUploading(false)
        return
      }

      const validation = validateUserData(parsedData)
      if (!validation.isValid) {
        setBulkValidationErrors(validation.errors)
        setIsBulkUploading(false)
        return
      }

      const response = await fetch('/api/users/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: parsedData,
          factoryId: currentFactory?.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        showError(t('users.bulkUploadFailed'), result.error || t('users.bulkServerError'))
        setIsBulkUploading(false)
        return
      }

      setBulkUploadResult(result)

      if (result.successCount > 0) {
        showSuccess(
          t('users.bulkUploadComplete'),
          t('users.bulkSuccessCount', { count: result.successCount })
        )
        loadUsers()
      }

      if (result.failedCount > 0 || result.duplicateCount > 0) {
        showError(
          t('users.bulkPartialError'),
          t('users.bulkPartialFailure', {
            failed: result.failedCount,
            duplicate: result.duplicateCount,
          })
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('users.bulkUploadError')
      showError(t('users.bulkUploadFailed'), message)
    } finally {
      setIsBulkUploading(false)
    }
  }

  const handleCloseBulkUploadModal = () => {
    setShowBulkUploadModal(false)
    setBulkUploadFile(null)
    setBulkUploadResult(null)
    setBulkValidationErrors([])
  }

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? t('users.actionDeactivate') : t('users.actionActivate')
    const confirmed = await confirmation.showConfirmation({
      type: 'update',
      title: `${t('users.statusChangePrefix')}${action}`,
      message: `${user.name} - ${action}${t('users.statusChangeMessage')}`,
      confirmText: action,
      cancelText: t('users.cancel'),
    })

    if (confirmed) {
      try {
        const updatedUser = await toggleUserStatus(user.id)
        if (updatedUser) {
          showSuccess(
            `${action} ${t('users.statusChangeComplete')}`,
            `${user.name} - ${action}`
          )
        } else {
          showError(`${action} ${t('users.statusChangeFailed')}`, t('users.editError'))
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('users.statusChangeError')
        showError(`${action} ${t('users.statusChangeFailed')}`, message)
      }
    }
  }

  const handleEditPermissions = (user: User) => {
    if (currentUser?.role !== 'system_admin') {
      showError(t('users.permissionDenied'), t('users.permissionDeniedMsg'))
      return
    }

    setSelectedUserForPermission(user)
    setPermissionFormData((user.permissions as PermissionFormState) || {})
    setShowPermissionModal(true)
  }

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserForPermission) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/users/${selectedUserForPermission.id}/permissions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: permissionFormData }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('users.permissionUpdateError'))
      }

      const result = await response.json()

      if (result.success) {
        showSuccess(
          t('users.permissionUpdateComplete'),
          `${selectedUserForPermission.name}${t('users.permissionUpdateMsg')}`
        )
        setShowPermissionModal(false)
        setSelectedUserForPermission(null)
        setPermissionFormData({})

        await loadUsers()

        if (currentUser && selectedUserForPermission.id === currentUser.id) {
          await refreshSession()
        }
      } else {
        throw new Error(result.error || t('users.permissionUpdateError'))
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('users.permissionUpdateError')
      showError(t('users.permissionUpdateFailed'), message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setPermissionFormData((prev: PermissionFormState) => {
      const modulePermissions = prev[module] || []
      let newPermissions: string[]

      if (checked) {
        newPermissions = [...modulePermissions, action]
      } else {
        newPermissions = modulePermissions.filter((a: string) => a !== action)
      }

      return {
        ...prev,
        [module]: newPermissions,
      }
    })
  }

  // 권한 템플릿 관련 핸들러
  const handleApplyTemplate = (template: UserRole) => {
    setSelectedTemplate(template)
    setShowTemplateModal(true)
  }

  const handleUserSelectionForTemplate = (userId: string, checked: boolean) => {
    setSelectedUsersForTemplate(prev => {
      if (checked) return [...prev, userId]
      return prev.filter(id => id !== userId)
    })
  }

  // MN2: 정직한 안내 — 일괄 적용 API 미구현, 토스트만 정직하게.
  const handleApplyTemplateToUsers = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate || selectedUsersForTemplate.length === 0) return
    showError(t('users.permissionUpdateFailed'), t('users.templateNotImplemented'))
  }

  const getTemplateUsageCount = (roleId: string): number => {
    return allUsers.filter(user => user.roleId === roleId).length
  }

  // 부서 목록 (고정)
  const departments = ['종합관리실', '공구관리실', 'Engineer']
  // 교대 목록 (A조, B조)
  const shifts = ['A', 'B']

  // 모듈 라벨
  const getModuleDisplayName = (module: string): string => {
    const map: Record<string, string> = {
      dashboard: t('users.moduleDashboard'),
      equipment: t('users.moduleEquipment'),
      endmills: t('users.moduleEndmills'),
      inventory: t('users.moduleInventory'),
      cam_sheets: t('users.moduleCamSheets'),
      tool_changes: t('users.moduleToolChanges'),
      endmill_disposals: t('users.moduleEndmillDisposals'),
      reports: t('users.moduleReports'),
      settings: t('users.moduleSettings'),
      users: t('users.moduleUsers'),
      ai_insights: t('users.moduleAiInsights'),
    }
    return map[module] || module
  }

  const getActionDisplayName = (action: string): string => {
    const map: Record<string, string> = {
      create: t('users.actionCreate'),
      read: t('users.actionRead'),
      update: t('users.actionUpdate'),
      delete: t('users.actionDelete'),
      manage: t('users.actionManage'),
    }
    return map[action] || action
  }

  const getUserPermissionLevel = (user: User): string => {
    const role = getUserRole(user.roleId)
    if (!role) return t('users.roleUnknown')
    const uniqueActions = new Set(Object.values(role.permissions).flat()).size
    if (uniqueActions >= 4) return t('users.permissionLevelFull')
    if (uniqueActions >= 3) return t('users.permissionLevelAdvanced')
    if (uniqueActions >= 2) return t('users.permissionLevelGeneral')
    return t('users.permissionLevelLimited')
  }

  // 카드 라벨 (모바일)
  const cardLabels: UserListCardLabels = {
    employeeId: t('users.employeeId'),
    email: t('users.email'),
    department: t('users.department'),
    position: t('users.position'),
    role: t('users.role'),
    detail: t('users.actionDetail'),
    edit: t('users.actionEdit'),
    permissions: t('users.actionPermissions'),
    delete: t('users.actionDelete'),
    toggleActivate: t('users.actionActivate'),
    toggleDeactivate: t('users.actionDeactivate'),
    statusActive: t('users.statusActive'),
    statusInactive: t('users.statusInactive'),
  }

  const toCardItem = (user: User): UserListCardItem => {
    const userRole = getUserRole(user.roleId)
    const t1: UserListCardRoleType = userRole
      ? userRole.type === 'system_admin'
        ? 'system_admin'
        : userRole.type === 'admin'
          ? 'admin'
          : 'user'
      : 'unknown'
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      department: user.department,
      position: user.position,
      isActive: user.isActive,
      roleType: t1,
      roleLabel: userRole ? getRoleName(userRole.type) : t('users.roleUnknown'),
    }
  }

  const formatDateTime = (value: string | undefined): string => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return value
    }
  }

  const isAnyFilterActive = Boolean(searchTerm || departmentFilter || roleFilter || statusFilter)
  const canEditPermissions = currentUser?.role === 'system_admin'

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* === Stat Strip === */}
      <section className="rounded-md border border-divider bg-paper-warm">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-divider lg:divide-y-0 lg:divide-x lg:divide-divider">
          <StatCell label={t('users.totalUsers')} value={stats.total.toLocaleString()} unit={t('users.userUnit')} />
          <StatCell
            label={t('users.systemAdmins')}
            value={stats.systemAdmins.toLocaleString()}
            unit={t('users.userUnit')}
            tone="cobalt"
          />
          <StatCell
            label={t('users.admins')}
            value={stats.admins.toLocaleString()}
            unit={t('users.userUnit')}
            tone="watch"
          />
          <StatCell
            label={t('users.activeUsers')}
            value={stats.activeUsers.toLocaleString()}
            unit={t('users.userUnit')}
            tone="go"
          />
        </div>
      </section>

      {/* === 탭 === */}
      <section className="rounded-md border border-divider bg-paper-warm">
        <nav className="flex" aria-label={t('users.title')}>
          <TabButton
            active={activeTab === 'list'}
            onClick={() => setActiveTab('list')}
            icon={<Users className="h-4 w-4" />}
            label={t('users.tabList')}
            count={`${filteredUsers.length}${t('users.userUnit')}`}
          />
          <TabButton
            active={activeTab === 'permissions'}
            onClick={() => setActiveTab('permissions')}
            icon={<Lock className="h-4 w-4" />}
            label={t('users.tabPermissions')}
            count={`${AVAILABLE_RESOURCES.length} ${t('users.moduleSuffix')}`}
          />
        </nav>
      </section>

      {/* === 사용자 목록 탭 === */}
      {activeTab === 'list' && (
        <>
          {/* 필터/검색 */}
          <section className="rounded-md border border-divider bg-paper-warm p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-1 sm:gap-2">
                <input
                  type="text"
                  placeholder={t('users.searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="min-h-touch flex-1 rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none"
                />
                <select
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                  className="min-h-touch rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                >
                  <option value="">{t('users.allDepartments')}</option>
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="min-h-touch rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                >
                  <option value="">{t('users.allRoles')}</option>
                  <option value="system_admin">{t('users.roleSystemAdmin')}</option>
                  <option value="admin">{t('users.roleAdmin')}</option>
                  <option value="user">{t('users.roleUser')}</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="min-h-touch rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                >
                  <option value="">{t('users.allStatuses')}</option>
                  <option value="active">{t('users.statusActive')}</option>
                  <option value="inactive">{t('users.statusInactive')}</option>
                </select>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      setDepartmentFilter('')
                      setRoleFilter('')
                      setStatusFilter('')
                    }}
                    className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-caption font-medium text-gauge-cobalt-strong transition-colors hover:bg-paper-warm"
                  >
                    {t('users.filterReset')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBulkUploadModal(true)}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
                >
                  <Upload className="h-4 w-4" />
                  {t('users.bulkUpload')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
                >
                  <Plus className="h-4 w-4" />
                  {t('users.addUser')}
                </button>
              </div>
            </div>
          </section>

          {/* 사용자 목록 */}
          <section className="space-y-3">
            <header className="flex items-center justify-between gap-3">
              <h2 className="text-title font-semibold text-ink no-break">
                {t('users.listHeading')}
              </h2>
              <p className="text-caption text-ink-soft tabular">
                <span className="font-medium text-ink">{filteredUsers.length}</span>
                {t('users.userUnit')}
              </p>
            </header>

            {/* 모바일 카드 */}
            <div className="lg:hidden space-y-3">
              {paginatedUsers.length === 0 ? (
                <EmptyFilterState
                  message={isAnyFilterActive ? t('users.emptyMatching') : t('users.emptyAll')}
                  resetLabel={t('users.filterReset')}
                  onReset={() => {
                    setSearchTerm('')
                    setDepartmentFilter('')
                    setRoleFilter('')
                    setStatusFilter('')
                    setCurrentPage(1)
                  }}
                  showReset={isAnyFilterActive}
                />
              ) : (
                paginatedUsers.map(user => (
                  <UserListCard
                    key={user.id}
                    item={toCardItem(user)}
                    labels={cardLabels}
                    canEditPermissions={canEditPermissions}
                    onViewDetail={id => {
                      const u = allUsers.find(x => x.id === id)
                      if (u) handleViewDetail(u)
                    }}
                    onEdit={id => {
                      const u = allUsers.find(x => x.id === id)
                      if (u) handleEdit(u)
                    }}
                    onEditPermissions={id => {
                      const u = allUsers.find(x => x.id === id)
                      if (u) handleEditPermissions(u)
                    }}
                    onToggleStatus={id => {
                      const u = allUsers.find(x => x.id === id)
                      if (u) handleToggleStatus(u)
                    }}
                    onDelete={id => {
                      const u = allUsers.find(x => x.id === id)
                      if (u) handleDelete(u)
                    }}
                  />
                ))
              )}
            </div>

            {/* 데스크톱 표 */}
            <div className="hidden lg:block rounded-md border border-divider bg-paper-warm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-paper border-b border-divider">
                    <tr>
                      <SortableTableHeader
                        label={t('users.department')}
                        field="department"
                        currentSortField={sortField}
                        currentSortOrder={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label={t('users.position')}
                        field="position"
                        currentSortField={sortField}
                        currentSortOrder={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label={t('users.nameLabel')}
                        field="name"
                        currentSortField={sortField}
                        currentSortOrder={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        label={t('users.role')}
                        field="roleId"
                        currentSortField={sortField}
                        currentSortOrder={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-label font-medium text-ink-soft no-break">
                        {t('users.statusActive')}
                      </th>
                      <th className="px-4 py-3 text-right text-label font-medium text-ink-soft no-break">
                        {t('users.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <Search
                            className="mx-auto mb-2 h-6 w-6 text-ink-mute"
                            aria-hidden="true"
                          />
                          <p className="text-base text-ink-soft">
                            {isAnyFilterActive ? t('users.emptyMatching') : t('users.emptyAll')}
                          </p>
                          {isAnyFilterActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm('')
                                setDepartmentFilter('')
                                setRoleFilter('')
                                setStatusFilter('')
                                setCurrentPage(1)
                              }}
                              className="mt-2 inline-flex items-center text-label font-medium text-gauge-cobalt-strong transition-colors hover:underline"
                            >
                              {t('users.filterReset')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map(user => {
                        const userRole = getUserRole(user.roleId)
                        const rt = roleType(user.roleId, roles)
                        return (
                          <tr key={user.id} className="transition-colors hover:bg-paper">
                            <td className="px-4 py-3 text-base text-ink no-break">
                              <NoBreak>{user.department || '—'}</NoBreak>
                            </td>
                            <td className="px-4 py-3 text-base text-ink no-break">
                              <NoBreak>{user.position || '—'}</NoBreak>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleViewDetail(user)}
                                className="text-left"
                              >
                                <p
                                  className={`text-base font-medium no-break transition-colors hover:underline ${
                                    user.isActive ? 'text-gauge-cobalt-strong' : 'text-ink-mute'
                                  }`}
                                >
                                  <NoBreak>{user.name}</NoBreak>
                                </p>
                                <p className="text-caption text-ink-soft truncate">{user.email}</p>
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              {userRole ? (
                                <span
                                  className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(rt)}`}
                                >
                                  <NoBreak>{getRoleName(userRole.type)}</NoBreak>
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-sm border border-divider bg-paper-warm px-2 py-0.5 text-caption text-ink-mute">
                                  {t('users.roleUnknown')}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                variant={user.isActive ? 'go' : 'neutral'}
                                label={
                                  user.isActive
                                    ? t('users.statusActive')
                                    : t('users.statusInactive')
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <IconActionButton
                                  onClick={() => handleViewDetail(user)}
                                  label={t('users.actionDetail')}
                                  icon={<Eye className="h-4 w-4" />}
                                />
                                <IconActionButton
                                  onClick={() => handleEdit(user)}
                                  label={t('users.actionEdit')}
                                  icon={<Pencil className="h-4 w-4" />}
                                />
                                {canEditPermissions && (
                                  <IconActionButton
                                    onClick={() => handleEditPermissions(user)}
                                    label={t('users.actionPermissions')}
                                    icon={<Lock className="h-4 w-4" />}
                                  />
                                )}
                                <IconActionButton
                                  onClick={() => handleToggleStatus(user)}
                                  label={
                                    user.isActive
                                      ? t('users.actionDeactivate')
                                      : t('users.actionActivate')
                                  }
                                  icon={<RotateCcw className="h-4 w-4" />}
                                />
                                <IconActionButton
                                  onClick={() => handleDelete(user)}
                                  label={t('users.actionDelete')}
                                  icon={<Trash2 className="h-4 w-4" />}
                                  tone="danger"
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="rounded-md border border-divider bg-paper-warm px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-caption text-ink-soft tabular">
                    {t('users.showingFrom')}{' '}
                    <span className="font-medium text-ink">{sortedUsers.length}</span>
                    {t('users.showingMid')}{' '}
                    <span className="font-medium text-ink">{startIndex + 1}-{Math.min(endIndex, sortedUsers.length)}</span>
                    {' '}
                    {t('users.showingTo')}
                  </p>
                  <nav
                    className="inline-flex items-center gap-1 self-end sm:self-auto"
                    aria-label={t('users.page')}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      aria-label={t('users.previous')}
                      className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ‹
                    </button>
                    {(() => {
                      const buttons = []
                      const maxVisible = 5
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                      const endPage = Math.min(totalPages, startPage + maxVisible - 1)
                      if (endPage - startPage < maxVisible - 1) {
                        startPage = Math.max(1, endPage - maxVisible + 1)
                      }
                      for (let i = startPage; i <= endPage; i++) {
                        const isActive = currentPage === i
                        buttons.push(
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCurrentPage(i)}
                            aria-current={isActive ? 'page' : undefined}
                            className={
                              isActive
                                ? 'inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-gauge-cobalt bg-gauge-cobalt px-3 text-label font-medium text-paper tabular'
                                : 'inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft tabular transition-colors hover:bg-paper-warm hover:text-ink'
                            }
                          >
                            {i}
                          </button>
                        )
                      }
                      return buttons
                    })()}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      aria-label={t('users.next')}
                      className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ›
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* === 권한 매트릭스 탭 === */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* 헤더 + 범례 */}
          <section className="rounded-md border border-divider bg-paper-warm">
            <div className="px-4 py-4 border-b border-divider sm:px-5 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-title font-semibold text-ink no-break">
                    {t('users.permissionsTitle')}
                  </h2>
                  <p className="mt-1 text-base text-ink-soft">{t('users.permissionsSubtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-sm border border-divider bg-paper px-2.5 py-1 text-caption font-medium text-ink-soft">
                    {filteredUsers.length} {t('users.usersCountSuffix')}
                  </span>
                  <span className="inline-flex items-center rounded-sm border border-divider bg-paper px-2.5 py-1 text-caption font-medium text-ink-soft">
                    {AVAILABLE_RESOURCES.length} {t('users.moduleSuffix')}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-4 py-4 bg-paper sm:px-5">
              <h3 className="text-label font-medium text-ink mb-3 no-break">
                {t('users.legendTitle')}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ACTION_KEYS.map(action => (
                  <div key={action} className="flex items-center gap-1.5">
                    <ActionIcon action={action} className={`h-3.5 w-3.5 ${actionTone(action)}`} />
                    <span className="text-caption text-ink-soft">{getActionDisplayName(action)}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-signal-go-strong" aria-hidden="true" />
                  <span className="text-caption text-ink-soft">{t('users.legendReadOnly')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <X className="h-3.5 w-3.5 text-signal-stop-strong" aria-hidden="true" />
                  <span className="text-caption text-ink-soft">{t('users.legendNoAccess')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 매트릭스 표 */}
          <section className="rounded-md border border-divider bg-paper-warm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-paper border-b border-divider">
                  <tr>
                    <th className="sticky left-0 z-10 bg-paper px-4 py-3 text-left text-label font-medium text-ink-soft border-r border-divider no-break">
                      {t('users.userColumn')}
                    </th>
                    <th className="px-4 py-3 text-left text-label font-medium text-ink-soft border-r border-divider no-break">
                      {t('users.permissionLevel')}
                    </th>
                    {AVAILABLE_RESOURCES.map(module => (
                      <th
                        key={module}
                        className="px-3 py-3 text-center text-label font-medium text-ink-soft border-r border-divider no-break"
                      >
                        <NoBreak>{getModuleDisplayName(module)}</NoBreak>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {filteredUsers.map(user => {
                    const userRole = getUserRole(user.roleId)
                    const rt = roleType(user.roleId, roles)
                    return (
                      <tr key={user.id} className="transition-colors hover:bg-paper">
                        <td className="sticky left-0 z-10 bg-paper-warm px-4 py-3 border-r border-divider">
                          <button
                            type="button"
                            onClick={() => canEditPermissions && handleEditPermissions(user)}
                            disabled={!canEditPermissions}
                            title={
                              canEditPermissions
                                ? t('users.permissionEditTooltip')
                                : t('users.permissionEditDisabledTooltip')
                            }
                            className={`text-left transition-colors ${
                              canEditPermissions
                                ? 'hover:text-gauge-cobalt-strong'
                                : 'cursor-not-allowed opacity-60'
                            }`}
                          >
                            <p
                              className={`text-base font-medium no-break ${
                                user.isActive ? 'text-ink' : 'text-ink-mute'
                              }`}
                            >
                              <NoBreak>{user.name}</NoBreak>
                            </p>
                            <p className="text-caption text-ink-soft no-break">
                              {user.department} · {user.position}
                            </p>
                          </button>
                        </td>
                        <td className="px-4 py-3 border-r border-divider">
                          <div className="flex flex-col items-start gap-1">
                            {userRole && (
                              <span
                                className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(rt)}`}
                              >
                                <NoBreak>{getRoleName(userRole.type)}</NoBreak>
                              </span>
                            )}
                            <span className="text-caption text-ink-soft no-break">
                              {getUserPermissionLevel(user)}
                            </span>
                          </div>
                        </td>
                        {AVAILABLE_RESOURCES.map(module => {
                          const hasWildcard = user.permissions?.['*']
                          const modulePermissions =
                            (hasWildcard as string[] | undefined) ||
                            (user.permissions?.[module] as string[] | undefined) ||
                            []
                          return (
                            <td
                              key={module}
                              className="px-3 py-3 text-center border-r border-divider"
                            >
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {modulePermissions.length > 0 ? (
                                  modulePermissions.length === 1 &&
                                  modulePermissions[0] === 'read' ? (
                                    <CheckCircle2
                                      className="h-4 w-4 text-signal-go-strong"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    modulePermissions.map((action: string) => (
                                      <ActionIcon
                                        key={action}
                                        action={action}
                                        className={`h-3.5 w-3.5 ${actionTone(action)}`}
                                      />
                                    ))
                                  )
                                ) : (
                                  <X
                                    className="h-3.5 w-3.5 text-signal-stop-strong"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 권한 요약 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 역할별 분포 */}
            <section className="rounded-md border border-divider bg-paper-warm p-4 sm:p-5">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('users.roleDistribution')}
              </h3>
              <div className="mt-3 space-y-2">
                {(['system_admin', 'admin', 'user'] as const).map(typeStr => {
                  const count = filteredUsers.filter(user => {
                    const role = getUserRole(user.roleId)
                    return role?.type === typeStr
                  }).length
                  const rt: UserListCardRoleType = typeStr
                  return (
                    <div
                      key={typeStr}
                      className="flex items-center justify-between gap-3 rounded-sm border border-divider bg-paper px-3 py-2.5"
                    >
                      <span
                        className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(rt)}`}
                      >
                        {getRoleName(typeStr)}
                      </span>
                      <span className="text-base font-medium text-ink tabular">
                        {count}
                        {t('users.userUnit')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 모듈별 접근률 */}
            <section className="rounded-md border border-divider bg-paper-warm p-4 sm:p-5">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('users.moduleAccessRate')}
              </h3>
              <div className="mt-3 space-y-3">
                {AVAILABLE_RESOURCES.slice(0, 5).map(module => {
                  const accessCount = filteredUsers.filter(user => {
                    const hasWildcard = user.permissions?.['*']
                    const modulePerms = user.permissions?.[module]
                    return hasWildcard || (modulePerms && modulePerms.length > 0)
                  }).length
                  const percentage =
                    filteredUsers.length === 0
                      ? 0
                      : Math.round((accessCount / filteredUsers.length) * 100)
                  return (
                    <div key={module} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-base text-ink no-break">
                          <NoBreak>{getModuleDisplayName(module)}</NoBreak>
                        </span>
                        <span className="text-base font-medium text-ink tabular">{percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-paper">
                        <div
                          className="h-1.5 rounded-full bg-gauge-cobalt"
                          style={{ width: `${percentage}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 보안 상태 */}
            <section className="rounded-md border border-divider bg-paper-warm p-4 sm:p-5">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('users.securityStatus')}
              </h3>
              <dl className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <dt className="text-base text-ink-soft no-break">
                    {t('users.activeUserCount')}
                  </dt>
                  <dd className="text-base font-medium text-signal-go-strong tabular">
                    {filteredUsers.filter(u => u.isActive).length}
                    {t('users.userUnit')}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-base text-ink-soft no-break">
                    {t('users.inactiveUserCount')}
                  </dt>
                  <dd className="text-base font-medium text-ink-soft tabular">
                    {filteredUsers.filter(u => !u.isActive).length}
                    {t('users.userUnit')}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-base text-ink-soft no-break">
                    {t('users.adminAccountCount')}
                  </dt>
                  <dd className="text-base font-medium text-gauge-cobalt-strong tabular">
                    {
                      filteredUsers.filter(user => {
                        const role = getUserRole(user.roleId)
                        return role?.type === 'system_admin' || role?.type === 'admin'
                      }).length
                    }
                    {t('users.userUnit')}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 pt-3 border-t border-divider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal-go" aria-hidden="true" />
                <span className="text-caption text-ink-soft">{t('users.securityHealthy')}</span>
              </div>
            </section>
          </div>

          {/* 권한 템플릿 관리 */}
          <section className="rounded-md border border-divider bg-paper-warm">
            <div className="px-4 py-4 border-b border-divider sm:px-5 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-title font-semibold text-ink no-break">
                    {t('users.templateTitle')}
                  </h2>
                  <p className="mt-1 text-base text-ink-soft">{t('users.templateSubtitle')}</p>
                </div>
                <p className="text-caption text-ink-soft tabular">
                  {roles.length} {t('users.templateAvailable')}
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map(role => {
                  const rt: UserListCardRoleType = role.type
                  return (
                    <article
                      key={role.id}
                      className="rounded-sm border border-divider bg-paper p-4 transition-shadow hover:shadow-hover-lift"
                    >
                      <header className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(rt)}`}
                        >
                          {getRoleName(role.type)}
                        </span>
                        <span className="text-caption text-ink-soft tabular">
                          {getTemplateUsageCount(role.id)} {t('users.templateUsage')}
                        </span>
                      </header>

                      <h3 className="mt-3 text-title font-semibold text-ink no-break">
                        <NoBreak>{role.name}</NoBreak>
                      </h3>
                      <p className="mt-1 text-caption text-ink-soft">{role.description}</p>

                      <div className="mt-3">
                        <p className="text-caption text-ink-soft mb-1.5">
                          {t('users.templatePermissionsLabel')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(role.permissions)
                            .filter(([, actions]) => actions.length > 0)
                            .slice(0, 4)
                            .map(([module, actions]) => (
                              <span
                                key={module}
                                className="inline-flex items-center rounded-sm border border-divider bg-paper-warm px-2 py-0.5 text-caption text-ink-soft no-break"
                              >
                                <NoBreak>
                                  {getModuleDisplayName(module)} ({actions.length})
                                </NoBreak>
                              </span>
                            ))}
                          {Object.entries(role.permissions).filter(
                            ([, actions]) => actions.length > 0
                          ).length > 4 && (
                            <span className="inline-flex items-center rounded-sm border border-divider bg-paper-warm px-2 py-0.5 text-caption text-ink-mute">
                              +
                              {Object.entries(role.permissions).filter(
                                ([, actions]) => actions.length > 0
                              ).length - 4}{' '}
                              {t('users.templateMore')}
                            </span>
                          )}
                        </div>
                      </div>

                      <dl className="mt-3 rounded-sm bg-paper-warm p-3 text-caption text-ink-soft space-y-1">
                        <div className="flex justify-between">
                          <dt>{t('users.templateModuleCount')}</dt>
                          <dd className="font-medium text-ink tabular">
                            {Object.keys(role.permissions).length}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>{t('users.templateActiveCount')}</dt>
                          <dd className="font-medium text-ink tabular">
                            {Object.values(role.permissions).reduce(
                              (sum, actions) => sum + actions.length,
                              0
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>{t('users.templateAccessLevel')}</dt>
                          <dd className="font-medium text-ink no-break">
                            {role.type === 'system_admin'
                              ? t('users.levelTop')
                              : role.type === 'admin'
                                ? t('users.levelAdmin')
                                : t('users.levelGeneral')}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(role)}
                          className="inline-flex w-full min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-3 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
                        >
                          <Target className="h-4 w-4" />
                          {t('users.applyToUsers')}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* === 사용자 상세 모달 === */}
      {showDetailModal && selectedUser && (
        <div
          className="mobile-modal-container"
          onClick={() => {
            setShowDetailModal(false)
            setSelectedUser(null)
          }}
        >
          <div
            className="mobile-modal-content md:max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('users.detailTitle')}
                <span className="mx-2 text-ink-mute">·</span>
                <NoBreak>{selectedUser.name}</NoBreak>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedUser(null)
                }}
                aria-label={t('users.close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mobile-modal-body space-y-4">
              {/* 기본 정보 */}
              <DetailSection icon={<UserCheck className="h-4 w-4" />} title={t('users.sectionBasicInfo')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField label={t('users.nameLabel')} value={selectedUser.name} />
                  <DetailField label={t('users.employeeId')} value={selectedUser.employeeId} />
                  <DetailField label={t('users.email')} value={selectedUser.email} />
                  <DetailField
                    label={t('users.phoneLabel')}
                    value={selectedUser.phone || t('users.phoneEmpty')}
                  />
                </div>
              </DetailSection>

              {/* 조직 정보 */}
              <DetailSection icon={<Building2 className="h-4 w-4" />} title={t('users.sectionOrgInfo')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField label={t('users.department')} value={selectedUser.department} />
                  <DetailField label={t('users.position')} value={selectedUser.position} />
                  <DetailField
                    label={t('users.shift')}
                    value={`${selectedUser.shift}${t('users.shiftSuffix')}`}
                  />
                  <div>
                    <p className="text-caption text-ink-soft no-break">
                      {t('users.accountStatus')}
                    </p>
                    <div className="mt-1">
                      <StatusBadge
                        variant={selectedUser.isActive ? 'go' : 'neutral'}
                        label={
                          selectedUser.isActive
                            ? t('users.statusActive')
                            : t('users.statusInactive')
                        }
                      />
                    </div>
                  </div>
                </div>
              </DetailSection>

              {/* 권한 정보 */}
              <DetailSection icon={<Lock className="h-4 w-4" />} title={t('users.sectionPermissionInfo')}>
                {(() => {
                  const userRole = getUserRole(selectedUser.roleId)
                  const rt = roleType(selectedUser.roleId, roles)
                  return (
                    <>
                      <div>
                        <p className="text-caption text-ink-soft no-break">{t('users.role')}</p>
                        <div className="mt-1">
                          {userRole ? (
                            <span
                              className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(rt)}`}
                            >
                              {getRoleName(userRole.type)}
                            </span>
                          ) : (
                            <span className="text-base text-ink-mute">
                              {t('users.unknownRole')}
                            </span>
                          )}
                        </div>
                      </div>
                      {userRole && (
                        <div className="mt-3">
                          <p className="text-caption text-ink-soft mb-2 no-break">
                            {t('users.accessibleModules')}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {Object.entries(userRole.permissions).map(
                              ([module, actions]) =>
                                actions.length > 0 && (
                                  <div
                                    key={module}
                                    className="flex items-center gap-1.5 rounded-sm border border-divider bg-paper px-2 py-1"
                                  >
                                    <ChevronRight
                                      className="h-3 w-3 text-gauge-cobalt-strong"
                                      aria-hidden="true"
                                    />
                                    <span className="text-caption text-ink-soft no-break">
                                      <NoBreak>
                                        {getModuleDisplayName(module)} ({actions.join(', ')})
                                      </NoBreak>
                                    </span>
                                  </div>
                                )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </DetailSection>

              {/* 시스템 정보 */}
              <DetailSection icon={<CalendarClock className="h-4 w-4" />} title={t('users.sectionSystemInfo')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField label={t('users.registeredAt')} value={formatDateTime(selectedUser.createdAt ?? undefined)} tabular />
                  <DetailField label={t('users.modifiedAt')} value={formatDateTime(selectedUser.updatedAt ?? undefined)} tabular />
                  <DetailField label={t('users.registeredBy')} value={selectedUser.createdBy ?? '—'} />
                  <DetailField
                    label={t('users.lastLogin')}
                    value={selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : t('users.loginNone')}
                    tabular
                  />
                </div>
              </DetailSection>
            </div>

            <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedUser(null)
                }}
                className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
              >
                {t('users.close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false)
                  handleEdit(selectedUser)
                }}
                className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
              >
                <Pencil className="h-4 w-4" />
                {t('users.editAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === 사용자 수정 모달 === */}
      {showEditModal && selectedUser && (
        <div
          className="mobile-modal-container"
          onClick={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
        >
          <div
            className="mobile-modal-content md:max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('users.editTitle')}
                <span className="mx-2 text-ink-mute">·</span>
                <NoBreak>{selectedUser.name}</NoBreak>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                  setEditFormData({})
                }}
                aria-label={t('users.close')}
                disabled={isSubmitting}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body space-y-4">
                {/* 기본 정보 */}
                <FormSection icon={<UserCheck className="h-4 w-4" />} title={t('users.sectionBasicInfo')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField id="edit_name" label={t('users.nameLabel')} required>
                      <input
                        type="text"
                        id="edit_name"
                        value={editFormData.name || ''}
                        onChange={e =>
                          setEditFormData(prev => ({ ...prev, name: e.target.value }))
                        }
                        placeholder={t('users.namePlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="edit_employee_id" label={t('users.employeeId')} required>
                      <input
                        type="text"
                        id="edit_employee_id"
                        value={editFormData.employeeId || ''}
                        onChange={e =>
                          setEditFormData(prev => ({ ...prev, employeeId: e.target.value }))
                        }
                        placeholder={t('users.employeeIdPlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="edit_email" label={t('users.email')} required>
                      <input
                        type="email"
                        id="edit_email"
                        value={editFormData.email || ''}
                        onChange={e =>
                          setEditFormData(prev => ({ ...prev, email: e.target.value }))
                        }
                        placeholder={t('users.emailPlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="edit_phone" label={t('users.phoneLabel')}>
                      <input
                        type="tel"
                        id="edit_phone"
                        value={editFormData.phone || ''}
                        onChange={e =>
                          setEditFormData(prev => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder={t('users.phonePlaceholder')}
                        disabled={isSubmitting}
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* 조직 정보 */}
                <FormSection icon={<Building2 className="h-4 w-4" />} title={t('users.sectionOrgInfo')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField id="edit_department" label={t('users.department')} required>
                      <select
                        id="edit_department"
                        value={editFormData.department || ''}
                        onChange={e =>
                          setEditFormData(prev => ({ ...prev, department: e.target.value }))
                        }
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      >
                        <option value="">{t('users.departmentSelect')}</option>
                        {departments.map(d => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField id="edit_position" label={t('users.position')} required>
                      <input
                        type="text"
                        id="edit_position"
                        value={editFormData.position || ''}
                        onChange={e =>
                          setEditFormData(prev => ({ ...prev, position: e.target.value }))
                        }
                        placeholder={t('users.positionPlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="edit_shift" label={t('users.shift')} required>
                      <select
                        id="edit_shift"
                        value={editFormData.shift || ''}
                        onChange={e =>
                          setEditFormData(prev => ({ ...prev, shift: e.target.value }))
                        }
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      >
                        <option value="">{t('users.shiftSelect')}</option>
                        {shifts.map(s => (
                          <option key={s} value={s}>
                            {s}
                            {t('users.shiftSuffix')}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField id="edit_is_active" label={t('users.accountStatus')} required>
                      <select
                        id="edit_is_active"
                        value={
                          editFormData.isActive !== undefined
                            ? editFormData.isActive
                              ? 'true'
                              : 'false'
                            : ''
                        }
                        onChange={e =>
                          setEditFormData(prev => ({
                            ...prev,
                            isActive: e.target.value === 'true',
                          }))
                        }
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      >
                        <option value="">{t('users.statusSelect')}</option>
                        <option value="true">{t('users.statusActive')}</option>
                        <option value="false">{t('users.statusInactive')}</option>
                      </select>
                    </FormField>
                  </div>
                </FormSection>

                {/* 권한 정보 */}
                <FormSection icon={<Lock className="h-4 w-4" />} title={t('users.sectionPermissionInfo')}>
                  <FormField id="edit_role" label={t('users.role')} required>
                    <select
                      id="edit_role"
                      value={editFormData.roleId || ''}
                      onChange={e =>
                        setEditFormData(prev => ({ ...prev, roleId: e.target.value }))
                      }
                      disabled={isSubmitting}
                      required
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                    >
                      <option value="">{t('users.roleSelect')}</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {getRoleName(role.type)} - {role.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {editFormData.roleId &&
                    (() => {
                      const sel = roles.find(role => role.id === editFormData.roleId)
                      if (!sel) return null
                      return (
                        <div className="mt-3 rounded-sm border border-divider bg-paper p-3">
                          <p className="text-caption font-medium text-ink mb-2 no-break">
                            {t('users.rolePermissions')}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {Object.entries(sel.permissions).map(
                              ([module, actions]) =>
                                actions.length > 0 && (
                                  <p
                                    key={module}
                                    className="text-caption text-ink-soft no-break"
                                  >
                                    <span className="font-medium text-ink">
                                      {getModuleDisplayName(module)}
                                    </span>
                                    : {actions.join(', ')}
                                  </p>
                                )
                            )}
                          </div>
                        </div>
                      )
                    })()}
                </FormSection>

                <div className="rounded-sm border border-divider bg-paper p-3">
                  <p className="text-caption text-ink-soft">{t('users.editNotice')}</p>
                </div>
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    setEditFormData({})
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:opacity-40"
                >
                  {t('users.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting ? t('users.saving') : t('users.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === 사용자 추가 모달 === */}
      {showAddModal && (
        <div
          className="mobile-modal-container"
          onClick={() => !isSubmitting && setShowAddModal(false)}
        >
          <div
            className="mobile-modal-content md:max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">{t('users.addTitle')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setAddFormData({
                    name: '',
                    email: '',
                    password: '',
                    employeeId: '',
                    department: '',
                    position: '',
                    roleId: '',
                    shift: '',
                    phone: '',
                    isActive: true,
                  })
                }}
                aria-label={t('users.close')}
                disabled={isSubmitting}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body space-y-4">
                <FormSection icon={<UserCheck className="h-4 w-4" />} title={t('users.sectionBasicInfo')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField id="add_name" label={t('users.nameLabel')} required>
                      <input
                        type="text"
                        id="add_name"
                        value={addFormData.name}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, name: e.target.value }))
                        }
                        placeholder={t('users.addNamePlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="add_employee_id" label={t('users.employeeId')} required>
                      <input
                        type="text"
                        id="add_employee_id"
                        value={addFormData.employeeId}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, employeeId: e.target.value }))
                        }
                        placeholder={t('users.addEmployeeIdPlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="add_email" label={t('users.email')} required>
                      <input
                        type="email"
                        id="add_email"
                        value={addFormData.email}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, email: e.target.value }))
                        }
                        placeholder={t('users.emailPlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="add_password" label={t('users.passwordLabel')} required>
                      <input
                        type="password"
                        id="add_password"
                        value={addFormData.password}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, password: e.target.value }))
                        }
                        placeholder={t('users.passwordPlaceholder')}
                        disabled={isSubmitting}
                        required
                        minLength={6}
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                      <p className="mt-1 text-caption text-ink-mute">{t('users.passwordHint')}</p>
                    </FormField>
                    <FormField id="add_phone" label={t('users.phoneLabel')}>
                      <input
                        type="tel"
                        id="add_phone"
                        value={addFormData.phone}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder={t('users.addPhonePlaceholder')}
                        disabled={isSubmitting}
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={<Building2 className="h-4 w-4" />} title={t('users.sectionOrgInfo')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField id="add_department" label={t('users.department')} required>
                      <select
                        id="add_department"
                        value={addFormData.department}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, department: e.target.value }))
                        }
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      >
                        <option value="">{t('users.departmentSelectPrompt')}</option>
                        {departments.map(d => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField id="add_position" label={t('users.position')} required>
                      <input
                        type="text"
                        id="add_position"
                        value={addFormData.position}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, position: e.target.value }))
                        }
                        placeholder={t('users.positionAddPlaceholder')}
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      />
                    </FormField>
                    <FormField id="add_shift" label={t('users.shift')} required>
                      <select
                        id="add_shift"
                        value={addFormData.shift}
                        onChange={e =>
                          setAddFormData(prev => ({ ...prev, shift: e.target.value }))
                        }
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      >
                        <option value="">{t('users.shiftSelectPrompt')}</option>
                        {shifts.map(s => (
                          <option key={s} value={s}>
                            {s}
                            {t('users.shiftSuffix')}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField id="add_is_active" label={t('users.accountStatus')} required>
                      <select
                        id="add_is_active"
                        value={addFormData.isActive ? 'true' : 'false'}
                        onChange={e =>
                          setAddFormData(prev => ({
                            ...prev,
                            isActive: e.target.value === 'true',
                          }))
                        }
                        disabled={isSubmitting}
                        required
                        className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                      >
                        <option value="true">{t('users.statusActiveOption')}</option>
                        <option value="false">{t('users.statusInactiveOption')}</option>
                      </select>
                    </FormField>
                  </div>
                </FormSection>

                <FormSection icon={<Lock className="h-4 w-4" />} title={t('users.sectionPermissionInfo')}>
                  <FormField id="add_role" label={t('users.role')} required>
                    <select
                      id="add_role"
                      value={addFormData.roleId}
                      onChange={e =>
                        setAddFormData(prev => ({ ...prev, roleId: e.target.value }))
                      }
                      disabled={isSubmitting}
                      required
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                    >
                      <option value="">{t('users.roleSelectPrompt')}</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {getRoleName(role.type)} - {role.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {addFormData.roleId &&
                    (() => {
                      const sel = roles.find(role => role.id === addFormData.roleId)
                      if (!sel) return null
                      return (
                        <div className="mt-3 rounded-sm border border-divider bg-paper p-3">
                          <p className="text-caption font-medium text-ink mb-2 no-break">
                            {t('users.selectedRolePermissions')}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {Object.entries(sel.permissions).map(
                              ([module, actions]) =>
                                actions.length > 0 && (
                                  <p
                                    key={module}
                                    className="text-caption text-ink-soft no-break"
                                  >
                                    <span className="font-medium text-ink">
                                      {getModuleDisplayName(module)}
                                    </span>
                                    : {actions.join(', ')}
                                  </p>
                                )
                            )}
                          </div>
                        </div>
                      )
                    })()}
                </FormSection>

                <div className="rounded-sm border border-divider bg-paper p-3">
                  <p className="text-caption font-medium text-ink mb-1.5 no-break">
                    {t('users.addCautionTitle')}
                  </p>
                  <ul className="text-caption text-ink-soft space-y-0.5">
                    <li>· {t('users.addCaution1')}</li>
                    <li>· {t('users.addCaution2')}</li>
                    <li>· {t('users.addCaution3')}</li>
                    <li>· {t('users.addCaution4')}</li>
                  </ul>
                </div>
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setAddFormData({
                      name: '',
                      email: '',
                      password: '',
                      employeeId: '',
                      department: '',
                      position: '',
                      roleId: '',
                      shift: '',
                      phone: '',
                      isActive: true,
                    })
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:opacity-40"
                >
                  {t('users.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {isSubmitting ? t('users.creating') : t('users.createUser')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === 권한 편집 모달 === */}
      {showPermissionModal && selectedUserForPermission && (
        <div
          className="mobile-modal-container"
          onClick={() => !isSubmitting && setShowPermissionModal(false)}
        >
          <div
            className="mobile-modal-content md:max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('users.permissionEditTitle')}
                <span className="mx-2 text-ink-mute">·</span>
                <NoBreak>{selectedUserForPermission.name}</NoBreak>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPermissionModal(false)
                  setSelectedUserForPermission(null)
                  setPermissionFormData({})
                }}
                aria-label={t('users.close')}
                disabled={isSubmitting}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body space-y-4">
                {/* 사용자 요약 */}
                <div className="rounded-sm border border-divider bg-paper p-3">
                  <p className="text-base font-medium text-ink no-break">
                    <NoBreak>{selectedUserForPermission.name}</NoBreak>
                  </p>
                  <p className="text-caption text-ink-soft no-break">
                    {selectedUserForPermission.department} · {selectedUserForPermission.position}
                    <span className="mx-1.5 text-ink-mute">·</span>
                    {t('users.currentPermissionLevel')}:{' '}
                    <span className="font-medium text-ink">
                      {getUserPermissionLevel(selectedUserForPermission)}
                    </span>
                  </p>
                </div>

                {/* 권한 매트릭스 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-title font-semibold text-ink no-break">
                      {t('users.moduleSettingsTitle')}
                    </h4>
                    <p className="text-caption text-ink-soft">{t('users.moduleSettingsHint')}</p>
                  </div>

                  <div className="rounded-sm border border-divider bg-paper overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-paper-warm border-b border-divider">
                          <tr>
                            <th className="px-3 py-2.5 text-left text-label font-medium text-ink-soft no-break">
                              {t('users.moduleColumn')}
                            </th>
                            {ACTION_KEYS.map(action => (
                              <th
                                key={action}
                                className="px-3 py-2.5 text-center text-label font-medium text-ink-soft no-break"
                              >
                                <div className="inline-flex items-center gap-1">
                                  <ActionIcon
                                    action={action}
                                    className={`h-3.5 w-3.5 ${actionTone(action)}`}
                                  />
                                  <span>{getActionDisplayName(action)}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-divider">
                          {AVAILABLE_RESOURCES.map(module => (
                            <tr key={module} className="transition-colors hover:bg-paper-warm">
                              <td className="px-3 py-2.5 text-base text-ink no-break">
                                <NoBreak>{getModuleDisplayName(module)}</NoBreak>
                              </td>
                              {ACTION_KEYS.map(action => (
                                <td key={action} className="px-3 py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={(permissionFormData[module] || []).includes(action)}
                                    onChange={e =>
                                      handlePermissionChange(module, action, e.target.checked)
                                    }
                                    disabled={isSubmitting}
                                    className="h-4 w-4 rounded-sm border-divider text-gauge-cobalt focus:ring-gauge-cobalt cursor-pointer disabled:opacity-40"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 빠른 권한 설정 */}
                <div className="rounded-sm border border-divider bg-paper p-3">
                  <p className="text-label font-medium text-ink mb-2 no-break">
                    {t('users.quickSetTitle')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: PermissionFormState = {}
                        AVAILABLE_RESOURCES.forEach(module => {
                          all[module] = ['create', 'read', 'update', 'delete', 'manage']
                        })
                        setPermissionFormData(all)
                      }}
                      disabled={isSubmitting}
                      className="inline-flex min-h-touch items-center rounded-sm border border-divider bg-paper-warm px-3 text-caption font-medium text-signal-go-strong transition-colors hover:bg-signal-go-soft disabled:opacity-40"
                    >
                      {t('users.grantAll')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ro: PermissionFormState = {}
                        AVAILABLE_RESOURCES.forEach(module => {
                          ro[module] = ['read']
                        })
                        setPermissionFormData(ro)
                      }}
                      disabled={isSubmitting}
                      className="inline-flex min-h-touch items-center rounded-sm border border-divider bg-paper-warm px-3 text-caption font-medium text-gauge-cobalt-strong transition-colors hover:bg-paper disabled:opacity-40"
                    >
                      {t('users.readOnlyOnly')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const none: PermissionFormState = {}
                        AVAILABLE_RESOURCES.forEach(module => {
                          none[module] = []
                        })
                        setPermissionFormData(none)
                      }}
                      disabled={isSubmitting}
                      className="inline-flex min-h-touch items-center rounded-sm border border-divider bg-paper-warm px-3 text-caption font-medium text-ink-soft transition-colors hover:bg-paper disabled:opacity-40"
                    >
                      {t('users.revokeAll')}
                    </button>
                  </div>
                </div>

                {/* 주의사항 */}
                <div className="rounded-sm border border-divider bg-paper p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className="h-4 w-4 text-signal-watch-strong mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-caption font-medium text-ink mb-1 no-break">
                        {t('users.permissionCautionTitle')}
                      </p>
                      <ul className="text-caption text-ink-soft space-y-0.5">
                        <li>· {t('users.permissionCaution1')}</li>
                        <li>· {t('users.permissionCaution2')}</li>
                        <li>· {t('users.permissionCaution3')}</li>
                        <li>· {t('users.permissionCaution4')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false)
                    setSelectedUserForPermission(null)
                    setPermissionFormData({})
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:opacity-40"
                >
                  {t('users.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {isSubmitting ? t('users.saving') : t('users.permissionUpdate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === 권한 템플릿 적용 모달 (MN2: 준비 중) === */}
      {showTemplateModal && selectedTemplate && (
        <div
          className="mobile-modal-container"
          onClick={() => !isSubmitting && setShowTemplateModal(false)}
        >
          <div
            className="mobile-modal-content md:max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('users.templateApplyTitle')}
                <span className="mx-2 text-ink-mute">·</span>
                <NoBreak>{selectedTemplate.name}</NoBreak>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false)
                  setSelectedTemplate(null)
                  setSelectedUsersForTemplate([])
                }}
                aria-label={t('users.close')}
                disabled={isSubmitting}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyTemplateToUsers} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body space-y-4">
                {/* MN2: 정직한 안내 */}
                <div className="rounded-sm border border-divider bg-signal-watch-soft p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className="h-4 w-4 text-signal-watch-strong mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-caption text-ink no-break">
                      {t('users.templateNotImplemented')}
                    </p>
                  </div>
                </div>

                {/* 템플릿 미리보기 */}
                <div className="rounded-sm border border-divider bg-paper p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(selectedTemplate.type)}`}
                    >
                      {getRoleName(selectedTemplate.type)}
                    </span>
                    <p className="text-base font-medium text-ink no-break">
                      <NoBreak>{selectedTemplate.name}</NoBreak>
                    </p>
                  </div>
                  <p className="mt-1 text-caption text-ink-soft">{selectedTemplate.description}</p>

                  <div className="mt-3 rounded-sm border border-divider bg-paper-warm p-3">
                    <p className="text-caption font-medium text-ink mb-2 no-break">
                      {t('users.templateApplyPermissions')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {Object.entries(selectedTemplate.permissions).map(([module, actions]) => (
                        <p key={module} className="text-caption text-ink-soft no-break">
                          <span className="font-medium text-ink">
                            {getModuleDisplayName(module)}
                          </span>
                          :{' '}
                          {actions.length > 0
                            ? actions.map((a: string) => getActionDisplayName(a)).join(', ')
                            : t('users.templateNoPermission')}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 사용자 선택 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-title font-semibold text-ink no-break">
                      {t('users.templateUserSelect')}
                    </h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedUsersForTemplate(filteredUsers.map(u => u.id))
                        }
                        disabled={isSubmitting}
                        className="inline-flex items-center rounded-sm border border-divider bg-paper px-2.5 py-1 text-caption font-medium text-gauge-cobalt-strong transition-colors hover:bg-paper-warm disabled:opacity-40"
                      >
                        {t('users.selectAll')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUsersForTemplate([])}
                        disabled={isSubmitting}
                        className="inline-flex items-center rounded-sm border border-divider bg-paper px-2.5 py-1 text-caption font-medium text-ink-soft transition-colors hover:bg-paper-warm disabled:opacity-40"
                      >
                        {t('users.deselectAll')}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-sm border border-divider bg-paper-warm p-3 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredUsers.map(user => {
                        const userRole = getUserRole(user.roleId)
                        const isCurrent = user.roleId === selectedTemplate.id
                        const checked = selectedUsersForTemplate.includes(user.id)
                        const rt = roleType(user.roleId, roles)
                        return (
                          <label
                            key={user.id}
                            className={`flex items-center gap-2 rounded-sm border px-2.5 py-2 cursor-pointer transition-colors ${
                              checked
                                ? 'border-gauge-cobalt bg-paper'
                                : 'border-divider bg-paper hover:bg-paper-warm'
                            } ${isCurrent ? 'opacity-50' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e =>
                                handleUserSelectionForTemplate(user.id, e.target.checked)
                              }
                              disabled={isSubmitting || isCurrent}
                              className="h-4 w-4 rounded-sm border-divider text-gauge-cobalt focus:ring-gauge-cobalt"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-medium text-ink truncate no-break">
                                <NoBreak>{user.name}</NoBreak>
                              </p>
                              <p className="text-caption text-ink-soft truncate">
                                {user.department} · {user.position}
                                {isCurrent && (
                                  <span className="ml-1 text-gauge-cobalt-strong">
                                    {t('users.currentTemplate')}
                                  </span>
                                )}
                              </p>
                            </div>
                            {userRole && (
                              <span
                                className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium no-break ${roleBadgeClass(rt)}`}
                              >
                                {getRoleName(userRole.type)}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <p className="text-caption text-ink-soft tabular">
                    {t('users.selectedUsersLabel')}{' '}
                    <span className="font-medium text-ink">
                      {selectedUsersForTemplate.length}
                    </span>{' '}
                    / {t('users.totalUsersLabel')}{' '}
                    <span className="font-medium text-ink">{filteredUsers.length}</span>
                  </p>
                </div>

                {/* 주의사항 */}
                <div className="rounded-sm border border-divider bg-paper p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className="h-4 w-4 text-signal-watch-strong mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-caption font-medium text-ink mb-1 no-break">
                        {t('users.templateCautionTitle')}
                      </p>
                      <ul className="text-caption text-ink-soft space-y-0.5">
                        <li>· {t('users.templateCaution1')}</li>
                        <li>· {t('users.templateCaution2')}</li>
                        <li>· {t('users.templateCaution3')}</li>
                        <li>· {t('users.templateCaution4')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false)
                    setSelectedTemplate(null)
                    setSelectedUsersForTemplate([])
                  }}
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:opacity-40"
                >
                  {t('users.cancel')}
                </button>
                <button
                  type="submit"
                  disabled
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper opacity-40 cursor-not-allowed"
                >
                  <Target className="h-4 w-4" />
                  {selectedUsersForTemplate.length}
                  {t('users.userUnit')} {t('users.templateApplyButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === 일괄 등록 모달 === */}
      {showBulkUploadModal && (
        <div
          className="mobile-modal-container"
          onClick={() => !isBulkUploading && handleCloseBulkUploadModal()}
        >
          <div
            className="mobile-modal-content md:max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">{t('users.bulkTitle')}</h3>
              <button
                type="button"
                onClick={handleCloseBulkUploadModal}
                aria-label={t('users.close')}
                disabled={isBulkUploading}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mobile-modal-body space-y-4">
              {/* 템플릿 다운로드 */}
              <div className="rounded-sm border border-divider bg-paper p-3">
                <p className="text-caption text-ink-soft mb-2">{t('users.bulkTemplateHint')}</p>
                <button
                  type="button"
                  onClick={async () => {
                    const { downloadUserTemplate } = await import(
                      '../../../lib/utils/userExcelTemplate'
                    )
                    downloadUserTemplate()
                  }}
                  className="inline-flex min-h-touch items-center gap-1.5 rounded-sm border border-divider bg-paper-warm px-3 text-label font-medium text-gauge-cobalt-strong transition-colors hover:bg-paper"
                >
                  <Upload className="h-4 w-4" />
                  {t('users.bulkTemplateDownload')}
                </button>
              </div>

              {/* 파일 선택 */}
              <div>
                <label className="block text-label font-medium text-ink mb-1.5 no-break">
                  {t('users.bulkFileLabel')}
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => {
                    setBulkUploadFile(e.target.files?.[0] || null)
                    setBulkUploadResult(null)
                    setBulkValidationErrors([])
                  }}
                  className="block w-full text-label text-ink-soft file:mr-3 file:min-h-touch file:rounded-sm file:border file:border-divider file:bg-paper-warm file:px-3 file:text-label file:font-medium file:text-gauge-cobalt-strong hover:file:bg-paper"
                />
              </div>

              {/* 검증 에러 */}
              {bulkValidationErrors.length > 0 && (
                <div className="rounded-sm border border-divider bg-signal-stop-soft p-3 max-h-48 overflow-y-auto">
                  <p className="text-caption font-medium text-signal-stop-strong mb-1.5 no-break">
                    {t('users.bulkValidationErrors')}
                  </p>
                  <ul className="text-caption text-ink space-y-0.5">
                    {bulkValidationErrors.map((error, i) => (
                      <li key={i}>· {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 업로드 결과 */}
              {bulkUploadResult && (
                <div className="space-y-2">
                  {bulkUploadResult.success.length > 0 && (
                    <div className="rounded-sm border border-divider bg-signal-go-soft p-3">
                      <p className="text-caption font-medium text-signal-go-strong">
                        {t('users.bulkSuccess')}: {bulkUploadResult.success.length}
                        {t('users.userUnit')}
                      </p>
                    </div>
                  )}
                  {bulkUploadResult.duplicates.length > 0 && (
                    <div className="rounded-sm border border-divider bg-signal-watch-soft p-3 max-h-32 overflow-y-auto">
                      <p className="text-caption font-medium text-signal-watch-strong mb-1">
                        {t('users.bulkDuplicate')}: {bulkUploadResult.duplicates.length}
                      </p>
                      <ul className="text-caption text-ink-soft">
                        {bulkUploadResult.duplicates.map((d, i) => (
                          <li key={i}>
                            {t('users.bulkRowPrefix')} {d.row}: {d.name} ({d.field}: {d.value})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {bulkUploadResult.failed.length > 0 && (
                    <div className="rounded-sm border border-divider bg-signal-stop-soft p-3 max-h-32 overflow-y-auto">
                      <p className="text-caption font-medium text-signal-stop-strong mb-1">
                        {t('users.bulkFailed')}: {bulkUploadResult.failed.length}
                      </p>
                      <ul className="text-caption text-ink-soft">
                        {bulkUploadResult.failed.map((f, i) => (
                          <li key={i}>
                            {t('users.bulkRowPrefix')} {f.row}: {f.name} - {f.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseBulkUploadModal}
                disabled={isBulkUploading}
                className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:opacity-40"
              >
                {t('users.close')}
              </button>
              {!bulkUploadResult && (
                <button
                  type="button"
                  onClick={handleBulkUpload}
                  disabled={!bulkUploadFile || isBulkUploading}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBulkUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isBulkUploading ? t('users.bulkUploading') : t('users.bulkSubmit')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === 승인 모달 === */}
      {confirmation.config && (
        <ConfirmationModal
          isOpen={confirmation.isOpen}
          config={confirmation.config}
          onConfirm={confirmation.handleConfirm}
          onCancel={confirmation.handleCancel}
          loading={confirmation.loading}
        />
      )}
    </div>
  )
}

// ===== Sub components =====

interface StatCellProps {
  label: string
  value: string
  unit?: string
  tone?: 'go' | 'watch' | 'stop' | 'cobalt' | 'default'
}

function StatCell({ label, value, unit, tone = 'default' }: StatCellProps) {
  const valueColor =
    tone === 'go'
      ? 'text-signal-go-strong'
      : tone === 'watch'
        ? 'text-signal-watch-strong'
        : tone === 'stop'
          ? 'text-signal-stop-strong'
          : tone === 'cobalt'
            ? 'text-gauge-cobalt-strong'
            : 'text-ink'
  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-caption text-ink-soft no-break">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <p className={`text-headline font-semibold tabular ${valueColor}`}>{value}</p>
        {unit && <p className="text-caption text-ink-soft no-break">{unit}</p>}
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: string
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 min-h-touch text-label font-medium border-b-2 transition-colors ${
        active
          ? 'border-gauge-cobalt text-gauge-cobalt-strong bg-paper'
          : 'border-transparent text-ink-soft hover:text-ink hover:bg-paper'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className="inline-flex items-center rounded-full border border-divider bg-paper px-2 py-0.5 text-caption text-ink-soft tabular">
        {count}
      </span>
    </button>
  )
}

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}

function FormField({ id, label, required, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-label font-medium text-ink mb-1.5 no-break">
        {label}
        {required && <span className="ml-1 text-signal-stop">*</span>}
      </label>
      {children}
    </div>
  )
}

interface FormSectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function FormSection({ icon, title, children }: FormSectionProps) {
  return (
    <section className="rounded-sm border border-divider bg-paper p-3">
      <header className="flex items-center gap-1.5 mb-2.5">
        <span className="inline-flex h-5 w-5 items-center justify-center text-gauge-cobalt-strong">
          {icon}
        </span>
        <h4 className="text-label font-semibold text-ink no-break">{title}</h4>
      </header>
      {children}
    </section>
  )
}

function DetailSection({ icon, title, children }: FormSectionProps) {
  return (
    <section className="rounded-sm border border-divider bg-paper p-3">
      <header className="flex items-center gap-1.5 mb-2.5">
        <span className="inline-flex h-5 w-5 items-center justify-center text-gauge-cobalt-strong">
          {icon}
        </span>
        <h4 className="text-label font-semibold text-ink no-break">{title}</h4>
      </header>
      {children}
    </section>
  )
}

interface DetailFieldProps {
  label: string
  value: string | null | undefined
  tabular?: boolean
}

function DetailField({ label, value, tabular = false }: DetailFieldProps) {
  return (
    <div>
      <p className="text-caption text-ink-soft no-break">{label}</p>
      <p className={`mt-0.5 text-base text-ink ${tabular ? 'tabular' : ''}`}>{value || '—'}</p>
    </div>
  )
}

interface IconActionButtonProps {
  onClick: () => void
  label: string
  icon: React.ReactNode
  tone?: 'default' | 'danger'
}

function IconActionButton({ onClick, label, icon, tone = 'default' }: IconActionButtonProps) {
  const colorClass =
    tone === 'danger'
      ? 'text-ink-soft hover:bg-signal-stop-soft hover:text-signal-stop-strong'
      : 'text-ink-soft hover:bg-paper hover:text-ink'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors ${colorClass}`}
    >
      {icon}
    </button>
  )
}

interface EmptyFilterStateProps {
  message: string
  resetLabel: string
  onReset: () => void
  showReset: boolean
}

function EmptyFilterState({ message, resetLabel, onReset, showReset }: EmptyFilterStateProps) {
  return (
    <div className="rounded-md border border-divider bg-paper-warm px-4 py-12 text-center">
      <Search className="mx-auto mb-2 h-6 w-6 text-ink-mute" aria-hidden="true" />
      <p className="text-base text-ink-soft">{message}</p>
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 inline-flex items-center text-label font-medium text-gauge-cobalt-strong transition-colors hover:underline"
        >
          {resetLabel}
        </button>
      )}
    </div>
  )
}
