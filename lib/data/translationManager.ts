import { 
  TranslationData, 
  TranslationValue, 
  TranslationHistory,
  TranslationStats, 
  TranslationValidationResult,
  TranslationValidationError,
  TranslationValidationWarning,
  SupportedLanguage,
  TranslationNamespace 
} from '../types/translations'
import { koTranslations } from './translations/ko'
import { supabase } from '../supabase/client'

/**
 * 번역 데이터 관리자 클래스
 * Supabase 데이터베이스 기반으로 번역 데이터를 관리합니다.
 */
export class TranslationManager {
  private static instance: TranslationManager
  private translations: TranslationData
  private history: TranslationHistory[] = []
  private isInitialized: boolean = false
  
  // 캐시 관련 설정
  private static readonly CACHE_EXPIRY = 60 * 60 * 1000 // 1시간 (밀리초)
  private cacheTimestamp: number = 0

  // 로컬 스토리지 키 (fallback용)
  private static readonly STORAGE_KEYS = {
    TRANSLATIONS: 'cnc_translations',
    HISTORY: 'cnc_translations_history',
    CACHE: 'cnc_translations_cache'
  }

  private constructor() {
    this.translations = koTranslations // 기본값으로 초기화
  }

  public static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager()
    }
    return TranslationManager.instance
  }

  /**
   * 데이터베이스에서 번역 데이터 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.isCacheValid()) {
      return
    }

    try {
      await this.loadTranslationsFromDB()
      this.isInitialized = true
      this.cacheTimestamp = Date.now()
    } catch (error) {
      console.error('번역 데이터 초기화 실패:', error)
      // 실패 시 기본 데이터 사용
      this.translations = koTranslations
      this.isInitialized = true
    }
  }

  /**
   * 캐시 유효성 검사
   */
  private isCacheValid(): boolean {
    return (Date.now() - this.cacheTimestamp) < TranslationManager.CACHE_EXPIRY
  }

  /**
   * 데이터베이스에서 번역 데이터 로드
   */
  private async loadTranslationsFromDB(): Promise<void> {
    try {
      // 1. 네임스페이스 조회
      const { data: namespaces, error: nsError } = await supabase
        .from('translation_namespaces')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (nsError) {
        console.error('네임스페이스 조회 실패:', nsError)
        throw nsError
      }

      // 2. 번역 키와 값 조회
      const { data: translationData, error: translationError } = await supabase
        .from('translation_keys')
        .select(`
          id,
          key_name,
          context,
          is_active,
          namespace:translation_namespaces!inner(code),
          translation_values!inner(
            language_code,
            translation_text,
            is_auto_translated
          )
        `)
        .eq('is_active', true)
        .eq('translation_namespaces.is_active', true)

      if (translationError) {
        console.error('번역 데이터 조회 실패:', translationError)
        throw translationError
      }

      // 3. 데이터 구조 변환
      const translations: TranslationData = {}
      
      for (const item of translationData || []) {
        const namespace = (item.namespace as any)?.code
        const key = item.key_name
        
        if (!namespace || !key) continue
        
        if (!translations[namespace]) {
          translations[namespace] = {}
        }
        
        if (!translations[namespace][key]) {
          translations[namespace][key] = { ko: '', vi: '' }
        }
        
        // 번역값 설정
        for (const value of item.translation_values) {
          const language = value.language_code as SupportedLanguage
          translations[namespace][key][language] = value.translation_text
        }
      }

      // 4. 기본 데이터와 병합
      this.translations = this.mergeTranslations(koTranslations, translations)
      
    } catch (error) {
      console.error('데이터베이스에서 번역 데이터 로드 실패:', error)
      // 실패 시 로컬 스토리지에서 로드 시도
      this.translations = this.loadTranslations()
    }
  }

  /**
   * 로컬 스토리지에서 번역 데이터 로드
   */
  private loadTranslations(): TranslationData {
    try {
      if (typeof window === 'undefined') {
        // 서버 사이드에서는 기본 한국어 데이터 반환
        return koTranslations
      }

      const stored = localStorage.getItem(TranslationManager.STORAGE_KEYS.TRANSLATIONS)
      if (stored) {
        const parsedData = JSON.parse(stored)
        // 기본 데이터와 병합 (기본 데이터를 우선으로)
        return this.mergeTranslations(koTranslations, parsedData)
      }
    } catch (error) {
      console.error('번역 데이터 로드 실패:', error)
    }
    
    return koTranslations
  }

  /**
   * 번역 데이터를 로컬 스토리지에 저장
   */
  private saveTranslations(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          TranslationManager.STORAGE_KEYS.TRANSLATIONS, 
          JSON.stringify(this.translations)
        )
      }
    } catch (error) {
      console.error('번역 데이터 저장 실패:', error)
    }
  }

  /**
   * 히스토리 로드
   */
  private loadHistory(): TranslationHistory[] {
    try {
      if (typeof window === 'undefined') return []
      
      const stored = localStorage.getItem(TranslationManager.STORAGE_KEYS.HISTORY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('번역 히스토리 로드 실패:', error)
      return []
    }
  }

  /**
   * 히스토리 저장
   */
  private saveHistory(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          TranslationManager.STORAGE_KEYS.HISTORY, 
          JSON.stringify(this.history)
        )
      }
    } catch (error) {
      console.error('번역 히스토리 저장 실패:', error)
    }
  }

  /**
   * 두 번역 데이터를 병합 (기본 데이터 우선)
   */
  private mergeTranslations(base: TranslationData, override: TranslationData): TranslationData {
    const result = { ...base }
    
    for (const namespace in override) {
      if (!result[namespace]) {
        result[namespace] = {}
      }
      
      for (const key in override[namespace]) {
        if (!result[namespace][key]) {
          result[namespace][key] = override[namespace][key]
        } else {
          // 기존 키가 있으면 언어별로 병합
          result[namespace][key] = {
            ...result[namespace][key],
            ...override[namespace][key]
          }
        }
      }
    }
    
    return result
  }

  /**
   * 전체 번역 데이터 조회
   */
  public getTranslations(): TranslationData {
    return { ...this.translations }
  }

  /**
   * 네임스페이스별 번역 데이터 조회
   */
  public getNamespaceTranslations(namespace: TranslationNamespace): Record<string, Record<SupportedLanguage, string>> {
    return this.translations[namespace] || {}
  }

  /**
   * 특정 번역 조회
   */
  public getTranslation(
    namespace: TranslationNamespace, 
    key: string, 
    language: SupportedLanguage
  ): string {
    const nsData = this.translations[namespace]
    if (!nsData || !nsData[key]) {
      return `${namespace}.${key}` // 키가 없으면 키 이름 반환
    }
    
    const translation = nsData[key][language]
    if (!translation) {
      // 해당 언어가 없으면 fallback 언어 시도
      const fallback = nsData[key]['ko'] // 한국어를 fallback으로 사용
      return fallback || `${namespace}.${key}`
    }
    
    return translation
  }

  /**
   * 번역 추가 또는 업데이트
   */
  public async setTranslation(
    namespace: TranslationNamespace,
    key: string,
    language: SupportedLanguage,
    value: string,
    changedBy: string = 'system'
  ): Promise<void> {
    try {
      // 1. 네임스페이스 확인/생성
      let { data: namespaceData, error: nsError } = await supabase
        .from('translation_namespaces')
        .select('id')
        .eq('code', namespace)
        .single()

      if (nsError && nsError.code === 'PGRST116') {
        // 네임스페이스가 없으면 생성
        const { data: newNamespace, error: createNsError } = await supabase
          .from('translation_namespaces')
          .insert({
            code: namespace,
            name_ko: namespace,
            name_vi: namespace,
            is_active: true,
            display_order: 0
          })
          .select('id')
          .single()

        if (createNsError) throw createNsError
        namespaceData = newNamespace
      } else if (nsError) {
        throw nsError
      }

      if (!namespaceData) {
        throw new Error('네임스페이스 데이터를 찾을 수 없습니다.')
      }

      // 2. 번역 키 확인/생성
      let { data: keyData, error: keyError } = await supabase
        .from('translation_keys')
        .select('id')
        .eq('namespace_id', namespaceData.id)
        .eq('key_name', key)
        .single()

      if (keyError && keyError.code === 'PGRST116') {
        // 키가 없으면 생성
        const { data: newKey, error: createKeyError } = await supabase
          .from('translation_keys')
          .insert({
            namespace_id: namespaceData.id,
            key_name: key,
            is_active: true
          })
          .select('id')
          .single()

        if (createKeyError) throw createKeyError
        keyData = newKey
      } else if (keyError) {
        throw keyError
      }

      if (!keyData) {
        throw new Error('번역 키 데이터를 찾을 수 없습니다.')
      }

      // 3. 번역값 확인/업데이트
      const { data: existingValue } = await supabase
        .from('translation_values')
        .select('translation_text')
        .eq('key_id', keyData.id)
        .eq('language_code', language)
        .single()

      const oldValue = existingValue?.translation_text || ''

      if (existingValue) {
        // 업데이트
        const { error: updateError } = await supabase
          .from('translation_values')
          .update({
            translation_text: value,
            is_auto_translated: false,
            updated_at: new Date().toISOString()
          })
          .eq('key_id', keyData.id)
          .eq('language_code', language)

        if (updateError) throw updateError
      } else {
        // 새로 생성
        const { error: insertError } = await supabase
          .from('translation_values')
          .insert({
            key_id: keyData.id,
            language_code: language,
            translation_text: value,
            is_auto_translated: false
          })

        if (insertError) throw insertError
      }

      // 4. 히스토리 기록
      await this.recordChangeToDatabase(namespace, key, language, oldValue, value, 'update', changedBy)

      // 5. 로컬 캐시 업데이트
      if (!this.translations[namespace]) {
        this.translations[namespace] = {}
      }
      
      if (!this.translations[namespace][key]) {
        this.translations[namespace][key] = { ko: '', vi: '' }
      }
      
      this.translations[namespace][key][language] = value

      // 6. fallback으로 로컬 스토리지에도 저장
      this.saveTranslations()

    } catch (error) {
      console.error('데이터베이스 번역 저장 실패:', error)
      
      // fallback: 로컬에만 저장
      if (!this.translations[namespace]) {
        this.translations[namespace] = {}
      }
      
      if (!this.translations[namespace][key]) {
        this.translations[namespace][key] = { ko: '', vi: '' }
      }
      
      const oldValue = this.translations[namespace][key][language]
      this.translations[namespace][key][language] = value
      
      // 로컬 히스토리 기록
      this.recordChange(namespace, key, language, oldValue, value, 'update', changedBy)
      this.saveTranslations()
    }
  }

  /**
   * 번역 키 삭제
   */
  public deleteTranslation(
    namespace: TranslationNamespace,
    key: string,
    changedBy: string = 'system'
  ): void {
    if (this.translations[namespace] && this.translations[namespace][key]) {
      const oldValue = this.translations[namespace][key]
      delete this.translations[namespace][key]
      
      // 히스토리 기록
      for (const lang of ['ko', 'vi'] as SupportedLanguage[]) {
        if (oldValue[lang]) {
          this.recordChange(namespace, key, lang, oldValue[lang], '', 'delete', changedBy)
        }
      }
      
      this.saveTranslations()
    }
  }

  /**
   * 데이터베이스에 변경 이력 기록
   */
  private async recordChangeToDatabase(
    namespace: TranslationNamespace,
    key: string,
    language: SupportedLanguage,
    oldValue: string,
    newValue: string,
    changeType: 'create' | 'update' | 'delete' | 'auto_translate',
    changedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      // 키 ID 조회
      const { data: keyData } = await supabase
        .from('translation_keys')
        .select(`
          id,
          namespace:translation_namespaces!inner(code)
        `)
        .eq('translation_namespaces.code', namespace)
        .eq('key_name', key)
        .single()

      if (keyData) {
        await supabase
          .from('translation_history')
          .insert({
            key_id: keyData.id,
            language_code: language,
            old_value: oldValue,
            new_value: newValue,
            change_type: changeType,
            changed_by: changedBy,
            reason: reason
          })
      }
    } catch (error) {
      console.error('데이터베이스 히스토리 기록 실패:', error)
    }
  }

  /**
   * 변경 이력 기록 (로컬 fallback)
   */
  private recordChange(
    namespace: TranslationNamespace,
    key: string,
    language: SupportedLanguage,
    oldValue: string,
    newValue: string,
    changeType: 'create' | 'update' | 'delete' | 'auto_translate',
    changedBy: string,
    reason?: string
  ): void {
    const historyEntry: TranslationHistory = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      translationId: `${namespace}.${key}`,
      namespace,
      key,
      language,
      oldValue,
      newValue,
      changeType,
      changedBy,
      changedAt: new Date().toISOString(),
      reason
    }
    
    this.history.unshift(historyEntry) // 최신 순서로 추가
    
    // 히스토리 최대 1000개로 제한
    if (this.history.length > 1000) {
      this.history = this.history.slice(0, 1000)
    }
    
    this.saveHistory()
  }

  /**
   * 번역 통계 계산
   */
  public getStats(): TranslationStats {
    let totalKeys = 0
    const translatedKeys: Record<SupportedLanguage, number> = { ko: 0, vi: 0 }
    const missingTranslations: Record<SupportedLanguage, string[]> = { ko: [], vi: [] }
    let autoTranslatedKeys = 0
    
    for (const namespace in this.translations) {
      for (const key in this.translations[namespace]) {
        totalKeys++
        
        for (const lang of ['ko', 'vi'] as SupportedLanguage[]) {
          const translation = this.translations[namespace][key][lang]
          if (translation && translation.trim()) {
            translatedKeys[lang]++
          } else {
            missingTranslations[lang].push(`${namespace}.${key}`)
          }
        }
      }
    }
    
    // 자동 번역된 키 개수 계산 (히스토리에서)
    autoTranslatedKeys = this.history.filter(h => h.changeType === 'auto_translate').length
    
    return {
      totalKeys,
      translatedKeys,
      autoTranslatedKeys,
      manualTranslatedKeys: totalKeys - autoTranslatedKeys,
      missingTranslations,
      lastSyncAt: new Date().toISOString()
    }
  }

  /**
   * 번역 데이터 검증
   */
  public validateTranslations(): TranslationValidationResult {
    const errors: TranslationValidationError[] = []
    const warnings: TranslationValidationWarning[] = []
    
    for (const namespace in this.translations) {
      for (const key in this.translations[namespace]) {
        const translations = this.translations[namespace][key]
        
        // 빈 번역 체크
        for (const lang of ['ko', 'vi'] as SupportedLanguage[]) {
          if (!translations[lang] || !translations[lang].trim()) {
            warnings.push({
              namespace: namespace as TranslationNamespace,
              key,
              language: lang,
              message: `번역이 누락되었습니다.`,
              suggestion: `${lang} 번역을 추가해주세요.`
            })
          }
        }
        
        // 번역 길이 체크 (한국어 대비 베트남어가 너무 긴 경우)
        const koText = translations.ko
        const viText = translations.vi
        if (koText && viText && viText.length > koText.length * 2) {
          warnings.push({
            namespace: namespace as TranslationNamespace,
            key,
            language: 'vi',
            message: `베트남어 번역이 한국어에 비해 너무 깁니다.`,
            suggestion: `번역을 간결하게 다시 작성해보세요.`
          })
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 번역 데이터 내보내기
   */
  public exportTranslations(): string {
    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      translations: this.translations,
      metadata: {
        exportedBy: 'TranslationManager',
        totalKeys: this.getStats().totalKeys,
        languages: ['ko', 'vi'] as SupportedLanguage[],
        description: 'CNC 앤드밀 관리 시스템 번역 데이터'
      }
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 번역 데이터 가져오기
   */
  public importTranslations(jsonData: string, changedBy: string = 'import'): void {
    try {
      const importData = JSON.parse(jsonData)
      
      if (!importData.translations) {
        throw new Error('올바르지 않은 번역 데이터 형식입니다.')
      }
      
      // 기존 데이터와 병합
      this.translations = this.mergeTranslations(this.translations, importData.translations)
      
      // 변경 이력 기록
      this.recordChange('common' as TranslationNamespace, 'import', 'ko', '', 
        `${Object.keys(importData.translations).length}개 네임스페이스 가져오기`, 
        'update', changedBy, '번역 데이터 가져오기')
      
      this.saveTranslations()
    } catch (error) {
      throw new Error(`번역 데이터 가져오기 실패: ${error}`)
    }
  }

  /**
   * 번역 데이터 초기화
   */
  public resetTranslations(changedBy: string = 'system'): void {
    this.translations = { ...koTranslations }
    
    // 히스토리 기록
    this.recordChange('common' as TranslationNamespace, 'reset', 'ko', '', 
      '번역 데이터 초기화', 'update', changedBy, '기본값으로 초기화')
    
    this.saveTranslations()
  }

  /**
   * 히스토리 조회
   */
  public getHistory(limit?: number): TranslationHistory[] {
    if (!this.history.length) {
      this.history = this.loadHistory()
    }
    
    return limit ? this.history.slice(0, limit) : this.history
  }

  /**
   * 히스토리 삭제
   */
  public clearHistory(): void {
    this.history = []
    this.saveHistory()
  }
} 