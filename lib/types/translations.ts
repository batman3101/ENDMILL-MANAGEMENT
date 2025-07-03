// 지원하는 언어 코드
export type SupportedLanguage = 'ko' | 'vi';

// 번역 키 타입 (네임스페이스 구조)
export type TranslationNamespace = 
  | 'common'
  | 'navigation'
  | 'dashboard'
  | 'equipment'
  | 'endmill'
  | 'inventory'
  | 'camSheets'
  | 'toolChanges'
  | 'reports'
  | 'settings'
  | 'users'
  | 'auth';

// 번역 키 구조
export interface TranslationKey {
  namespace: TranslationNamespace;
  key: string;
  context?: string; // 번역 컨텍스트 (선택사항)
}

// 번역 값 구조
export interface TranslationValue {
  id: string;
  namespace: TranslationNamespace;
  key: string;
  translations: Record<SupportedLanguage, string>;
  context?: string;
  isAutoTranslated: boolean; // Google Translate로 자동 번역된 것인지
  lastUpdated: string;
  createdAt: string;
}

// 번역 데이터 전체 구조
export interface TranslationData {
  [namespace: string]: {
    [key: string]: Record<SupportedLanguage, string>;
  };
}

// Google Translate API 요청 타입
export interface GoogleTranslateRequest {
  text: string;
  sourceLang: SupportedLanguage;
  targetLang: SupportedLanguage;
  context?: string;
}

// Google Translate API 응답 타입
export interface GoogleTranslateResponse {
  translatedText: string;
  sourceText: string;
  sourceLang: SupportedLanguage;
  targetLang: SupportedLanguage;
  confidence?: number;
}

// 번역 관리 설정
export interface TranslationSettings {
  defaultLanguage: SupportedLanguage;
  fallbackLanguage: SupportedLanguage;
  autoTranslate: boolean; // 새로운 키 추가 시 자동 번역 여부
  googleApiKey: string;
  cacheEnabled: boolean;
  cacheExpiry: number; // 캐시 만료 시간 (분)
}

// 번역 통계
export interface TranslationStats {
  totalKeys: number;
  translatedKeys: Record<SupportedLanguage, number>;
  autoTranslatedKeys: number;
  manualTranslatedKeys: number;
  missingTranslations: Record<SupportedLanguage, string[]>;
  lastSyncAt: string;
}

// 번역 관리 상태
export interface TranslationManagementState {
  currentLanguage: SupportedLanguage;
  translations: TranslationData;
  settings: TranslationSettings;
  stats: TranslationStats;
  isLoading: boolean;
  error: string | null;
}

// 번역 컨텍스트 (React Context용)
export interface TranslationContextType {
  currentLanguage: SupportedLanguage;
  translations: TranslationData;
  t: (namespace: TranslationNamespace, key: string, params?: Record<string, any>) => string;
  changeLanguage: (language: SupportedLanguage) => void;
  addTranslation: (translation: Omit<TranslationValue, 'id' | 'createdAt' | 'lastUpdated'>) => Promise<void>;
  updateTranslation: (id: string, updates: Partial<TranslationValue>) => Promise<void>;
  deleteTranslation: (id: string) => Promise<void>;
  autoTranslate: (text: string, targetLang: SupportedLanguage, context?: string) => Promise<string>;
  exportTranslations: () => string;
  importTranslations: (data: string) => Promise<void>;
}

// 번역 검증 결과
export interface TranslationValidationResult {
  isValid: boolean;
  errors: TranslationValidationError[];
  warnings: TranslationValidationWarning[];
}

export interface TranslationValidationError {
  namespace: TranslationNamespace;
  key: string;
  language: SupportedLanguage;
  message: string;
}

export interface TranslationValidationWarning {
  namespace: TranslationNamespace;
  key: string;
  language: SupportedLanguage;
  message: string;
  suggestion?: string;
}

// 번역 가져오기/내보내기 형식
export interface TranslationExport {
  version: string;
  timestamp: string;
  translations: TranslationData;
  metadata: {
    exportedBy: string;
    totalKeys: number;
    languages: SupportedLanguage[];
    description?: string;
  };
}

// 번역 히스토리 (변경 내역 추적)
export interface TranslationHistory {
  id: string;
  translationId: string;
  namespace: TranslationNamespace;
  key: string;
  language: SupportedLanguage;
  oldValue: string;
  newValue: string;
  changeType: 'create' | 'update' | 'delete' | 'auto_translate';
  changedBy: string;
  changedAt: string;
  reason?: string;
} 