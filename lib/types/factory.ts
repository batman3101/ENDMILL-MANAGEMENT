// 공장 정보 타입
export interface Factory {
  id: string
  code: string           // 'ALT', 'ALV'
  name: string           // 'ALMUS TECH', 'ALMUS VINA'
  name_ko: string        // '1공장', '2공장'
  name_vi: string        // 'Nha may 1', 'Nha may 2'
  country: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 사용자 공장 접근 권한 정보 (RPC에서 반환)
export interface UserFactoryAccess {
  factory_id: string
  code: string
  name: string
  name_ko: string
  name_vi: string
  country: string
  timezone: string
  is_default: boolean
}

// Factory Context 타입
export interface FactoryContextType {
  currentFactory: Factory | null
  accessibleFactories: Factory[]
  setCurrentFactory: (factory: Factory) => Promise<void>
  isLoading: boolean
  error: Error | null
}

// 공장 코드 상수
export const FACTORY_CODES = {
  ALT: 'ALT',  // ALMUS TECH (1공장)
  ALV: 'ALV',  // ALMUS VINA (2공장)
} as const

export type FactoryCode = typeof FACTORY_CODES[keyof typeof FACTORY_CODES]

// 공장별 테마 색상
export const FACTORY_COLORS: Record<FactoryCode, { primary: string; bg: string; text: string }> = {
  ALT: {
    primary: '#1e3a8a',  // 파란색
    bg: 'bg-blue-600',
    text: 'text-blue-600'
  },
  ALV: {
    primary: '#059669',  // 초록색
    bg: 'bg-emerald-600',
    text: 'text-emerald-600'
  }
}
