'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { clientSupabaseService } from '../services/supabaseService'
import { Database } from '../types/database'

// Database 타입에서 가져오기
type Equipment = Database['public']['Tables']['equipments']['Row']

// 타입 export
export type { Equipment }

export interface EquipmentFilter {
  status?: string
  location?: string
  model?: string
}

export interface EquipmentStats {
  total: number
  active: number
  maintenance: number
  setup: number
}

export const useEquipment = (filter?: EquipmentFilter) => {
  const queryClient = useQueryClient()

  // 설비 데이터 조회
  const {
    data: equipments = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['equipment', filter],
    queryFn: async () => {
      const response = await fetch('/api/equipment?' + new URLSearchParams({
        ...(filter?.status && { status: filter.status }),
        ...(filter?.location && { location: filter.location }),
        ...(filter?.model && { model: filter.model })
      }))
      
      if (!response.ok) {
        throw new Error('설비 데이터를 불러오는데 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '설비 데이터를 불러오는데 실패했습니다.')
      }
      
      return result.data as Equipment[]
    }
  })

  // 실시간 구독 설정
  useEffect(() => {
    const subscription = clientSupabaseService.equipment.subscribeToChanges((payload) => {
      console.log('Equipment 실시간 업데이트:', payload)
      
      // React Query 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [queryClient])

  // 설비 생성 Mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      equipment_number: number
      model_code: string
      status?: string
      location?: string
      current_model?: string
      process?: string
      tool_positions?: any
    }) => {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('설비 생성에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '설비 생성에 실패했습니다.')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    }
  })

  // 설비 업데이트 Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      equipment_number: number
      model_code: string
      status: string
      location: string
      current_model: string
      process: string
      tool_positions: any
    }>) => {
      const response = await fetch('/api/equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })
      
      if (!response.ok) {
        throw new Error('설비 업데이트에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '설비 업데이트에 실패했습니다.')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    }
  })

  // 설비 삭제 Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/equipment?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('설비 삭제에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '설비 삭제에 실패했습니다.')
      }
      
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    }
  })

  // 필터링된 설비 조회
  const getFilteredEquipments = (additionalFilter: EquipmentFilter = {}) => {
    return equipments.filter(eq => {
      if (additionalFilter.status && eq.status !== additionalFilter.status) return false
      if (additionalFilter.location && eq.location !== additionalFilter.location) return false
      if (additionalFilter.model && eq.model_code !== additionalFilter.model) return false
      return true
    })
  }

  // 설비 통계 계산
  const getEquipmentStats = (filtered?: Equipment[]): EquipmentStats => {
    const data = filtered || equipments
    return {
      total: data.length,
      active: data.filter(eq => eq.status === 'active').length,
      maintenance: data.filter(eq => eq.status === 'maintenance').length,
      setup: data.filter(eq => eq.status === 'offline').length,
    }
  }

  // 사용 가능한 모델 목록 (하드코딩된 값들)
  const getAvailableModels = () => {
    return ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  }

  // 사용 가능한 공정 목록 (하드코딩된 값들)
  const getAvailableProcesses = () => {
    return ['CNC1', 'CNC2', 'CNC2-1']
  }

  // 사용 가능한 위치 목록
  const getAvailableLocations = () => {
    return ['A동', 'B동']
  }

  // 대량 설비 생성 (개발용) - 실제로는 API 호출하지 않음
  const generateEquipments = async (count: number = 800) => {
    // 실제 구현에서는 서버에서 대량 생성하거나 배치로 생성해야 함
    console.log(`${count}대의 설비 생성은 서버에서 처리되어야 합니다.`)
    return []
  }

  return {
    equipments,
    loading,
    error: error?.message || null,
    refetch,
    createEquipment: createMutation.mutate,
    updateEquipment: updateMutation.mutate,
    deleteEquipment: deleteMutation.mutate,
    getFilteredEquipments,
    getEquipmentStats,
    getAvailableModels,
    getAvailableProcesses,
    getAvailableLocations,
    generateEquipments,
    // Mutation 상태들
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

// 설비 상태 변경 Hook
export const useEquipmentStatus = () => {
  const { updateEquipment } = useEquipment()

  const changeStatus = (id: string, status: string) => {
    updateEquipment({ id, status })
  }

  const changeModel = (id: string, current_model: string, process?: string) => {
    updateEquipment({ id, current_model, ...(process && { process }) })
  }

  const resetToolPositions = (id: string) => {
    updateEquipment({ id, tool_positions: { used: 0, total: 21 } })
  }

  const updateToolPositions = (id: string, used: number) => {
    updateEquipment({ id, tool_positions: { used, total: 21 } })
  }

  return {
    changeStatus,
    changeModel,
    resetToolPositions,
    updateToolPositions
  }
}

// 설비 검색 Hook
export const useEquipmentSearch = () => {
  const { equipments } = useEquipment()

  const searchByNumber = (equipmentNumber: string) => {
    return equipments.find(eq => 
      eq.equipment_number.toString().includes(equipmentNumber)
    )
  }

    const searchByModel = (model: string) => {
    return equipments.filter(eq =>
      eq.model_code?.toLowerCase().includes(model.toLowerCase())
    )
  }

    const searchByProcess = (process: string) => {
    // TODO: 프로세스 검색은 별도 테이블 조인 필요
    return equipments.filter(eq => true) // 임시로 모든 설비 반환
  }

  return {
    searchByNumber,
    searchByModel,
    searchByProcess
  }
} 