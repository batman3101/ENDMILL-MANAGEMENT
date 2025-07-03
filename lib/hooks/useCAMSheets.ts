'use client'

import { useState, useEffect, useMemo } from 'react'
import { FileDataManager, type CAMSheet } from '../data/fileDataManager'

export interface EndmillInfo {
  tNumber: number
  endmillCode: string
  endmillName: string
  specifications: string
  toolLife: number
}

// CAMSheet 타입 re-export
export type { CAMSheet }

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

// 로컬 스토리지에서 CAM Sheet 데이터 로드
const loadCAMSheetsFromStorage = (): CAMSheet[] => {
  try {
    return FileDataManager.getCAMSheets()
  } catch (error) {
    console.error('CAM Sheet 데이터 로드 실패:', error)
    return []
  }
}

// 로컬 스토리지에 CAM Sheet 데이터 저장
const saveCAMSheetsToStorage = (camSheets: CAMSheet[]) => {
  try {
    FileDataManager.saveCAMSheets(camSheets)
  } catch (error) {
    console.error('CAM Sheet 데이터 저장 실패:', error)
  }
}

export const useCAMSheets = () => {
  const [camSheets, setCamSheets] = useState<CAMSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 데이터 로드
  useEffect(() => {
    try {
      const data = loadCAMSheetsFromStorage()
      setCamSheets(data)
      setLoading(false)
    } catch (err) {
      setError('CAM Sheet 데이터를 불러오는데 실패했습니다.')
      setLoading(false)
    }
  }, [])

  // 새 CAM Sheet 생성
  const createCAMSheet = (data: Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCAMSheet: CAMSheet = {
      ...data,
      id: `cam-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedSheets = [...camSheets, newCAMSheet]
    setCamSheets(updatedSheets)
    saveCAMSheetsToStorage(updatedSheets)
  }

  // CAM Sheet 업데이트
  const updateCAMSheet = (id: string, data: Partial<Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedSheets = camSheets.map(sheet => 
      sheet.id === id 
        ? { ...sheet, ...data, updatedAt: new Date().toISOString() }
        : sheet
    )
    setCamSheets(updatedSheets)
    saveCAMSheetsToStorage(updatedSheets)
  }

  // CAM Sheet 삭제
  const deleteCAMSheet = (id: string) => {
    const updatedSheets = camSheets.filter(sheet => sheet.id !== id)
    setCamSheets(updatedSheets)
    saveCAMSheetsToStorage(updatedSheets)
  }

  // 필터링된 CAM Sheet 조회
  const getFilteredCAMSheets = (filter: CAMSheetFilter = {}) => {
    return camSheets.filter(sheet => {
      if (filter.model && sheet.model !== filter.model) return false
      if (filter.process && sheet.process !== filter.process) return false
      if (filter.tNumber && !sheet.endmills.some(e => e.tNumber === filter.tNumber)) return false
      return true
    })
  }

  // 사용 가능한 모델 목록 - 메모이제이션
  const getAvailableModels = useMemo(() => {
    return FileDataManager.getModels()
  }, [camSheets])

  // 사용 가능한 공정 목록 - 메모이제이션
  const getAvailableProcesses = useMemo(() => {
    return FileDataManager.getProcesses()
  }, [camSheets])

  return {
    camSheets,
    loading,
    error,
    createCAMSheet,
    updateCAMSheet,
    deleteCAMSheet,
    getFilteredCAMSheets,
    getAvailableModels,
    getAvailableProcesses
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
        sheet.endmills.forEach(endmill => {
          results.push({
            camSheetId: sheet.id,
            model: sheet.model,
            process: sheet.process,
            endmill
          })
        })
      })
    
    return results.sort((a, b) => a.endmill.tNumber - b.endmill.tNumber)
  }

  // T번호로 앤드밀 검색
  const searchEndmillByTNumber = (model: string, process: string, tNumber: number): EndmillSearchResult | null => {
    const sheet = camSheets.find(s => s.model === model && s.process === process)
    if (!sheet) return null
    
    const endmill = sheet.endmills.find(e => e.tNumber === tNumber)
    if (!endmill) return null
    
    return {
      camSheetId: sheet.id,
      model: sheet.model,
      process: sheet.process,
      endmill
    }
  }

  // 앤드밀 코드로 검색
  const searchEndmillByCode = (endmillCode: string): EndmillSearchResult[] => {
    const results: EndmillSearchResult[] = []
    
    camSheets.forEach(sheet => {
      sheet.endmills
        .filter(endmill => endmill.endmillCode.toLowerCase().includes(endmillCode.toLowerCase()))
        .forEach(endmill => {
          results.push({
            camSheetId: sheet.id,
            model: sheet.model,
            process: sheet.process,
            endmill
          })
        })
    })
    
    return results
  }

  // 앤드밀 제안 (자동완성용)
  const getEndmillSuggestions = (query: string, limit: number = 10): EndmillSearchResult[] => {
    const allEndmills: EndmillSearchResult[] = []
    
    camSheets.forEach(sheet => {
      sheet.endmills.forEach(endmill => {
        allEndmills.push({
          camSheetId: sheet.id,
          model: sheet.model,
          process: sheet.process,
          endmill
        })
      })
    })
    
    const filtered = allEndmills.filter(result => 
      result.endmill.endmillCode.toLowerCase().includes(query.toLowerCase()) ||
      result.endmill.endmillName.toLowerCase().includes(query.toLowerCase()) ||
      result.endmill.specifications.toLowerCase().includes(query.toLowerCase())
    )
    
    return filtered.slice(0, limit)
  }

  return {
    searchEndmillsByModelAndProcess,
    searchEndmillByTNumber,
    searchEndmillByCode,
    getEndmillSuggestions
  }
}

// 공구 교체 자동완성 Hook
export const useToolChangeAutoComplete = () => {
  const { searchEndmillByTNumber } = useEndmillSearch()

  // 모델, 공정, T번호로 앤드밀 정보 자동 채우기
  const autoFillEndmillInfo = (model: string, process: string, tNumber: number) => {
    const result = searchEndmillByTNumber(model, process, tNumber)
    
    if (result) {
      return {
        endmillCode: result.endmill.endmillCode,
        endmillName: result.endmill.endmillName,
        toolLife: result.endmill.toolLife
      }
    }
    
    return null
  }

  // 자동완성 제안 목록
  const getAutoCompleteSuggestions = (query: string) => {
    const { getEndmillSuggestions } = useEndmillSearch()
    return getEndmillSuggestions(query, 5)
  }

  return {
    autoFillEndmillInfo,
    getAutoCompleteSuggestions
  }
} 