import { TranslationData } from '../../types/translations'

// 한국어 번역 데이터 (기본 언어)
export const koTranslations: TranslationData = {
  // 공통 용어
  common: {
    // 기본 액션
    save: { ko: '저장', vi: '' },
    cancel: { ko: '취소', vi: '' },
    delete: { ko: '삭제', vi: '' },
    edit: { ko: '수정', vi: '' },
    add: { ko: '추가', vi: '' },
    create: { ko: '생성', vi: '' },
    update: { ko: '업데이트', vi: '' },
    search: { ko: '검색', vi: '' },
    filter: { ko: '필터', vi: '' },
    export: { ko: '내보내기', vi: '' },
    import: { ko: '가져오기', vi: '' },
    download: { ko: '다운로드', vi: '' },
    upload: { ko: '업로드', vi: '' },
    reset: { ko: '초기화', vi: '' },
    refresh: { ko: '새로고침', vi: '' },
    loading: { ko: '로딩 중...', vi: '' },
    
    // 상태
    status: { ko: '상태', vi: '' },
    active: { ko: '활성', vi: '' },
    inactive: { ko: '비활성', vi: '' },
    enabled: { ko: '활성화', vi: '' },
    disabled: { ko: '비활성화', vi: '' },
    success: { ko: '성공', vi: '' },
    error: { ko: '오류', vi: '' },
    warning: { ko: '경고', vi: '' },
    info: { ko: '정보', vi: '' },
    
    // 기본 필드
    name: { ko: '이름', vi: '' },
    code: { ko: '코드', vi: '' },
    description: { ko: '설명', vi: '' },
    date: { ko: '날짜', vi: '' },
    time: { ko: '시간', vi: '' },
    type: { ko: '타입', vi: '' },
    category: { ko: '카테고리', vi: '' },
    location: { ko: '위치', vi: '' },
    quantity: { ko: '수량', vi: '' },
    price: { ko: '가격', vi: '' },
    
    // 시스템 정보
    lastUpdate: { ko: '마지막 업데이트', vi: 'Cập nhật cuối' },
    admin: { ko: '관리자', vi: 'Quản trị viên' },
    
    // 메시지
    confirmDelete: { ko: '정말 삭제하시겠습니까?', vi: '' },
    saveSuccess: { ko: '성공적으로 저장되었습니다.', vi: '' },
    deleteSuccess: { ko: '성공적으로 삭제되었습니다.', vi: '' },
    updateSuccess: { ko: '성공적으로 업데이트되었습니다.', vi: '' },
    noData: { ko: '데이터가 없습니다.', vi: '' },
    noResults: { ko: '검색 결과가 없습니다.', vi: '' },
  },

  // 네비게이션
  navigation: {
    dashboard: { ko: '대시보드', vi: 'Bảng điều khiển' },
    equipment: { ko: '설비 관리', vi: 'Quản lý thiết bị' },
    endmill: { ko: '앤드밀 관리', vi: 'Quản lý dao phay' },
    inventory: { ko: '재고 관리', vi: 'Quản lý tồn kho' },
    camSheets: { ko: 'CAM SHEET 관리', vi: 'Quản lý CAM SHEET' },
    toolChanges: { ko: '교체 실적', vi: 'Kết quả thay thế' },
    reports: { ko: '분석 & 리포트', vi: 'Phân tích & Báo cáo' },
    settings: { ko: '설정', vi: 'Cài đặt' },
    users: { ko: '사용자 관리', vi: 'Quản lý người dùng' },
    translations: { ko: '번역 관리', vi: 'Quản lý dịch thuật' },
    logout: { ko: '로그아웃', vi: 'Đăng xuất' },
  },

  // 대시보드
  dashboard: {
    title: { ko: '대시보드', vi: 'Bảng điều khiển' },
    subtitle: { ko: '실시간 CNC 앤드밀 관리 현황', vi: 'Tình trạng quản lý dao phay CNC thời gian thực' },
    totalEquipment: { ko: '총 CNC 설비', vi: 'Tổng thiết bị CNC' },
    toolChanges: { ko: '교체 부품', vi: 'Linh kiện thay thế' },
    todayChanges: { ko: '오늘 교체', vi: 'Thay thế hôm nay' },
    equipmentStatus: { ko: '설비 가동 현황', vi: 'Tình trạng hoạt động thiết bị' },
    equipmentCount: { ko: '대', vi: 'máy' },
    pieceCount: { ko: '개', vi: 'cái' },
    percentCount: { ko: '%', vi: '%' },
    operatingRate: { ko: '가동률', vi: 'Tỷ lệ hoạt động' },
    maintenanceCount: { ko: '점검중', vi: 'Đang bảo trì' },
    setupCount: { ko: '셋업중', vi: 'Đang thiết lập' },
  },

  // 설비 관리
  equipment: {
    title: { ko: '설비 관리', vi: '' },
    subtitle: { ko: '800대 CNC 설비 현황 및 관리', vi: '' },
    equipmentNumber: { ko: '설비번호', vi: '' },
    model: { ko: '모델', vi: '' },
    process: { ko: '공정', vi: '' },
    location: { ko: '위치', vi: '' },
    status: { ko: '상태', vi: '' },
    lastMaintenance: { ko: '마지막 정비', vi: '' },
    toolPositions: { ko: '툴 포지션', vi: '' },
    
    // 상태
    operating: { ko: '가동중', vi: '' },
    maintenance: { ko: '점검중', vi: '' },
    setup: { ko: '셋업중', vi: '' },
    
    // 메시지
    statusChanged: { ko: '설비 상태가 변경되었습니다.', vi: '' },
    addEquipment: { ko: '설비 추가', vi: '' },
  },

  // 앤드밀 관리
  endmill: {
    title: { ko: '앤드밀 관리', vi: '' },
    subtitle: { ko: '앤드밀 별 모델, 설비, 공정의 사용 현황', vi: '' },
    endmillCode: { ko: '앤드밀 코드', vi: '' },
    endmillName: { ko: '앤드밀 이름', vi: '' },
    specifications: { ko: '사양', vi: '' },
    toolLife: { ko: 'Tool Life', vi: '' },
    currentLife: { ko: '현재 수명', vi: '' },
    totalLife: { ko: '총 수명', vi: '' },
    tNumber: { ko: 'T번호', vi: '' },
    installDate: { ko: '설치일', vi: '' },
    
    // 상태
    new: { ko: '신규', vi: '' },
    normal: { ko: '정상', vi: '' },
    warning: { ko: '교체 권장', vi: '' },
    critical: { ko: '즉시 교체', vi: '' },
  },

  // 재고 관리
  inventory: {
    title: { ko: '재고 관리', vi: '' },
    subtitle: { ko: '앤드밀 재고 현황 및 공급업체별 단가 비교', vi: '' },
    currentStock: { ko: '현재 재고', vi: '' },
    minStock: { ko: '최소 재고', vi: '' },
    maxStock: { ko: '최대 재고', vi: '' },
    supplier: { ko: '공급업체', vi: '' },
    unitPrice: { ko: '단가', vi: '' },
    totalValue: { ko: '총 금액', vi: '' },
    stockStatus: { ko: '재고 상태', vi: '' },
    
    // 상태
    sufficient: { ko: '충분', vi: '' },
    low: { ko: '부족', vi: '' },
    critical: { ko: '위험', vi: '' },
    
    // 입출고
    inbound: { ko: '입고', vi: '' },
    outbound: { ko: '출고', vi: '' },
    inboundManagement: { ko: '입고 관리', vi: '' },
    outboundManagement: { ko: '출고 관리', vi: '' },
  },

  // CAM SHEET 관리
  camSheets: {
    title: { ko: 'CAM SHEET 관리', vi: '' },
    subtitle: { ko: 'CAM SHEET 등록 및 엔드밀 정보 관리', vi: '' },
    camVersion: { ko: 'CAM 버전', vi: '' },
    versionDate: { ko: '버전 변경일자', vi: '' },
    registeredEndmills: { ko: '등록 앤드밀', vi: '' },
    lastModified: { ko: '마지막 수정', vi: '' },
    addCAMSheet: { ko: 'CAM Sheet 등록', vi: '' },
    excelBulkUpload: { ko: '엑셀 일괄 등록', vi: '' },
  },

  // 교체 실적
  toolChanges: {
    title: { ko: '교체 실적', vi: '' },
    subtitle: { ko: '앤드밀 교체 이력 관리', vi: '' },
    changeDate: { ko: '교체일자', vi: '' },
    productionModel: { ko: '생산모델', vi: '' },
    changedBy: { ko: '교체자', vi: '' },
    changeReason: { ko: '교체사유', vi: '' },
    
    // 교체 사유
    lifeCompleted: { ko: '수명완료', vi: '' },
    broken: { ko: '파손', vi: '' },
    wear: { ko: '마모', vi: '' },
    preventive: { ko: '예방교체', vi: '' },
    modelChange: { ko: '모델변경', vi: '' },
    other: { ko: '기타', vi: '' },
  },

  // 리포트
  reports: {
    title: { ko: '분석 & 리포트', vi: '' },
    subtitle: { ko: '데이터 분석 및 리포트 생성', vi: '' },
    generateReport: { ko: '리포트 생성', vi: '' },
    dailyReport: { ko: '일일 리포트', vi: '' },
    weeklyReport: { ko: '주간 리포트', vi: '' },
    monthlyReport: { ko: '월간 리포트', vi: '' },
  },

  // 설정
  settings: {
    title: { ko: '설정', vi: '' },
    subtitle: { ko: '시스템 설정 관리', vi: '' },
    systemSettings: { ko: '시스템 설정', vi: '' },
    equipmentSettings: { ko: '설비 설정', vi: '' },
    inventorySettings: { ko: '재고 설정', vi: '' },
    translationSettings: { ko: '번역 설정', vi: '' },
    
    // 번역 설정
    languageManagement: { ko: '언어 관리', vi: '' },
    defaultLanguage: { ko: '기본 언어', vi: '' },
    fallbackLanguage: { ko: '대체 언어', vi: '' },
    autoTranslate: { ko: '자동 번역', vi: '' },
    googleApiKey: { ko: 'Google API 키', vi: '' },
    cacheSettings: { ko: '캐시 설정', vi: '' },
    translationCache: { ko: '번역 캐시', vi: '' },
    cacheExpiry: { ko: '캐시 만료 시간', vi: '' },
  },

  // 사용자 관리
  users: {
    title: { ko: '사용자 관리', vi: '' },
    subtitle: { ko: '사용자 계정 및 권한 관리', vi: '' },
    userName: { ko: '사용자명', vi: '' },
    email: { ko: '이메일', vi: '' },
    role: { ko: '역할', vi: '' },
    department: { ko: '부서', vi: '' },
    shift: { ko: '교대', vi: '' },
    lastLogin: { ko: '마지막 로그인', vi: '' },
    
    // 역할
    admin: { ko: '관리자', vi: '' },
    manager: { ko: '매니저', vi: '' },
    operator: { ko: '운영자', vi: '' },
  },

  // 인증
  auth: {
    login: { ko: '로그인', vi: 'Đăng nhập' },
    logout: { ko: '로그아웃', vi: 'Đăng xuất' },
    email: { ko: '이메일', vi: 'Email' },
    password: { ko: '비밀번호', vi: 'Mật khẩu' },
    rememberMe: { ko: '로그인 상태 유지', vi: 'Ghi nhớ đăng nhập' },
    forgotPassword: { ko: '비밀번호를 잊으셨나요?', vi: 'Quên mật khẩu?' },
    loginTitle: { ko: 'CNC 앤드밀 관리 시스템', vi: 'Hệ thống quản lý dao phay CNC' },
    loginSubtitle: { ko: '관리자 로그인', vi: 'Đăng nhập quản trị viên' },
    noAccount: { ko: '계정이 없으신가요?', vi: 'Chưa có tài khoản?' },
    contactAdmin: { ko: '관리자에게 문의하세요', vi: 'Liên hệ quản trị viên' },
  },
} 