'use client'

import { useState, useEffect } from 'react'
import { FileDataManager, Inventory, EndmillMaster } from '../data/fileDataManager'

// FileDataManager에서 타입들을 가져옴
export { Inventory, EndmillMaster } from '../data/fileDataManager'

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

export interface EnrichedInventory extends Inventory {
  endmill?: {
    name: string
    category: string
    specifications: string
    unitPrice: number
  }
}

// 로컬 스토리지에서 재고 데이터 로드
const loadInventoryFromStorage = (): Inventory[] => {
  try {
    return FileDataManager.getInventory()
  } catch (error) {
    console.error('재고 데이터 로드 실패:', error)
    return []
  }
}

// 로컬 스토리지에 재고 데이터 저장
const saveInventoryToStorage = (inventory: Inventory[]) => {
  try {
    FileDataManager.saveInventory(inventory)
  } catch (error) {
    console.error('재고 데이터 저장 실패:', error)
  }
}

export const useInventory = () => {
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [endmillMaster, setEndmillMaster] = useState<EndmillMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 데이터 로드
  useEffect(() => {
    try {
      const inventoryData = loadInventoryFromStorage()
      const endmillData = FileDataManager.getEndmillMaster()
      
      setInventory(inventoryData)
      setEndmillMaster(endmillData)
      setLoading(false)
    } catch (err) {
      setError('재고 데이터를 불러오는데 실패했습니다.')
      setLoading(false)
    }
  }, [])

  // 재고 상태 계산
  const calculateStockStatus = (current: number, min: number, max: number): 'sufficient' | 'low' | 'critical' => {
    if (current <= min) return 'critical'
    if (current <= min * 1.5) return 'low'
    return 'sufficient'
  }

  // 재고 생성
  const createInventory = (data: Omit<Inventory, 'id' | 'status' | 'lastUpdated'>) => {
    const status = calculateStockStatus(data.currentStock, data.minStock, data.maxStock)
    
    const newInventory: Inventory = {
      ...data,
      id: `inv-${Date.now()}`,
      status,
      lastUpdated: new Date().toISOString(),
      suppliers: data.suppliers || []
    }

    const updatedInventory = [...inventory, newInventory]
    setInventory(updatedInventory)
    saveInventoryToStorage(updatedInventory)
  }

  // 재고 업데이트
  const updateInventory = (id: string, data: Partial<Omit<Inventory, 'id' | 'lastUpdated'>>) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...data }
        // 재고 수량이 변경되면 상태 재계산
        if (data.currentStock !== undefined || data.minStock !== undefined || data.maxStock !== undefined) {
          updatedItem.status = calculateStockStatus(
            data.currentStock ?? item.currentStock,
            data.minStock ?? item.minStock,
            data.maxStock ?? item.maxStock
          )
        }
        updatedItem.lastUpdated = new Date().toISOString()
        return updatedItem
      }
      return item
    })
    setInventory(updatedInventory)
    saveInventoryToStorage(updatedInventory)
  }

  // 재고 삭제
  const deleteInventory = (id: string) => {
    const updatedInventory = inventory.filter(item => item.id !== id)
    setInventory(updatedInventory)
    saveInventoryToStorage(updatedInventory)
  }

  // 앤드밀 정보가 포함된 재고 데이터 조회
  const getEnrichedInventory = (): EnrichedInventory[] => {
    return inventory.map(item => {
      const endmill = endmillMaster.find(e => e.code === item.endmillCode)
      return {
        ...item,
        endmill: endmill ? {
          name: endmill.name,
          category: endmill.category,
          specifications: endmill.specifications,
          unitPrice: endmill.unitPrice
        } : undefined
      }
    })
  }

  // 필터링된 재고 조회
  const getFilteredInventory = (filter: InventoryFilter = {}): EnrichedInventory[] => {
    let filtered = getEnrichedInventory()

    if (filter.status) {
      filtered = filtered.filter(item => item.status === filter.status)
    }

    if (filter.category && filter.category !== '') {
      filtered = filtered.filter(item => item.endmill?.category === filter.category)
    }

    if (filter.lowStock) {
      filtered = filtered.filter(item => item.status === 'low' || item.status === 'critical')
    }

    return filtered
  }

  // 재고 통계 계산
  const getInventoryStats = (filtered?: EnrichedInventory[]): InventoryStats => {
    const data = filtered || getEnrichedInventory()
    
    const totalItems = data.length
    const totalValue = data.reduce((sum, item) => 
      sum + (item.currentStock * (item.endmill?.unitPrice || 0)), 0)
    
    const criticalItems = data.filter(item => item.status === 'critical').length
    const lowStockItems = data.filter(item => item.status === 'low').length
    const sufficientItems = data.filter(item => item.status === 'sufficient').length
    
    // 카테고리별 통계
    const categoryStats = data.reduce((acc: Record<string, { count: number; value: number }>, item) => {
      if (item.endmill?.category) {
        const category = item.endmill.category
        if (!acc[category]) {
          acc[category] = { count: 0, value: 0 }
        }
        acc[category].count += item.currentStock
        acc[category].value += item.currentStock * (item.endmill.unitPrice || 0)
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
    return [...new Set(endmillMaster.map(e => e.category))].sort()
  }

  // 앤드밀 마스터 데이터 조회
  const getEndmillMasterData = () => {
    return endmillMaster
  }

  return {
    inventory,
    endmillMaster,
    loading,
    error,
    createInventory,
    updateInventory,
    deleteInventory,
    getEnrichedInventory,
    getFilteredInventory,
    getInventoryStats,
    getAvailableCategories,
    getEndmillMasterData
  }
}

// 재고 알림 Hook
export const useInventoryAlerts = () => {
  const { getEnrichedInventory } = useInventory()

  const getCriticalItems = () => {
    return getEnrichedInventory().filter(item => item.status === 'critical')
  }

  const getLowStockItems = () => {
    return getEnrichedInventory().filter(item => item.status === 'low')
  }

  const getAlertCount = () => {
    const enriched = getEnrichedInventory()
    return {
      critical: enriched.filter(item => item.status === 'critical').length,
      low: enriched.filter(item => item.status === 'low').length
    }
  }

  return {
    getCriticalItems,
    getLowStockItems,
    getAlertCount
  }
}

// 재고 검색 Hook
export const useInventorySearch = () => {
  const { getEnrichedInventory } = useInventory()

  const searchByCode = (code: string) => {
    return getEnrichedInventory().filter(item =>
      item.endmillCode.toLowerCase().includes(code.toLowerCase())
    )
  }

  const searchByName = (name: string) => {
    return getEnrichedInventory().filter(item =>
      item.endmill?.name.toLowerCase().includes(name.toLowerCase()) ||
      item.endmill?.specifications.toLowerCase().includes(name.toLowerCase())
    )
  }

  const searchByCategory = (category: string) => {
    return getEnrichedInventory().filter(item =>
      item.endmill?.category === category
    )
  }

  return {
    searchByCode,
    searchByName,
    searchByCategory
  }
} 