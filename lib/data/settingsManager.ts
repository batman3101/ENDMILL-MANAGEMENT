import { 
  SystemSettings, 
  DEFAULT_SETTINGS, 
  SettingsCategory,
  SettingsHistory,
  SettingsValidationResult,
  SettingsValidationError,
  SettingsValidationWarning
} from '@/lib/types/settings'

const SETTINGS_STORAGE_KEY = 'endmill_system_settings'
const SETTINGS_HISTORY_KEY = 'endmill_settings_history'

// 전역에서 싱글톤 인스턴스 유지를 위한 타입 확장
declare global {
  var __settingsManagerInstance: SettingsManager | undefined
}

export class SettingsManager {
  private static instance: SettingsManager
  private settings: SystemSettings
  private history: SettingsHistory[] = []

  private constructor() {
    this.settings = this.loadSettings()
    this.history = this.loadHistory()
  }

  public static getInstance(): SettingsManager {
    // 브라우저 환경에서는 전역 객체에서 인스턴스 확인
    if (typeof window !== 'undefined') {
      if (!global.__settingsManagerInstance) {
        global.__settingsManagerInstance = new SettingsManager()
      }
      return global.__settingsManagerInstance
    }
    
    // 서버 환경에서는 기존 방식 사용
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager()
    }
    return SettingsManager.instance
  }

  // 설정 로드
  private loadSettings(): SystemSettings {
    try {
      if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS
      }

      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      
      if (!stored) {
        return DEFAULT_SETTINGS
      }

      const parsed = JSON.parse(stored)
      
      // 기본 설정과 병합하여 누락된 필드 보완
      const merged = this.mergeWithDefaults(parsed, DEFAULT_SETTINGS)
      
      return merged
    } catch (error) {
      console.error('설정 로드 실패:', error)
      return DEFAULT_SETTINGS
    }
  }

  // 기본값과 병합
  private mergeWithDefaults(stored: any, defaults: SystemSettings): SystemSettings {
    const merged = { ...defaults }
    
    Object.keys(defaults).forEach(category => {
      if (stored[category] && typeof stored[category] === 'object') {
        merged[category as keyof SystemSettings] = {
          ...defaults[category as keyof SystemSettings],
          ...stored[category]
        }
      }
    })

    return merged
  }

  // 설정 저장
  private saveSettings(): void {
    if (typeof window === 'undefined') return
    
    try {
      const settingsJson = JSON.stringify(this.settings, null, 2)
      localStorage.setItem(SETTINGS_STORAGE_KEY, settingsJson)
      
      // 커스텀 이벤트 발생으로 React Hook에서 실시간 변경 감지 가능
      window.dispatchEvent(new CustomEvent('settingsUpdated', { 
        detail: this.settings 
      }))
    } catch (error) {
      console.error('설정 저장 실패:', error)
    }
  }

  // 히스토리 로드
  private loadHistory(): SettingsHistory[] {
    try {
      if (typeof window === 'undefined') {
        return []
      }

      const stored = localStorage.getItem(SETTINGS_HISTORY_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('설정 히스토리 로드 실패:', error)
      return []
    }
  }

  // 히스토리 저장
  private saveHistory(): void {
    try {
      if (typeof window !== 'undefined') {
        // 최근 100개만 유지
        const recentHistory = this.history.slice(-100)
        localStorage.setItem(SETTINGS_HISTORY_KEY, JSON.stringify(recentHistory))
      }
    } catch (error) {
      console.error('설정 히스토리 저장 실패:', error)
    }
  }

  // 전체 설정 조회
  public getSettings(): SystemSettings {
    return { ...this.settings }
  }

  // 카테고리별 설정 조회
  public getCategorySettings<T extends SettingsCategory>(category: T): SystemSettings[T] {
    return { ...this.settings[category] }
  }

  // 특정 설정값 조회
  public getSetting<T extends SettingsCategory, K extends keyof SystemSettings[T]>(
    category: T, 
    key: K
  ): SystemSettings[T][K] {
    return this.settings[category][key]
  }

  // 설정 업데이트
  public updateSettings(
    updates: Partial<SystemSettings>,
    changedBy: string = 'system',
    reason?: string
  ): void {
    const validation = this.validateSettings({ ...this.settings, ...updates })
    
    if (!validation.isValid) {
      throw new Error(`설정 유효성 검증 실패: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // 변경 사항 기록
    this.recordChanges(this.settings, updates, changedBy, reason)

    // 설정 업데이트
    Object.keys(updates).forEach(category => {
      if (updates[category as keyof SystemSettings]) {
        this.settings[category as keyof SystemSettings] = {
          ...this.settings[category as keyof SystemSettings],
          ...updates[category as keyof SystemSettings]
        }
      }
    })

    this.saveSettings()
  }

  // 카테고리별 설정 업데이트
  public updateCategorySettings<T extends SettingsCategory>(
    category: T,
    updates: Partial<SystemSettings[T]>,
    changedBy: string = 'system',
    reason?: string
  ): void {
    const currentCategorySettings = this.settings[category]
    const newCategorySettings = { ...currentCategorySettings, ...updates }
    
    const fullUpdates = { [category]: newCategorySettings } as Partial<SystemSettings>
    this.updateSettings(fullUpdates, changedBy, reason)
  }

  // 특정 설정값 업데이트
  public updateSetting<T extends SettingsCategory, K extends keyof SystemSettings[T]>(
    category: T,
    key: K,
    value: SystemSettings[T][K],
    changedBy: string = 'system',
    reason?: string
  ): void {
    const updates = { [key]: value } as Partial<SystemSettings[T]>
    this.updateCategorySettings(category, updates, changedBy, reason)
  }

  // 변경 사항 기록
  private recordChanges(
    current: SystemSettings,
    updates: Partial<SystemSettings>,
    changedBy: string,
    reason?: string
  ): void {
    Object.keys(updates).forEach(category => {
      const categoryKey = category as SettingsCategory
      const currentCategory = current[categoryKey]
      const updatedCategory = updates[categoryKey]

      if (updatedCategory && typeof updatedCategory === 'object') {
        Object.keys(updatedCategory).forEach(field => {
          const oldValue = currentCategory[field as keyof typeof currentCategory]
          const newValue = updatedCategory[field as keyof typeof updatedCategory]

          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            this.history.push({
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              category: categoryKey,
              field,
              oldValue,
              newValue,
              changedBy,
              changedAt: new Date().toISOString(),
              reason
            })
          }
        })
      }
    })

    this.saveHistory()
  }

  // 설정 유효성 검증
  public validateSettings(settings: SystemSettings): SettingsValidationResult {
    const errors: SettingsValidationError[] = []
    const warnings: SettingsValidationWarning[] = []

    // 시스템 설정 검증
    if (settings.system.itemsPerPage < 1 || settings.system.itemsPerPage > 100) {
      errors.push({
        category: 'system',
        field: 'itemsPerPage',
        message: '페이지당 항목 수는 1-100 사이여야 합니다.',
        value: settings.system.itemsPerPage
      })
    }

    if (settings.system.sessionTimeout < 5 || settings.system.sessionTimeout > 480) {
      errors.push({
        category: 'system',
        field: 'sessionTimeout',
        message: '세션 타임아웃은 5-480분 사이여야 합니다.',
        value: settings.system.sessionTimeout
      })
    }

    // 설비 설정 검증
    if (settings.equipment.totalCount < 1 || settings.equipment.totalCount > 10000) {
      errors.push({
        category: 'equipment',
        field: 'totalCount',
        message: '총 설비 수는 1-10000 사이여야 합니다.',
        value: settings.equipment.totalCount
      })
    }

    if (settings.equipment.toolPositionCount < 1 || settings.equipment.toolPositionCount > 50) {
      errors.push({
        category: 'equipment',
        field: 'toolPositionCount',
        message: '앤드밀 포지션 수는 1-50 사이여야 합니다.',
        value: settings.equipment.toolPositionCount
      })
    }

    // 재고 설정 검증
    const { criticalPercent, lowPercent } = settings.inventory.stockThresholds
    if (criticalPercent >= lowPercent) {
      errors.push({
        category: 'inventory',
        field: 'stockThresholds',
        message: '위험 임계값은 부족 임계값보다 작아야 합니다.',
        value: { criticalPercent, lowPercent }
      })
    }

    // 경고 사항
    if (settings.system.sessionTimeout < 15) {
      warnings.push({
        category: 'system',
        field: 'sessionTimeout',
        message: '세션 타임아웃이 너무 짧습니다.',
        suggestion: '15분 이상으로 설정하는 것을 권장합니다.'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // 설정 초기화
  public resetSettings(category?: SettingsCategory, changedBy: string = 'system'): void {
    if (category) {
      // 특정 카테고리만 초기화
      const defaultCategory = DEFAULT_SETTINGS[category]
      this.updateCategorySettings(category, defaultCategory, changedBy, '설정 초기화')
    } else {
      // 전체 초기화
      this.recordChanges(this.settings, DEFAULT_SETTINGS, changedBy, '전체 설정 초기화')
      this.settings = { ...DEFAULT_SETTINGS }
      this.saveSettings()
    }
  }

  // 설정 가져오기/내보내기
  public exportSettings(): string {
    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      settings: this.settings,
      metadata: {
        exportedBy: 'system',
        description: '엔드밀 관리 시스템 설정 내보내기'
      }
    }

    return JSON.stringify(exportData, null, 2)
  }

  public importSettings(jsonData: string, changedBy: string = 'system'): void {
    try {
      const importData = JSON.parse(jsonData)
      
      if (!importData.settings) {
        throw new Error('유효하지 않은 설정 파일입니다.')
      }

      const validation = this.validateSettings(importData.settings)
      if (!validation.isValid) {
        throw new Error(`설정 가져오기 실패: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      this.updateSettings(importData.settings, changedBy, '설정 가져오기')
    } catch (error) {
      throw new Error(`설정 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 설정 히스토리 조회
  public getHistory(category?: SettingsCategory, limit?: number): SettingsHistory[] {
    let filtered = [...this.history]

    if (category) {
      filtered = filtered.filter(h => h.category === category)
    }

    if (limit) {
      filtered = filtered.slice(-limit)
    }

    return filtered.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
  }

  // 히스토리 초기화
  public clearHistory(category?: SettingsCategory): void {
    if (category) {
      this.history = this.history.filter(h => h.category !== category)
    } else {
      this.history = []
    }
    this.saveHistory()
  }
}

// 싱글톤 인스턴스 내보내기
export const settingsManager = SettingsManager.getInstance() 