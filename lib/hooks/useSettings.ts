import { useState, useEffect, useCallback, useMemo } from 'react'
import { settingsManager } from '@/lib/data/settingsManager'
import { 
  SystemSettings, 
  SettingsCategory, 
  SettingsHistory,
  SettingsValidationResult 
} from '@/lib/types/settings'

// 설정 훅 반환 타입
interface UseSettingsReturn {
  // 설정 데이터
  settings: SystemSettings
  
  // 카테고리별 설정 조회
  getCategorySettings: <T extends SettingsCategory>(category: T) => SystemSettings[T]
  
  // 특정 설정값 조회
  getSetting: <T extends SettingsCategory, K extends keyof SystemSettings[T]>(
    category: T,
    key: K
  ) => SystemSettings[T][K]
  
  // 설정 업데이트
  updateSettings: (
    updates: Partial<SystemSettings>,
    changedBy?: string,
    reason?: string
  ) => Promise<void>
  
  // 카테고리별 설정 업데이트
  updateCategorySettings: <T extends SettingsCategory>(
    category: T,
    updates: Partial<SystemSettings[T]>,
    changedBy?: string,
    reason?: string
  ) => Promise<void>
  
  // 특정 설정값 업데이트
  updateSetting: <T extends SettingsCategory, K extends keyof SystemSettings[T]>(
    category: T,
    key: K,
    value: SystemSettings[T][K],
    changedBy?: string,
    reason?: string
  ) => Promise<void>
  
  // 설정 초기화
  resetSettings: (category?: SettingsCategory, changedBy?: string) => Promise<void>
  
  // 설정 가져오기/내보내기
  exportSettings: () => string
  importSettings: (jsonData: string, changedBy?: string) => Promise<void>
  
  // 유효성 검증
  validateSettings: (settingsToValidate?: SystemSettings) => SettingsValidationResult
  
  // 히스토리
  getHistory: (category?: SettingsCategory, limit?: number) => SettingsHistory[]
  clearHistory: (category?: SettingsCategory) => void
  
  // 상태
  isLoading: boolean
  error: string | null
  hasUnsavedChanges: boolean
}

