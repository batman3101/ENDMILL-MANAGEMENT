# CNC 앤드밀 관리 시스템 - 코드베이스 검토 및 인덱싱 보고서

## 📋 프로젝트 개요

### 기본 정보
- **프로젝트명**: CNC 앤드밀 관리 시스템 (CNC Endmill Management System)
- **버전**: 1.0.0
- **개발 언어**: TypeScript, JavaScript
- **프레임워크**: Next.js 14 (App Router)
- **데이터베이스**: PostgreSQL (Supabase)
- **UI 라이브러리**: Tailwind CSS
- **상태 관리**: React Query + Custom Hooks

### 프로젝트 목적
CNC 가공 현장에서 앤드밀 공구의 재고, 교체 이력, 설비 관리를 효율적으로 수행하기 위한 웹 기반 관리 시스템

---

## 🏗️ 시스템 아키텍처

### 기술 스택

#### Frontend
- **Next.js 14**: App Router 기반 풀스택 프레임워크
- **React 18.3.1**: 사용자 인터페이스 라이브러리
- **TypeScript 5.0**: 정적 타입 검사
- **Tailwind CSS 3.4**: 유틸리티 우선 CSS 프레임워크
- **Lucide React**: 아이콘 라이브러리

#### Backend & Database
- **Supabase**: Backend as a Service
  - PostgreSQL 15 데이터베이스
  - Row Level Security (RLS)
  - 실시간 API
  - 인증 시스템
  - 파일 스토리지

#### 상태 관리 & 데이터 페칭
- **@tanstack/react-query 5.81.2**: 서버 상태 관리
- **Custom Hooks**: 비즈니스 로직 캡슐화
- **Zod 3.25.67**: 스키마 검증

#### 개발 도구
- **ESLint**: 코드 품질 관리
- **Jest**: 단위 테스트
- **Testing Library**: 컴포넌트 테스트

---

## 📁 프로젝트 구조 분석

### 디렉토리 구조
```
ENDMILL MANAGEMENT/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 라우트
│   │   └── login/
│   ├── api/               # API 엔드포인트
│   │   ├── auth/          # 인증 API
│   │   ├── cam-sheets/    # CAM 시트 API
│   │   ├── dashboard/     # 대시보드 API
│   │   ├── equipment/     # 설비 API
│   │   ├── inventory/     # 재고 API
│   │   ├── settings/      # 설정 API
│   │   ├── tool-changes/  # 공구 교체 API
│   │   └── translations/   # 번역 API
│   ├── dashboard/         # 대시보드 페이지
│   │   ├── cam-sheets/
│   │   ├── endmill/
│   │   ├── endmill-detail/
│   │   ├── equipment/
│   │   ├── inventory/
│   │   ├── qr-scan/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── tool-changes/
│   │   └── users/
│   ├── globals.css        # 전역 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈페이지
├── components/            # React 컴포넌트
│   ├── auth/              # 인증 컴포넌트
│   ├── features/          # 기능별 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   ├── shared/            # 공통 컴포넌트
│   └── ui/                # UI 컴포넌트
├── lib/                   # 라이브러리 및 유틸리티
│   ├── config/            # 설정 관리
│   ├── data/              # 데이터 관리
│   ├── hooks/             # 커스텀 훅
│   ├── providers/         # Context 프로바이더
│   ├── services/          # 서비스 레이어
│   ├── supabase/          # Supabase 클라이언트
│   ├── types/             # TypeScript 타입 정의
│   └── utils/             # 유틸리티 함수
├── docs/                  # 문서
├── scripts/               # 스크립트
├── backup/                # 백업 파일
└── 설정 파일들
```

---

## 🗄️ 데이터베이스 스키마 분석

### 주요 테이블 구조

#### 1. 사용자 관리
- **user_roles**: 사용자 역할 정의 (system_admin, admin, user)
- **user_profiles**: 사용자 확장 정보 (Supabase Auth 확장)

#### 2. 설비 관리
- **equipment**: 설비 정보 (C001-C800, 상태, 위치, 모델)
- **tool_positions**: 공구 위치 정보 (T1-T21)

#### 3. 앤드밀 관리
- **endmill_categories**: 앤드밀 카테고리 (FLAT, BALL, T-CUT 등)
- **endmill_types**: 앤드밀 타입 마스터 데이터
- **suppliers**: 공급업체 정보
- **endmill_supplier_prices**: 공급업체별 가격 정보

#### 4. 재고 관리
- **inventory**: 재고 현황
- **inventory_transactions**: 재고 이동 이력

#### 5. CAM Sheet 관리
- **cam_sheets**: CAM 시트 정보
- **cam_sheet_endmills**: CAM 시트별 앤드밀 상세

