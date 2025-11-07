// 설정 모듈 타입 정의
export interface SystemSettings {
  // 기본 시스템 설정
  system: {
    defaultLanguage: 'ko' | 'vi'
    currency: 'VND'
    timezone: string
    dateFormat: string
    sessionTimeout: number // 분
    autoLogout: boolean
    itemsPerPage: number
    maxFileSize: number // MB
  }

  // 설비 관리 설정
  equipment: {
    totalCount: number
    numberFormat: string // 예: 'C{number:3}'
    locations: string[]
    toolPositionCount: number // T1-T21
    statuses: EquipmentStatusConfig[]
    defaultStatus: string
    models: string[]
    processes: string[]
  }

  // 재고 관리 설정
  inventory: {
    categories: string[]
    suppliers: string[]
    stockThresholds: {
      criticalPercent: number // 위험 임계값 (%)
      lowPercent: number // 부족 임계값 (%)
    }
    defaultValues: {
      minStock: number
      maxStock: number
      standardLife: number
    }
    statuses: InventoryStatusConfig[]
  }

  // 교체 이력 설정
  toolChanges: {
    reasons: string[]
    defaultReason: string
    tNumberRange: {
      min: number
      max: number
    }
    lifeThresholds: {
      warning: number // %
      critical: number // %
    }
  }

  // 사용자 및 조직 설정
  organization: {
    departments: string[]
    shifts: string[]
    roles: UserRoleConfig[]
    defaultRole: string
    defaultShift: string
  }

  // UI/UX 설정
  ui: {
    theme: 'light' | 'dark' | 'auto'
    sidebarCollapsed: boolean
    notifications: {
      enabled: boolean
      position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
      duration: number // 초
    }
    dashboard: {
      refreshInterval: number // 초
      chartColors: string[]
    }
  }

  // 알림 설정
  notifications: {
    email: {
      enabled: boolean
      recipientGroups: string[]
    }
    realtime: {
      enabled: boolean
      types: NotificationTypeConfig[]
    }
    scheduling: {
      dailyReport: string // HH:MM 형식
      weeklyReport: string
      monthlyReport: string
    }
  }

  // 번역 설정
  translations?: {
    enabled?: boolean
    defaultLanguage?: 'ko' | 'vi'
    fallbackLanguage?: 'ko' | 'vi'
    autoTranslate?: boolean
    googleApiKey?: string
    googleProjectId?: string
    googleLocation?: string
    useAdvancedAPI?: boolean
    apiUsage?: {
      currentUsage?: number
      monthlyLimit?: number
      lastResetDate?: string
    }
    cacheEnabled?: boolean
    cacheExpiry?: number
  }
}

// 설비 상태 설정
export interface EquipmentStatusConfig {
  code: string
  name: string
  color: string
  icon: string
  description?: string
  isActive: boolean
  order: number
}

// 재고 상태 설정
export interface InventoryStatusConfig {
  code: 'sufficient' | 'low' | 'critical'
  name: string
  color: string
  threshold: number // 백분율
  description?: string
}

// 사용자 역할 설정
export interface UserRoleConfig {
  code: string
  name: string
  permissions: string[]
  description?: string
  isActive: boolean
}

// 알림 타입 설정
export interface NotificationTypeConfig {
  type: 'equipment_status' | 'inventory_low' | 'tool_change' | 'system'
  enabled: boolean
  priority: 'high' | 'medium' | 'low'
  channels: ('ui' | 'email' | 'sms')[]
  template?: string
}

// 설정 카테고리 타입
export type SettingsCategory =
  | 'system'
  | 'equipment'
  | 'inventory'
  | 'toolChanges'
  | 'organization'
  | 'ui'
  | 'notifications'
  | 'translations'

// 설정 수정 내역
export interface SettingsHistory {
  id: string
  category: SettingsCategory
  field: string
  oldValue: any
  newValue: any
  changedBy: string
  changedAt: string
  reason?: string
}

// 설정 가져오기/내보내기 형식
export interface SettingsExport {
  version: string
  timestamp: string
  settings: SystemSettings
  metadata: {
    exportedBy: string
    description?: string
  }
}

