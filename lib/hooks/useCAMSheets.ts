import { useState, useEffect } from 'react'

export interface EndmillInfo {
  tNumber: number
  endmillCode: string
  endmillName: string
  specifications: string
  toolLife: number
}

export interface CAMSheet {
  id: string
  model: string
  process: string
  camVersion: string
  versionDate: string
  endmills: EndmillInfo[]
  createdAt: string
  updatedAt: string
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

// 로컬 스토리지 키
const CAM_SHEETS_STORAGE_KEY = 'camSheets'

// 로컬 스토리지에서 데이터 로드
const loadCAMSheetsFromStorage = (): CAMSheet[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(CAM_SHEETS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('CAM Sheets 로드 실패:', error)
    return []
  }
}

// 로컬 스토리지에 데이터 저장
const saveCAMSheetsToStorage = (camSheets: CAMSheet[]) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CAM_SHEETS_STORAGE_KEY, JSON.stringify(camSheets))
  } catch (error) {
    console.error('CAM Sheets 저장 실패:', error)
  }
}

export const useCAMSheets = () => {
  const [camSheets, setCamSheets] = useState<CAMSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 데이터 로드
  useEffect(() => {
    setLoading(true)
    try {
      const sheets = loadCAMSheetsFromStorage()
      setCamSheets(sheets)
    } catch (err) {
      setError('CAM Sheets 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  // CAM Sheet 생성
  const createCAMSheet = (data: Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSheet: CAMSheet = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedSheets = [...camSheets, newSheet]
    setCamSheets(updatedSheets)
    saveCAMSheetsToStorage(updatedSheets)
    
    return newSheet
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

  return {
    camSheets,
    loading,
    error,
    createCAMSheet,
    updateCAMSheet,
    deleteCAMSheet,
    getFilteredCAMSheets
  }
}

// 앤드밀 자동 완성을 위한 검색 훅
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

  // 자동 완성 제안
  const getEndmillSuggestions = (query: string, limit: number = 10): EndmillSearchResult[] => {
    if (!query || query.length < 2) return []

    const results: EndmillSearchResult[] = []
    
    camSheets.forEach(sheet => {
      sheet.endmills.forEach(endmill => {
        const matches = (
          endmill.endmillCode.toLowerCase().includes(query.toLowerCase()) ||
          endmill.endmillName.toLowerCase().includes(query.toLowerCase())
        )
        
        if (matches) {
          results.push({
            camSheetId: sheet.id,
            model: sheet.model,
            process: sheet.process,
            endmill
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

// 교체 실적 입력에서 사용할 앤드밀 자동 입력 훅
export const useToolChangeAutoComplete = () => {
  const { searchEndmillByTNumber, getEndmillSuggestions } = useEndmillSearch()

  // 모델, 공정, T번호로 앤드밀 정보 자동 입력
  const autoFillEndmillInfo = (model: string, process: string, tNumber: number) => {
    if (!model || !process || !tNumber) return null

    const result = searchEndmillByTNumber(model, process, tNumber)
    
    if (result) {
      return {
        endmillCode: result.endmill.endmillCode,
        endmillName: result.endmill.endmillName,
        suggestedToolLife: result.endmill.toolLife
      }
    }
    
    return null
  }

  // 앤드밀 코드 입력 시 자동 완성 제안
  const getAutoCompleteSuggestions = (query: string) => {
    return getEndmillSuggestions(query)
  }

  return {
    autoFillEndmillInfo,
    getAutoCompleteSuggestions
  }
} 