#### 6. 교체 이력
- **tool_changes**: 공구 교체 이력

#### 7. 시스템 관리
- **system_settings**: 시스템 설정
- **settings_history**: 설정 변경 이력
- **translations**: 다국어 번역
- **translation_history**: 번역 변경 이력
- **notifications**: 알림
- **activity_logs**: 활동 로그

### 데이터베이스 특징
- **ENUM 타입 활용**: 상태, 역할, 위치 등 제한된 값들을 ENUM으로 정의
- **UUID 기본키**: 모든 테이블에서 UUID 사용
- **Row Level Security (RLS)**: 세분화된 접근 제어
- **트리거 함수**: 자동 업데이트, 상태 관리, 로깅
- **인덱스 최적화**: 성능을 위한 적절한 인덱스 설정
- **뷰 활용**: 복잡한 쿼리를 위한 뷰 생성

---

## 🔧 API 엔드포인트 분석

### API 구조
```
/api/
├── auth/
│   ├── login/route.ts     # 로그인
│   ├── logout/route.ts    # 로그아웃
│   └── me/route.ts        # 현재 사용자 정보
├── equipment/
│   └── route.ts           # 설비 CRUD
├── inventory/
│   └── route.ts           # 재고 관리
├── cam-sheets/
│   └── route.ts           # CAM 시트 관리
├── tool-changes/
│   └── route.ts           # 공구 교체 이력
├── dashboard/
│   └── route.ts           # 대시보드 데이터
├── settings/
│   └── route.ts           # 시스템 설정
└── translations/
    └── route.ts           # 번역 관리
```

### API 특징
- **RESTful 설계**: 표준 HTTP 메서드 사용
- **Zod 스키마 검증**: 입력 데이터 검증
- **에러 핸들링**: 일관된 에러 응답
- **인증 미들웨어**: Supabase Auth 통합
- **타입 안전성**: TypeScript 타입 정의

---

## 🎨 컴포넌트 아키텍처 분석

### 컴포넌트 분류

#### 1. 기능별 컴포넌트 (features/)
- **CAMSheetForm.tsx**: CAM 시트 폼
- **DonutChart.tsx**: 도넛 차트
- **EndmillMasterUploader.tsx**: 앤드밀 마스터 업로더
- **ExcelUploader.tsx**: 엑셀 업로더
- **LandingStatusCard.tsx**: 상태 카드

#### 2. 공통 컴포넌트 (shared/)
- **ConfirmationModal.tsx**: 확인 모달
- **StatusChangeDropdown.tsx**: 상태 변경 드롭다운
- **Toast.tsx**: 토스트 알림

#### 3. UI 컴포넌트 (ui/)
- 기본 UI 컴포넌트들

#### 4. 레이아웃 컴포넌트 (layout/)
- 페이지 레이아웃 관련 컴포넌트

### 컴포넌트 특징
- **함수형 컴포넌트**: React Hooks 활용
- **TypeScript**: 강타입 지원
- **재사용성**: 모듈화된 설계
- **접근성**: 웹 접근성 고려

---

## 🪝 커스텀 훅 분석

### 주요 훅들

#### 1. useAuth.ts
- 사용자 인증 상태 관리
- 로그인/로그아웃 기능
- 사용자 정보 관리

#### 2. useInventory.ts
- 재고 데이터 관리
- CRUD 작업
- React Query 통합

#### 3. useEquipment.ts
- 설비 데이터 관리
- 상태 업데이트
- 필터링 기능

#### 4. useDashboard.ts
- 대시보드 데이터 집계
- 실시간 업데이트
- 통계 계산

#### 5. useSettings.ts
- 시스템 설정 관리
- 설정 검증
- 변경 이력 추적

#### 6. useTranslations.ts
- 다국어 지원
- 번역 관리
- 언어 전환

#### 7. useUsers.ts
- 사용자 관리
- 역할 기반 권한
- 사용자 통계

#### 8. useCAMSheets.ts
- CAM 시트 관리
- 버전 관리
- 앤드밀 매핑

#### 9. useConfirmation.ts
- 확인 모달 관리
- 사용자 확인 처리

### 훅 특징
- **React Query 통합**: 서버 상태 관리
- **타입 안전성**: TypeScript 지원
- **에러 핸들링**: 일관된 에러 처리
- **캐싱**: 효율적인 데이터 캐싱
- **실시간 업데이트**: Supabase 실시간 기능

---

## 🔧 서비스 레이어 분석

### SupabaseService 클래스 구조

