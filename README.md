# CNC Endmill Management System

CNC 장비의 엔드밀 공구 교체 및 재고 관리를 위한 종합 웹 애플리케이션

## 프로젝트 개요

800대의 CNC 장비에서 사용되는 엔드밀 공구의 교체 이력, 재고 관리, 자동 발주, 상세 분석 기능을 제공하는 실시간 모니터링 시스템입니다.

## 주요 기능

### ✅ 구현 완료
- **사용자 인증 및 권한 관리**
  - 이메일/비밀번호 기반 인증
  - 역할 기반 접근 제어 (시스템 관리자, 관리자, 사용자)
  - 개별 사용자 권한 설정 시스템
  - 보호된 라우트 미들웨어

- **대시보드**
  - 설비 현황 개요
  - 실시간 통계 및 모니터링
  - 교체 이력 요약

- **설비 관리**
  - 설비 CRUD 기능
  - Excel 대량 업로드 기능
  - 설비번호, 모델, 상태, 위치로 검색 및 필터링
  - 설비번호 형식 자동 변환 (C001 ↔ 1)

- **엔드밀 관리**
  - 엔드밀 타입 및 사양 관리
  - 카테고리 및 공급업체 가격 관리
  - 동적 카테고리 필터링 (데이터 기반)
  - Excel 대량 업로드 지원

- **교체 실적 관리**
  - 공구 교체 기록 시스템
  - 자동 완성 기능
  - 설비번호, 생산모델, 공정, 앤드밀 코드로 검색
  - 작업자별 교체 이력 추적

- **재고 관리**
  - 입고/출고 추적
  - 재고 수준 및 재주문 포인트
  - 실시간 재고 업데이트

- **CAM 시트 관리**
  - 모델별 공구 사양 시트 관리
  - CAM 시트 뷰어

- **보고서 시스템**
  - 월간 보고서
  - 비용 분석 보고서
  - 공구 수명 분석 보고서
  - 성능 보고서

- **사용자 관리**
  - 사용자 계정 관리
  - 역할 및 권한 설정
  - 부서 및 교대조 관리

- **다국어 지원**
  - 한국어/베트남어 지원
  - i18next 기반 번역 시스템

### 🚧 개발 중
- QR 코드 스캐닝 (textScanService 구현됨)
- 실시간 대시보드 업데이트
- 자동 발주 알림

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (Radix UI 기반)
- **State Management**: TanStack Query v5
- **Internationalization**: i18next

### Backend
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Authentication**: Supabase Auth
- **Edge Functions**: Supabase Edge Functions
- **Validation**: Zod

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **Type Checking**: TypeScript 5.x

## 데이터베이스 구조

### 주요 테이블
- `equipments` - CNC 장비 기록 (PA1, PA2, PS, B7, Q7 모델)
- `tool_positions` - 장비당 공구 위치 (T1-T24)
- `endmill_types` - 공구 사양 및 비용
- `tool_changes` - 교체 이력 (작업자 추적)
- `inventory` - 재고 수준 및 재주문 포인트
- `cam_sheets` - 모델별 공구 사양 시트
- `user_profiles` - 사용자 계정 및 개별 권한
- `user_roles` - 역할 및 권한 정의

## 설치 및 실행

### 환경 변수 설정
```bash
# .env.local 파일 생성
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```
개발 서버가 http://localhost:3000 에서 실행됩니다.

### 프로덕션 빌드
```bash
npm run build
npm run start
```

### 관리자 계정 생성
```bash
# 대화형 관리자 생성
npm run create-admin

# 기본 관리자 계정 생성
npm run create-default-admin
```

## 프로젝트 구조