// 설정 유효성 검증 결과
export interface SettingsValidationResult {
  isValid: boolean
  errors: SettingsValidationError[]
  warnings: SettingsValidationWarning[]
}

export interface SettingsValidationError {
  category: SettingsCategory
  field: string
  message: string
  value: any
}

export interface SettingsValidationWarning {
  category: SettingsCategory
  field: string
  message: string
  suggestion?: string
}

// 기본 설정값
export const DEFAULT_SETTINGS: SystemSettings = {
  system: {
    defaultLanguage: 'ko',
    currency: 'VND',
    timezone: 'Asia/Seoul',
    dateFormat: 'YYYY-MM-DD',
    sessionTimeout: 30,
    autoLogout: true,
    itemsPerPage: 20,
    maxFileSize: 10
  },

  equipment: {
    totalCount: 800,
    numberFormat: 'C{number:3}',
    locations: ['A동', 'B동'],
    toolPositionCount: 21,
    statuses: [
      { code: '가동중', name: '가동 중', color: 'green', icon: '🟢', isActive: true, order: 1 },
      { code: '점검중', name: '점검 중', color: 'red', icon: '🔧', isActive: true, order: 2 },
      { code: '셋업중', name: '셋업 중', color: 'purple', icon: '⚙️', isActive: true, order: 3 }
    ],
    defaultStatus: '가동중',
    models: ['PA1', 'PA2', 'PS', 'B7', 'Q7'],
    processes: ['CNC1', 'CNC2', 'CNC2-1']
  },

  inventory: {
    categories: ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL'],
    suppliers: ['KORLOY', 'SANDVIK', 'ISCAR', 'MITSUBISHI', 'KENNAMETAL', 'TUNGALOY'],
    stockThresholds: {
      criticalPercent: 50,
      lowPercent: 100
    },
    defaultValues: {
      minStock: 20,
      maxStock: 100,
      standardLife: 2000
    },
    statuses: [
      { code: 'sufficient', name: '충분', color: 'green', threshold: 100 },
      { code: 'low', name: '부족', color: 'yellow', threshold: 50 },
      { code: 'critical', name: '위험', color: 'red', threshold: 0 }
    ]
  },

  toolChanges: {
    reasons: ['수명완료', '파손', '마모', '예방교체', '모델변경', '추가SETUP', '기타'],
    defaultReason: '수명완료',
    tNumberRange: { min: 1, max: 21 },
    lifeThresholds: {
      warning: 80,
      critical: 95
    }
  },

  organization: {
    departments: ['종합 관리실', '공구 관리실', '기술팀'],
    shifts: ['A', 'B'],
    roles: [
      { 
        code: 'admin', 
        name: '관리자', 
        permissions: ['*'], 
        isActive: true 
      },
      { 
        code: 'manager', 
        name: '매니저', 
        permissions: ['read', 'write', 'export'], 
        isActive: true 
      },
      { 
        code: 'operator', 
        name: '운영자', 
        permissions: ['read', 'tool_change'], 
        isActive: true 
      }
    ],
    defaultRole: 'operator',
    defaultShift: 'A'
  },

  ui: {
    theme: 'light',
    sidebarCollapsed: false,
    notifications: {
      enabled: true,
      position: 'top-right',
      duration: 5
    },
    dashboard: {
      refreshInterval: 30,
      chartColors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    }
  },

  notifications: {
    email: {
      enabled: false,
      recipientGroups: ['managers', 'admins']
    },
    realtime: {
      enabled: true,
      types: [
        { type: 'equipment_status', enabled: true, priority: 'high', channels: ['ui'] },
        { type: 'inventory_low', enabled: true, priority: 'medium', channels: ['ui'] },
        { type: 'tool_change', enabled: true, priority: 'low', channels: ['ui'] },
        { type: 'system', enabled: true, priority: 'high', channels: ['ui'] }
      ]
    },
    scheduling: {
      dailyReport: '08:00',
      weeklyReport: '월요일 09:00',
      monthlyReport: '1일 10:00'
    }
  }
} 