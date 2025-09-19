import { useCallback } from 'react'
import { useTranslation as useReactI18next } from 'react-i18next'

/**
 * 지원 언어 타입
 */
export type SupportedLanguage = 'ko' | 'vi'

/**
 * 번역 Hook 반환 타입
 */
interface UseTranslationsReturn {
  // 현재 언어
  currentLanguage: SupportedLanguage

  // 번역 함수 (react-i18next의 t 함수)
  t: (key: string, options?: any) => string

  // 언어 관리
  changeLanguage: (language: SupportedLanguage) => void
  getSupportedLanguages: () => SupportedLanguage[]

  // 상태
  isLoading: boolean
  error: string | null
}

/**
 * 번역 관리 Hook (react-i18next 기반)
 */
export function useTranslations(): UseTranslationsReturn {
  const { t: i18nT, ready, i18n } = useReactI18next()

  /**
   * 언어 변경
   */
  const changeLanguage = useCallback((language: SupportedLanguage) => {
    i18n.changeLanguage(language)
  }, [i18n])

  /**
   * 지원 언어 목록 조회
   */
  const getSupportedLanguages = useCallback((): SupportedLanguage[] => {
    return ['ko', 'vi']
  }, [])

  return {
    currentLanguage: i18n.language as SupportedLanguage,
    t: i18nT,
    changeLanguage,
    getSupportedLanguages,
    isLoading: !ready,
    error: null
  }
}

/**
 * 간단한 번역 전용 Hook (react-i18next 직접 사용)
 */
export function useTranslation() {
  const { t, i18n, ready } = useReactI18next()

  const changeLanguage = useCallback((language: SupportedLanguage) => {
    i18n.changeLanguage(language)
  }, [i18n])

  return {
    t,
    currentLanguage: i18n.language as SupportedLanguage,
    changeLanguage,
    isLoading: !ready
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