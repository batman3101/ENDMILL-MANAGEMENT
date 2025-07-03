import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  SupportedLanguage, 
  TranslationNamespace, 
  TranslationData,
  TranslationStats,
  TranslationValidationResult,
  TranslationHistory
} from '../types/translations'
import { TranslationManager } from '../data/translationManager'
import { supportedLanguages, languageInfo } from '../data/translations'

/**
 * 번역 Hook 반환 타입
 */
interface UseTranslationsReturn {
  // 현재 언어 및 번역 데이터
  currentLanguage: SupportedLanguage
  translations: TranslationData
  
  // 번역 함수
  t: (namespace: TranslationNamespace, key: string, params?: Record<string, any>) => string
  
  // 언어 관리
  changeLanguage: (language: SupportedLanguage) => void
  getSupportedLanguages: () => SupportedLanguage[]
  getLanguageInfo: (language: SupportedLanguage) => { name: string; nativeName: string; flag: string }
  
  // 번역 관리 (관리자용)
  addTranslation: (namespace: TranslationNamespace, key: string, language: SupportedLanguage, value: string) => void
  updateTranslation: (namespace: TranslationNamespace, key: string, language: SupportedLanguage, value: string) => void
  deleteTranslation: (namespace: TranslationNamespace, key: string) => void
  
  // 통계 및 검증
  getStats: () => TranslationStats
  validateTranslations: () => TranslationValidationResult
  
  // 가져오기/내보내기
  exportTranslations: () => string
  importTranslations: (jsonData: string) => void
  resetTranslations: () => void
  
  // 히스토리
  getHistory: (limit?: number) => TranslationHistory[]
  clearHistory: () => void
  
  // 상태
  isLoading: boolean
  error: string | null
}

/**
 * 번역 관리 Hook
 */
