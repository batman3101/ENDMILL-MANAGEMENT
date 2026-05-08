'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientSupabaseService } from '../services/supabaseService'
import { User, UserRole, UserStats, UserFilter, ModulePermissions } from '../types/users'
import { useRealtime } from './useRealtime'
import { logger } from '@/lib/utils/logger'
import { useFactory } from './useFactory'

export const useUsers = () => {
  const queryClient = useQueryClient()
  const { currentFactory } = useFactory()

  // 사용자 프로필 데이터 조회 (Supabase에서 가져오기)
  const {
    data: rawUsers = [],
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users', currentFactory?.id],
    queryFn: async () => {
      logger.log('🔄 Fetching user profiles from API...')
      const params = new URLSearchParams()
      if (currentFactory?.id) params.set('factoryId', currentFactory.id)
      const response = await fetch(`/api/users?${params.toString()}`, {
        credentials: 'include',
      })
      if (!response.ok) {
        logger.error('❌ API fetch failed:', response.status, response.statusText)
        throw new Error('Failed to fetch users')
      }
      const result = await response.json()
      logger.log('✅ User profiles fetched:', result.data?.length, 'users')
      return result.data || []
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000 // 10분
  })

  // 역할 데이터 조회 (Supabase에서 가져오기)
  const {
    data: rawRoles = [],
    isLoading: isLoadingRoles,
    error: rolesError
  } = useQuery({
    queryKey: ['userRoles'],
    queryFn: async () => {
      logger.log('🔄 Fetching user roles from Supabase...')
      const data = await clientSupabaseService.userRoles.getAll()
      logger.log('✅ User roles fetched:', data?.length, 'roles')
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000 // 10분
  })

  // user_profiles 테이블 실시간 구독
  useRealtime({
    table: 'user_profiles',
    onInsert: (payload) => {
      logger.log('📥 New user profile inserted:', payload)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onUpdate: (payload) => {
      logger.log('📝 User profile updated:', payload)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onDelete: (payload) => {
      logger.log('🗑️ User profile deleted:', payload)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  // user_roles 테이블 실시간 구독
  useRealtime({
    table: 'user_roles',
    onInsert: (payload) => {
      logger.log('📥 New user role inserted:', payload)
      queryClient.invalidateQueries({ queryKey: ['userRoles'] })
    },
    onUpdate: (payload) => {
      logger.log('📝 User role updated:', payload)
      queryClient.invalidateQueries({ queryKey: ['userRoles'] })
    },
    onDelete: (payload) => {
      logger.log('🗑️ User role deleted:', payload)
      queryClient.invalidateQueries({ queryKey: ['userRoles'] })
    }
  })

  // 데이터 변환: Supabase 데이터를 User 타입으로 변환
  const users: User[] = rawUsers.map((profile: any) => ({
    id: profile.id,
    name: profile.name,
    email: profile.email || '',
    employeeId: profile.employee_id,
    department: profile.department,
    position: profile.position,
    shift: profile.shift,
    roleId: profile.role_id || '',
    phone: profile.phone || undefined,
    isActive: profile.is_active ?? true,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    permissions: profile.permissions || {}
  }))

  // 역할 데이터 변환
  const roles: UserRole[] = rawRoles.map(role => ({
    id: role.id,
    name: role.name,
    type: role.type,
    description: role.description || '',
    permissions: (role.permissions || {}) as unknown as ModulePermissions,
    isSystemRole: true,
    isActive: role.is_active ?? true,
    createdAt: role.created_at,
    updatedAt: role.updated_at
  }))

  const isLoading = isLoadingUsers || isLoadingRoles
  const error = usersError || rolesError

  // 사용자 통계 계산
  const getUserStats = (): UserStats => {
    const stats: UserStats = {
      total: users.length,
      systemAdmins: 0,
      admins: 0,
      users: 0,
      activeUsers: users.filter(user => user.isActive).length,
      inactiveUsers: users.filter(user => !user.isActive).length,
      departmentStats: {},
      shiftStats: {}
    }

    users.forEach(user => {
      // 역할별 통계
      const role = roles.find(r => r.id === user.roleId)
      if (role) {
        switch (role.type) {
          case 'system_admin':
            stats.systemAdmins++
            break
          case 'admin':
            stats.admins++
            break
          case 'user':
            stats.users++
            break
        }
      }

      // 부서별 통계
      stats.departmentStats[user.department] = (stats.departmentStats[user.department] || 0) + 1

      // 교대별 통계
      stats.shiftStats[user.shift] = (stats.shiftStats[user.shift] || 0) + 1
    })

    return stats
  }

  // 필터된 사용자 목록 조회
  const getFilteredUsers = (filter: UserFilter = {}): User[] => {
    return users.filter(user => {
      if (filter.department && user.department !== filter.department) return false
      if (filter.shift && user.shift !== filter.shift) return false
      if (filter.position && user.position !== filter.position) return false
      if (filter.isActive !== undefined && user.isActive !== filter.isActive) return false
      
      if (filter.role) {
        const role = roles.find(r => r.id === user.roleId)
        if (!role || role.type !== filter.role) return false
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.employeeId.toLowerCase().includes(searchLower) ||
          user.department.toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }

  // ID로 사용자 조회
  const getUserById = (id: string): User | undefined => {
    return users.find(user => user.id === id)
  }

  // 사용자 생성 mutation (Auth + Profile 통합)
  const createUserMutation = useMutation({
    mutationFn: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }) => {
      logger.log('🔄 Creating new user with auth:', userData)

      // API를 통해 서버 측에서 Admin API로 사용자 생성
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          employeeId: userData.employeeId,
          department: userData.department,
          position: userData.position,
          shift: userData.shift,
          roleId: userData.roleId,
          phone: userData.phone,
          isActive: userData.isActive ?? true,
          factoryId: currentFactory?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      const result = await response.json()
      logger.log('✅ User created via API:', result)
      return result.data
    },
    onSuccess: () => {
      logger.log('✅ User creation successful, invalidating cache')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      logger.error('❌ User creation failed:', error)
    }
  })

  // 사용자 수정 mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) => {
      logger.log('🔄 Updating user profile:', id, updates)

      // User 타입을 Supabase Update 타입으로 변환
      const updateData: any = {}
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.employeeId !== undefined) updateData.employee_id = updates.employeeId
      if (updates.department !== undefined) updateData.department = updates.department
      if (updates.position !== undefined) updateData.position = updates.position
      if (updates.shift !== undefined) updateData.shift = updates.shift
      if (updates.roleId !== undefined) updateData.role_id = updates.roleId
      if (updates.phone !== undefined) updateData.phone = updates.phone
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive

      const result = await clientSupabaseService.userProfile.update(id, updateData)
      logger.log('✅ User profile updated:', result)
      return result
    },
    onSuccess: () => {
      logger.log('✅ User update successful, invalidating cache')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      logger.error('❌ User update failed:', error)
    }
  })

  // 사용자 삭제 mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      logger.log('🔄 Deleting user profile:', id)
      const result = await clientSupabaseService.userProfile.delete(id)
      logger.log('✅ User profile deleted:', id)
      return result
    },
    onSuccess: () => {
      logger.log('✅ User deletion successful, invalidating cache')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      logger.error('❌ User deletion failed:', error)
    }
  })

  // 편의 함수들
  const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createUserMutation.mutateAsync(userData)
  }

  const updateUser = (id: string, updates: Partial<User>) => {
    return updateUserMutation.mutateAsync({ id, updates })
  }

  const deleteUser = (id: string) => {
    return deleteUserMutation.mutateAsync(id)
  }

  const toggleUserStatus = (id: string) => {
    const user = users.find(user => user.id === id)
    if (!user) return null
    return updateUser(id, { isActive: !user.isActive })
  }

  const changeUserRole = (id: string, roleId: string) => {
    const roleExists = roles.some(role => role.id === roleId)
    if (!roleExists) return null
    return updateUser(id, { roleId })
  }

  const resetUserPassword = (id: string): boolean => {
    const user = users.find(user => user.id === id)
    if (!user) return false

    // 실제로는 서버 API 호출
    logger.log(`비밀번호 재설정 요청: ${user.email}`)
    return true
  }

  return {
    users,
    roles,
    isLoading,
    error,
    getUserStats,
    getFilteredUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    changeUserRole,
    resetUserPassword,
    loadUsers: refetchUsers, // 사용자 목록 새로고침 함수
    // Mutation 상태들
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending
  }
} 