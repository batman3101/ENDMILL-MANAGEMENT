'use client'

import { useState, useCallback } from 'react'
import { useUsers } from '../../../lib/hooks/useUsers'
import { User, UserRole } from '../../../lib/types/users'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import { AdminGuard } from '../../../components/auth/PermissionGuard'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'
import { AVAILABLE_RESOURCES } from '../../../lib/auth/permissions'
import { useAuth } from '../../../lib/hooks/useAuth'

export default function UsersPage() {
  return (
    <AdminGuard>
      <UsersPageContent />
    </AdminGuard>
  )
}

function UsersPageContent() {
  const {
    getUserStats,
    getFilteredUsers,
    roles,
    isLoading,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    loadUsers
  } = useUsers()

  const confirmation = useConfirmation()
  const { showSuccess, showError } = useToast()
  const { user: currentUser, refreshSession } = useAuth()
  
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
  const [permissionFormData, setPermissionFormData] = useState<any>({})
  
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
    isActive: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 정렬 상태
  const [sortField, setSortField] = useState<string>('department')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // 정렬 핸들러
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }, [sortField])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-gray-600">사용자 데이터를 불러오는 중...</p>
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
    
    // 검색어 필터
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 부서 필터
    const matchesDepartment = departmentFilter === '' || user.department === departmentFilter
    
    // 권한 필터
    const matchesRole = roleFilter === '' || (userRole && userRole.type === roleFilter)
    
    // 상태 필터
    const matchesStatus = statusFilter === '' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive)
    
    return matchesSearch && matchesDepartment && matchesRole && matchesStatus
  })

  // 정렬 적용
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortField as keyof User] || ''
    const bValue = b[sortField as keyof User] || ''

    // 역할 이름으로 정렬하는 경우
    if (sortField === 'roleId') {
      const aRole = roles.find(r => r.id === a.roleId)
      const bRole = roles.find(r => r.id === b.roleId)
      const aRoleName = aRole ? aRole.name : ''
      const bRoleName = bRole ? bRole.name : ''

      if (sortDirection === 'asc') {
        return aRoleName.localeCompare(bRoleName, 'ko')
      }
      return bRoleName.localeCompare(aRoleName, 'ko')
    }

    // 일반 정렬
    if (sortDirection === 'asc') {
      return String(aValue).localeCompare(String(bValue), 'ko')
    }
    return String(bValue).localeCompare(String(aValue), 'ko')
  })

  // 페이지네이션 적용
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex)

  // 사용자의 역할 정보 가져오기
  const getUserRole = (roleId: string) => {
    return roles.find(role => role.id === roleId)
  }

  // 권한 배지 스타일
  const getRoleBadge = (roleType: string) => {
    switch (roleType) {
      case 'system_admin':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-orange-100 text-orange-800'
      case 'user':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 권한 이름 표시
  const getRoleName = (roleType: string) => {
    switch (roleType) {
      case 'system_admin':
        return '시스템 관리자'
      case 'admin':
        return '관리자'
      case 'user':
        return '사용자'
      default:
        return '알 수 없음'
    }
  }

  // CRUD 핸들러 함수들
  
  // 사용자 상세 보기
  const handleViewDetail = (user: User) => {
    setSelectedUser(user)
    setShowDetailModal(true)
  }

  // 사용자 수정 시작
  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setEditFormData(user)
    setShowEditModal(true)
  }

  // 사용자 수정 저장
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const updatedUser = await updateUser(selectedUser.id, editFormData)
      if (updatedUser) {
        showSuccess('수정 완료', `${updatedUser?.name || '사용자'}의 정보가 성공적으로 수정되었습니다.`)
        setShowEditModal(false)
        setSelectedUser(null)
        setEditFormData({})
      } else {
        showError('수정 실패', '사용자 정보 수정에 실패했습니다.')
      }
    } catch (_error) {
      showError('수정 실패', '사용자 정보 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 사용자 삭제
  const handleDelete = async (user: User) => {
    const confirmed = await confirmation.showConfirmation({
      type: 'delete',
      title: '사용자 삭제',
      message: (
        <div>
          <p className="mb-2">정말로 <strong>{user.name}</strong> 사용자를 삭제하시겠습니까?</p>
          <p className="text-sm text-gray-600">이 작업은 되돌릴 수 없습니다.</p>
        </div>
      ),
      confirmText: '삭제',
      cancelText: '취소',
      isDangerous: true
    })

    if (confirmed) {
      try {
        const success = await deleteUser(user.id)
        if (success) {
          showSuccess('삭제 완료', `${user.name} 사용자가 성공적으로 삭제되었습니다.`)
        } else {
          showError('삭제 실패', '사용자 삭제에 실패했습니다.')
        }
      } catch (_error) {
        showError('삭제 실패', '사용자 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  // 새 사용자 추가
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!addFormData.name.trim()) {
      showError('입력 오류', '이름을 입력해주세요.')
      return
    }
    
    if (!addFormData.email.trim()) {
      showError('입력 오류', '이메일을 입력해주세요.')
      return
    }

    if (!addFormData.password.trim()) {
      showError('입력 오류', '비밀번호를 입력해주세요.')
      return
    }

    if (addFormData.password.length < 6) {
      showError('입력 오류', '비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (!addFormData.employeeId.trim()) {
      showError('입력 오류', '사번을 입력해주세요.')
      return
    }

    if (!addFormData.roleId) {
      showError('입력 오류', '권한을 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const newUser = await createUser({
        ...addFormData,
        createdBy: 'admin' // 실제로는 현재 로그인한 사용자 ID
      })
      
      showSuccess('추가 완료', `${newUser.name} 사용자가 성공적으로 추가되었습니다.`)
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
        isActive: true
      })
    } catch (_error) {
      showError('추가 실패', '사용자 추가 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 사용자 상태 토글
  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? '비활성화' : '활성화'
    const confirmed = await confirmation.showConfirmation({
      type: 'update',
      title: `사용자 ${action}`,
      message: `${user.name} 사용자를 ${action}하시겠습니까?`,
      confirmText: action,
      cancelText: '취소'
    })

    if (confirmed) {
      try {
        const updatedUser = await toggleUserStatus(user.id)
        if (updatedUser) {
          showSuccess(`${action} 완료`, `${user.name} 사용자가 ${action}되었습니다.`)
        } else {
          showError(`${action} 실패`, `사용자 ${action}에 실패했습니다.`)
        }
      } catch (_error) {
        showError(`${action} 실패`, `사용자 ${action} 중 오류가 발생했습니다.`)
      }
    }
  }

  // 권한 편집 관련 핸들러
  const handleEditPermissions = (user: User) => {
    setSelectedUserForPermission(user)
    // 사용자 개인 권한 사용 (user.permissions)
    setPermissionFormData(user.permissions || {})
    setShowPermissionModal(true)
  }

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserForPermission) return

    setIsSubmitting(true)
    try {
      // API를 통해 권한 업데이트
      const response = await fetch(`/api/users/${selectedUserForPermission.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: permissionFormData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '권한 업데이트에 실패했습니다.')
      }

      const result = await response.json()

      if (result.success) {
        showSuccess('권한 업데이트 완료', `${selectedUserForPermission.name}의 권한이 성공적으로 업데이트되었습니다.`)
        setShowPermissionModal(false)
        setSelectedUserForPermission(null)
        setPermissionFormData({})

        // 사용자 목록 새로고침
        await loadUsers()

        // 현재 로그인한 사용자의 권한을 수정한 경우, 세션을 새로고침하여 user 객체 업데이트
        if (currentUser && selectedUserForPermission.id === currentUser.id) {
          await refreshSession()
        }
      } else {
        throw new Error(result.error || '권한 업데이트에 실패했습니다.')
      }
    } catch (error) {
      showError('권한 업데이트 실패', error instanceof Error ? error.message : '권한 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setPermissionFormData((prev: any) => {
      const modulePermissions = prev[module] || []
      let newPermissions

      if (checked) {
        // 권한 추가
        newPermissions = [...modulePermissions, action]
      } else {
        // 권한 제거
        newPermissions = modulePermissions.filter((a: string) => a !== action)
      }

      return {
        ...prev,
        [module]: newPermissions
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
      if (checked) {
        return [...prev, userId]
      } else {
        return prev.filter(id => id !== userId)
      }
    })
  }

  const handleApplyTemplateToUsers = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate || selectedUsersForTemplate.length === 0) return

    setIsSubmitting(true)
    try {
      // 선택된 사용자들에게 템플릿 권한 적용
      const updatedCount = selectedUsersForTemplate.length
      
      // 실제로는 API 호출해야 하지만 지금은 로컬 업데이트
      // TODO: API 연동 필요
      for (const userId of selectedUsersForTemplate) {
        const user = allUsers.find(u => u.id === userId)
        if (user) {
          // 사용자의 역할을 선택된 템플릿으로 변경
          // changeUserRole(userId, selectedTemplate.id)
        }
      }
      
      showSuccess('템플릿 적용 완료', `${updatedCount}명의 사용자에게 "${selectedTemplate.name}" 권한이 적용되었습니다.`)
      setShowTemplateModal(false)
      setSelectedTemplate(null)
      setSelectedUsersForTemplate([])
    } catch (_error) {
      showError('템플릿 적용 실패', '권한 템플릿 적용 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTemplateUsageCount = (roleId: string): number => {
    return allUsers.filter(user => user.roleId === roleId).length
  }

  // 부서 목록 (고정)
  const departments = ['종합관리실', '공구관리실', 'Engineer']
  // 교대 목록 (A조, B조)
  const shifts = ['A', 'B']
  
  // 권한 매트릭스 관련 함수들
  const getModuleDisplayName = (module: string): string => {
    const moduleNames: Record<string, string> = {
      dashboard: '대시보드',
      equipment: '설비관리',
      endmills: '엔드밀관리',
      inventory: '재고관리',
      cam_sheets: 'CAM시트',
      tool_changes: '교체이력',
      endmill_disposals: '폐기관리',
      reports: '보고서',
      settings: '설정',
      users: '사용자관리'
    }
    return moduleNames[module] || module
  }
  
  const getActionDisplayName = (action: string): string => {
    const actionNames: Record<string, string> = {
      create: '생성',
      read: '조회',
      update: '수정',
      delete: '삭제',
      manage: '관리'
    }
    return actionNames[action] || action
  }
  
  const getActionIcon = (action: string): string => {
    const actionIcons: Record<string, string> = {
      create: '+',
      read: '●',
      update: '✏',
      delete: '🗑',
      manage: '↻'
    }
    return actionIcons[action] || '?'
  }

  const getActionColor = (action: string): string => {
    const actionColors: Record<string, string> = {
      create: 'text-blue-600',
      read: 'text-green-600',
      update: 'text-orange-600',
      delete: 'text-gray-600',
      manage: 'text-blue-600'
    }
    return actionColors[action] || 'text-gray-600'
  }
  
  const getUserPermissionLevel = (user: User): string => {
    const role = getUserRole(user.roleId)
    if (!role) return '알 수 없음'
    
    // 전체 권한 수 계산
    const uniqueActions = new Set(Object.values(role.permissions).flat()).size
    
    if (uniqueActions >= 4) return '전체 권한'
    if (uniqueActions >= 3) return '고급 권한'
    if (uniqueActions >= 2) return '일반 권한'
    return '제한 권한'
  }

  return (
    <div className="space-y-6">
      {/* 상단 사용자 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              👥
            </div>
            <div>
              <p className="text-sm text-gray-600">전체 사용자</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}명</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              👑
            </div>
            <div>
              <p className="text-sm text-gray-600">시스템 관리자</p>
              <p className="text-xl font-bold text-purple-600">{stats.systemAdmins}명</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              🛡️
            </div>
            <div>
              <p className="text-sm text-gray-600">관리자</p>
              <p className="text-xl font-bold text-orange-600">{stats.admins}명</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              ✅
            </div>
            <div>
              <p className="text-sm text-gray-600">활성 사용자</p>
              <p className="text-xl font-bold text-green-600">{stats.activeUsers}명</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex" aria-label="사용자 관리 탭">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">👥</span>
                <span>사용자 목록</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {filteredUsers.length}명
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🔐</span>
                <span>권한 매트릭스</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {AVAILABLE_RESOURCES.length}개 모듈
                </span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* 필터 및 검색 - 사용자 목록 탭에서만 표시 */}
      {activeTab === 'list' && (
      <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="이름, 이메일, 사번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 부서</option>
              {departments.map(department => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
          <div>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 권한</option>
              <option value="system_admin">시스템 관리자</option>
              <option value="admin">관리자</option>
              <option value="user">사용자</option>
            </select>
          </div>
          <div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
          
          {/* 필터 초기화 버튼 */}
          {(searchTerm || departmentFilter || roleFilter || statusFilter) && (
            <button 
              onClick={() => {
                setSearchTerm('')
                setDepartmentFilter('')
                setRoleFilter('')
                setStatusFilter('')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              필터 초기화
            </button>
          )}
          
          {/* 새 사용자 추가 버튼 */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + 사용자 추가
          </button>
        </div>
      </div>
      )}

      {/* 사용자 리스트 테이블 - 사용자 목록 탭에서만 표시 */}
      {activeTab === 'list' && (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            사용자 목록 ({filteredUsers.length}명)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm || departmentFilter || roleFilter || statusFilter 
              ? `전체 ${allUsers.length}명 중 ${filteredUsers.length}명 표시` 
              : '시스템 사용자 계정 및 권한 정보'}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label="부서"
                  field="department"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="직위"
                  field="position"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="이름"
                  field="name"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="권한"
                  field="roleId"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => {
                  const userRole = getUserRole(user.roleId)
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      {/* 부서 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.department}</div>
                      </td>
                      
                      {/* 직위 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.position}</div>
                      </td>
                      
                      {/* 이름 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              user.isActive ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-sm font-medium ${
                                user.isActive ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                {user.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className={`text-sm font-medium ${
                              user.isActive ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                              {user.name}
                              {!user.isActive && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  비활성
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* 권한 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userRole ? (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(userRole.type)}`}>
                            {getRoleName(userRole.type)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            알 수 없음
                          </span>
                        )}
                      </td>
                      
                      {/* 작업 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewDetail(user)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            상세
                          </button>
                          <button 
                            onClick={() => handleEdit(user)}
                            className="text-green-600 hover:text-green-900"
                          >
                            수정
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(user)}
                            className={`${user.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                          >
                            {user.isActive ? '비활성화' : '활성화'}
                          </button>
                          <button 
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                        <span className="text-xl">🔍</span>
                      </div>
                      <p className="text-sm">
                        {searchTerm || departmentFilter || roleFilter || statusFilter 
                          ? '검색 조건에 맞는 사용자가 없습니다' 
                          : '등록된 사용자가 없습니다'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {sortedUsers.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                전체 {sortedUsers.length}개 중 {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)}개 표시
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const pageNumbers = []
                    const maxVisiblePages = 5

                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1)
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            currentPage === i
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      )
                    }

                    return pageNumbers
                  })()}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 권한 매트릭스 탭 내용 */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* 권한 매트릭스 헤더 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">🔐 사용자 권한 매트릭스</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    각 사용자별 모듈 접근 권한을 한눈에 확인할 수 있습니다
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {filteredUsers.length}명 사용자
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {AVAILABLE_RESOURCES.length}개 모듈
                  </span>
                </div>
              </div>
            </div>
            
            {/* 권한 범례 */}
            <div className="px-6 py-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">권한 범례</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${getActionColor('create')}`}>{getActionIcon('create')}</span>
                  <span className="text-xs text-gray-600">{getActionDisplayName('create')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${getActionColor('read')}`}>{getActionIcon('read')}</span>
                  <span className="text-xs text-gray-600">{getActionDisplayName('read')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${getActionColor('update')}`}>{getActionIcon('update')}</span>
                  <span className="text-xs text-gray-600">{getActionDisplayName('update')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${getActionColor('delete')}`}>{getActionIcon('delete')}</span>
                  <span className="text-xs text-gray-600">{getActionDisplayName('delete')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${getActionColor('manage')}`}>{getActionIcon('manage')}</span>
                  <span className="text-xs text-gray-600">{getActionDisplayName('manage')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl text-green-600 font-bold">✓</span>
                  <span className="text-xs text-gray-600">조회만</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl text-red-500 font-bold">✕</span>
                  <span className="text-xs text-gray-600">권한 없음</span>
                </div>
              </div>
            </div>
          </div>

          {/* 권한 매트릭스 테이블 */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      권한 레벨
                    </th>
                    {AVAILABLE_RESOURCES.map(module => (
                      <th key={module} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-sm">{getModuleDisplayName(module)}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const userRole = getUserRole(user.roleId)
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        {/* 사용자 정보 (고정 컬럼) */}
                        <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div 
                            className="flex items-center space-x-3 cursor-pointer hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors"
                            onClick={() => handleEditPermissions(user)}
                            title="클릭하여 권한 편집"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              user.isActive ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-sm font-bold ${
                                user.isActive ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                {user.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-500">
                                {user.department} • {user.position}
                              </div>
                            </div>
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-xs text-blue-600">✏️</span>
                            </div>
                          </div>
                        </td>
                        
                        {/* 권한 레벨 */}
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div className="flex flex-col items-center space-y-1">
                            {userRole && (
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(userRole.type)}`}>
                                {getRoleName(userRole.type)}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {getUserPermissionLevel(user)}
                            </span>
                          </div>
                        </td>
                        
                        {/* 모듈별 권한 */}
                        {AVAILABLE_RESOURCES.map(module => {
                          // 시스템 관리자는 "*" 권한을 가질 수 있음
                          const hasWildcardPermission = user.permissions?.['*']
                          const modulePermissions = hasWildcardPermission || user.permissions?.[module] || []

                          return (
                            <td key={module} className="px-4 py-4 text-center border-r border-gray-200">
                              <div className="flex flex-wrap justify-center gap-1">
                                {modulePermissions.length > 0 ? (
                                  // 읽기 권한만 있는 경우
                                  modulePermissions.length === 1 && modulePermissions[0] === 'read' ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 text-xl text-green-600" title="조회">
                                      ✓
                                    </span>
                                  ) : (
                                    // 여러 권한이 있는 경우
                                    modulePermissions.map((action: string) => (
                                      <span
                                        key={action}
                                        className={`inline-flex items-center justify-center w-6 h-6 text-sm font-bold ${getActionColor(action)}`}
                                        title={getActionDisplayName(action)}
                                      >
                                        {getActionIcon(action)}
                                      </span>
                                    ))
                                  )
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 text-xl text-red-500" title="권한 없음">
                                    ✕
                                  </span>
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
          </div>

          {/* 권한 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 역할별 통계 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👑 역할별 분포</h3>
              <div className="space-y-3">
                {['system_admin', 'admin', 'user'].map(roleType => {
                  const count = filteredUsers.filter(user => {
                    const role = getUserRole(user.roleId)
                    return role?.type === roleType
                  }).length
                  
                  return (
                    <div key={roleType} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(roleType)}`}>
                          {getRoleName(roleType)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}명</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* 모듈별 접근 현황 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 모듈별 접근률</h3>
              <div className="space-y-3">
                {AVAILABLE_RESOURCES.slice(0, 5).map(module => {
                  const accessCount = filteredUsers.filter(user => {
                    const hasWildcard = user.permissions?.['*']
                    const modulePerms = user.permissions?.[module]
                    return hasWildcard || (modulePerms && modulePerms.length > 0)
                  }).length
                  const percentage = Math.round((accessCount / filteredUsers.length) * 100)
                  
                  return (
                    <div key={module} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{getModuleDisplayName(module)}</span>
                        <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{width: `${percentage}%`}}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* 보안 상태 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 보안 상태</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">활성 사용자</span>
                  <span className="text-sm font-medium text-green-600">
                    {filteredUsers.filter(u => u.isActive).length}명
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">비활성 사용자</span>
                  <span className="text-sm font-medium text-gray-600">
                    {filteredUsers.filter(u => !u.isActive).length}명
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">관리자 계정</span>
                  <span className="text-sm font-medium text-purple-600">
                    {filteredUsers.filter(user => {
                      const role = getUserRole(user.roleId)
                      return role?.type === 'system_admin' || role?.type === 'admin'
                    }).length}명
                  </span>
                </div>
                <div className="pt-2 mt-3 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs text-gray-600">보안 상태 양호</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 권한 템플릿 관리 섹션 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">📋 권한 템플릿 관리</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    역할별 권한 템플릿을 관리하고 사용자에게 일괄 적용할 수 있습니다
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {roles.length}개 템플릿 사용 가능
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* 템플릿 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(role.type)}`}>
                          {getRoleName(role.type)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTemplateUsageCount(role.id)}명 사용 중
                      </div>
                    </div>
                    
                    {/* 템플릿 이름 및 설명 */}
                    <div className="mb-3">
                      <h3 className="text-md font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    </div>
                    
                    {/* 권한 요약 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">포함된 권한:</h4>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(role.permissions).filter(([, actions]) => actions.length > 0).slice(0, 4).map(([module, actions]) => (
                          <span key={module} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {getModuleDisplayName(module)} ({actions.length})
                          </span>
                        ))}
                        {Object.entries(role.permissions).filter(([, actions]) => actions.length > 0).length > 4 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{Object.entries(role.permissions).filter(([, actions]) => actions.length > 0).length - 4}개 더
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* 권한 상세 정보 */}
                    <div className="mb-4 bg-gray-50 rounded p-2">
                      <div className="text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>총 모듈 수:</span>
                          <span className="font-medium">{Object.keys(role.permissions).length}개</span>
                        </div>
                        <div className="flex justify-between">
                          <span>활성 권한:</span>
                          <span className="font-medium">
                            {Object.values(role.permissions).reduce((sum, actions) => sum + actions.length, 0)}개
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>접근 레벨:</span>
                          <span className="font-medium">
                            {role.type === 'system_admin' ? '최고' : 
                             role.type === 'admin' ? '관리자' : '일반'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 템플릿 작업 버튼 */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApplyTemplate(role)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        🎯 사용자에게 적용
                      </button>
                      <button
                        onClick={() => {
                          // 권한 상세보기 (현재는 간단한 알림으로 대체)
                          alert(`${role.name} 권한 상세:\n\n${Object.entries(role.permissions).map(([module, actions]) => 
                            `${getModuleDisplayName(module)}: ${actions.length > 0 ? actions.map((a: string) => getActionDisplayName(a)).join(', ') : '권한 없음'}`
                          ).join('\n')}`)
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                        title="권한 상세보기"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 상세보기 모달 */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {selectedUser.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">사용자 상세 정보</h3>
                    <p className="text-sm text-gray-500">{selectedUser.name}의 계정 정보</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedUser(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 기본 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">👤</span>
                  기본 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이름</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">사번</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.employeeId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이메일</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">연락처</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.phone || '등록되지 않음'}</p>
                  </div>
                </div>
              </div>

              {/* 조직 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🏢</span>
                  조직 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">부서</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.department}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">직위</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.position}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">교대</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.shift}교대</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">계정 상태</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedUser.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedUser.isActive ? '✅ 활성' : '❌ 비활성'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 권한 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🔐</span>
                  권한 정보
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">역할</label>
                    <div className="mt-1">
                      {(() => {
                        const userRole = getUserRole(selectedUser.roleId)
                        return userRole ? (
                          <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getRoleBadge(userRole.type)}`}>
                            {getRoleName(userRole.type)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">알 수 없는 역할</span>
                        )
                      })()}
                    </div>
                  </div>
                  
                  {(() => {
                    const userRole = getUserRole(selectedUser.roleId)
                    return userRole && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">접근 가능한 모듈</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(userRole.permissions).map(([module, actions]) => (
                            actions.length > 0 && (
                              <div key={module} className="flex items-center space-x-2 text-xs">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span className="text-gray-700 capitalize">{module}</span>
                                <span className="text-gray-500">({actions.join(', ')})</span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 시스템 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">📅</span>
                  시스템 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">등록일</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">최종 수정일</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">등록자</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.createdBy}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">최종 로그인</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.lastLogin 
                        ? new Date(selectedUser.lastLogin).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '로그인 기록 없음'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    handleEdit(selectedUser)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  수정하기
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedUser(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 수정 모달 */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">✏️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">사용자 정보 수정</h3>
                    <p className="text-sm text-gray-500">{selectedUser.name}의 정보를 수정합니다</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    setEditFormData({})
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 수정 폼 */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
              {/* 기본 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">👤</span>
                  기본 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="이름을 입력하세요"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사번 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.employeeId || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="사번을 입력하세요"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="이메일을 입력하세요"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="연락처를 입력하세요"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* 조직 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🏢</span>
                  조직 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      부서 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.department || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">부서 선택</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      직위 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.position || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="직위를 입력하세요"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      교대 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.shift || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, shift: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">교대 선택</option>
                      {shifts.map(shift => (
                        <option key={shift} value={shift}>{shift}교대</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      계정 상태 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.isActive !== undefined ? (editFormData.isActive ? 'true' : 'false') : ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">상태 선택</option>
                      <option value="true">활성</option>
                      <option value="false">비활성</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 권한 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🔐</span>
                  권한 정보
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    역할 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.roleId || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, roleId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">역할 선택</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {getRoleName(role.type)} - {role.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* 선택된 역할의 권한 미리보기 */}
                  {editFormData.roleId && (() => {
                    const selectedRole = roles.find(role => role.id === editFormData.roleId)
                    return selectedRole && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm font-medium text-blue-900 mb-2">이 역할의 권한:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                          {Object.entries(selectedRole.permissions).map(([module, actions]) => (
                            actions.length > 0 && (
                              <div key={module} className="text-xs text-blue-700">
                                <span className="font-medium capitalize">{module}</span>: {actions.join(', ')}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 수정 일시 표시 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">💡 안내:</span> 수정 사항은 즉시 적용되며, 수정 일시가 자동으로 기록됩니다.
                </p>
              </div>

              {/* 모달 푸터 - 폼 내부 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    setEditFormData({})
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? '저장 중...' : '💾 변경사항 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 사용자 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">➕</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">새 사용자 추가</h3>
                    <p className="text-sm text-gray-500">새로운 사용자 계정을 생성합니다</p>
                  </div>
                </div>
                <button 
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
                      isActive: true
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 추가 폼 */}
            <form onSubmit={handleAddUser} className="p-6 space-y-6">
              {/* 기본 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">👤</span>
                  기본 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="사용자 이름을 입력하세요"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사번 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addFormData.employeeId}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="사번을 입력하세요 (예: EMP001)"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={addFormData.email}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="이메일을 입력하세요"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={addFormData.password}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="비밀번호 (최소 6자)"
                      disabled={isSubmitting}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">최초 로그인 시 사용할 비밀번호입니다.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처
                    </label>
                    <input
                      type="tel"
                      value={addFormData.phone}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="연락처를 입력하세요 (선택사항)"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* 조직 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🏢</span>
                  조직 정보
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      부서 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addFormData.department}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">부서를 선택하세요</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      직위 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addFormData.position}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="직위를 입력하세요 (예: 팀장, 대리, 사원)"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      교대 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addFormData.shift}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, shift: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">교대를 선택하세요</option>
                      {shifts.map(shift => (
                        <option key={shift} value={shift}>{shift}교대</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      계정 상태 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addFormData.isActive ? 'true' : 'false'}
                      onChange={(e) => setAddFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                      required
                    >
                      <option value="true">활성 (즉시 사용 가능)</option>
                      <option value="false">비활성 (추후 활성화)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 권한 정보 섹션 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🔐</span>
                  권한 설정
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    역할 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.roleId}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, roleId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">사용자 역할을 선택하세요</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {getRoleName(role.type)} - {role.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* 선택된 역할의 권한 미리보기 */}
                  {addFormData.roleId && (() => {
                    const selectedRole = roles.find(role => role.id === addFormData.roleId)
                    return selectedRole && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm font-medium text-blue-900 mb-2">선택된 역할의 권한:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                          {Object.entries(selectedRole.permissions).map(([module, actions]) => (
                            actions.length > 0 && (
                              <div key={module} className="text-xs text-blue-700">
                                <span className="font-medium capitalize">{module}</span>: {actions.join(', ')}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* 주의사항 안내 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">새 계정 생성 시 주의사항:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• 사번은 고유값이어야 하며, 중복될 수 없습니다</li>
                      <li>• 이메일 주소는 계정 식별 및 알림 전송에 사용됩니다</li>
                      <li>• 계정 생성 후 초기 비밀번호는 별도로 설정해야 합니다</li>
                      <li>• 역할에 따라 시스템 접근 권한이 결정됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 모달 푸터 - 폼 내부 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                      isActive: true
                    })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? '생성 중...' : '👤 사용자 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 권한 편집 모달 */}
      {showPermissionModal && selectedUserForPermission && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">🔐</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">사용자 권한 편집</h3>
                    <p className="text-sm text-gray-500">{selectedUserForPermission.name}의 모듈별 접근 권한 설정</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPermissionModal(false)
                    setSelectedUserForPermission(null)
                    setPermissionFormData({})
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 모달 내용 */}
            <form onSubmit={handleSavePermissions} className="p-6 space-y-6">
              {/* 사용자 정보 요약 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {selectedUserForPermission.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{selectedUserForPermission.name}</h4>
                    <p className="text-sm text-gray-600">
                      {selectedUserForPermission.department} • {selectedUserForPermission.position} • 
                      현재 권한 레벨: <span className="font-medium">{getUserPermissionLevel(selectedUserForPermission)}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 권한 매트릭스 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">모듈별 권한 설정</h4>
                  <div className="text-sm text-gray-500">
                    체크박스를 통해 각 모듈의 작업 권한을 개별적으로 설정할 수 있습니다
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                          모듈
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          생성 {getActionIcon('create')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          조회 {getActionIcon('read')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          수정 {getActionIcon('update')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          삭제 {getActionIcon('delete')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          관리 {getActionIcon('manage')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {AVAILABLE_RESOURCES.map(module => (
                        <tr key={module} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {getModuleDisplayName(module)}
                              </span>
                            </div>
                          </td>
                          {['create', 'read', 'update', 'delete', 'manage'].map(action => (
                            <td key={action} className="px-4 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={(permissionFormData[module] || []).includes(action)}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  handlePermissionChange(module, action, e.target.checked)
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const currentlyChecked = (permissionFormData[module] || []).includes(action)
                                  handlePermissionChange(module, action, !currentlyChecked)
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                disabled={isSubmitting}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 권한 프리셋 (빠른 설정) */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">빠른 권한 설정</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allPermissions: any = {}
                      AVAILABLE_RESOURCES.forEach(module => {
                        allPermissions[module] = ['create', 'read', 'update', 'delete', 'manage']
                      })
                      setPermissionFormData(allPermissions)
                    }}
                    className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-md hover:bg-green-200"
                    disabled={isSubmitting}
                  >
                    모든 권한 부여
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const readOnlyPermissions: any = {}
                      AVAILABLE_RESOURCES.forEach(module => {
                        readOnlyPermissions[module] = ['read']
                      })
                      setPermissionFormData(readOnlyPermissions)
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200"
                    disabled={isSubmitting}
                  >
                    읽기 전용
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const noPermissions: any = {}
                      AVAILABLE_RESOURCES.forEach(module => {
                        noPermissions[module] = []
                      })
                      setPermissionFormData(noPermissions)
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    모든 권한 제거
                  </button>
                </div>
              </div>

              {/* 주의사항 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">권한 변경 시 주의사항:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• 권한 변경은 즉시 적용되며, 사용자가 다음 로그인 시부터 반영됩니다</li>
                      <li>• 관리 권한은 해당 모듈의 모든 기능에 대한 접근을 허용합니다</li>
                      <li>• 시스템 관리자 권한 변경은 신중하게 검토하여 진행하세요</li>
                      <li>• 권한 변경 내역은 시스템 로그에 기록됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false)
                    setSelectedUserForPermission(null)
                    setPermissionFormData({})
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? '저장 중...' : '🔐 권한 업데이트'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 권한 템플릿 적용 모달 */}
      {showTemplateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">권한 템플릿 적용</h3>
                    <p className="text-sm text-gray-500">&quot;{selectedTemplate.name}&quot; 템플릿을 사용자에게 적용</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowTemplateModal(false)
                    setSelectedTemplate(null)
                    setSelectedUsersForTemplate([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 모달 내용 */}
            <form onSubmit={handleApplyTemplateToUsers} className="p-6 space-y-6">
              {/* 템플릿 정보 요약 */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 text-sm font-semibold rounded-full ${getRoleBadge(selectedTemplate.type)}`}>
                    {getRoleName(selectedTemplate.type)}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h4>
                    <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                  </div>
                </div>
                
                {/* 템플릿 권한 미리보기 */}
                <div className="mt-3 p-3 bg-white rounded border">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">적용될 권한:</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(selectedTemplate.permissions).map(([module, actions]) => (
                      <div key={module} className="text-xs">
                        <span className="font-medium">{getModuleDisplayName(module)}:</span>
                        <div className="ml-2 text-gray-600">
                          {actions.length > 0 ? actions.map((action: string) => getActionDisplayName(action)).join(', ') : '권한 없음'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 사용자 선택 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">적용할 사용자 선택</h4>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUsersForTemplate(filteredUsers.map(u => u.id))}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200"
                      disabled={isSubmitting}
                    >
                      전체 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUsersForTemplate([])}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                      disabled={isSubmitting}
                    >
                      선택 해제
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredUsers.map(user => {
                      const userRole = getUserRole(user.roleId)
                      const isCurrentTemplate = user.roleId === selectedTemplate.id
                      
                      return (
                        <label 
                          key={user.id} 
                          className={`flex items-center space-x-3 p-2 rounded border cursor-pointer transition-colors ${
                            selectedUsersForTemplate.includes(user.id) 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          } ${isCurrentTemplate ? 'opacity-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsersForTemplate.includes(user.id)}
                            onChange={(e) => handleUserSelectionForTemplate(user.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={isSubmitting || isCurrentTemplate}
                          />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            user.isActive ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              user.isActive ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              {user.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.department} • {user.position}
                              {isCurrentTemplate && <span className="ml-2 text-blue-600">(현재 템플릿)</span>}
                            </div>
                          </div>
                          {userRole && (
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(userRole.type)}`}>
                              {getRoleName(userRole.type)}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  선택된 사용자: <span className="font-medium">{selectedUsersForTemplate.length}명</span> / 
                  전체: <span className="font-medium">{filteredUsers.length}명</span>
                </div>
              </div>

              {/* 주의사항 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">템플릿 적용 시 주의사항:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• 선택된 사용자들의 기존 권한이 템플릿 권한으로 완전히 교체됩니다</li>
                      <li>• 권한 변경은 사용자가 다음 로그인 시부터 반영됩니다</li>
                      <li>• 현재 동일한 템플릿을 사용하는 사용자는 선택할 수 없습니다</li>
                      <li>• 템플릿 적용 내역은 시스템 로그에 기록됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false)
                    setSelectedTemplate(null)
                    setSelectedUsersForTemplate([])
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting || selectedUsersForTemplate.length === 0}
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? '적용 중...' : `🎯 ${selectedUsersForTemplate.length}명에게 템플릿 적용`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 승인 모달 */}
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