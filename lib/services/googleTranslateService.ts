import { 
  GoogleTranslateRequest, 
  GoogleTranslateResponse, 
  SupportedLanguage 
} from '../types/translations'
import { SettingsManager } from '../data/settingsManager'

/**
 * Google Cloud Translation API 서비스
 */
export class GoogleTranslateService {
  private static instance: GoogleTranslateService
  private apiKey: string = ''
  private projectId: string = ''
  private location: string = 'global'
  
  // API 버전별 URL
  private baseUrlV2 = 'https://translation.googleapis.com/language/translate/v2'
  private baseUrlV3 = 'https://translation.googleapis.com/v3'
  private useAdvancedAPI = false // v3 (Advanced) 사용 여부
  
  // 캐시 관리
  private cache = new Map<string, GoogleTranslateResponse>()
  private cacheEnabled = true
  private cacheExpiry = 60 * 60 * 1000 // 1시간 (밀리초)
  
  // 고급 기능
  private customModels = new Map<string, string>() // 사용자 정의 모델
  private glossaries = new Map<string, string>() // 용어집

  private constructor() {
    this.loadSettings()
  }

  public static getInstance(): GoogleTranslateService {
    if (!GoogleTranslateService.instance) {
      GoogleTranslateService.instance = new GoogleTranslateService()
    }
    return GoogleTranslateService.instance
  }

  /**
   * 설정 로드
   */
  private loadSettings(): void {
    try {
      const settingsManager = SettingsManager.getInstance()
      const translationSettings = settingsManager.getCategorySettings('translations')
      
      this.apiKey = translationSettings.googleApiKey || ''
      this.projectId = translationSettings.googleProjectId || ''
      this.location = translationSettings.googleLocation || 'global'
      this.useAdvancedAPI = translationSettings.useAdvancedAPI || false
      this.cacheEnabled = translationSettings.cacheEnabled
      this.cacheExpiry = translationSettings.cacheExpiry * 60 * 1000 // 분을 밀리초로 변환
    } catch (error) {
      console.error('번역 설정 로드 실패:', error)
    }
  }

  /**
   * API 키 설정
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * 프로젝트 ID 설정 (고급 API용)
   */
  public setProjectId(projectId: string): void {
    this.projectId = projectId
  }

  /**
   * 고급 API 사용 설정
   */
  public setUseAdvancedAPI(useAdvanced: boolean): void {
    this.useAdvancedAPI = useAdvanced
  }

  /**
   * 위치 설정 (고급 API용)
   */
  public setLocation(location: string): void {
    this.location = location
  }

