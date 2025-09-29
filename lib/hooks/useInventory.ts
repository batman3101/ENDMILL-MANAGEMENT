'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { clientSupabaseService } from '../services/supabaseService'
import { Database } from '../types/database'

// Database 타입에서 가져오기
type Inventory = Database['public']['Tables']['inventory']['Row'] & {
  endmill_type?: Database['public']['Tables']['endmill_types']['Row'] & {
    endmill_categories?: Database['public']['Tables']['endmill_categories']['Row']
  }
}

type EndmillType = Database['public']['Tables']['endmill_types']['Row'] & {
  endmill_categories?: Database['public']['Tables']['endmill_categories']['Row']
}

// 타입 export
export type { Inventory, EndmillType }

export interface InventoryFilter {
  status?: string
  category?: string
  lowStock?: boolean
}

export interface InventoryStats {
  totalItems: number
  totalValue: number
  criticalItems: number
  lowStockItems: number
  sufficientItems: number
  averageValue: number
  categoryStats: Record<string, { count: number; value: number }>
}

// 재고 상태 계산
const calculateStockStatus = (current: number, min: number, max: number): 'sufficient' | 'low' | 'critical' => {
  if (current <= min) return 'critical'
  if (current <= min * 1.5) return 'low'
  return 'sufficient'
}

export const useInventory = (filter?: InventoryFilter) => {
  const queryClient = useQueryClient()

  // 재고 데이터 조회
  const {
    data: inventory = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inventory', filter],
    queryFn: async () => {
      const response = await fetch('/api/inventory?' + new URLSearchParams({
        ...(filter?.status && { status: filter.status }),
        ...(filter?.category && { category: filter.category }),
        ...(filter?.lowStock && { lowStock: 'true' })
      }))
      
      if (!response.ok) {
        throw new Error('재고 데이터를 불러오는데 실패했습니다.')
      }
      
      const result = await response.json()

      // API 응답이 { data: [], count: number, stats: {} } 형태인 경우와
      // { success: true, data: [] } 형태인 경우 모두 처리
      if (result.success === false) {
        throw new Error(result.error || '재고 데이터를 불러오는데 실패했습니다.')
      }

      return (result.data || result) as Inventory[]
    }
  })

  // 앤드밀 타입 데이터 조회
  const {
    data: endmillTypes = [],
    isLoading: endmillTypesLoading
  } = useQuery({
    queryKey: ['endmill-types'],
    queryFn: async () => {
      const endmillTypesData = await clientSupabaseService.endmillType.getAll()
      return endmillTypesData as EndmillType[]
    }
  })

  // 실시간 구독 설정
  useEffect(() => {
    const subscription = clientSupabaseService.inventory.subscribeToChanges((payload) => {
      console.log('Inventory 실시간 업데이트:', payload)
      
      // React Query 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [queryClient])

  // 재고 생성 Mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      endmill_type_id: string
      current_stock: number
      min_stock: number
      max_stock: number
      location?: string
      suppliers?: any[]
    }) => {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('재고 생성에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '재고 생성에 실패했습니다.')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })

  // 재고 업데이트 Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      current_stock: number
      min_stock: number
      max_stock: number
      location: string
      suppliers: any[]
    }>) => {
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })
      
      if (!response.ok) {
        throw new Error('재고 업데이트에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '재고 업데이트에 실패했습니다.')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })

  // 재고 삭제 Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/inventory?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('재고 삭제에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '재고 삭제에 실패했습니다.')
      }
      
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })

  // 필터링된 재고 조회
  const getFilteredInventory = (additionalFilter: InventoryFilter = {}): Inventory[] => {
    let filtered = inventory

    if (additionalFilter.status) {
      filtered = filtered.filter(item => {
        const status = calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0)
        return status === additionalFilter.status
      })
    }

    if (additionalFilter.category && additionalFilter.category !== '') {
      filtered = filtered.filter(item => 
        item.endmill_types?.endmill_categories?.code === additionalFilter.category
      )
    }

    if (additionalFilter.lowStock) {
      filtered = filtered.filter(item => {
        const status = calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0)
        return status === 'low' || status === 'critical'
      })
    }

    return filtered
  }

  // 재고 통계 계산
  const getInventoryStats = (filtered?: Inventory[]): InventoryStats => {
    const data = filtered || inventory
    
    const totalItems = data.length
    const totalValue = data.reduce((sum, item) => 
      sum + ((item.current_stock || 0) * (item.endmill_types?.unit_cost || 0)), 0)
    
    const statusCounts = data.reduce((acc, item) => {
      const status = calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const criticalItems = statusCounts.critical || 0
    const lowStockItems = statusCounts.low || 0
    const sufficientItems = statusCounts.sufficient || 0
    
    // 카테고리별 통계
    const categoryStats = data.reduce((acc: Record<string, { count: number; value: number }>, item) => {
      const category = item.endmill_types?.endmill_categories?.code
      if (category) {
        if (!acc[category]) {
          acc[category] = { count: 0, value: 0 }
        }
        acc[category].count += (item.current_stock || 0)
        acc[category].value += (item.current_stock || 0) * (item.endmill_types?.unit_cost || 0)
      }
      return acc
    }, {})

    return {
      totalItems,
      totalValue,
      criticalItems,
      lowStockItems,
      sufficientItems,
      averageValue: totalItems > 0 ? totalValue / totalItems : 0,
      categoryStats
    }
  }

  // 사용 가능한 카테고리 목록
  const getAvailableCategories = () => {
    return Array.from(new Set(endmillTypes.map(e => e.endmill_categories?.code).filter(Boolean))).sort()
  }

  // 앤드밀 타입 데이터 조회 (호환성을 위해)
  const getEndmillMasterData = () => {
    return endmillTypes.map(type => ({
      code: type.code,
      name: type.name || '',
      category: type.endmill_categories?.code || '',
      specifications: type.specifications ? JSON.stringify(type.specifications) : '',
      unitPrice: type.unit_cost || 0
    }))
  }

  return {
    inventory,
    endmillTypes,
    loading: loading || endmillTypesLoading,
    error: error?.message || null,
    refetch,
    createInventory: createMutation.mutate,
    updateInventory: updateMutation.mutate,
    deleteInventory: deleteMutation.mutate,
    getFilteredInventory,
    getInventoryStats,
    getAvailableCategories,
    getEndmillMasterData,
    // Mutation 상태들
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

export const useInventoryAlerts = () => {
  const { inventory } = useInventory()

  const getCriticalItems = () => {
    return inventory.filter(item => 
      calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0) === 'critical'
    )
  }

  const getLowStockItems = () => {
    return inventory.filter(item => 
      calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0) === 'low'
    )
  }

  const getAlertCount = () => {
    const critical = getCriticalItems().length
    const low = getLowStockItems().length
    return {
      critical,
      low,
      total: critical + low
    }
  }

  return {
    getCriticalItems,
    getLowStockItems,
    getAlertCount
  }
}

export const useInventorySearch = () => {
  const { inventory, endmillTypes } = useInventory()

  const searchByCode = (code: string) => {
    return inventory.filter(item => 
      item.endmill_types?.code.toLowerCase().includes(code.toLowerCase())
    )
  }

  const searchByName = (name: string) => {
    return inventory.filter(item => 
      item.endmill_types?.name?.toLowerCase().includes(name.toLowerCase())
    )
  }

  const searchByCategory = (category: string) => {
    return inventory.filter(item => 
      item.endmill_types?.endmill_categories?.code === category
    )
  }

  return {
    searchByCode,
    searchByName,
    searchByCategory
  }
}