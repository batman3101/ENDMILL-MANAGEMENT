import { useState, useEffect, useCallback } from 'react'

// 대시보드 데이터 타입 정의
export interface DashboardData {
  equipment: {
    total: number
    active: number
    maintenance: number
    setup: number
    operatingRate: number
    toolLifeEfficiency: number
  }
  endmillUsage: {
    total: number
    normalLife: number
    broken: number
    premature: number
    brokenRate: number
  }
  inventory: {
    total: number
    sufficient: number
    low: number
    critical: number
  }
  toolChanges: {
    today: number
    yesterday: number
    difference: number
    trend: string
    target: number
  }
  qualityMetrics: {
    achievementRate: number
    target: number
    trend: string
    status: string
  }
  costAnalysis: {
    currentMonth: number
    lastMonth: number
    savings: number
    savingsPercent: number
    trend: string
  }
  frequencyAnalysis: Array<{
    series: string
    count: number
    avgInterval: number
  }>
  lifespanAnalysis: Array<{
    category: string
    avgLife: number
    variance: number
  }>
  modelCostAnalysis: Array<{
    series: string
    cost: number
    percentage: number
  }>
  recentAlerts?: Array<{
    type: string
    equipmentNumber?: string
    tNumber?: number
    actualLife?: number
    standardLife?: number
    endmillCode?: string
    endmillName?: string
    currentStock?: number
    minStock?: number
    recentCount?: number
    increase?: number
    minutesAgo: number
    color: string
    severity: string
  }>
  endmillByEquipmentCount?: Array<{
    endmillCode: string
    endmillName: string
    equipmentCount: number
    totalPositions: number
  }>
  modelEndmillUsage?: Array<{
    model: string
    equipmentCount: number
    endmillCount: number
    avgEndmillPerEquipment: number
  }>
  equipmentLifeConsumption?: Array<{
    equipmentNumber: number
    model: string
    totalLife: number
    consumedLife: number
    remainingLife: number
    consumptionRate: number
    toolCount: number
  }>
  lastUpdated: string
  dataSource: string
}

interface UseDashboardReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  lastRefresh: Date | null
}

export const useDashboard = (refreshInterval: number = 30000): UseDashboardReturn => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store' // 실시간 데이터를 위해 캐시 비활성화
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      setData(result)
      setLastRefresh(new Date())
      
    } catch (err) {
      console.error('대시보드 데이터 조회 오류:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    await fetchDashboardData()
  }, [fetchDashboardData])

  // 초기 데이터 로드
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // 주기적 데이터 업데이트 (페이지가 보일 때만)
  useEffect(() => {
    if (refreshInterval <= 0) return

    let interval: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (interval) clearInterval(interval)
      interval = setInterval(() => {
        if (!document.hidden) { // 페이지가 활성 상태일 때만 폴링
          fetchDashboardData()
        }
      }, refreshInterval)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) {
          clearInterval(interval)
          interval = null
        }
      } else {
        startPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchDashboardData, refreshInterval])

  return {
    data,
    isLoading,
    error,
    refreshData,
    lastRefresh
  }
}

// 개별 인사이트 Hook들
export const useEquipmentStats = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    stats: data?.equipment || null,
    isLoading,
    error
  }
}

export const useInventoryStats = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    stats: data?.inventory || null,
    isLoading,
    error
  }
}

export const useToolChangeStats = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    stats: data?.toolChanges || null,
    isLoading,
    error
  }
}

export const useQualityMetrics = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    metrics: data?.qualityMetrics || null,
    isLoading,
    error
  }
}

export const useCostAnalysis = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    analysis: data?.costAnalysis || null,
    isLoading,
    error
  }
}

export const useFrequencyAnalysis = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    analysis: data?.frequencyAnalysis || [],
    isLoading,
    error
  }
}

export const useLifespanAnalysis = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    analysis: data?.lifespanAnalysis || [],
    isLoading,
    error
  }
}

export const useModelCostAnalysis = () => {
  const { data, isLoading, error } = useDashboard()
  return {
    analysis: data?.modelCostAnalysis || [],
    isLoading,
    error
  }
}

// 유틸리티 함수들
export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ko-KR').format(num)
}

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'excellent': return 'text-green-600'
    case 'good': return 'text-blue-600'
    case 'warning': return 'text-yellow-600'
    case 'critical': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

export const getTrendIcon = (trend: string): string => {
  if (trend.startsWith('+')) return '▲'
  if (trend.startsWith('-')) return '▼'
  return '─'
}

export const getTrendColor = (trend: string): string => {
  if (trend.startsWith('+')) return 'text-green-600'
  if (trend.startsWith('-')) return 'text-red-600'
  return 'text-gray-600'
} 