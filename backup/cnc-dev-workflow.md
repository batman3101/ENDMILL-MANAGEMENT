# CNC 앤드밀 관리 시스템 개발 워크플로우

## 1. 개발 환경 설정 및 프로젝트 초기화 (Week 1)

### 1.1 개발 환경 구축
```bash
# 1. 프로젝트 생성
npx create-next-app@latest cnc-endmill-management --typescript --tailwind --app

# 2. 필수 패키지 설치
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install react-hook-form zod @hookform/resolvers
npm install @radix-ui/react-* # shadcn/ui 컴포넌트
npm install framer-motion
npm install react-i18next i18next
npm install xlsx pdfkit
npm install qrcode react-qr-scanner
npm install recharts
```

### 1.2 Supabase 설정
```sql
-- 1. Supabase 프로젝트 생성
-- 2. 데이터베이스 스키마 생성
-- 3. RLS 정책 설정
-- 4. Edge Functions 설정
-- 5. Storage 버킷 생성 (cam-sheets, qr-codes)
```

### 1.3 프로젝트 구조 설정
```
cnc-endmill-management/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── equipment/
│   │   ├── endmill/
│   │   ├── inventory/
│   │   └── reports/
│   └── api/
├── components/
│   ├── ui/           # shadcn/ui 컴포넌트
│   ├── layout/       # 레이아웃 컴포넌트
│   ├── features/     # 기능별 컴포넌트
│   └── shared/       # 공통 컴포넌트
├── lib/
│   ├── supabase/     # Supabase 클라이언트
│   ├── hooks/        # 커스텀 훅
│   ├── utils/        # 유틸리티 함수
│   └── types/        # TypeScript 타입
├── locales/          # 다국어 파일
├── public/
└── styles/
```

## 2. 인증 시스템 구현 (Week 1-2)

### 2.1 Supabase Auth 설정
```typescript
// lib/supabase/auth.ts
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// 역할 기반 권한 설정
// RLS 정책으로 admin, manager, operator 구분
```

### 2.2 인증 관련 페이지
- `/login` - 로그인 페이지
- `/register` - 회원가입 페이지
- 비밀번호 재설정 기능
- 프로필 설정 (언어, 작업조)

### 2.3 보호된 라우트 설정
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

## 3. 기본 데이터 모델 구현 (Week 2-3)

### 3.1 데이터베이스 테이블 생성
```sql
-- 1. 설비 관련 테이블
CREATE TABLE equipments (...);
CREATE TABLE processes (...);

-- 2. 앤드밀 관련 테이블
CREATE TABLE endmill_categories (...);
CREATE TABLE endmill_types (...);
CREATE TABLE tool_positions (...);
CREATE TABLE endmill_instances (...);

-- 3. 기록 테이블
CREATE TABLE tool_changes (...);
CREATE TABLE inventory_transactions (...);

-- 4. RLS 정책 설정
-- 각 테이블별 역할 기반 접근 제어
```

### 3.2 Supabase 타입 생성
```bash
npx supabase gen types typescript --project-id [project-id] > lib/types/database.ts
```

### 3.3 API 훅 생성
```typescript
// lib/hooks/useEquipments.ts
export const useEquipments = () => {
  return useQuery({
    queryKey: ['equipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipments')
        .select('*')
        .order('equipment_number');
      if (error) throw error;
      return data;
    },
  });
};
```

## 4. 핵심 기능 구현 (Week 3-6)

### 4.1 설비 관리 모듈
```typescript
// app/(dashboard)/equipment/page.tsx
// 설비 목록, 필터링, 검색
// 설비별 공구 위치 관리
// 설비 상태 업데이트
```

**구현 순서:**
1. 설비 목록 페이지
2. 설비 상세 페이지
3. 공구 위치 관리 UI
4. 실시간 상태 업데이트 (Supabase Realtime)

### 4.2 앤드밀 교체 관리
```typescript
// app/(dashboard)/endmill/change/page.tsx
// 교체 기록 입력 폼
// Tool Life 계산
// 교체 이력 조회
```

**구현 순서:**
1. 교체 기록 입력 폼
2. 현재 Tool Life 표시
3. 교체 알림 시스템
4. 교체 이력 테이블

### 4.3 재고 관리 시스템
```typescript
// app/(dashboard)/inventory/page.tsx
// 재고 현황 대시보드
// 입출고 기록
// 재고 부족 알림
```

**구현 순서:**
1. 재고 현황 대시보드
2. 입출고 트랜잭션 기록
3. 최소 재고 알림 로직
4. 재고 예측 기능

## 5. QR 코드 시스템 구현 (Week 6-7)

### 5.1 QR 코드 생성
```typescript
// lib/utils/qrcode.ts
import QRCode from 'qrcode';

export const generateQRCode = async (endmillId: string) => {
  const qrData = {
    type: 'endmill',
    id: endmillId,
    timestamp: new Date().toISOString(),
  };
  
  const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));
  return qrCodeUrl;
};
```

