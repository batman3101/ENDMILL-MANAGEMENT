'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from './useRealtime'

export interface ToolChangeFilters {
  equipmentNumber?: number
  endmillType?: string
  searchTerm?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface ToolChange {
  id: string
  equipment_number: number
  endmill_type_id: string
  endmill_code: string
  change_date: string
  old_life_hours: number
  new_life_hours: number
  reason: string
  notes?: string
  user_id: string
  created_at: string
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
      console.error('Tool changes 조회 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

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
      console.error('Tool changes 추가 로드 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    }
  }, [hasMore, isLoading, filters, toolChanges.length])

  // 초기 데이터 로드 및 필터 변경시 재로드
  useEffect(() => {
    fetchToolChanges(true)
  }, [
    filters.equipmentNumber,
    filters.endmillType,
    filters.searchTerm,
    filters.startDate,
    filters.endDate,
    filters.offset,
    filters.limit
  ])

  // 실시간 업데이트
  useRealtime({
    table: 'tool_changes',
    enabled: enableRealtime,
    onInsert: (payload) => {
      console.log('New tool change:', payload.new)
      refreshData()
    },
    onUpdate: (payload) => {
      console.log('Updated tool change:', payload.new)
      setToolChanges(prev =>
        prev.map(item =>
          item.id === payload.new.id ? { ...item, ...payload.new } : item
        )
      )
    },
    onDelete: (payload) => {
      console.log('Deleted tool change:', payload.old)
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