import { createServerClient } from '../supabase/client'
import { logger } from './logger'

/**
 * 서버 사이드에서 설정값을 조회하는 헬퍼 함수
 */
export async function getSetting<T = any>(
  category: string,
  key: string,
  defaultValue?: T
): Promise<T> {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('category', category)
      .eq('key', key)
      .single()

    if (error) {
      logger.warn(`설정 조회 실패 (${category}.${key}):`, error)
      return defaultValue as T
    }

    return data?.value as T ?? defaultValue as T
  } catch (error) {
    logger.error(`설정 조회 오류 (${category}.${key}):`, error)
    return defaultValue as T
  }
}

/**
 * 카테고리 전체 설정 조회
 */
export async function getCategorySettings<T = any>(
  category: string
): Promise<T | null> {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('category', category)

    if (error) {
      logger.warn(`카테고리 설정 조회 실패 (${category}):`, error)
      return null
    }

    // key-value 객체로 변환
    const settings: any = {}
    data?.forEach((item: any) => {
      settings[item.key] = item.value
    })

    return settings as T
  } catch (error) {
    logger.error(`카테고리 설정 조회 오류 (${category}):`, error)
    return null
  }
}

/**
 * 여러 설정을 한번에 조회
 */
export async function getSettings(
  settings: Array<{ category: string; key: string; defaultValue?: any }>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {}

  await Promise.all(
    settings.map(async ({ category, key, defaultValue }) => {
      const value = await getSetting(category, key, defaultValue)
      results[`${category}.${key}`] = value
    })
  )

  return results
}

/**
 * 시스템 설정 조회 (자주 사용되는 설정들)
 */
export const SystemSettings = {
  async getDefaultLanguage() {
    return getSetting<string>('system', 'defaultLanguage', 'ko')
  },

  async getSessionTimeout() {
    return getSetting<number>('system', 'sessionTimeout', 30)
  },

  async getItemsPerPage() {
    return getSetting<number>('system', 'itemsPerPage', 20)
  },

  async getMaxFileSize() {
    return getSetting<number>('system', 'maxFileSize', 10)
  },

  async getDateFormat() {
    return getSetting<string>('system', 'dateFormat', 'YYYY-MM-DD')
  }
}

/**
 * 설비 설정 조회
 */
export const EquipmentSettings = {
  async getModels() {
    return getSetting<string[]>('equipment', 'models', ['PA1', 'PA2', 'PS', 'B7', 'Q7'])
  },

  async getProcesses() {
    return getSetting<string[]>('equipment', 'processes', ['CNC1', 'CNC2', 'CNC2-1'])
  },

  async getLocations() {
    return getSetting<string[]>('equipment', 'locations', ['A동', 'B동'])
  },

  async getStatuses() {
    return getSetting<any[]>('equipment', 'statuses', [
      { code: '가동중', name: '가동 중', color: 'green', icon: '🟢', isActive: true, order: 1 },
      { code: '점검중', name: '점검 중', color: 'red', icon: '🔧', isActive: true, order: 2 },
      { code: '셋업중', name: '셋업 중', color: 'purple', icon: '⚙️', isActive: true, order: 3 }
    ])
  },

  async getTotalCount() {
    return getSetting<number>('equipment', 'totalCount', 800)
  },

  async getToolPositionCount() {
    return getSetting<number>('equipment', 'toolPositionCount', 21)
  }
}

/**
 * 재고 설정 조회
 */
export const InventorySettings = {
  async getCategories() {
    return getSetting<string[]>('inventory', 'categories', ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL'])
  },

  async getSuppliers() {
    return getSetting<string[]>('inventory', 'suppliers', ['KORLOY', 'SANDVIK', 'ISCAR', 'MITSUBISHI', 'KENNAMETAL', 'TUNGALOY'])
  },

  async getStockThresholds() {
    return getSetting<{ criticalPercent: number; lowPercent: number }>(
      'inventory',
      'stockThresholds',
      { criticalPercent: 50, lowPercent: 100 }
    )
  },

  async getDefaultValues() {
    return getSetting<{ minStock: number; maxStock: number; standardLife: number }>(
      'inventory',
      'defaultValues',
      { minStock: 20, maxStock: 100, standardLife: 2000 }
    )
  }
}

/**
 * 교체 이력 설정 조회
 */
export const ToolChangeSettings = {
  async getReasons() {
    return getSetting<string[]>('toolChanges', 'reasons', ['수명완료', '파손', '마모', '예방교체', '모델변경', '기타'])
  },

  async getDefaultReason() {
    return getSetting<string>('toolChanges', 'defaultReason', '수명완료')
  },

  async getTNumberRange() {
    return getSetting<{ min: number; max: number }>('toolChanges', 'tNumberRange', { min: 1, max: 21 })
  },

  async getLifeThresholds() {
    return getSetting<{ warning: number; critical: number }>(
      'toolChanges',
      'lifeThresholds',
      { warning: 80, critical: 95 }
    )
  }
}

/**
 * 알림 설정 조회
 */
export const NotificationSettings = {
  async isEmailEnabled() {
    const emailSettings = await getSetting<{ enabled: boolean }>('notifications', 'email', { enabled: false })
    return emailSettings?.enabled ?? false
  },

  async isRealtimeEnabled() {
    const realtimeSettings = await getSetting<{ enabled: boolean }>('notifications', 'realtime', { enabled: true })
    return realtimeSettings?.enabled ?? true
  },

  async getScheduling() {
    return getSetting<{ dailyReport: string; weeklyReport: string; monthlyReport: string }>(
      'notifications',
      'scheduling',
      {
        dailyReport: '08:00',
        weeklyReport: '월요일 09:00',
        monthlyReport: '1일 10:00'
      }
    )
  }
}
