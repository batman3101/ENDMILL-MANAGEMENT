'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from './useRealtime'
import { useFactory } from '@/lib/hooks/useFactory'
import { clientLogger } from '../utils/logger'

export interface ToolChangeFilters {
  equipmentNumber?: number
  endmillType?: string
  searchTerm?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

export interface ToolChange {
  id: string
  equipment_number: number
  equipment_id?: string
  production_model: string
  process: string
  t_number: number
  endmill_type_id?: string
  endmill_code: string | null
  endmill_name: string | null
  change_date: string
  tool_life: number
  change_reason: string
  changed_by?: string
  notes?: string
  created_at: string
  // Legacy fields for backward compatibility
  old_life_hours?: number
  new_life_hours?: number
  reason?: string
  user_id?: string
  equipment?: {
    id: string
    name: string
    equipment_number: number
    type: string
    status: string
  }
  endmill_type?: {
    id: string
    code: string
    name: string
    specifications?: any
  }
  user?: {
    name: string
    employee_id: string
  }
}

interface UseToolChangesReturn {
  toolChanges: ToolChange[]
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  totalCount: number
}

export const useToolChanges = (
  filters: ToolChangeFilters = {},
  enableRealtime: boolean = true
): UseToolChangesReturn => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  const [toolChanges, setToolChanges] = useState<ToolChange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const fetchToolChanges = useCallback(async (reset: boolean = false) => {
    try {
      setError(null)
      if (reset) {
        setIsLoading(true)
      }

      const params = new URLSearchParams()

      // 공장 필터 추가
      if (factoryId) {
        params.append('factoryId', factoryId)
      }

      // 필터 파라미터 추가
      if (filters.equipmentNumber) {
        params.append('equipment_number', filters.equipmentNumber.toString())
      }
      if (filters.endmillType) {
        params.append('endmill_type', filters.endmillType)
      }
      if (filters.searchTerm) {
        params.append('search', filters.searchTerm)
      }
      if (filters.startDate) {
        params.append('start_date', filters.startDate)
      }
      if (filters.endDate) {
        params.append('end_date', filters.endDate)
      }

      // 페이지네이션 파라미터
      const limit = filters.limit || 20
      const offset = filters.offset || 0

      params.append('limit', limit.toString())
      params.append('offset', offset.toString())

      // 정렬 파라미터
      if (filters.sortField) {
        params.append('sort_field', filters.sortField)
      }
      if (filters.sortDirection) {
        params.append('sort_direction', filters.sortDirection)
      }

      const response = await fetch(`/api/tool-changes?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tool changes')
      }

      const newData = result.data || []
      const total = result.totalCount || result.total || 0

      if (reset) {
        setToolChanges(newData)
      } else {
        setToolChanges(prev => [...prev, ...newData])
      }

      setHasMore(newData.length === limit)
      setTotalCount(total || newData.length)

    } catch (err) {
      clientLogger.error('Tool changes 조회 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [filters, factoryId])

  const refreshData = useCallback(async () => {
    await fetchToolChanges(true)
  }, [fetchToolChanges])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return

    // loadMore는 현재 데이터에 추가로 로드
    const currentOffset = toolChanges.length
    const updatedFilters = { ...filters, offset: currentOffset }

    try {
      setError(null)
      const params = new URLSearchParams()

      // 공장 필터 추가
      if (factoryId) {
        params.append('factoryId', factoryId)
      }

      if (updatedFilters.equipmentNumber) {
        params.append('equipment_number', updatedFilters.equipmentNumber.toString())
      }
      if (updatedFilters.endmillType) {
        params.append('endmill_type', updatedFilters.endmillType)
      }
      if (updatedFilters.searchTerm) {
        params.append('search', updatedFilters.searchTerm)
      }
      if (updatedFilters.startDate) {
        params.append('start_date', updatedFilters.startDate)
      }
      if (updatedFilters.endDate) {
        params.append('end_date', updatedFilters.endDate)
      }

      const limit = updatedFilters.limit || 20
      params.append('limit', limit.toString())
      params.append('offset', currentOffset.toString())

      // 정렬 파라미터
      if (updatedFilters.sortField) {
        params.append('sort_field', updatedFilters.sortField)
      }
      if (updatedFilters.sortDirection) {
        params.append('sort_direction', updatedFilters.sortDirection)
      }

      const response = await fetch(`/api/tool-changes?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tool changes')
      }

      const newData = result.data || []
      setToolChanges(prev => [...prev, ...newData])
      setHasMore(newData.length === limit)

    } catch (err) {
      clientLogger.error('Tool changes 추가 로드 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    }
  }, [hasMore, isLoading, filters, toolChanges.length, factoryId])

  // 초기 데이터 로드 및 필터 변경시 재로드
  useEffect(() => {
    fetchToolChanges(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    factoryId,
    filters.equipmentNumber,
    filters.endmillType,
    filters.searchTerm,
    filters.startDate,
    filters.endDate,
    filters.offset,
    filters.limit,
    filters.sortField,
    filters.sortDirection
  ])

  // 실시간 업데이트
  useRealtime({
    table: 'tool_changes',
    enabled: enableRealtime,
    onInsert: (payload) => {
      clientLogger.log('New tool change:', payload.new)
      refreshData()
    },
    onUpdate: (payload) => {
      clientLogger.log('Updated tool change:', payload.new)
      setToolChanges(prev =>
        prev.map(item =>
          item.id === payload.new.id ? { ...item, ...payload.new } : item
        )
      )
    },
    onDelete: (payload) => {
      clientLogger.log('Deleted tool change:', payload.old)
      setToolChanges(prev =>
        prev.filter(item => item.id !== payload.old.id)
      )
    }
  })

  return {
    toolChanges,
    isLoading,
    error,
    refreshData,
    loadMore,
    hasMore,
    totalCount
  }
}

// 특정 설비의 교체 이력만 조회하는 전용 훅
export const useEquipmentToolChanges = (equipmentNumber: number) => {
  return useToolChanges({ equipmentNumber, limit: 50 })
}

// 최근 교체 이력만 조회하는 훅
export const useRecentToolChanges = (limit: number = 10) => {
  return useToolChanges({ limit })
}

// 교체 실적 통계 인터페이스
export interface ToolChangeStats {
  todayTotal: number
  regularReplacement: number
  broken: number
  wear: number
  modelChange: number
  qualityDefect: number
  topModelToday: { name: string; count: number }
  topProcessToday: { name: string; count: number }
}

interface UseToolChangeStatsReturn {
  stats: ToolChangeStats | null
  isLoading: boolean
  error: string | null
  refreshStats: () => Promise<void>
}

// 교체 실적 통계를 가져오는 훅
export const useToolChangeStats = (
  date?: string, // YYYY-MM-DD 형식, 기본값은 오늘
  enableRealtime: boolean = true
): UseToolChangeStatsReturn => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  const [stats, setStats] = useState<ToolChangeStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)

      const params = new URLSearchParams()
      if (factoryId) {
        params.append('factoryId', factoryId)
      }
      if (date) {
        params.append('date', date)
      }

      const response = await fetch(`/api/tool-changes/stats?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tool change stats')
      }

      setStats(result.data)
    } catch (err) {
      clientLogger.error('Tool change stats 조회 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [date, factoryId])

  const refreshStats = useCallback(async () => {
    await fetchStats()
  }, [fetchStats])

  // 초기 데이터 로드 및 날짜 변경시 재로드
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 실시간 업데이트 - tool_changes 테이블에 변경이 있을 때 통계 새로고침
  useRealtime({
    table: 'tool_changes',
    enabled: enableRealtime,
    onInsert: () => {
      clientLogger.log('Tool change inserted, refreshing stats...')
      refreshStats()
    },
    onUpdate: () => {
      clientLogger.log('Tool change updated, refreshing stats...')
      refreshStats()
    },
    onDelete: () => {
      clientLogger.log('Tool change deleted, refreshing stats...')
      refreshStats()
    }
  })

  return {
    stats,
    isLoading,
    error,
    refreshStats
  }
}