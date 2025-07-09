'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientSupabaseService } from '../services/supabaseService'
import { User, UserRole, UserStats, UserFilter } from '../types/users'

// 기본 역할 데이터 (임시)
const defaultRoles: UserRole[] = [
  {
    id: '1',
    name: '시스템 관리자',
    type: 'system_admin',
    description: '모든 시스템 권한을 가진 최고 관리자',
    permissions: {
      dashboard: ['create', 'read', 'update', 'delete', 'manage'],
      equipment: ['create', 'read', 'update', 'delete', 'manage'],
      endmill: ['create', 'read', 'update', 'delete', 'manage'],
      inventory: ['create', 'read', 'update', 'delete', 'manage'],
      toolChanges: ['create', 'read', 'update', 'delete', 'manage'],
      camSheets: ['create', 'read', 'update', 'delete', 'manage'],
      reports: ['create', 'read', 'update', 'delete', 'manage'],
      users: ['create', 'read', 'update', 'delete', 'manage'],
      settings: ['create', 'read', 'update', 'delete', 'manage']
    },
    isSystemRole: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: '관리자',
    type: 'admin',
    description: '일반적인 관리 업무를 담당하는 관리자',
    permissions: {
      dashboard: ['read', 'update'],
      equipment: ['read', 'update'],
      endmill: ['read', 'update'],
      inventory: ['read', 'update'],
      toolChanges: ['read', 'update'],
      camSheets: ['read', 'update'],
      reports: ['read'],
      users: ['read'],
      settings: ['read']
    },
    isSystemRole: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: '사용자',
    type: 'user',
    description: '기본 사용자 권한을 가진 일반 사용자',
    permissions: {
      dashboard: ['read'],
      equipment: ['read'],
      endmill: ['read'],
      inventory: ['read'],
      toolChanges: ['read'],
      camSheets: ['read'],
      reports: ['read'],
      users: [],
      settings: []
    },
    isSystemRole: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// 기본 사용자 데이터 (임시)
const defaultUsers: User[] = [
  {
    id: '1',
    name: '관리자',
    email: 'admin@almustech.com',
    employeeId: 'EMP001',
    department: '관리부',
    position: '부장',
    shift: '상시',
    roleId: '1',
    isActive: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const useUsers = () => {
  const queryClient = useQueryClient()

  // 사용자 데이터 조회 (Supabase 연동 시까지 기본 데이터 사용)
  const {
    data: users = defaultUsers,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // TODO: Supabase userProfile 서비스 사용
      // return await clientSupabaseService.userProfile.getAll()
      return defaultUsers
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000 // 10분
  })

  // 역할 데이터 (현재는 기본값 사용)
  const roles = defaultRoles

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

  // 사용자 생성 mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
      // TODO: Supabase userProfile 서비스 사용
      // return await clientSupabaseService.userProfile.create(userData)
      return {
        ...userData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  // 사용자 수정 mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) => {
      // TODO: Supabase userProfile 서비스 사용
      // return await clientSupabaseService.userProfile.update(id, updates)
      return { id, ...updates }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  // 사용자 삭제 mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      // TODO: Supabase userProfile 서비스 사용
      // return await clientSupabaseService.userProfile.delete(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
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
    console.log(`비밀번호 재설정 요청: ${user.email}`)
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
    // Mutation 상태들
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending
  }
} 