export function useTranslations(): UseTranslationsReturn {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ko')
  const [translations, setTranslations] = useState<TranslationData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const translationManager = useMemo(() => TranslationManager.getInstance(), [])

  // 초기 로드
  useEffect(() => {
    try {
      setIsLoading(true)
      
      // 로컬 스토리지에서 언어 설정 로드
      const savedLanguage = localStorage.getItem('cnc_current_language') as SupportedLanguage
      if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
        setCurrentLanguage(savedLanguage)
      }
      
      // 번역 데이터 로드
      const loadedTranslations = translationManager.getTranslations()
      setTranslations(loadedTranslations)
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 데이터 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [translationManager])

  /**
   * 번역 함수 - 파라미터를 지원하는 템플릿 기능 포함
   */
  const t = useCallback((
    namespace: TranslationNamespace, 
    key: string, 
    params?: Record<string, any>
  ): string => {
    try {
      let translation = translationManager.getTranslation(namespace, key, currentLanguage)
      
      // 파라미터 치환
      if (params && Object.keys(params).length > 0) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          const placeholder = `{{${paramKey}}}`
          translation = translation.replace(new RegExp(placeholder, 'g'), String(paramValue))
        }
      }
      
      return translation
    } catch (err) {
      console.error(`번역 조회 실패: ${namespace}.${key}`, err)
      return `${namespace}.${key}`
    }
  }, [translationManager, currentLanguage])

  /**
   * 언어 변경
   */
  const changeLanguage = useCallback((language: SupportedLanguage) => {
    try {
      if (!supportedLanguages.includes(language)) {
        throw new Error(`지원하지 않는 언어입니다: ${language}`)
      }
      
      setCurrentLanguage(language)
      localStorage.setItem('cnc_current_language', language)
      
      // 언어 변경 이벤트 발생 (다른 컴포넌트에서 감지 가능)
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language, previousLanguage: currentLanguage } 
      }))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '언어 변경 실패')
    }
  }, [currentLanguage])

  /**
   * 지원 언어 목록 조회
   */
  const getSupportedLanguages = useCallback(() => {
    return supportedLanguages
  }, [])

  /**
   * 언어 정보 조회
   */
  const getLanguageInfo = useCallback((language: SupportedLanguage) => {
    return languageInfo[language]
  }, [])

  /**
   * 번역 추가
   */
  const addTranslation = useCallback((
    namespace: TranslationNamespace, 
    key: string, 
    language: SupportedLanguage, 
    value: string
  ) => {
    try {
      translationManager.setTranslation(namespace, key, language, value, 'user')
      setTranslations(translationManager.getTranslations())
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 추가 실패')
    }
  }, [translationManager])

  /**
   * 번역 업데이트
   */
  const updateTranslation = useCallback((
    namespace: TranslationNamespace, 
    key: string, 
    language: SupportedLanguage, 
    value: string
  ) => {
    try {
      translationManager.setTranslation(namespace, key, language, value, 'user')
      setTranslations(translationManager.getTranslations())
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 업데이트 실패')
    }
  }, [translationManager])

  /**
   * 번역 삭제
   */
  const deleteTranslation = useCallback((namespace: TranslationNamespace, key: string) => {
    try {
      translationManager.deleteTranslation(namespace, key, 'user')
      setTranslations(translationManager.getTranslations())
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 삭제 실패')
    }
  }, [translationManager])

  /**
   * 번역 통계 조회
   */
  const getStats = useCallback(() => {
    return translationManager.getStats()
  }, [translationManager])

  /**
   * 번역 검증
   */
  const validateTranslations = useCallback(() => {
    return translationManager.validateTranslations()
  }, [translationManager])

  /**
   * 번역 데이터 내보내기
   */
  const exportTranslations = useCallback(() => {
    return translationManager.exportTranslations()
  }, [translationManager])

  /**
   * 번역 데이터 가져오기
   */
  const importTranslations = useCallback((jsonData: string) => {
    try {
      translationManager.importTranslations(jsonData, 'user')
      setTranslations(translationManager.getTranslations())
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 가져오기 실패')
    }
  }, [translationManager])

  /**
   * 번역 데이터 초기화
   */
  const resetTranslations = useCallback(() => {
    try {
      translationManager.resetTranslations('user')
      setTranslations(translationManager.getTranslations())
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 초기화 실패')
    }
  }, [translationManager])

  /**
   * 히스토리 조회
   */
  const getHistory = useCallback((limit?: number) => {
    return translationManager.getHistory(limit)
  }, [translationManager])

  /**
   * 히스토리 삭제
   */
  const clearHistory = useCallback(() => {
    try {
      translationManager.clearHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : '히스토리 삭제 실패')
    }
  }, [translationManager])

  return {
    currentLanguage,
    translations,
    t,
    changeLanguage,
    getSupportedLanguages,
    getLanguageInfo,
    addTranslation,
    updateTranslation,
    deleteTranslation,
    getStats,
    validateTranslations,
    exportTranslations,
    importTranslations,
    resetTranslations,
    getHistory,
    clearHistory,
    isLoading,
    error
  }
}

/**
 * 간단한 번역 전용 Hook (성능 최적화)
 */
export function useTranslation() {
  const { t, currentLanguage, changeLanguage } = useTranslations()
  
  return {
    t,
    currentLanguage,
    changeLanguage
  }
}

/**
 * 특정 네임스페이스만 사용하는 Hook
 */
export function useNamespaceTranslation(namespace: TranslationNamespace) {
  const { t, currentLanguage, changeLanguage } = useTranslations()
  
  const nt = useCallback((key: string, params?: Record<string, any>) => {
    return t(namespace, key, params)
  }, [t, namespace])
  
  return {
    t: nt,
    currentLanguage,
    changeLanguage
  }
}

/**
 * 다국어 형태소 변환 도구
 */
export function useLanguageUtils() {
  const { currentLanguage } = useTranslations()
  
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat(currentLanguage === 'ko' ? 'ko-KR' : 'vi-VN').format(num)
  }, [currentLanguage])
  
  const formatCurrency = useCallback((amount: number) => {
    // VND 기본 통화 사용
    return new Intl.NumberFormat(currentLanguage === 'ko' ? 'ko-KR' : 'vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }, [currentLanguage])
  
  const formatDate = useCallback((date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(currentLanguage === 'ko' ? 'ko-KR' : 'vi-VN').format(dateObj)
  }, [currentLanguage])
  
  const formatDateTime = useCallback((date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(currentLanguage === 'ko' ? 'ko-KR' : 'vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj)
  }, [currentLanguage])
  
  return {
    formatNumber,
    formatCurrency,
    formatDate,
    formatDateTime
  }
} 