import { TranslationData, SupportedLanguage } from '../../types/translations'
import { koTranslations } from './ko'

// 베트남어 번역 데이터 (향후 추가 예정)
export const viTranslations: TranslationData = {
  // 공통 용어
  common: {
    save: { ko: '저장', vi: 'Lưu' },
    cancel: { ko: '취소', vi: 'Hủy' },
    delete: { ko: '삭제', vi: 'Xóa' },
    edit: { ko: '수정', vi: 'Chỉnh sửa' },
    add: { ko: '추가', vi: 'Thêm' },
    create: { ko: '생성', vi: 'Tạo' },
    update: { ko: '업데이트', vi: 'Cập nhật' },
    search: { ko: '검색', vi: 'Tìm kiếm' },
    filter: { ko: '필터', vi: 'Bộ lọc' },
    export: { ko: '내보내기', vi: 'Xuất' },
    import: { ko: '가져오기', vi: 'Nhập' },
    loading: { ko: '로딩 중...', vi: 'Đang tải...' },
    
    // 상태
    status: { ko: '상태', vi: 'Trạng thái' },
    active: { ko: '활성', vi: 'Hoạt động' },
    inactive: { ko: '비활성', vi: 'Không hoạt động' },
    enabled: { ko: '활성화', vi: 'Kích hoạt' },
    disabled: { ko: '비활성화', vi: 'Vô hiệu hóa' },
    
    // 메시지
    noData: { ko: '데이터가 없습니다.', vi: 'Không có dữ liệu.' },
    noResults: { ko: '검색 결과가 없습니다.', vi: 'Không có kết quả tìm kiếm.' },
  },

  // 네비게이션
  navigation: {
    dashboard: { ko: '대시보드', vi: 'Bảng điều khiển' },
    equipment: { ko: '설비 관리', vi: 'Quản lý thiết bị' },
    endmill: { ko: '앤드밀 관리', vi: 'Quản lý dao phay' },
    inventory: { ko: '재고 관리', vi: 'Quản lý kho' },
    camSheets: { ko: 'CAM SHEET 관리', vi: 'Quản lý CAM SHEET' },
    toolChanges: { ko: '교체 실적', vi: 'Thay đổi dụng cụ' },
    reports: { ko: '분석 & 리포트', vi: 'Phân tích & Báo cáo' },
    settings: { ko: '설정', vi: 'Cài đặt' },
    users: { ko: '사용자 관리', vi: 'Quản lý người dùng' },
    translations: { ko: '번역 관리', vi: 'Quản lý dịch thuật' },
    logout: { ko: '로그아웃', vi: 'Đăng xuất' },
  },

  // 대시보드
  dashboard: {
    title: { ko: '대시보드', vi: 'Bảng điều khiển' },
    subtitle: { ko: '실시간 CNC 앤드밀 관리 현황', vi: 'Trạng thái quản lý dao phay CNC thời gian thực' },
    totalEquipment: { ko: '총 CNC 설비', vi: 'Tổng thiết bị CNC' },
    toolChanges: { ko: '교체 부품', vi: 'Thay đổi dụng cụ' },
    todayChanges: { ko: '오늘 교체', vi: 'Thay đổi hôm nay' },
    equipmentStatus: { ko: '설비 가동 현황', vi: 'Trạng thái vận hành thiết bị' },
    operatingRate: { ko: '가동률', vi: 'Tỷ lệ hoạt động' },
  },

  // 설비 관리
  equipment: {
    title: { ko: '설비 관리', vi: 'Quản lý thiết bị' },
    subtitle: { ko: '800대 CNC 설비 현황 및 관리', vi: 'Trạng thái và quản lý 800 thiết bị CNC' },
    equipmentNumber: { ko: '설비번호', vi: 'Số thiết bị' },
    model: { ko: '모델', vi: 'Mô hình' },
    process: { ko: '공정', vi: 'Quy trình' },
    location: { ko: '위치', vi: 'Vị trí' },
    status: { ko: '상태', vi: 'Trạng thái' },
    
    // 상태
    operating: { ko: '가동중', vi: 'Đang hoạt động' },
    maintenance: { ko: '점검중', vi: 'Đang bảo trì' },
    setup: { ko: '셋업중', vi: 'Đang thiết lập' },
  },

  // 재고 관리
  inventory: {
    title: { ko: '재고 관리', vi: 'Quản lý kho' },
    subtitle: { ko: '앤드밀 재고 현황 및 공급업체별 단가 비교', vi: 'Trạng thái kho dao phay và so sánh giá theo nhà cung cấp' },
    currentStock: { ko: '현재 재고', vi: 'Kho hiện tại' },
    supplier: { ko: '공급업체', vi: 'Nhà cung cấp' },
    unitPrice: { ko: '단가', vi: 'Đơn giá' },
    
    // 상태
    sufficient: { ko: '충분', vi: 'Đủ' },
    low: { ko: '부족', vi: 'Thiếu' },
    critical: { ko: '위험', vi: 'Nguy hiểm' },
    
    inbound: { ko: '입고', vi: 'Nhập kho' },
    outbound: { ko: '출고', vi: 'Xuất kho' },
  },

  // 설정
  settings: {
    title: { ko: '설정', vi: 'Cài đặt' },
    subtitle: { ko: '시스템 설정 관리', vi: 'Quản lý cài đặt hệ thống' },
    systemSettings: { ko: '시스템 설정', vi: 'Cài đặt hệ thống' },
    translationSettings: { ko: '번역 설정', vi: 'Cài đặt dịch thuật' },
    languageManagement: { ko: '언어 관리', vi: 'Quản lý ngôn ngữ' },
    defaultLanguage: { ko: '기본 언어', vi: 'Ngôn ngữ mặc định' },
    autoTranslate: { ko: '자동 번역', vi: 'Dịch tự động' },
  },

  // 인증
  auth: {
    login: { ko: '로그인', vi: 'Đăng nhập' },
    logout: { ko: '로그아웃', vi: 'Đăng xuất' },
    email: { ko: '이메일', vi: 'Email' },
    password: { ko: '비밀번호', vi: 'Mật khẩu' },
    loginTitle: { ko: 'CNC 앤드밀 관리 시스템', vi: 'Hệ thống quản lý dao phay CNC' },
  },

  // 기타 네임스페이스는 빈 값으로 초기화 (추후 번역 추가)
  endmill: {},
  camSheets: {},
  toolChanges: {},
  reports: {},
  users: {},
}