```
app/                          # Next.js App Router
├── api/                     # API 라우트
│   ├── auth/               # 인증 엔드포인트
│   ├── cam-sheets/         # CAM 시트 관리
│   ├── dashboard/          # 대시보드 데이터
│   ├── equipment/          # 설비 관리
│   ├── inventory/          # 재고 관리
│   └── tool-changes/       # 교체 기록
├── dashboard/              # 보호된 대시보드 페이지
└── (auth)/                # 인증 페이지

lib/                         # 핵심 애플리케이션 로직
├── auth/                   # 인증 및 권한
├── config/                 # 환경 설정
├── hooks/                  # React 훅
├── i18n/                   # 국제화
├── providers/              # React 컨텍스트
├── services/               # 외부 서비스 통합
├── supabase/              # Supabase 클라이언트
├── types/                  # TypeScript 타입 정의
└── utils/                  # 유틸리티 함수

components/                  # 재사용 가능한 컴포넌트
├── ui/                    # 기본 UI 컴포넌트
├── dashboard/             # 대시보드 컴포넌트
└── features/              # 기능별 컴포넌트
```

## 주요 기능 상세

### 권한 시스템
- **시스템 관리자**: 모든 기능 접근 가능
- **관리자**: 대부분의 관리 기능 접근
- **사용자**: 제한된 읽기 및 교체 기록 권한
- 개별 사용자별 세밀한 권한 설정 가능

### 검색 기능
- **설비 관리**: 설비번호 (C001/1 자동 변환), 모델, 상태, 위치
- **앤드밀 관리**: 코드, 이름, 동적 카테고리
- **교체 실적**: 설비번호, 생산모델, 공정, 앤드밀 코드

### 실시간 기능
- Supabase Realtime을 통한 실시간 데이터 구독
- 10 events/second 제한 설정
- 자동 캐시 무효화 및 갱신

## 코딩 규칙

### TypeScript
- Strict mode 사용
- `any` 타입 사용 금지
- 모든 타입 명시적 선언

### 스타일링
- Tailwind CSS 클래스만 사용
- 회사 컬러 팔레트 (#1e3a8a - primary blue)
- 터치 친화적 크기 (최소 44px)

### 다국어
- 모든 사용자 대면 텍스트는 번역 키 사용
- `useTranslations` 훅 활용
- 한국어 기본, 베트남어 지원

## API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/session` - 세션 확인

### 설비
- `GET /api/equipment` - 설비 목록
- `POST /api/equipment` - 설비 생성
- `PUT /api/equipment/:id` - 설비 수정
- `DELETE /api/equipment/:id` - 설비 삭제
- `POST /api/equipment/bulk-upload` - Excel 대량 업로드

### 엔드밀
- `GET /api/endmill` - 엔드밀 목록
- `GET /api/endmill/categories` - 카테고리 목록
- `GET /api/endmill/suppliers` - 공급업체 목록
- `POST /api/endmill` - 엔드밀 생성

### 교체 기록
- `GET /api/tool-changes` - 교체 이력
- `POST /api/tool-changes` - 교체 기록 생성
- `GET /api/tool-changes/auto-fill` - 자동 완성 데이터

### 재고
- `GET /api/inventory` - 재고 목록
- `POST /api/inventory/inbound` - 입고 처리
- `POST /api/inventory/outbound` - 출고 처리

### 보고서
- `GET /api/reports/monthly` - 월간 보고서
- `GET /api/reports/cost` - 비용 분석
- `GET /api/reports/tool-life` - 공구 수명 분석
- `GET /api/reports/performance` - 성능 보고서

## 최근 업데이트

### 2025.10.08
- 교체 실적 검색 기능 개선 (설비번호, 생산모델, 공정, 앤드밀 코드)
- 설비 관리 검색 개선 (C001 형식 지원)
- 앤드밀 카테고리 동적 필터링
- 사용자 개별 권한 시스템 구현

### 주요 수정 사항
- 역할 기반 권한에서 개별 사용자 권한 시스템으로 전환
- `user_profiles.permissions` 컬럼 추가
- 검색 기능 전반적 개선
- 실시간 데이터 동기화 개선

## 라이선스

MIT

## 기여

프로젝트 개선을 위한 기여를 환영합니다.

## 지원

문의사항이 있으시면 프로젝트 관리자에게 연락하세요.