// 카테고리별 설정 훅
interface UseCategorySettingsReturn<T extends SettingsCategory> {
  settings: SystemSettings[T]
  updateSettings: (
    updates: Partial<SystemSettings[T]>,
    changedBy?: string,
    reason?: string
  ) => Promise<void>
  resetSettings: (changedBy?: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

// 메인 설정 훅
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<SystemSettings>(() => settingsManager.getSettings())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 설정 변경 감지 및 업데이트
  useEffect(() => {
    const handleStorageChange = () => {
      setSettings(settingsManager.getSettings())
      setHasUnsavedChanges(false)
    }

    // localStorage 변경 감지
    window.addEventListener('storage', handleStorageChange)
    
    // 컴포넌트 마운트 시 최신 설정 로드
    handleStorageChange()

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // 카테고리별 설정 조회 - settings state를 직접 사용
  const getCategorySettings = useCallback(<T extends SettingsCategory>(category: T): SystemSettings[T] => {
    return { ...settings[category] }
  }, [settings])

  // 특정 설정값 조회 - settings state를 직접 사용
  const getSetting = useCallback(<T extends SettingsCategory, K extends keyof SystemSettings[T]>(
    category: T,
    key: K
  ): SystemSettings[T][K] => {
    return settings[category][key]
  }, [settings])

  // API 호출 헬퍼 함수
  const callSettingsAPI = useCallback(async (
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
    endpoint: string = '/api/settings',
    body?: any
  ) => {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(endpoint, options)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `API 호출 실패 (${response.status})`)
    }

    return result
  }, [])

  // 설정 업데이트 (API 연결)
  const updateSettings = useCallback(async (
    updates: Partial<SystemSettings>,
    changedBy: string = 'user',
    reason?: string
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setHasUnsavedChanges(true)

    try {
      // API 호출 시도 (실패하면 로컬 저장소 사용)
      try {
        const result = await callSettingsAPI('PUT', '/api/settings', {
          updates,
          changedBy,
          reason
        })
        setSettings(result.data)
      } catch (apiError) {
        console.warn('API 호출 실패, 로컬 저장소 사용:', apiError)
        // API 실패 시 로컬 저장소 사용
        settingsManager.updateSettings(updates, changedBy, reason)
        setSettings(settingsManager.getSettings())
      }
      
      setHasUnsavedChanges(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '설정 업데이트 실패'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callSettingsAPI])

  // 카테고리별 설정 업데이트 (API 연결)
  const updateCategorySettings = useCallback(async <T extends SettingsCategory>(
    category: T,
    updates: Partial<SystemSettings[T]>,
    changedBy: string = 'user',
    reason?: string
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setHasUnsavedChanges(true)

    try {
      // API 호출 시도 (실패하면 로컬 저장소 사용)
      try {
        const result = await callSettingsAPI('PUT', '/api/settings', {
          updates,
          category,
          changedBy,
          reason
        })
        setSettings(prev => ({ ...prev, ...result.data }))
      } catch (apiError) {
        console.warn('API 호출 실패, 로컬 저장소 사용:', apiError)
        // API 실패 시 로컬 저장소 사용
        settingsManager.updateCategorySettings(category, updates, changedBy, reason)
        setSettings(settingsManager.getSettings())
      }
      
      setHasUnsavedChanges(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '설정 업데이트 실패'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callSettingsAPI])

  // 특정 설정값 업데이트 (API 연결)
  const updateSetting = useCallback(async <T extends SettingsCategory, K extends keyof SystemSettings[T]>(
    category: T,
    key: K,
    value: SystemSettings[T][K],
    changedBy: string = 'user',
    reason?: string
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setHasUnsavedChanges(true)

    try {
      const updates = { [key]: value } as Partial<SystemSettings[T]>
      
      // API 호출 시도 (실패하면 로컬 저장소 사용)
      try {
        const result = await callSettingsAPI('PUT', '/api/settings', {
          updates,
          category,
          changedBy,
          reason
        })
        setSettings(prev => ({ ...prev, ...result.data }))
      } catch (apiError) {
        console.warn('API 호출 실패, 로컬 저장소 사용:', apiError)
        // API 실패 시 로컬 저장소 사용
        settingsManager.updateSetting(category, key, value, changedBy, reason)
        setSettings(settingsManager.getSettings())
      }
      
      setHasUnsavedChanges(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '설정 업데이트 실패'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callSettingsAPI])

  // 설정 초기화 (API 연결)
  const resetSettings = useCallback(async (
    category?: SettingsCategory,
    changedBy: string = 'user'
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // API 호출 시도 (실패하면 로컬 저장소 사용)
      try {
        const result = await callSettingsAPI('POST', '/api/settings', {
          action: 'reset',
          category,
          changedBy
        })
        setSettings(result.data)
      } catch (apiError) {
        console.warn('API 호출 실패, 로컬 저장소 사용:', apiError)
        // API 실패 시 로컬 저장소 사용
        settingsManager.resetSettings(category, changedBy)
        setSettings(settingsManager.getSettings())
      }
      
      setHasUnsavedChanges(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '설정 초기화 실패'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callSettingsAPI])

  // 설정 내보내기
  const exportSettings = useCallback((): string => {
    return settingsManager.exportSettings()
  }, [])

  // 설정 가져오기 (API 연결)
  const importSettings = useCallback(async (
    jsonData: string,
    changedBy: string = 'user'
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // API 호출 시도 (실패하면 로컬 저장소 사용)
      try {
        const result = await callSettingsAPI('POST', '/api/settings', {
          action: 'import',
          data: jsonData,
          changedBy
        })
        setSettings(result.data)
      } catch (apiError) {
        console.warn('API 호출 실패, 로컬 저장소 사용:', apiError)
        // API 실패 시 로컬 저장소 사용
        settingsManager.importSettings(jsonData, changedBy)
        setSettings(settingsManager.getSettings())
      }
      
      setHasUnsavedChanges(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '설정 가져오기 실패'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [callSettingsAPI])

  // 유효성 검증
  const validateSettings = useCallback((
    settingsToValidate?: SystemSettings
  ): SettingsValidationResult => {
    return settingsManager.validateSettings(settingsToValidate || settings)
  }, [settings])

  // 히스토리 조회
  const getHistory = useCallback((
    category?: SettingsCategory,
    limit?: number
  ): SettingsHistory[] => {
    return settingsManager.getHistory(category, limit)
  }, [])

  // 히스토리 삭제
  const clearHistory = useCallback((category?: SettingsCategory): void => {
    settingsManager.clearHistory(category)
  }, [])

  return useMemo(() => ({
    settings,
    getCategorySettings,
    getSetting,
    updateSettings,
    updateCategorySettings,
    updateSetting,
    resetSettings,
    exportSettings,
    importSettings,
    validateSettings,
    getHistory,
    clearHistory,
    isLoading,
    error,
    hasUnsavedChanges
  }), [
    settings,
    getCategorySettings,
    getSetting,
    updateSettings,
    updateCategorySettings,
    updateSetting,
    resetSettings,
    exportSettings,
    importSettings,
    validateSettings,
    getHistory,
    clearHistory,
    isLoading,
    error,
    hasUnsavedChanges
  ])
}

// 카테고리별 설정 전용 훅
export function useCategorySettings<T extends SettingsCategory>(
  category: T
): UseCategorySettingsReturn<T> {
  const {
    settings: allSettings,
    updateCategorySettings,
    resetSettings: resetAllSettings,
    isLoading,
    error
  } = useSettings()

  const settings = useMemo(() => allSettings[category], [allSettings, category])

  const updateSettings = useCallback(async (
    updates: Partial<SystemSettings[T]>,
    changedBy?: string,
    reason?: string
  ): Promise<void> => {
    return updateCategorySettings(category, updates, changedBy, reason)
  }, [category, updateCategorySettings])

  const resetSettings = useCallback(async (
    changedBy?: string
  ): Promise<void> => {
    return resetAllSettings(category, changedBy)
  }, [category, resetAllSettings])

  return useMemo(() => ({
    settings,
    updateSettings,
    resetSettings,
    isLoading,
    error
  }), [settings, updateSettings, resetSettings, isLoading, error])
}

// 특정 설정값 전용 훅
export function useSetting<T extends SettingsCategory, K extends keyof SystemSettings[T]>(
  category: T,
  key: K
) {
  const { settings, updateSetting, isLoading, error } = useSettings()
  
  const value = useMemo(() => settings[category][key], [settings, category, key])
  
  const setValue = useCallback(async (
    newValue: SystemSettings[T][K],
    changedBy?: string,
    reason?: string
  ): Promise<void> => {
    return updateSetting(category, key, newValue, changedBy, reason)
  }, [category, key, updateSetting])

  return useMemo(() => ({
    value,
    setValue,
    isLoading,
    error
  }), [value, setValue, isLoading, error])
}

// 설정 변경 감지 훅
export function useSettingsChange(
  callback: (newSettings: SystemSettings, oldSettings: SystemSettings) => void,
  dependencies?: SettingsCategory[]
) {
  const { settings } = useSettings()
  const [previousSettings, setPreviousSettings] = useState<SystemSettings>(settings)

  useEffect(() => {
    // 의존성이 지정된 경우 해당 카테고리만 감지
    if (dependencies && dependencies.length > 0) {
      const hasChanged = dependencies.some(category => 
        JSON.stringify(settings[category]) !== JSON.stringify(previousSettings[category])
      )
      
      if (hasChanged) {
        callback(settings, previousSettings)
        setPreviousSettings(settings)
      }
    } else {
      // 전체 설정 변경 감지
      if (JSON.stringify(settings) !== JSON.stringify(previousSettings)) {
        callback(settings, previousSettings)
        setPreviousSettings(settings)
      }
    }
  }, [settings, previousSettings, callback, dependencies])
} 