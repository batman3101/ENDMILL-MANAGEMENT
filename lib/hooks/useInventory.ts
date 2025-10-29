'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { clientSupabaseService } from '../services/supabaseService'
import { Database } from '../types/database'
import { clientLogger } from '../utils/logger'

// Database 타입에서 가져오기
type EndmillSupplierPrice = Database['public']['Tables']['endmill_supplier_prices']['Row']

type Inventory = Database['public']['Tables']['inventory']['Row'] & {
  endmill_type?: Database['public']['Tables']['endmill_types']['Row'] & {
    endmill_categories?: Database['public']['Tables']['endmill_categories']['Row']
    endmill_supplier_prices?: EndmillSupplierPrice[]
  }
}

type EndmillType = Database['public']['Tables']['endmill_types']['Row'] & {
  endmill_categories?: Database['public']['Tables']['endmill_categories']['Row']
  endmill_supplier_prices?: EndmillSupplierPrice[]
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
const calculateStockStatus = (current: number, min: number, _max: number): 'sufficient' | 'low' | 'critical' => {
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
      clientLogger.log('Inventory 실시간 업데이트:', payload)

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
      suppliers?: Array<{
        supplier_id: string
        unit_price: number
        is_preferred?: boolean
        lead_time_days?: number
        min_order_quantity?: number
      }>
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
    onSuccess: async () => {
      // 생성 성공 시 즉시 캐시 무효화 및 refetch
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }
  })

  // 재고 업데이트 Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      current_stock: number
      min_stock: number
      max_stock: number
      location: string
      suppliers: Array<{
        supplier_id: string
        unit_price: number
        is_preferred?: boolean
        lead_time_days?: number
        min_order_quantity?: number
      }>
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
    onSuccess: async () => {
      // 업데이트 성공 시 즉시 캐시 무효화 및 refetch
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
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
    onSuccess: async () => {
      // 삭제 성공 시 즉시 캐시 무효화 및 refetch
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
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
        item.endmill_type?.endmill_categories?.code === additionalFilter.category
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
    
    // 총 재고 수량: 모든 앤드밀 코드의 current_stock 합계
    const totalItems = data.reduce((sum, item) => sum + (item.current_stock || 0), 0)
    // 총 보유 가치: 각 앤드밀의 최저 공급업체 가격 * 재고 수량의 합계
    const totalValue = data.reduce((sum, item) => {
      const currentStock = item.current_stock || 0
      if (currentStock === 0) return sum

      // 앤드밀 타입의 공급업체별 가격 정보가 있는지 확인
      const endmillType = item.endmill_type
      if (!endmillType) return sum

      let lowestPrice = endmillType.unit_cost || 0

      // 공급업체 가격이 있으면 최저가 찾기
      if (endmillType.endmill_supplier_prices && Array.isArray(endmillType.endmill_supplier_prices) && endmillType.endmill_supplier_prices.length > 0) {
        const prices = endmillType.endmill_supplier_prices
          .map((sp) => sp.unit_price)
          .filter((price): price is number => typeof price === 'number' && price > 0)
        if (prices.length > 0) {
          lowestPrice = Math.min(...prices)
        }
      }
      return sum + (currentStock * lowestPrice)
    }, 0)
    
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
      const category = item.endmill_type?.endmill_categories?.code
      if (category) {
        if (!acc[category]) {
          acc[category] = { count: 0, value: 0 }
        }
        acc[category].count += (item.current_stock || 0)
        // 카테고리별 가치도 최저가 기준으로 계산
        const currentStock = item.current_stock || 0
        let lowestPrice = item.endmill_type?.unit_cost || 0

        // 공급업체 가격이 있으면 최저가 찾기
        if (item.endmill_type?.endmill_supplier_prices && Array.isArray(item.endmill_type.endmill_supplier_prices) && item.endmill_type.endmill_supplier_prices.length > 0) {
          const prices = item.endmill_type.endmill_supplier_prices
            .map((sp) => sp.unit_price)
            .filter((price): price is number => typeof price === 'number' && price > 0)
          if (prices.length > 0) {
            lowestPrice = Math.min(...prices)
          }
        }

        acc[category].value += currentStock * lowestPrice
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
  const getAvailableCategories = (): string[] => {
    return Array.from(
      new Set(
        endmillTypes
          .map(e => e.endmill_categories?.code)
          .filter((code): code is string => Boolean(code))
      )
    ).sort()
  }

  // 앤드밀 타입 데이터 조회 (호환성을 위해)
  const getEndmillMasterData = () => {
    return endmillTypes.map(type => ({
      code: type.code,
      name: type.name || '',
      category: type.endmill_categories?.code || '',
      specifications: '', // specifications 필드는 더 이상 database에 저장되지 않음
      unitPrice: type.unit_cost || 0
    }))
  }

  return {
    inventory,
    endmillTypes,
    loading: loading || endmillTypesLoading,
    error: error?.message || null,
    refetch,
    createInventory: createMutation.mutateAsync,
    updateInventory: updateMutation.mutateAsync,
    deleteInventory: deleteMutation.mutateAsync,
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

  const getCriticalItems = (): Inventory[] => {
    return inventory.filter(item =>
      calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0) === 'critical'
    )
  }

  const getLowStockItems = (): Inventory[] => {
    return inventory.filter(item =>
      calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0) === 'low'
    )
  }

  const getAlertCount = (): { critical: number; low: number; total: number } => {
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
  const { inventory } = useInventory()

  const searchByCode = (code: string): Inventory[] => {
    return inventory.filter(item =>
      item.endmill_type?.code?.toLowerCase().includes(code.toLowerCase())
    )
  }

  const searchByName = (name: string): Inventory[] => {
    return inventory.filter(item =>
      item.endmill_type?.name?.toLowerCase().includes(name.toLowerCase())
    )
  }

  const searchByCategory = (category: string): Inventory[] => {
    return inventory.filter(item =>
      item.endmill_type?.endmill_categories?.code === category
    )
  }

  return {
    searchByCode,
    searchByName,
    searchByCategory
  }
}