  /**
   * API 키 유효성 검증
   */
  public async validateApiKey(apiKey?: string): Promise<boolean> {
    const keyToTest = apiKey || this.apiKey
    
    if (!keyToTest) {
      return false
    }

    try {
      // 간단한 번역 요청으로 API 키 테스트
      const response = await fetch(`${this.baseUrl}?key=${keyToTest}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: 'test',
          source: 'ko',
          target: 'vi',
          format: 'text'
        })
      })

      return response.ok
    } catch (error) {
      console.error('API 키 검증 실패:', error)
      return false
    }
  }

  /**
   * 언어 감지
   */
  public async detectLanguage(text: string): Promise<SupportedLanguage | null> {
    if (!this.apiKey) {
      throw new Error('Google Translate API 키가 설정되지 않았습니다.')
    }

    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text
        })
      })

      if (!response.ok) {
        throw new Error(`언어 감지 API 오류: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const detectedLang = data.data.detections[0][0].language

      // 지원 언어로 매핑
      if (detectedLang === 'ko') return 'ko'
      if (detectedLang === 'vi') return 'vi'
      
      return null
    } catch (error) {
      console.error('언어 감지 실패:', error)
      return null
    }
  }

  /**
   * 텍스트 번역
   */
  public async translateText(request: GoogleTranslateRequest): Promise<GoogleTranslateResponse> {
    if (!this.apiKey) {
      throw new Error('Google Translate API 키가 설정되지 않았습니다.')
    }

    // 캐시 확인
    const cacheKey = this.generateCacheKey(request)
    if (this.cacheEnabled) {
      const cached = this.getCachedTranslation(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      let result: GoogleTranslateResponse

      if (this.useAdvancedAPI && this.projectId) {
        // Cloud Translation Advanced API (v3) 사용
        result = await this.translateWithAdvancedAPI(request)
      } else {
        // 기본 Translation API (v2) 사용
        result = await this.translateWithBasicAPI(request)
      }

      // 캐시에 저장
      if (this.cacheEnabled) {
        this.setCachedTranslation(cacheKey, result)
      }

      return result
    } catch (error) {
      console.error('번역 실패:', error)
      throw new Error(`번역 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  /**
   * 기본 API (v2)로 번역
   */
  private async translateWithBasicAPI(request: GoogleTranslateRequest): Promise<GoogleTranslateResponse> {
    const response = await fetch(`${this.baseUrlV2}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: request.text,
        source: request.sourceLang,
        target: request.targetLang,
        format: 'text'
      })
    })

    if (!response.ok) {
      throw new Error(`번역 API 오류: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const translatedText = data.data.translations[0].translatedText

    return {
      translatedText,
      sourceText: request.text,
      sourceLang: request.sourceLang,
      targetLang: request.targetLang,
      confidence: data.data.translations[0].confidence || 0.95
    }
  }

  /**
   * 고급 API (v3)로 번역
   */
  private async translateWithAdvancedAPI(request: GoogleTranslateRequest): Promise<GoogleTranslateResponse> {
    const parent = `projects/${this.projectId}/locations/${this.location}`
    const url = `${this.baseUrlV3}/${parent}:translateText`

    // 고급 API 요청 본문
    const requestBody: any = {
      contents: [request.text],
      sourceLanguageCode: request.sourceLang,
      targetLanguageCode: request.targetLang,
      mimeType: 'text/plain'
    }

    // 컨텍스트가 있는 경우 용어집 확인
    if (request.context) {
      const glossaryId = this.glossaries.get(`${request.sourceLang}-${request.targetLang}`)
      if (glossaryId) {
        requestBody.glossaryConfig = {
          glossary: `${parent}/glossaries/${glossaryId}`
        }
      }
    }

    // 사용자 정의 모델 확인
    const modelId = this.customModels.get(`${request.sourceLang}-${request.targetLang}`)
    if (modelId) {
      requestBody.model = `${parent}/models/${modelId}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`, // v3는 Bearer 토큰 사용
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`고급 번역 API 오류: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const translation = data.translations[0]

    return {
      translatedText: translation.translatedText,
      sourceText: request.text,
      sourceLang: request.sourceLang,
      targetLang: request.targetLang,
      confidence: translation.confidence || 0.98 // 고급 API는 일반적으로 더 높은 신뢰도
    }
  }

  /**
   * 여러 텍스트 일괄 번역
   */
  public async translateBatch(
    texts: string[], 
    sourceLang: SupportedLanguage, 
    targetLang: SupportedLanguage
  ): Promise<GoogleTranslateResponse[]> {
    if (!this.apiKey) {
      throw new Error('Google Translate API 키가 설정되지 않았습니다.')
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: texts,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      })

      if (!response.ok) {
        throw new Error(`일괄 번역 API 오류: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      return data.data.translations.map((translation: any, index: number) => ({
        translatedText: translation.translatedText,
        sourceText: texts[index],
        sourceLang,
        targetLang,
        confidence: translation.confidence || 0.95
      }))
    } catch (error) {
      console.error('일괄 번역 실패:', error)
      throw new Error(`일괄 번역 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  /**
   * 지원 언어 목록 조회
   */
  public async getSupportedLanguages(): Promise<Array<{ language: string; name: string }>> {
    if (!this.apiKey) {
      throw new Error('Google Translate API 키가 설정되지 않았습니다.')
    }

    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2/languages?key=${this.apiKey}&target=ko`
      )

      if (!response.ok) {
        throw new Error(`지원 언어 조회 API 오류: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.languages
    } catch (error) {
      console.error('지원 언어 조회 실패:', error)
      throw new Error(`지원 언어 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(request: GoogleTranslateRequest): string {
    return `${request.sourceLang}-${request.targetLang}-${this.hashString(request.text)}`
  }

  /**
   * 간단한 해시 함수
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit 정수로 변환
    }
    return hash.toString()
  }

  /**
   * 캐시된 번역 조회
   */
  private getCachedTranslation(cacheKey: string): GoogleTranslateResponse | null {
    const cached = this.cache.get(cacheKey)
    if (!cached) return null

    // 캐시 만료 시간 확인 (임시로 현재 시간 기반)
    const now = Date.now()
    const cacheTime = (cached as any).cacheTime || now
    
    if (now - cacheTime > this.cacheExpiry) {
      this.cache.delete(cacheKey)
      return null
    }

    return cached
  }

  /**
   * 번역 결과 캐시에 저장
   */
  private setCachedTranslation(cacheKey: string, result: GoogleTranslateResponse): void {
    // 캐시 크기 제한 (1000개)
    if (this.cache.size >= 1000) {
      // 오래된 항목부터 삭제
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    // 캐시 시간 추가
    (result as any).cacheTime = Date.now()
    this.cache.set(cacheKey, result)
  }

  /**
   * 캐시 클리어
   */
  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * 캐시 통계
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 1000
    }
  }

  /**
   * 사용량 제한 확인 (API 쿼터)
   */
  public async checkQuota(): Promise<{ 
    charactersTranslated: number; 
    quotaLimit: number; 
    remainingQuota: number 
  }> {
    // Google Cloud Translation API는 직접적인 쿼터 조회 API를 제공하지 않으므로
    // 간접적인 방법으로 추정
    try {
      // 로컬 스토리지에서 사용량 추적
      const today = new Date().toDateString()
      const usageKey = `google_translate_usage_${today}`
      const todayUsage = parseInt(localStorage.getItem(usageKey) || '0', 10)
      
      // 일일 무료 한도: 500,000 문자 (Google Cloud의 기본 무료 티어)
      const dailyLimit = 500000
      
      return {
        charactersTranslated: todayUsage,
        quotaLimit: dailyLimit,
        remainingQuota: Math.max(0, dailyLimit - todayUsage)
      }
    } catch (error) {
      console.error('사용량 확인 실패:', error)
      return {
        charactersTranslated: 0,
        quotaLimit: 500000,
        remainingQuota: 500000
      }
    }
  }

  /**
   * 사용량 기록
   */
  public recordUsage(characterCount: number): void {
    try {
      const today = new Date().toDateString()
      const usageKey = `google_translate_usage_${today}`
      const currentUsage = parseInt(localStorage.getItem(usageKey) || '0', 10)
      
      localStorage.setItem(usageKey, (currentUsage + characterCount).toString())
    } catch (error) {
      console.error('사용량 기록 실패:', error)
    }
  }

  /**
   * 번역 품질 평가 (신뢰도 기반)
   */
  public evaluateTranslationQuality(response: GoogleTranslateResponse): {
    quality: 'excellent' | 'good' | 'fair' | 'poor'
    score: number
    suggestions: string[]
  } {
    const confidence = response.confidence || 0
    const sourceLength = response.sourceText.length
    const targetLength = response.translatedText.length
    const lengthRatio = targetLength / sourceLength
    
    let score = confidence * 100
    const suggestions: string[] = []
    
    // 길이 비율 검증 (베트남어는 일반적으로 한국어보다 길다)
    if (response.targetLang === 'vi' && lengthRatio < 0.8) {
      score -= 10
      suggestions.push('번역 결과가 너무 짧을 수 있습니다.')
    }
    
    if (response.targetLang === 'ko' && lengthRatio > 1.5) {
      score -= 10
      suggestions.push('번역 결과가 너무 길 수 있습니다.')
    }
    
    // 특수 문자나 숫자가 보존되었는지 확인
    const sourceNumbers = (response.sourceText.match(/\d+/g) || []).length
    const targetNumbers = (response.translatedText.match(/\d+/g) || []).length
    
    if (sourceNumbers !== targetNumbers) {
      score -= 15
      suggestions.push('숫자가 올바르게 번역되지 않았을 수 있습니다.')
    }
    
    let quality: 'excellent' | 'good' | 'fair' | 'poor'
    if (score >= 90) quality = 'excellent'
    else if (score >= 75) quality = 'good'
    else if (score >= 60) quality = 'fair'
    else quality = 'poor'
    
    return { quality, score: Math.max(0, score), suggestions }
  }

  // ========== 고급 API 전용 기능들 ==========

  /**
   * 용어집 관리 - 용어집 추가
   */
  public addGlossary(sourceLang: SupportedLanguage, targetLang: SupportedLanguage, glossaryId: string): void {
    const key = `${sourceLang}-${targetLang}`
    this.glossaries.set(key, glossaryId)
  }

  /**
   * 용어집 관리 - 용어집 제거
   */
  public removeGlossary(sourceLang: SupportedLanguage, targetLang: SupportedLanguage): void {
    const key = `${sourceLang}-${targetLang}`
    this.glossaries.delete(key)
  }

  /**
   * 용어집 관리 - 용어집 목록 조회
   */
  public getGlossaries(): Map<string, string> {
    return new Map(this.glossaries)
  }

  /**
   * 사용자 정의 모델 - 모델 추가
   */
  public addCustomModel(sourceLang: SupportedLanguage, targetLang: SupportedLanguage, modelId: string): void {
    const key = `${sourceLang}-${targetLang}`
    this.customModels.set(key, modelId)
  }

  /**
   * 사용자 정의 모델 - 모델 제거
   */
  public removeCustomModel(sourceLang: SupportedLanguage, targetLang: SupportedLanguage): void {
    const key = `${sourceLang}-${targetLang}`
    this.customModels.delete(key)
  }

  /**
   * 사용자 정의 모델 - 모델 목록 조회
   */
  public getCustomModels(): Map<string, string> {
    return new Map(this.customModels)
  }

  /**
   * 고급 일괄 번역 (v3 API 사용)
   */
  public async translateBatchAdvanced(
    texts: string[],
    sourceLang: SupportedLanguage,
    targetLang: SupportedLanguage,
    options?: {
      useGlossary?: boolean
      useCustomModel?: boolean
      mimeType?: 'text/plain' | 'text/html'
    }
  ): Promise<GoogleTranslateResponse[]> {
    if (!this.useAdvancedAPI || !this.projectId) {
      throw new Error('고급 API가 활성화되지 않았거나 프로젝트 ID가 설정되지 않았습니다.')
    }

    const parent = `projects/${this.projectId}/locations/${this.location}`
    const url = `${this.baseUrlV3}/${parent}:translateText`

    const requestBody: any = {
      contents: texts,
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
      mimeType: options?.mimeType || 'text/plain'
    }

    // 용어집 사용
    if (options?.useGlossary) {
      const glossaryId = this.glossaries.get(`${sourceLang}-${targetLang}`)
      if (glossaryId) {
        requestBody.glossaryConfig = {
          glossary: `${parent}/glossaries/${glossaryId}`
        }
      }
    }

    // 사용자 정의 모델 사용
    if (options?.useCustomModel) {
      const modelId = this.customModels.get(`${sourceLang}-${targetLang}`)
      if (modelId) {
        requestBody.model = `${parent}/models/${modelId}`
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`고급 일괄 번역 API 오류: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      return data.translations.map((translation: any, index: number) => ({
        translatedText: translation.translatedText,
        sourceText: texts[index],
        sourceLang,
        targetLang,
        confidence: translation.confidence || 0.98
      }))
    } catch (error) {
      console.error('고급 일괄 번역 실패:', error)
      throw new Error(`고급 일괄 번역 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  /**
   * 번역 컨텍스트 분석 (고급 기능)
   */
  public analyzeTranslationContext(text: string): {
    domain: 'technical' | 'business' | 'casual' | 'formal' | 'unknown'
    complexity: 'simple' | 'medium' | 'complex'
    hasSpecialTerms: boolean
    suggestedGlossary?: string
  } {
    const lowerText = text.toLowerCase()
    
    // 도메인 분석
    let domain: 'technical' | 'business' | 'casual' | 'formal' | 'unknown' = 'unknown'
    
    if (/설비|공구|앤드밀|cnc|tool|equipment|manufacturing/.test(lowerText)) {
      domain = 'technical'
    } else if (/관리|시스템|사용자|설정|관리자/.test(lowerText)) {
      domain = 'business'
    } else if (/안녕|고마워|괜찮아/.test(lowerText)) {
      domain = 'casual'
    } else if (/귀하|존경하는|정중히/.test(lowerText)) {
      domain = 'formal'
    }

    // 복잡도 분석
    const sentenceCount = text.split(/[.!?]/).length - 1
    const wordCount = text.split(/\s+/).length
    let complexity: 'simple' | 'medium' | 'complex' = 'simple'
    
    if (wordCount > 50 || sentenceCount > 3) {
      complexity = 'complex'
    } else if (wordCount > 20 || sentenceCount > 1) {
      complexity = 'medium'
    }

    // 전문 용어 포함 여부
    const hasSpecialTerms = /앤드밀|CNC|Tool|Life|설비번호|T번호/.test(text)

    // 용어집 추천
    let suggestedGlossary: string | undefined
    if (domain === 'technical' && hasSpecialTerms) {
      suggestedGlossary = 'manufacturing-glossary'
    } else if (domain === 'business') {
      suggestedGlossary = 'business-glossary'
    }

    return {
      domain,
      complexity,
      hasSpecialTerms,
      suggestedGlossary
    }
  }

  /**
   * 번역 품질 향상 제안
   */
  public getTranslationImprovementSuggestions(
    request: GoogleTranslateRequest,
    response: GoogleTranslateResponse
  ): string[] {
    const suggestions: string[] = []
    const analysis = this.analyzeTranslationContext(request.text)

    // 고급 API 사용 제안
    if (!this.useAdvancedAPI && analysis.complexity !== 'simple') {
      suggestions.push('복잡한 문장에는 고급 API (v3) 사용을 권장합니다.')
    }

    // 용어집 사용 제안
    if (analysis.hasSpecialTerms && !request.context) {
      suggestions.push('전문 용어가 포함된 텍스트에는 용어집 사용을 권장합니다.')
    }

    // 사용자 정의 모델 제안
    if (analysis.domain === 'technical' && response.confidence && response.confidence < 0.9) {
      suggestions.push('기술 문서 번역을 위해 사용자 정의 모델 사용을 고려해보세요.')
    }

    // 신뢰도 기반 제안
    if (response.confidence && response.confidence < 0.8) {
      suggestions.push('낮은 신뢰도로 인해 수동 검토가 필요합니다.')
    }

    return suggestions
  }
} 