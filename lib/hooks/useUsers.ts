'use client'

import { useState, useEffect } from 'react'
import { User, UserRole, UserStats, UserFilter } from '../types/users'

// 목업 데이터 가져오기
const getInitialData = (): { users: User[]; roles: UserRole[] } => {
  try {
    // 실제 프로젝트에서는 mock 데이터를 import하거나 API에서 가져오기
    const mockUsers = require('../data/mock/users.json')
    return mockUsers
  } catch (error) {
    console.error('목업 데이터 로드 실패:', error)
    return { users: [], roles: [] }
  }
}

// 로컬 스토리지에서 사용자 데이터 로드
const loadUsersFromStorage = (): { users: User[]; roles: UserRole[] } => {
  if (typeof window === 'undefined') {
    return getInitialData()
  }
  
  try {
    const stored = localStorage.getItem('users')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('사용자 데이터 로드 실패:', error)
  }
  
  // 로컬 스토리지에 데이터가 없으면 목업 데이터 로드 후 저장
  const initialData = getInitialData()
  saveUsersToStorage(initialData.users, initialData.roles)
  return initialData
}

// 로컬 스토리지에 사용자 데이터 저장
const saveUsersToStorage = (users: User[], roles: UserRole[]) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('users', JSON.stringify({ users, roles }))
  } catch (error) {
    console.error('사용자 데이터 저장 실패:', error)
  }
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 초기 데이터 로드
  useEffect(() => {
    const { users: loadedUsers, roles: loadedRoles } = loadUsersFromStorage()
    setUsers(loadedUsers)
    setRoles(loadedRoles)
    setIsLoading(false)
  }, [])

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

  // 새 사용자 생성
  const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    saveUsersToStorage(updatedUsers, roles)
    
    return newUser
  }

  // 사용자 정보 수정
  const updateUser = (id: string, updates: Partial<User>): User | null => {
    const userIndex = users.findIndex(user => user.id === id)
    if (userIndex === -1) return null

    const updatedUser: User = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    const updatedUsers = [...users]
    updatedUsers[userIndex] = updatedUser
    setUsers(updatedUsers)
    saveUsersToStorage(updatedUsers, roles)
    
    return updatedUser
  }

  // 사용자 삭제
  const deleteUser = (id: string): boolean => {
    const userExists = users.some(user => user.id === id)
    if (!userExists) return false

    const updatedUsers = users.filter(user => user.id !== id)
    setUsers(updatedUsers)
    saveUsersToStorage(updatedUsers, roles)
    
    return true
  }

  // 사용자 활성/비활성 상태 토글
  const toggleUserStatus = (id: string): User | null => {
    const user = users.find(user => user.id === id)
    if (!user) return null

    return updateUser(id, { isActive: !user.isActive })
  }

  // 사용자 역할 변경
  const changeUserRole = (id: string, roleId: string): User | null => {
    const roleExists = roles.some(role => role.id === roleId)
    if (!roleExists) return null

    return updateUser(id, { roleId })
  }

  // 사용자 비밀번호 재설정 (실제로는 서버에서 처리)
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
    getUserStats,
    getFilteredUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    changeUserRole,
    resetUserPassword
  }
} 