/**
 * 지원되는 모든 언어의 번역 데이터
 */
export const allTranslations: Record<SupportedLanguage, TranslationData> = {
  ko: koTranslations,
  vi: viTranslations
}

/**
 * 기본 번역 데이터 (한국어)
 */
export const defaultTranslations = koTranslations

/**
 * 언어별 번역 데이터 조회
 */
export function getTranslationsByLanguage(language: SupportedLanguage): TranslationData {
  return allTranslations[language] || defaultTranslations
}

/**
 * 모든 지원 언어 목록
 */
export const supportedLanguages: SupportedLanguage[] = ['ko', 'vi']

/**
 * 언어 정보
 */
export const languageInfo: Record<SupportedLanguage, { name: string; nativeName: string; flag: string }> = {
  ko: {
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷'
  },
  vi: {
    name: 'Vietnamese', 
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳'
  }
}

/**
 * 번역 키가 누락된 항목들을 찾기
 */
export function findMissingTranslations(): Record<SupportedLanguage, string[]> {
  const missing: Record<SupportedLanguage, string[]> = { ko: [], vi: [] }
  
  // 한국어를 기준으로 누락된 번역 찾기
  for (const namespace in koTranslations) {
    for (const key in koTranslations[namespace]) {
      for (const lang of supportedLanguages) {
        const translation = allTranslations[lang][namespace]?.[key]?.[lang]
        if (!translation || translation.trim() === '') {
          missing[lang].push(`${namespace}.${key}`)
        }
      }
    }
  }
  
  return missing
} 