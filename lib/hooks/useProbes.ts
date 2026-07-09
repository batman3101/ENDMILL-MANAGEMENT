'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useFactory } from './useFactory'
import { useSettings } from './useSettings'
import {
  Probe, ProbeInspection, ProbeRepair, ProbeMovement, ProbeListParams, DEFAULT_INSPECTION_INTERVAL_DAYS
} from '../types/probe'

interface ProbeListResponse {
  success: boolean
  data: Probe[]
  pagination: { page: number; pageSize: number; total: number }
}

export function useProbes(params: ProbeListParams) {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  return useQuery<ProbeListResponse>({
    queryKey: ['probes', factoryId, params],
    enabled: !!factoryId, // factoryId 확정 전 fetch 차단 (fail-closed, Arbor와 동일 정책)
    placeholderData: keepPreviousData, // 페이지 전환 시 깜빡임 제거
    queryFn: async () => {
      const sp = new URLSearchParams({
        factoryId: factoryId!,
        page: String(params.page),
        pageSize: String(params.pageSize)
      })
      if (params.result) sp.set('result', params.result)
      if (params.status) sp.set('status', params.status)
      if (params.model) sp.set('model', params.model)
      if (params.equipmentId) sp.set('equipmentId', params.equipmentId)
      if (params.search) sp.set('search', params.search)
      if (params.sortBy) sp.set('sortBy', params.sortBy)
      if (params.sortDir) sp.set('sortDir', params.sortDir)
      const res = await fetch(`/api/probes?${sp.toString()}`)
      if (!res.ok) throw new Error('프로브 목록 조회 실패')
      return res.json()
    }
  })
}

export function useProbeDetail(id: string | null) {
  return useQuery<{ success: boolean; data: Probe }>({
    queryKey: ['probe', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/probes/${id}`)
      if (!res.ok) throw new Error('프로브 조회 실패')
      return res.json()
    }
  })
}

export function useProbeInspections(id: string | null) {
  return useQuery<{
    success: boolean
    data: (ProbeInspection & { inspected_by_profile: { name: string } | null })[]
  }>({
    queryKey: ['probe-inspections', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/probes/${id}/inspections`)
      if (!res.ok) throw new Error('검사 이력 조회 실패')
      return res.json()
    }
  })
}

export function useProbeRepairs(id: string | null) {
  return useQuery<{ success: boolean; data: ProbeRepair[] }>({
    queryKey: ['probe-repairs', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/probes/${id}/repairs`)
      if (!res.ok) throw new Error('수리 이력 조회 실패')
      return res.json()
    }
  })
}

export function useProbeMovements(id: string | null) {
  return useQuery<{
    success: boolean
    data: (ProbeMovement & { moved_by_profile: { name: string } | null })[]
  }>({
    queryKey: ['probe-movements', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/probes/${id}/move`)
      if (!res.ok) throw new Error('이동 이력 조회 실패')
      return res.json()
    }
  })
}

// 판정은 OK/NG 2단계 (등급제 폐지)
export interface ProbeStats {
  total: number
  ok: number
  ng: number
  uninspected: number
  inUse: number
  spare: number
  inRepair: number
  disposed: number
  lost: number
  overdue: number
}

export function useProbeStats() {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  const { settings } = useSettings()
  // settings.probe는 저장 전(app_settings에 probe 행 없음)엔 API 응답에 없어 undefined일 수 있음 → 기본값 폴백
  const intervalDays = settings.probe?.inspectionIntervalDays ?? DEFAULT_INSPECTION_INTERVAL_DAYS
  return useQuery<{ success: boolean; data: ProbeStats }>({
    queryKey: ['probe-stats', factoryId, intervalDays],
    enabled: !!factoryId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/probes/stats?factoryId=${factoryId}&intervalDays=${intervalDays}`)
      if (!res.ok) throw new Error('통계 조회 실패')
      return res.json()
    }
  })
}
