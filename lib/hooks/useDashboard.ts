import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useFactory } from '@/lib/hooks/useFactory'

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
  topBrokenEndmills?: Array<{
    code: string
    count: number
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

const fetchDashboardData = async (factoryId?: string): Promise<DashboardData> => {
  // 타임스탬프를 추가하여 브라우저 캐시 무효화
  const timestamp = Date.now()
  const params = new URLSearchParams({ t: String(timestamp) })
  if (factoryId) params.set('factoryId', factoryId)
  const response = await fetch(`/api/dashboard?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()

  if (result.error) {
    throw new Error(result.error)
  }

  return result
}

export const useDashboard = (refreshInterval: number = 30000): UseDashboardReturn => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  // React Query로 대시보드 데이터 관리
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<DashboardData>({
    queryKey: ['dashboard', factoryId],
    queryFn: () => fetchDashboardData(factoryId || undefined),
    enabled: !!factoryId,
    refetchInterval: refreshInterval, // 주기적 새로고침
    refetchIntervalInBackground: false, // 백그라운드에서는 새로고침 안 함
    staleTime: 0, // 항상 stale 상태
    gcTime: 1000 * 60, // 1분 동안 캐시 유지
    retry: 1
  })

  const refreshData = useCallback(async () => {
    await refetch()
  }, [refetch])

  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  return {
    data: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
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