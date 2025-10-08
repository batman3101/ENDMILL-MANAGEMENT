'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { clientSupabaseService } from '../services/supabaseService'
import { Database } from '../types/database'
import { clientLogger } from '../utils/logger'

// Database 타입에서 가져오기
type CAMSheet = Database['public']['Tables']['cam_sheets']['Row'] & {
  cam_sheet_endmills?: Database['public']['Tables']['cam_sheet_endmills']['Row'][]
  endmills?: Database['public']['Tables']['cam_sheet_endmills']['Row'][] // API에서 반환하는 구조 지원
}

// 타입 export
export type { CAMSheet }

export interface EndmillInfo {
  t_number: number
  endmill_code: string | null
  endmill_name: string | null
  specifications: string | null
  tool_life: number | null
  endmill_type_id?: string | null
  cam_sheet_id?: string | null
  id?: string
  created_at?: string | null
}

// CAM Sheet 검색을 위한 필터 타입
export interface CAMSheetFilter {
  model?: string
  process?: string
  tNumber?: number
}

// 앤드밀 자동 완성을 위한 검색 결과 타입
export interface EndmillSearchResult {
  camSheetId: string
  model: string
  process: string
  endmill: EndmillInfo
}

export const useCAMSheets = (filter?: CAMSheetFilter) => {
  const queryClient = useQueryClient()

  // CAM Sheet 데이터 조회
  const {
    data: camSheets = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['cam-sheets', filter],
    queryFn: async () => {
      const response = await fetch('/api/cam-sheets?' + new URLSearchParams({
        ...(filter?.model && { model: filter.model }),
        ...(filter?.process && { process: filter.process })
      }))
      
      if (!response.ok) {
        throw new Error('CAM Sheet 데이터를 불러오는데 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'CAM Sheet 데이터를 불러오는데 실패했습니다.')
      }

      clientLogger.log('CAM Sheet API 응답 데이터:', result.data)

      // 데이터 정규화: endmills 필드를 cam_sheet_endmills로 매핑
      const normalizedData = result.data.map((sheet: any) => ({
        ...sheet,
        cam_sheet_endmills: sheet.endmills || sheet.cam_sheet_endmills || []
      }))

      clientLogger.log('정규화된 CAM Sheet 데이터:', normalizedData)

      return normalizedData as CAMSheet[]
    }
  })

  // 실시간 구독 설정
  useEffect(() => {
    const subscription = clientSupabaseService.camSheet.subscribeToChanges((payload) => {
      clientLogger.log('CAM Sheets 실시간 업데이트:', payload)

      // React Query 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [queryClient])

  // CAM Sheet 생성 Mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      model: string
      process: string
      cam_version: string
      version_date: string
      endmills: EndmillInfo[]
    }) => {
      const response = await fetch('/api/cam-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('CAM Sheet 생성에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'CAM Sheet 생성에 실패했습니다.')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    }
  })

  // CAM Sheet 일괄 생성 Mutation (엑셀 업로드용)
  const createBatchMutation = useMutation({
    mutationFn: async (data: {
      batch: true
      data: {
        model: string
        process: string
        cam_version: string
        version_date: string
        endmills: EndmillInfo[]
      }[]
    }) => {
      const response = await fetch('/api/cam-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('CAM Sheet 일괄 생성에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'CAM Sheet 일괄 생성에 실패했습니다.')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    }
  })

  // CAM Sheet 업데이트 Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      model: string
      process: string
      cam_version: string
      version_date: string
      endmills: EndmillInfo[]
    }>) => {
      const response = await fetch('/api/cam-sheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })
      
      if (!response.ok) {
        throw new Error('CAM Sheet 업데이트에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'CAM Sheet 업데이트에 실패했습니다.')
      }
      
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    }
  })

  // CAM Sheet 삭제 Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cam-sheets?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('CAM Sheet 삭제에 실패했습니다.')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'CAM Sheet 삭제에 실패했습니다.')
      }
      
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    }
  })

  // 필터링된 CAM Sheet 조회
  const getFilteredCAMSheets = (additionalFilter: CAMSheetFilter = {}) => {
    return camSheets.filter(sheet => {
      if (additionalFilter.model && sheet.model !== additionalFilter.model) return false
      if (additionalFilter.process && sheet.process !== additionalFilter.process) return false
      if (additionalFilter.tNumber && 
          !sheet.cam_sheet_endmills?.some(e => e.t_number === additionalFilter.tNumber)) return false
      return true
    })
  }

  // 사용 가능한 모델 목록 - CAM Sheet에서 실제 등록된 모델들 추출
  const getAvailableModels = useMemo(() => {
    if (!camSheets || camSheets.length === 0) {
      return ['PA1', 'PA2', 'PS', 'B7', 'Q7'] // 기본값
    }

    const uniqueModels = Array.from(new Set(camSheets.map(sheet => sheet.model)))
      .filter(model => model && model.trim())
      .sort()

    return uniqueModels.length > 0 ? uniqueModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  }, [camSheets])

  // 사용 가능한 공정 목록 - CAM Sheet에서 실제 등록된 공정들 추출
  const getAvailableProcesses = useMemo(() => {
    if (!camSheets || camSheets.length === 0) {
      return ['CNC1', 'CNC2', 'CNC2-1'] // 기본값
    }

    const uniqueProcesses = Array.from(new Set(camSheets.map(sheet => sheet.process)))
      .filter(process => process && process.trim())
      .sort()

    return uniqueProcesses.length > 0 ? uniqueProcesses : ['CNC1', 'CNC2', 'CNC2-1']
  }, [camSheets])

  return {
    camSheets,
    loading,
    error: error?.message || null,
    refetch,
    createCAMSheet: createMutation.mutate,
    createCAMSheetsBatch: createBatchMutation.mutate,
    updateCAMSheet: updateMutation.mutate,
    deleteCAMSheet: deleteMutation.mutate,
    getFilteredCAMSheets,
    getAvailableModels,
    getAvailableProcesses,
    // Mutation 상태들
    isCreating: createMutation.isPending,
    isCreatingBatch: createBatchMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

// 앤드밀 검색 Hook
export const useEndmillSearch = () => {
  const { camSheets } = useCAMSheets()

  // 모델과 공정으로 앤드밀 검색
  const searchEndmillsByModelAndProcess = (model: string, process: string): EndmillSearchResult[] => {
    const results: EndmillSearchResult[] = []
    
    camSheets
      .filter(sheet => sheet.model === model && sheet.process === process)
      .forEach(sheet => {
        sheet.cam_sheet_endmills?.forEach(endmill => {
          results.push({
            camSheetId: sheet.id,
            model: sheet.model,
            process: sheet.process,
            endmill: {
              t_number: endmill.t_number,
              endmill_code: endmill.endmill_code || '',
              endmill_name: endmill.endmill_name || '',
              specifications: endmill.specifications || '',
              tool_life: endmill.tool_life || 0
            }
          })
        })
      })
    
    return results.sort((a, b) => a.endmill.t_number - b.endmill.t_number)
  }

  // T번호로 앤드밀 검색
  const searchEndmillByTNumber = (model: string, process: string, tNumber: number): EndmillSearchResult | null => {
    const sheet = camSheets.find(s => s.model === model && s.process === process)
    if (!sheet) return null
    
    const endmill = sheet.cam_sheet_endmills?.find(e => e.t_number === tNumber)
    if (!endmill) return null
    
    return {
      camSheetId: sheet.id,
      model: sheet.model,
      process: sheet.process,
      endmill: {
        t_number: endmill.t_number,
        endmill_code: endmill.endmill_code || '',
        endmill_name: endmill.endmill_name || '',
        specifications: endmill.specifications || '',
        tool_life: endmill.tool_life || 0
      }
    }
  }

  // 앤드밀 코드로 검색
  const searchEndmillByCode = (endmillCode: string): EndmillSearchResult[] => {
    const results: EndmillSearchResult[] = []
    
    camSheets.forEach(sheet => {
      sheet.cam_sheet_endmills
        ?.filter(endmill => endmill.endmill_code?.toLowerCase().includes(endmillCode.toLowerCase()))
        .forEach(endmill => {
          results.push({
            camSheetId: sheet.id,
            model: sheet.model,
            process: sheet.process,
            endmill: {
              t_number: endmill.t_number,
              endmill_code: endmill.endmill_code || '',
              endmill_name: endmill.endmill_name || '',
              specifications: endmill.specifications || '',
              tool_life: endmill.tool_life || 0
            }
          })
        })
    })
    
    return results.sort((a, b) => a.endmill.t_number - b.endmill.t_number)
  }

  // 앤드밀 제안 검색 (자동완성용)
  const getEndmillSuggestions = (query: string, limit: number = 10): EndmillSearchResult[] => {
    const results: EndmillSearchResult[] = []
    const queryLower = query.toLowerCase()
    
    camSheets.forEach(sheet => {
      sheet.cam_sheet_endmills?.forEach(endmill => {
        if (
          endmill.endmill_code?.toLowerCase().includes(queryLower) ||
          endmill.endmill_name?.toLowerCase().includes(queryLower) ||
          endmill.specifications?.toLowerCase().includes(queryLower)
        ) {
          results.push({
            camSheetId: sheet.id,
            model: sheet.model,
            process: sheet.process,
            endmill: {
              t_number: endmill.t_number,
              endmill_code: endmill.endmill_code || '',
              endmill_name: endmill.endmill_name || '',
              specifications: endmill.specifications || '',
              tool_life: endmill.tool_life || 0
            }
          })
        }
      })
    })
    
    return results.slice(0, limit)
  }

  return {
    searchEndmillsByModelAndProcess,
    searchEndmillByTNumber,
    searchEndmillByCode,
    getEndmillSuggestions
  }
}

// 교체 실적 자동완성 Hook
export const useToolChangeAutoComplete = () => {
  const { searchEndmillByTNumber, getEndmillSuggestions } = useEndmillSearch()

  // 모델, 공정, T번호로 앤드밀 정보 자동 입력
  const autoFillEndmillInfo = (model: string, process: string, tNumber: number) => {
    const result = searchEndmillByTNumber(model, process, tNumber)
    if (result) {
      return {
        endmillCode: result.endmill.endmill_code,
        endmillName: result.endmill.endmill_name,
        specifications: result.endmill.specifications,
        toolLife: result.endmill.tool_life
      }
    }
    return null
  }

  // 앤드밀 코드 자동완성 제안
  const getAutoCompleteSuggestions = (query: string) => {
    return getEndmillSuggestions(query, 5).map(result => ({
      code: result.endmill.endmill_code,
      name: result.endmill.endmill_name,
      specifications: result.endmill.specifications,
      model: result.model,
      process: result.process,
      tNumber: result.endmill.t_number
    }))
  }

  return {
    autoFillEndmillInfo,
    getAutoCompleteSuggestions
  }
}