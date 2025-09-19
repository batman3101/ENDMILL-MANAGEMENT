import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// 번역 리소스
const resources = {
  ko: {
    translation: {
      // 공통 용어
      common: {
        // 기본 액션
        save: '저장',
        cancel: '취소',
        delete: '삭제',
        edit: '수정',
        add: '추가',
        create: '생성',
        update: '업데이트',
        search: '검색',
        filter: '필터',
        export: '내보내기',
        import: '가져오기',
        download: '다운로드',
        upload: '업로드',
        reset: '초기화',
        refresh: '새로고침',
        loading: '로딩 중...',

        // 상태
        status: '상태',
        active: '활성',
        inactive: '비활성',
        enabled: '활성화',
        disabled: '비활성화',
        success: '성공',
        error: '오류',
        warning: '경고',
        info: '정보',

        // 기본 필드
        name: '이름',
        code: '코드',
        description: '설명',
        date: '날짜',
        time: '시간',
        type: '타입',
        category: '카테고리',
        location: '위치',
        quantity: '수량',
        price: '가격',

        // 시스템 정보
        lastUpdate: '마지막 업데이트',
        admin: '관리자',

        // 메시지
        confirmDelete: '정말 삭제하시겠습니까?',
        saveSuccess: '성공적으로 저장되었습니다.',
        deleteSuccess: '성공적으로 삭제되었습니다.',
        updateSuccess: '성공적으로 업데이트되었습니다.',
        noData: '데이터가 없습니다.',
        noResults: '검색 결과가 없습니다.',
      },

      // 네비게이션
      navigation: {
        dashboard: '대시보드',
        equipment: '설비 관리',
        endmill: '앤드밀 관리',
        inventory: '재고 관리',
        camSheets: 'CAM SHEET 관리',
        toolChanges: '교체 실적',
        reports: '분석 & 리포트',
        settings: '설정',
        users: '사용자 관리',
        translations: '번역 관리',
        logout: '로그아웃',
      },

      // 대시보드
      dashboard: {
        title: '대시보드',
        subtitle: '실시간 CNC 앤드밀 관리 현황',
        totalEquipment: '총 CNC 설비',
        toolChanges: '교체 부품',
        todayChanges: '오늘 교체',
        equipmentStatus: '설비 가동 현황',
        equipmentCount: '대',
        pieceCount: '개',
        percentCount: '%',
        operatingRate: '가동률',
        maintenanceCount: '점검중',
        setupCount: '셋업중',
      },

      // 설비 관리
      equipment: {
        title: '설비 관리',
        subtitle: '800대 CNC 설비 현황 및 관리',
        equipmentNumber: '설비번호',
        model: '모델',
        process: '공정',
        location: '위치',
        status: '상태',
        lastMaintenance: '마지막 정비',
        toolPositions: '툴 포지션',

        // 상태
        operating: '가동중',
        maintenance: '점검중',
        setup: '셋업중',

        // 메시지
        statusChanged: '설비 상태가 변경되었습니다.',
        addEquipment: '설비 추가',
      },

      // 앤드밀 관리
      endmill: {
        title: '앤드밀 관리',
        subtitle: '앤드밀 별 모델, 설비, 공정의 사용 현황',
        endmillCode: '앤드밀 코드',
        endmillName: '앤드밀 이름',
        specifications: '사양',
        toolLife: 'Tool Life',
        currentLife: '현재 수명',
        totalLife: '총 수명',
        tNumber: 'T번호',
        installDate: '설치일',

        // 상태
        new: '신규',
        normal: '정상',
        warning: '교체 권장',
        critical: '즉시 교체',
      },

      // 재고 관리
      inventory: {
        title: '재고 관리',
        subtitle: '앤드밀 재고 현황 및 공급업체별 단가 비교',
        currentStock: '현재 재고',
        minStock: '최소 재고',
        maxStock: '최대 재고',
        supplier: '공급업체',
        unitPrice: '단가',
        totalValue: '총 금액',
        stockStatus: '재고 상태',

        // 상태
        sufficient: '충분',
        low: '부족',
        critical: '위험',

        // 입출고
        inbound: '입고',
        outbound: '출고',
        inboundManagement: '입고 관리',
        outboundManagement: '출고 관리',
      },

      // CAM SHEET 관리
      camSheets: {
        title: 'CAM SHEET 관리',
        subtitle: 'CAM SHEET 등록 및 엔드밀 정보 관리',
        camVersion: 'CAM 버전',
        versionDate: '버전 변경일자',
        registeredEndmills: '등록 앤드밀',
        lastModified: '마지막 수정',
        addCAMSheet: 'CAM Sheet 등록',
        excelBulkUpload: '엑셀 일괄 등록',
      },

      // 교체 실적
      toolChanges: {
        title: '교체 실적',
        subtitle: '앤드밀 교체 이력 관리',
        changeDate: '교체일자',
        productionModel: '생산모델',
        changedBy: '교체자',
        changeReason: '교체사유',

        // 교체 사유
        lifeCompleted: '수명완료',
        broken: '파손',
        wear: '마모',
        preventive: '예방교체',
        modelChange: '모델변경',
        other: '기타',
      },

      // 리포트
      reports: {
        title: '분석 & 리포트',
        subtitle: '데이터 분석 및 리포트 생성',
        generateReport: '리포트 생성',
        dailyReport: '일일 리포트',
        weeklyReport: '주간 리포트',
        monthlyReport: '월간 리포트',
      },

      // 설정
      settings: {
        title: '설정',
        subtitle: '시스템 설정 관리',
        systemSettings: '시스템 설정',
        equipmentSettings: '설비 설정',
        inventorySettings: '재고 설정',
        translationSettings: '번역 설정',

        // 번역 설정
        languageManagement: '언어 관리',
        defaultLanguage: '기본 언어',
        fallbackLanguage: '대체 언어',
        autoTranslate: '자동 번역',
        googleApiKey: 'Google API 키',
        cacheSettings: '캐시 설정',
        translationCache: '번역 캐시',
        cacheExpiry: '캐시 만료 시간',
      },

      // 사용자 관리
      users: {
        title: '사용자 관리',
        subtitle: '사용자 계정 및 권한 관리',
        userName: '사용자명',
        email: '이메일',
        role: '역할',
        department: '부서',
        shift: '교대',
        lastLogin: '마지막 로그인',

        // 역할
        admin: '관리자',
        manager: '매니저',
        operator: '운영자',
      },

      // 인증
      auth: {
        login: '로그인',
        logout: '로그아웃',
        email: '이메일',
        password: '비밀번호',
        rememberMe: '로그인 상태 유지',
        forgotPassword: '비밀번호를 잊으셨나요?',
        loginTitle: 'CNC 앤드밀 관리 시스템',
        loginSubtitle: '관리자 로그인',
        noAccount: '계정이 없으신가요?',
        contactAdmin: '관리자에게 문의하세요',
      },
    }
  },
  vi: {
    translation: {
      // 공통 용어
      common: {
        // 기본 액션
        save: 'Lưu',
        cancel: 'Hủy',
        delete: 'Xóa',
        edit: 'Chỉnh sửa',
        add: 'Thêm',
        create: 'Tạo',
        update: 'Cập nhật',
        search: 'Tìm kiếm',
        filter: 'Lọc',
        export: 'Xuất',
        import: 'Nhập',
        download: 'Tải xuống',
        upload: 'Tải lên',
        reset: 'Đặt lại',
        refresh: 'Làm mới',
        loading: 'Đang tải...',

        // 상태
        status: 'Trạng thái',
        active: 'Hoạt động',
        inactive: 'Không hoạt động',
        enabled: 'Kích hoạt',
        disabled: 'Vô hiệu hóa',
        success: 'Thành công',
        error: 'Lỗi',
        warning: 'Cảnh báo',
        info: 'Thông tin',

        // 기본 필드
        name: 'Tên',
        code: 'Mã',
        description: 'Mô tả',
        date: 'Ngày',
        time: 'Thời gian',
        type: 'Loại',
        category: 'Danh mục',
        location: 'Vị trí',
        quantity: 'Số lượng',
        price: 'Giá',

        // 시스템 정보
        lastUpdate: 'Cập nhật cuối',
        admin: 'Quản trị viên',

        // 메시지
        confirmDelete: 'Bạn có chắc chắn muốn xóa?',
        saveSuccess: 'Đã lưu thành công.',
        deleteSuccess: 'Đã xóa thành công.',
        updateSuccess: 'Đã cập nhật thành công.',
        noData: 'Không có dữ liệu.',
        noResults: 'Không có kết quả tìm kiếm.',
      },

      // 네비게이션
      navigation: {
        dashboard: 'Bảng điều khiển',
        equipment: 'Quản lý thiết bị',
        endmill: 'Quản lý dao phay',
        inventory: 'Quản lý tồn kho',
        camSheets: 'Quản lý CAM SHEET',
        toolChanges: 'Kết quả thay thế',
        reports: 'Phân tích & Báo cáo',
        settings: 'Cài đặt',
        users: 'Quản lý người dùng',
        translations: 'Quản lý dịch thuật',
        logout: 'Đăng xuất',
      },

      // 대시보드
      dashboard: {
        title: 'Bảng điều khiển',
        subtitle: 'Tình trạng quản lý dao phay CNC thời gian thực',
        totalEquipment: 'Tổng thiết bị CNC',
        toolChanges: 'Linh kiện thay thế',
        todayChanges: 'Thay thế hôm nay',
        equipmentStatus: 'Tình trạng hoạt động thiết bị',
        equipmentCount: 'máy',
        pieceCount: 'cái',
        percentCount: '%',
        operatingRate: 'Tỷ lệ hoạt động',
        maintenanceCount: 'Đang bảo trì',
        setupCount: 'Đang thiết lập',
      },

      // 설비 관리
      equipment: {
        title: 'Quản lý thiết bị',
        subtitle: 'Tình trạng và quản lý 800 thiết bị CNC',
        equipmentNumber: 'Số thiết bị',
        model: 'Mẫu',
        process: 'Quy trình',
        location: 'Vị trí',
        status: 'Trạng thái',
        lastMaintenance: 'Bảo trì cuối cùng',
        toolPositions: 'Vị trí dụng cụ',

        // 상태
        operating: 'Đang hoạt động',
        maintenance: 'Đang bảo trì',
        setup: 'Đang thiết lập',

        // 메시지
        statusChanged: 'Trạng thái thiết bị đã được thay đổi.',
        addEquipment: 'Thêm thiết bị',
      },

      // 앤드밀 관리
      endmill: {
        title: 'Quản lý dao phay',
        subtitle: 'Tình trạng sử dụng theo dao phay, mẫu, thiết bị, quy trình',
        endmillCode: 'Mã dao phay',
        endmillName: 'Tên dao phay',
        specifications: 'Thông số kỹ thuật',
        toolLife: 'Tuổi thọ dụng cụ',
        currentLife: 'Tuổi thọ hiện tại',
        totalLife: 'Tổng tuổi thọ',
        tNumber: 'Số T',
        installDate: 'Ngày lắp đặt',

        // 상태
        new: 'Mới',
        normal: 'Bình thường',
        warning: 'Khuyến cáo thay thế',
        critical: 'Thay thế ngay',
      },

      // 재고 관리
      inventory: {
        title: 'Quản lý tồn kho',
        subtitle: 'Tình trạng tồn kho dao phay và so sánh giá theo nhà cung cấp',
        currentStock: 'Tồn kho hiện tại',
        minStock: 'Tồn kho tối thiểu',
        maxStock: 'Tồn kho tối đa',
        supplier: 'Nhà cung cấp',
        unitPrice: 'Đơn giá',
        totalValue: 'Tổng giá trị',
        stockStatus: 'Trạng thái tồn kho',

        // 상태
        sufficient: 'Đủ',
        low: 'Thiếu',
        critical: 'Nguy hiểm',

        // 입출고
        inbound: 'Nhập kho',
        outbound: 'Xuất kho',
        inboundManagement: 'Quản lý nhập kho',
        outboundManagement: 'Quản lý xuất kho',
      },

      // CAM SHEET 관리
      camSheets: {
        title: 'Quản lý CAM SHEET',
        subtitle: 'Đăng ký CAM SHEET và quản lý thông tin dao phay',
        camVersion: 'Phiên bản CAM',
        versionDate: 'Ngày thay đổi phiên bản',
        registeredEndmills: 'Dao phay đã đăng ký',
        lastModified: 'Sửa đổi cuối cùng',
        addCAMSheet: 'Đăng ký CAM Sheet',
        excelBulkUpload: 'Đăng ký hàng loạt bằng Excel',
      },

      // 교체 실적
      toolChanges: {
        title: 'Kết quả thay thế',
        subtitle: 'Quản lý lịch sử thay thế dao phay',
        changeDate: 'Ngày thay thế',
        productionModel: 'Mẫu sản xuất',
        changedBy: 'Người thay thế',
        changeReason: 'Lý do thay thế',

        // 교체 사유
        lifeCompleted: 'Hết tuổi thọ',
        broken: 'Hỏng',
        wear: 'Mài mòn',
        preventive: 'Thay thế phòng ngừa',
        modelChange: 'Thay đổi mẫu',
        other: 'Khác',
      },

      // 리포트
      reports: {
        title: 'Phân tích & Báo cáo',
        subtitle: 'Phân tích dữ liệu và tạo báo cáo',
        generateReport: 'Tạo báo cáo',
        dailyReport: 'Báo cáo hàng ngày',
        weeklyReport: 'Báo cáo hàng tuần',
        monthlyReport: 'Báo cáo hàng tháng',
      },

      // 설정
      settings: {
        title: 'Cài đặt',
        subtitle: 'Quản lý cài đặt hệ thống',
        systemSettings: 'Cài đặt hệ thống',
        equipmentSettings: 'Cài đặt thiết bị',
        inventorySettings: 'Cài đặt tồn kho',
        translationSettings: 'Cài đặt dịch thuật',

        // 번역 설정
        languageManagement: 'Quản lý ngôn ngữ',
        defaultLanguage: 'Ngôn ngữ mặc định',
        fallbackLanguage: 'Ngôn ngữ dự phòng',
        autoTranslate: 'Dịch tự động',
        googleApiKey: 'Khóa API Google',
        cacheSettings: 'Cài đặt bộ nhớ cache',
        translationCache: 'Bộ nhớ cache dịch thuật',
        cacheExpiry: 'Thời gian hết hạn cache',
      },

      // 사용자 관리
      users: {
        title: 'Quản lý người dùng',
        subtitle: 'Quản lý tài khoản người dùng và quyền hạn',
        userName: 'Tên người dùng',
        email: 'Email',
        role: 'Vai trò',
        department: 'Phòng ban',
        shift: 'Ca làm việc',
        lastLogin: 'Đăng nhập cuối',

        // 역할
        admin: 'Quản trị viên',
        manager: 'Quản lý',
        operator: 'Vận hành',
      },

      // 인증
      auth: {
        login: 'Đăng nhập',
        logout: 'Đăng xuất',
        email: 'Email',
        password: 'Mật khẩu',
        rememberMe: 'Ghi nhớ đăng nhập',
        forgotPassword: 'Quên mật khẩu?',
        loginTitle: 'Hệ thống quản lý dao phay CNC',
        loginSubtitle: 'Đăng nhập quản trị viên',
        noAccount: 'Chưa có tài khoản?',
        contactAdmin: 'Liên hệ quản trị viên',
      },
    }
  }
}

i18n
  .use(initReactI18next) // react-i18next 초기화
  .init({
    resources,
    lng: 'ko', // 기본 언어
    fallbackLng: 'ko', // 대체 언어

    interpolation: {
      escapeValue: false, // React는 기본적으로 XSS 보호
    },

    // 네임스페이스 설정
    defaultNS: 'translation',

    // 개발 모드 설정
    debug: process.env.NODE_ENV === 'development',
  })

export default i18n