### 5.2 QR 스캔 기능
```typescript
// components/features/QRScanner.tsx
// 모바일 카메라 접근
// QR 코드 디코딩
// 정보 조회 및 표시
```

### 5.3 오프라인 지원
- Service Worker 설정
- 로컬 스토리지 캐싱
- 동기화 로직

## 6. 실시간 대시보드 구현 (Week 7-8)

### 6.1 대시보드 레이아웃
```typescript
// app/(dashboard)/page.tsx
// 실시간 통계 위젯
// 교체 필요 알림
// 재고 현황
// 비용 분석 차트
```

### 6.2 실시간 업데이트
```typescript
// Supabase Realtime 구독
const channel = supabase
  .channel('dashboard-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tool_changes'
  }, (payload) => {
    // 대시보드 업데이트
  })
  .subscribe();
```

### 6.3 차트 및 시각화
- Recharts를 활용한 차트 구현
- 비용 분석 차트
- Tool Life 히트맵
- 설비 가동률 그래프

## 7. CAM Sheet 관리 (Week 8-9)

### 7.1 파일 업로드
```typescript
// Supabase Storage 활용
const uploadCAMSheet = async (file: File, modelCode: string) => {
  const { data, error } = await supabase.storage
    .from('cam-sheets')
    .upload(`${modelCode}/${file.name}`, file);
  
  return { data, error };
};
```

### 7.2 이미지 뷰어
- 확대/축소 기능
- 공구 위치 마킹
- 버전 비교

### 7.3 공구 매칭 시스템
- CAM Sheet 정보와 공구 DB 연결
- 자동 추천 기능

## 8. 다국어 지원 구현 (Week 9)

### 8.1 i18n 설정
```typescript
// lib/i18n/config.ts
export const i18nConfig = {
  locales: ['ko', 'vi'],
  defaultLocale: 'ko',
};
```

### 8.2 번역 관리
- 데이터베이스 기반 번역
- 관리자 번역 편집 UI
- 실시간 언어 전환

### 8.3 언어별 최적화
- 베트남어 폰트 설정
- RTL/LTR 대응
- 날짜/숫자 포맷

## 9. 보고서 및 분석 기능 (Week 9-10)

### 9.1 보고서 생성
```typescript
// Excel 내보내기
import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
```

### 9.2 PDF 생성
- PDFKit을 활용한 PDF 생성
- 차트 이미지 포함
- 다국어 지원

### 9.3 고급 분석
- Tool Life 예측 모델
- 비용 최적화 분석
- 성능 트렌드 분석

## 10. 테스트 및 최적화 (Week 10-11)

### 10.1 테스트 전략
```typescript
// 단위 테스트 (Jest)
describe('Tool Life Calculation', () => {
  test('should calculate remaining life correctly', () => {
    // 테스트 코드
  });
});

// E2E 테스트 (Playwright)
test('endmill replacement workflow', async ({ page }) => {
  // E2E 테스트 시나리오
});
```

### 10.2 성능 최적화
- 쿼리 최적화
- 이미지 최적화
- 번들 크기 최소화
- 캐싱 전략

### 10.3 접근성 테스트
- WCAG 2.1 준수 확인
- 스크린 리더 테스트
- 키보드 네비게이션

## 11. 배포 및 모니터링 (Week 11-12)

### 11.1 배포 준비
```bash
# 환경 변수 설정
# .env.production
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 빌드 및 테스트
npm run build
npm run test
```

### 11.2 배포 프로세스
- Vercel 배포 설정
- CI/CD 파이프라인
- 환경별 배포 (dev/staging/prod)

### 11.3 모니터링 설정
- 에러 트래킹 (Sentry)
- 성능 모니터링
- 사용자 분석 (Google Analytics)
- 서버 모니터링

## 12. 유지보수 계획

### 12.1 정기 업데이트
- 보안 패치
- 의존성 업데이트
- 버그 수정

### 12.2 사용자 피드백
- 피드백 수집 채널
- 우선순위 결정
- 개선 사항 반영

### 12.3 확장 계획
- 모바일 앱 개발
- AI 기능 고도화
- 외부 시스템 연동

## 개발 체크리스트

### Week 1-2: 기초 설정 ✅
- [ ] 프로젝트 초기화
- [ ] Supabase 설정
- [ ] 인증 시스템
- [ ] 기본 라우팅

### Week 3-6: 핵심 기능 ✅
- [ ] 설비 관리
- [ ] 앤드밀 교체
- [ ] 재고 관리
- [ ] 기본 CRUD

### Week 7-9: 고급 기능 ✅
- [ ] QR 시스템
- [ ] 실시간 대시보드
- [ ] CAM Sheet
- [ ] 다국어 지원

### Week 10-12: 마무리 ✅
- [ ] 테스트
- [ ] 최적화
- [ ] 문서화
- [ ] 배포

---

**문서 버전**: v1.0  
**작성일**: 2025-06-09  
**작성자**: Development Team  
**다음 업데이트**: 매주 금요일