```typescript
export class SupabaseService {
  public equipment: EquipmentService
  public endmillType: EndmillTypeService
  public inventory: InventoryService
  public userProfile: UserProfileService
  public camSheet: CAMSheetService
  public toolChange: ToolChangeService
  // ... 기타 서비스들
}
```

### 주요 서비스들

#### 1. EquipmentService
- 설비 CRUD 작업
- 상태별 조회
- 위치별 필터링

#### 2. InventoryService
- 재고 관리
- 재고 이동 처리
- 상태 자동 업데이트

#### 3. EndmillTypeService
- 앤드밀 타입 관리
- 카테고리별 조회
- 사양 관리

#### 4. UserProfileService
- 사용자 프로필 관리
- 역할 기반 접근 제어
- 활동 추적

### 서비스 특징
- **모듈화**: 기능별 서비스 분리
- **타입 안전성**: TypeScript 지원
- **에러 핸들링**: 일관된 에러 처리
- **트랜잭션**: 데이터 일관성 보장

---

## 🔒 보안 및 인증

### 인증 시스템
- **Supabase Auth**: 이메일/비밀번호 인증
- **JWT 토큰**: 세션 관리
- **쿠키 기반**: 서버 사이드 인증

### 권한 관리
- **역할 기반 접근 제어 (RBAC)**:
  - system_admin: 시스템 전체 관리
  - admin: 일반 관리자
  - user: 일반 사용자

### Row Level Security (RLS)
- 테이블별 세분화된 접근 제어
- 사용자 역할에 따른 데이터 접근 제한
- 본인 데이터만 접근 가능한 정책

### 보안 기능
- **CSRF 보호**: Next.js 내장 보호
- **XSS 방지**: 입력 데이터 검증
- **SQL 인젝션 방지**: Supabase ORM 사용
- **환경변수 보호**: 민감한 정보 분리

---

## 🌐 다국어 지원

### 지원 언어
- **한국어 (ko)**: 기본 언어
- **베트남어 (vi)**: 보조 언어

### 번역 시스템
- **데이터베이스 기반**: translations 테이블
- **네임스페이스 분리**: 기능별 번역 그룹
- **자동 번역**: Google Translate API 연동
- **번역 이력**: 변경 추적

### 번역 관리
- **실시간 업데이트**: 번역 변경 즉시 반영
- **컨텍스트 정보**: 번역 맥락 제공
- **품질 관리**: 수동 검토 시스템

---

## 📊 상태 관리

### React Query 활용
- **서버 상태 관리**: API 데이터 캐싱
- **백그라운드 업데이트**: 자동 데이터 갱신
- **옵티미스틱 업데이트**: 사용자 경험 향상
- **에러 재시도**: 네트워크 오류 처리

### 클라이언트 상태
- **React Hooks**: 로컬 상태 관리
- **Context API**: 전역 상태 공유
- **커스텀 훅**: 비즈니스 로직 캡슐화

---

## 🎯 주요 기능 분석

### 1. 대시보드
- **실시간 통계**: 설비 가동률, 재고 현황
- **시각화**: 차트 및 그래프
- **알림 시스템**: 중요 이벤트 알림

### 2. 설비 관리
- **설비 현황**: 800대 설비 관리
- **상태 추적**: 가동중, 점검중, 셋업중
- **공구 위치**: T1-T21 위치별 관리

### 3. 재고 관리
- **실시간 재고**: 현재 재고 수량
- **자동 알림**: 부족/위험 재고 알림
- **재고 이동**: 입출고 이력 관리

### 4. 앤드밀 관리
- **마스터 데이터**: 앤드밀 타입 관리
- **카테고리 분류**: FLAT, BALL, T-CUT 등
- **사양 관리**: 직경, 플루트 수, 코팅 등

### 5. CAM Sheet 관리
- **버전 관리**: CAM 시트 버전 추적
- **앤드밀 매핑**: T번호별 앤드밀 할당
- **공구 수명**: 예상 수명 관리

### 6. 교체 이력
- **교체 기록**: 공구 교체 이력 추적
- **교체 사유**: 정기교체, 마모, 파손 등
- **통계 분석**: 교체 패턴 분석

### 7. QR 코드 시스템
- **QR 생성**: 설비/공구별 QR 코드
- **모바일 스캔**: 실시간 정보 조회
- **빠른 접근**: 현장에서 즉시 확인

---

## 🧪 테스트 전략

### 테스트 도구
- **Jest**: 단위 테스트 프레임워크
- **Testing Library**: 컴포넌트 테스트
- **@testing-library/user-event**: 사용자 상호작용 테스트

### 테스트 파일
- **auth-session.test.ts**: 인증 세션 테스트

