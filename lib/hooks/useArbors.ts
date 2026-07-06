'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useFactory } from './useFactory'
import { useSettings } from './useSettings'
import { Arbor, ArborInspection, ArborListParams } from '../types/arbor'

interface ArborListResponse {
  success: boolean
  data: Arbor[]
  pagination: { page: number; pageSize: number; total: number }
}

export function useArbors(params: ArborListParams) {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  return useQuery<ArborListResponse>({
    queryKey: ['arbors', factoryId, params],
    enabled: !!factoryId, // factoryId 확정 전 fetch 차단 (fail-closed, 버그 감사 #2 교훈)
    placeholderData: keepPreviousData, // 페이지 전환 시 깜빡임 제거
    queryFn: async () => {
      const sp = new URLSearchParams({
        factoryId: factoryId!,
        page: String(params.page),
        pageSize: String(params.pageSize)
      })
      if (params.grade) sp.set('grade', params.grade)
      if (params.status) sp.set('status', params.status)
      if (params.search) sp.set('search', params.search)
      if (params.sortBy) sp.set('sortBy', params.sortBy)
      if (params.sortDir) sp.set('sortDir', params.sortDir)
      const res = await fetch(`/api/arbors?${sp.toString()}`)
      if (!res.ok) throw new Error('Arbor 목록 조회 실패')
      return res.json()
    }
  })
}

export function useArborDetail(id: string | null) {
  return useQuery<{ success: boolean; data: Arbor }>({
    queryKey: ['arbor', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/arbors/${id}`)
      if (!res.ok) throw new Error('Arbor 조회 실패')
      return res.json()
    }
  })
}

export function useArborInspections(id: string | null) {
  return useQuery<{ success: boolean; data: (ArborInspection & { inspected_by_profile: { name: string } | null })[] }>({
    queryKey: ['arbor-inspections', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/arbors/${id}/inspections`)
      if (!res.ok) throw new Error('검사 이력 조회 실패')
      return res.json()
    }
  })
}

export interface ArborStats {
  total: number; gradeA: number; gradeB: number; gradeC: number; gradeD: number
  uninspected: number; repair: number; disposed: number; overdue: number
}

export function useArborStats() {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  const { settings } = useSettings()
  // settings.arbor는 저장 전(app_settings에 arbor 행 없음)엔 API 응답에 없어 undefined일 수 있음 → 기본값 폴백
  const intervalDays = settings.arbor?.inspectionIntervalDays ?? 180
  return useQuery<{ success: boolean; data: ArborStats }>({
    queryKey: ['arbor-stats', factoryId, intervalDays],
    enabled: !!factoryId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/arbors/stats?factoryId=${factoryId}&intervalDays=${intervalDays}`)
      if (!res.ok) throw new Error('통계 조회 실패')
      return res.json()
    }
  })
}
