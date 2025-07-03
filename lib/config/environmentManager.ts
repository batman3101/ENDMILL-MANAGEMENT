/**
 * 환경변수 및 보안 설정 관리 클래스
 * API 키와 같은 민감한 정보를 안전하게 관리하고 환경변수와 설정 시스템을 연결합니다.
 */

import { SettingsManager } from '../data/settingsManager'

export interface EnvironmentVariable {
  key: string
  value: string
  isEncrypted: boolean
  category: 'api_key' | 'database' | 'service' | 'general'
  description?: string
  required: boolean
  validationPattern?: string
}

export interface SecurityConfig {
  enableEncryption: boolean
  secretKey: string
  saltRounds: number
  tokenExpiry: number // 토큰 만료 시간 (시간)
}

export class EnvironmentManager {
  private static instance: EnvironmentManager
  private securityConfig: SecurityConfig
  private environmentVariables: Map<string, EnvironmentVariable> = new Map()

  // 지원하는 환경변수 목록
  private static readonly SUPPORTED_VARIABLES: Record<string, Omit<EnvironmentVariable, 'value'>> = {
    'GOOGLE_TRANSLATE_API_KEY': {
      key: 'GOOGLE_TRANSLATE_API_KEY',
      isEncrypted: true,
      category: 'api_key',
      description: 'Google Cloud Translation API 키',
      required: false,
      validationPattern: '^AIza[0-9A-Za-z-_]{35}$'
    },
    'GOOGLE_CLOUD_PROJECT_ID': {
      key: 'GOOGLE_CLOUD_PROJECT_ID',
      isEncrypted: false,
      category: 'api_key',
      description: 'Google Cloud 프로젝트 ID',
      required: false,
      validationPattern: '^[a-z][a-z0-9-]*[a-z0-9]$'
    },
    'GOOGLE_CLOUD_LOCATION': {
      key: 'GOOGLE_CLOUD_LOCATION',
      isEncrypted: false,
      category: 'api_key',
      description: 'Google Cloud 리전 설정',
      required: false,
      validationPattern: '^[a-z0-9-]+$'
    },
    'USE_ADVANCED_TRANSLATION_API': {
      key: 'USE_ADVANCED_TRANSLATION_API',
      isEncrypted: false,
      category: 'api_key',
      description: '고급 번역 API 사용 여부',
      required: false,
      validationPattern: '^(true|false)$'
    },
    'NEXT_PUBLIC_SUPABASE_URL': {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      isEncrypted: false,
      category: 'database',
      description: 'Supabase 프로젝트 URL',
      required: true,
      validationPattern: '^https://[a-z0-9]+\\.supabase\\.co$'
    },
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      isEncrypted: true,
      category: 'database',
      description: 'Supabase 익명 키',
      required: true,
      validationPattern: '^eyJ[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]*$'
    }
  }

  private constructor() {
    this.securityConfig = {
      enableEncryption: true,
      secretKey: this.generateSecretKey(),
      saltRounds: 12,
      tokenExpiry: 24 // 24시간
    }
    this.initializeFromEnvironment()
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager()
    }
    return EnvironmentManager.instance
  }

  /**
   * 환경변수에서 초기 설정 로드
   */
  private initializeFromEnvironment(): void {
    Object.entries(EnvironmentManager.SUPPORTED_VARIABLES).forEach(([key, config]) => {
      const value = this.getEnvironmentValue(key)
      if (value) {
        this.environmentVariables.set(key, {
          ...config,
          value: config.isEncrypted ? this.encrypt(value) : value
        })
      }
    })
  }

  /**
   * 환경변수 값 가져오기 (서버/클라이언트 구분)
   */
  private getEnvironmentValue(key: string): string | undefined {
    // 서버 사이드에서만 process.env 접근
    if (typeof window === 'undefined') {
      return process.env[key]
    }
    
    // 클라이언트에서는 NEXT_PUBLIC_ 접두사가 있는 것만 접근 가능
    if (key.startsWith('NEXT_PUBLIC_')) {
      return process.env[key]
    }
    
    return undefined
  }

  /**
   * 환경변수 설정
   */
  public setEnvironmentVariable(key: string, value: string): void {
    const config = EnvironmentManager.SUPPORTED_VARIABLES[key]
    if (!config) {
      throw new Error(`지원하지 않는 환경변수입니다: ${key}`)
    }

    // 유효성 검증
    if (config.validationPattern && !new RegExp(config.validationPattern).test(value)) {
      throw new Error(`환경변수 ${key}의 값이 올바르지 않습니다.`)
    }

    this.environmentVariables.set(key, {
      ...config,
      value: config.isEncrypted ? this.encrypt(value) : value
    })

    // 설정 시스템에도 동기화
    this.syncToSettings(key, value)
  }

  /**
   * 환경변수 가져오기
   */
  public getEnvironmentVariable(key: string): string | undefined {
    const envVar = this.environmentVariables.get(key)
    if (!envVar) {
      return undefined
    }

    return envVar.isEncrypted ? this.decrypt(envVar.value) : envVar.value
  }

  /**
   * 모든 환경변수 목록 가져오기 (값은 마스킹됨)
   */
  public getAllEnvironmentVariables(): Array<EnvironmentVariable & { maskedValue: string }> {
    return Array.from(this.environmentVariables.values()).map(envVar => ({
      ...envVar,
      value: envVar.isEncrypted ? this.decrypt(envVar.value) : envVar.value,
      maskedValue: this.maskSensitiveValue(envVar.value, envVar.isEncrypted)
    }))
  }

  /**
   * 환경변수 삭제
   */
  public deleteEnvironmentVariable(key: string): void {
    this.environmentVariables.delete(key)
    // 설정에서도 제거
    this.syncToSettings(key, '')
  }

  /**
   * 설정 시스템과 동기화
   */
  private syncToSettings(key: string, value: string): void {
    const settingsManager = SettingsManager.getInstance()
    
    try {
      switch (key) {
        case 'GOOGLE_TRANSLATE_API_KEY':
          settingsManager.updateCategorySettings('translations', { googleApiKey: value }, 'system')
          break
        case 'GOOGLE_CLOUD_PROJECT_ID':
          settingsManager.updateCategorySettings('translations', { googleProjectId: value }, 'system')
          break
        case 'GOOGLE_CLOUD_LOCATION':
          settingsManager.updateCategorySettings('translations', { googleLocation: value }, 'system')
          break
        case 'USE_ADVANCED_TRANSLATION_API':
          settingsManager.updateCategorySettings('translations', { useAdvancedAPI: value === 'true' }, 'system')
          break
      }
    } catch (error) {
      console.error('설정 동기화 실패:', error)
    }
  }

  /**
   * 설정에서 환경변수로 동기화
   */
  public syncFromSettings(): void {
    const settingsManager = SettingsManager.getInstance()
    const translationSettings = settingsManager.getCategorySettings('translations')

    // Google API 설정 동기화
    if (translationSettings.googleApiKey) {
      this.setEnvironmentVariable('GOOGLE_TRANSLATE_API_KEY', translationSettings.googleApiKey)
    }
    if (translationSettings.googleProjectId) {
      this.setEnvironmentVariable('GOOGLE_CLOUD_PROJECT_ID', translationSettings.googleProjectId)
    }
    if (translationSettings.googleLocation) {
      this.setEnvironmentVariable('GOOGLE_CLOUD_LOCATION', translationSettings.googleLocation)
    }
    if (translationSettings.useAdvancedAPI !== undefined) {
      this.setEnvironmentVariable('USE_ADVANCED_TRANSLATION_API', translationSettings.useAdvancedAPI.toString())
    }
  }

  /**
   * 환경변수 유효성 검증
   */
  public validateEnvironmentVariables(): { 
    isValid: boolean 
    errors: string[] 
    warnings: string[] 
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // 필수 환경변수 확인
    Object.entries(EnvironmentManager.SUPPORTED_VARIABLES).forEach(([key, config]) => {
      if (config.required && !this.environmentVariables.has(key)) {
        errors.push(`필수 환경변수가 누락되었습니다: ${key}`)
      }
    })

    // API 키 유효성 확인 (간단한 패턴 검사)
    const apiKey = this.getEnvironmentVariable('GOOGLE_TRANSLATE_API_KEY')
    if (apiKey && !apiKey.startsWith('AIza')) {
      warnings.push('Google Translate API 키 형식이 올바르지 않을 수 있습니다.')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 환경변수 내보내기 (보안 정보 제외)
   */
  public exportConfiguration(): string {
    const safeConfig = Array.from(this.environmentVariables.entries())
      .filter(([_, envVar]) => !envVar.isEncrypted)
      .reduce((acc, [key, envVar]) => {
        acc[key] = envVar.value
        return acc
      }, {} as Record<string, string>)

    return `# 엔드밀 관리 시스템 환경 설정
# 생성일: ${new Date().toISOString()}
# 주의: 이 파일에는 민감한 정보가 포함되어 있지 않습니다.
# API 키와 같은 보안 정보는 별도로 설정해주세요.

${Object.entries(safeConfig)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')}

# ==========================================
# 보안 설정 (수동으로 설정 필요)
# ==========================================

# Google Cloud Translation API 키 (필수)
# GOOGLE_TRANSLATE_API_KEY=AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz

# Supabase 데이터베이스 연결 (필수)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1Q...
`
  }

  /**
   * 암호화
   */
  private encrypt(text: string): string {
    if (!this.securityConfig.enableEncryption) {
      return text
    }
    
    // 간단한 Base64 인코딩 (실제 운영에서는 더 강력한 암호화 사용)
    try {
      return Buffer.from(text).toString('base64')
    } catch (error) {
      console.error('암호화 실패:', error)
      return text
    }
  }

  /**
   * 복호화
   */
  private decrypt(encryptedText: string): string {
    if (!this.securityConfig.enableEncryption) {
      return encryptedText
    }
    
    try {
      return Buffer.from(encryptedText, 'base64').toString()
    } catch (error) {
      console.error('복호화 실패:', error)
      return encryptedText
    }
  }

  /**
   * 민감한 값 마스킹
   */
  private maskSensitiveValue(value: string, isEncrypted: boolean): string {
    if (!isEncrypted) {
      return value
    }
    
    const decrypted = isEncrypted ? this.decrypt(value) : value
    if (decrypted.length <= 8) {
      return '*'.repeat(decrypted.length)
    }
    
    return decrypted.slice(0, 4) + '*'.repeat(decrypted.length - 8) + decrypted.slice(-4)
  }

  /**
   * 보안 키 생성
   */
  private generateSecretKey(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  /**
   * 환경변수 통계
   */
  public getStatistics(): {
    total: number
    configured: number
    encrypted: number
    missing: number
    categories: Record<string, number>
  } {
    const total = Object.keys(EnvironmentManager.SUPPORTED_VARIABLES).length
    const configured = this.environmentVariables.size
    const encrypted = Array.from(this.environmentVariables.values())
      .filter(env => env.isEncrypted).length
    const missing = total - configured

    const categories = Array.from(this.environmentVariables.values())
      .reduce((acc, env) => {
        acc[env.category] = (acc[env.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return {
      total,
      configured,
      encrypted,
      missing,
      categories
    }
  }
} 