### 테스트 커버리지
- 현재 기본적인 테스트 설정만 완료
- 추가 테스트 케이스 작성 필요

---

## 📈 성능 최적화

### 프론트엔드 최적화
- **Next.js App Router**: 서버 사이드 렌더링
- **이미지 최적화**: Next.js Image 컴포넌트
- **코드 분할**: 동적 임포트
- **캐싱**: React Query 캐싱 전략

### 데이터베이스 최적화
- **인덱스**: 쿼리 성능 향상
- **뷰**: 복잡한 쿼리 최적화
- **트리거**: 자동화된 데이터 처리
- **RLS**: 효율적인 권한 제어

---

## 🔧 개발 도구 및 설정

### 개발 환경
- **Node.js**: JavaScript 런타임
- **npm**: 패키지 매니저
- **TypeScript**: 정적 타입 검사
- **ESLint**: 코드 품질 관리

### 빌드 도구
- **Next.js**: 프레임워크
- **Tailwind CSS**: 스타일링
- **PostCSS**: CSS 후처리
- **Autoprefixer**: 브라우저 호환성

### 배포 설정
- **Vercel**: 배포 플랫폼 (추정)
- **Supabase**: 백엔드 서비스
- **환경변수**: 설정 관리

---

## 📝 문서화 현황

### 기존 문서
- **README.md**: 프로젝트 개요
- **development-plan.md**: 개발 계획
- **cnc-dev-workflow.md**: 개발 워크플로우
- **cnc-prd.md**: 제품 요구사항

### 문서 특징
- **한국어 작성**: 팀 내 의사소통
- **상세한 계획**: 단계별 개발 계획
- **기술 스택**: 상세한 기술 정보

---

## ⚠️ 개선 권장사항

### 1. 테스트 커버리지 확대
- 단위 테스트 추가 작성
- 통합 테스트 구현
- E2E 테스트 도입

### 2. 에러 처리 강화
- 전역 에러 바운더리
- 에러 로깅 시스템
- 사용자 친화적 에러 메시지

### 3. 성능 모니터링
- 성능 메트릭 수집
- 사용자 행동 분석
- 성능 병목 지점 식별

### 4. 보안 강화
- 정기적인 보안 감사
- 의존성 취약점 검사
- 보안 헤더 설정

### 5. 문서화 개선
- API 문서 자동 생성
- 컴포넌트 스토리북
- 사용자 매뉴얼 작성

### 6. CI/CD 파이프라인
- 자동화된 테스트
- 자동 배포
- 코드 품질 검사

---

## 📊 프로젝트 통계

### 파일 구성
- **총 파일 수**: 200+ 파일
- **TypeScript 파일**: 80%
- **JavaScript 파일**: 15%
- **설정 파일**: 5%

### 코드 라인 수 (추정)
- **프론트엔드**: ~15,000 라인
- **백엔드 API**: ~5,000 라인
- **데이터베이스 스키마**: ~750 라인
- **설정 파일**: ~500 라인

### 의존성
- **프로덕션 의존성**: 14개
- **개발 의존성**: 16개
- **주요 라이브러리**: React, Next.js, Supabase, React Query

---

## 🎯 결론

### 프로젝트 강점
1. **현대적인 기술 스택**: Next.js 14, TypeScript, Supabase
2. **체계적인 아키텍처**: 모듈화된 구조, 명확한 책임 분리
3. **타입 안전성**: TypeScript 전면 도입
4. **확장 가능한 설계**: 서비스 레이어, 커스텀 훅 활용
5. **보안 고려**: RLS, 역할 기반 접근 제어
6. **다국어 지원**: 한국어/베트남어 지원
7. **실시간 기능**: Supabase 실시간 API 활용

### 개선 영역
1. **테스트 커버리지**: 현재 최소한의 테스트만 존재
2. **에러 처리**: 더 체계적인 에러 핸들링 필요
3. **성능 최적화**: 추가적인 최적화 여지
4. **문서화**: 기술 문서 보완 필요
5. **모니터링**: 운영 모니터링 시스템 부재

### 전체 평가
이 프로젝트는 **현대적이고 확장 가능한 웹 애플리케이션**으로 잘 설계되었습니다. 특히 제조업 현장의 복잡한 요구사항을 체계적으로 분석하고 구현한 점이 인상적입니다. 코드 품질과 아키텍처 측면에서 높은 수준을 보여주며, 향후 기능 확장과 유지보수에 유리한 구조를 갖추고 있습니다.

---

**보고서 생성일**: 2024년 12월 19일  
**분석 대상**: CNC 앤드밀 관리 시스템 v1.0.0  
**분석자**: AI 코드 분석 시스템