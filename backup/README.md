
# CNC 앤드밀 관리 시스템 (CNC Endmill Management System)

## 🏭 프로젝트 개요

800대의 CNC 설비를 보유한 제조업체를 위한 포괄적인 앤드밀 교체 및 재고 관리 웹 애플리케이션입니다. 실시간 모니터링, 자동화된 발주 시스템, 그리고 상세한 분석 기능을 제공합니다.

### 🎯 주요 목표
- **효율적인 공구 관리**: 800대 설비의 앤드밀 교체 일정 최적화
- **재고 최적화**: 자동 발주 시스템으로 재고 부족 방지
- **비용 절감**: 공구 수명 분석을 통한 비용 효율성 향상
- **품질 향상**: CAM Sheet 기반 정확한 공구 선택 지원

## 🔧 기술 스택

### Frontend
- **React 19** - 최신 React 19 기능 및 서버 컴포넌트 활용
- **TypeScript 5.4** - 향상된 타입 안정성 및 성능
- **Tailwind CSS 3.4** - JIT 컴파일 및 향상된 CSS 네스팅
- **Shadcn/ui** - Radix UI 기반의 접근성 컴포넌트
- **Next.js 14** - 앱 라우터 및 서버 컴포넌트
- **TanStack Query 5** - 서버 상태 관리
- **Zod** - 런타임 타입 검증
- **React Hook Form** - 폼 상태 관리
- **Framer Motion** - 애니메이션 라이브러리
- **Vite** - 빠른 개발 서버 및 빌드 도구

### Backend & Database
- **Supabase** - Backend as a Service
  - **PostgreSQL 15** - 최신 데이터베이스 기능
  - **Supabase Edge Functions** - Deno 기반 서버리스 함수
  - **Realtime API** - 실시간 데이터 동기화
  - **Row Level Security (RLS)** - 세분화된 접근 제어
  - **Storage** - S3 호환 파일 스토리지
  - **Auth** - OAuth 및 이메일/비밀번호 인증
  - **Vector** - AI/ML을 위한 벡터 임베딩 지원
  - **PostgREST** - 자동 생성되는 RESTful API
  - **Database Webhooks** - 데이터 변경 시 트리거

### 추가 기능
- **QR Code 스캔** - 모바일 최적화 및 오프라인 지원
- **PWA (Progressive Web App)** - 오프라인 우선 전략 및 설치 가능
- **i18n (Internationalization)** - 한국어/베트남어/영어 다국어 지원
- **Excel/PDF 내보내기** - SheetJS 및 PDFKit을 활용한 보고서 생성
- **실시간 대시보드** - WebSocket 기반 실시간 모니터링
- **AI 예측 분석** - 머신러닝 기반 공구 수명 예측
- **자동 백업** - 클라우드 스토리지 연동 자동 백업
- **API 문서화** - Swagger/OpenAPI 3.0 기반 문서화

## 🏗️ 시스템 아키텍처

### 데이터베이스 구조

```
equipments (설비)
├── id (UUID, PK)
├── model_code (VARCHAR) - PA1, PA2, PS, B7, Q7 등
├── equipment_number (INTEGER)
├── status (ENUM) - active, maintenance, offline
├── location (VARCHAR)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

processes (공정)
├── id (UUID, PK)
├── equipment_id (UUID, FK)
├── process_name (VARCHAR) - CNC#1, CNC#2 등
├── process_order (INTEGER)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

endmill_categories (앤드밀 카테고리)
├── id (UUID, PK)
├── code (VARCHAR) - FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL
├── name_ko (VARCHAR)
├── name_vi (VARCHAR)
├── description (TEXT)
└── created_at (TIMESTAMP)

endmill_types (앤드밀 타입)
├── id (UUID, PK)
├── code (VARCHAR) - AT001, AT002 등
├── category_id (UUID, FK)
├── description_ko (VARCHAR)
├── description_vi (VARCHAR)
├── specifications (JSONB) - 직경, 날 수 등
├── unit_cost (DECIMAL)
└── created_at (TIMESTAMP)

tool_positions (공구 위치)
├── id (UUID, PK)
├── equipment_id (UUID, FK)
├── process_id (UUID, FK)
├── position_number (INTEGER) - 1~24 (T1~T24)
├── endmill_type_id (UUID, FK)
├── current_endmill_id (UUID, FK)
├── standard_life (INTEGER)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

endmill_instances (앤드밀 개체)
├── id (UUID, PK)
├── endmill_type_id (UUID, FK)
├── serial_number (VARCHAR)
├── qr_code (VARCHAR)
├── current_life (INTEGER)
├── status (ENUM) - new, active, warning, critical, replaced
├── installation_date (TIMESTAMP)
├── last_maintenance (TIMESTAMP)
├── supplier_id (UUID, FK)
└── created_at (TIMESTAMP)

tool_changes (공구 교체 기록)
├── id (UUID, PK)
├── tool_position_id (UUID, FK)
├── old_endmill_id (UUID, FK)
├── new_endmill_id (UUID, FK)
├── change_reason (ENUM) - scheduled, premature, damage, other
├── operator_id (UUID, FK)
├── shift (ENUM) - A, B, C
├── change_datetime (TIMESTAMP)
├── notes (TEXT)
└── created_at (TIMESTAMP)

inventory (재고)
├── id (UUID, PK)
├── endmill_type_id (UUID, FK)
├── current_stock (INTEGER)
├── min_stock (INTEGER)
├── max_stock (INTEGER)
├── location (VARCHAR)
├── last_updated (TIMESTAMP)
└── created_at (TIMESTAMP)

inventory_transactions (재고 거래)
├── id (UUID, PK)
├── endmill_type_id (UUID, FK)
├── transaction_type (ENUM) - in, out
├── quantity (INTEGER)
├── reference_id (UUID) - 교체 기록 등 참조
├── operator_id (UUID, FK)
├── notes (TEXT)
└── created_at (TIMESTAMP)

suppliers (공급업체)
├── id (UUID, PK)
├── name (VARCHAR)
├── contact_info (JSONB)
├── delivery_time (INTEGER) - 일 단위
└── created_at (TIMESTAMP)

cam_sheets (CAM Sheet)
├── id (UUID, PK)
├── model_code (VARCHAR)
├── process_id (UUID, FK)
├── sheet_image_url (VARCHAR)
├── tool_specifications (JSONB)
├── version (VARCHAR)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

users (사용자)
├── id (UUID, PK)
├── email (VARCHAR)
├── name (VARCHAR)
├── role (ENUM) - admin, manager, operator
├── shift (ENUM) - A, B, C
├── language_preference (ENUM) - ko, vi
└── created_at (TIMESTAMP)

translations (번역)
├── id (UUID, PK)
├── key (VARCHAR)
├── language (ENUM) - ko, vi
├── value (TEXT)
├── category (VARCHAR) - ui, error, notification
└── updated_at (TIMESTAMP)
```

## 🚀 개발 순서도

### Phase 1: 기초 설정 및 인증 (Week 1-2)
1. **프로젝트 초기 설정**
   - Supabase 프로젝트 생성 및 연동
   - 기본 UI 컴포넌트 라이브러리 구성
   - 라우팅 시스템 구축

2. **사용자 인증 시스템**
   - 회원가입/로그인 기능
   - 역할 기반 권한 관리 (admin, manager, operator)
   - 다국어 설정 기능

3. **기본 데이터베이스 구조**
   - 핵심 테이블 생성
   - RLS 정책 설정
   - 초기 데이터 시딩

### Phase 2: 핵심 모듈 개발 (Week 3-6)
4. **설비 관리 모듈**
   - 설비 등록/수정/삭제
   - 공정 관리
   - 설비 현황 대시보드

5. **앤드밀 관리 모듈**
   - 앤드밀 타입 관리
   - 공구 위치 관리
   - 교체 이력 추적

6. **재고 관리 모듈**
   - 입출고 관리
   - 자동 발주 알림
   - 재고 현황 대시보드

### Phase 3: 고급 기능 (Week 7-10)
7. **QR 코드 시스템**
   - QR 코드 생성
   - 모바일 스캔 기능
   - 실시간 정보 조회

8. **CAM Sheet 관리**
   - 이미지 업로드/관리
   - 공구 매칭 시스템
   - 버전 관리

9. **분석 및 리포트**
   - 실시간 대시보드
   - 비용 분석
   - 성능 리포트

### Phase 4: 최적화 및 배포 (Week 11-12)
10. **성능 최적화**
    - 쿼리 최적화
    - 캐싱 전략
    - 반응형 최적화

11. **테스트 및 배포**
    - 단위 테스트
    - 통합 테스트
    - 프로덕션 배포

## 📱 주요 기능

### 1. 실시간 대시보드 🏠
- 800대 설비 현황 모니터링
- 교체 필요 공구 알림
- 재고 부족 경고
- 일일/주간/월간 통계

### 2. 앤드밀 관리 🔧
- 24개 공구 위치별 관리 (T1~T24)
- 실시간 Tool Life 추적
- 교체 이력 관리
- 작업조별 교체 기록

### 3. 재고 관리 📦
- 입출고 자동 기록
- 최소 재고 알림
- 자동 발주서 생성
- QR 코드 기반 재고 확인

### 4. CAM Sheet 연동 📋
- 모델별 공구 사양 확인
- 이미지 기반 공구 매칭
- 버전 관리 시스템

### 5. 분석 및 리포트 📊
- 비용 분석 (일간/주간/월간/연간)
- 모델별 성능 분석
- Tool Life 예측
- Excel 리포트 내보내기

### 6. QR 스캔 📱
- 모바일 최적화 스캔
- 실시간 정보 조회
- 입출고 간편 처리

## 🌐 다국어 지원

### 지원 언어
- **한국어** (기본) - 개발자용
- **베트남어** - 실제 사용자용 (전문용어는 영어 혼합)

### 번역 시스템
- 데이터베이스 기반 번역 관리
- 실시간 언어 전환
- 관리자 번역 편집 기능

## 🎨 UI/UX 디자인 가이드

### 색상 팔레트
- **주 색상**: 진청색 (#1e3a8a) - 회사 대표 색상
- **보조 색상**: 연청색, 회색 계열
- **상태 색상**: 
  - 성공: 녹색 (#10b981)
  - 경고: 주황색 (#f59e0b)
  - 위험: 빨간색 (#ef4444)

### 디자인 원칙
- **직관적 네비게이션**: 이모지와 아이콘 조합
- **반응형 디자인**: 모바일/태블릿/데스크톱 최적화
- **접근성**: 고대비 색상, 큰 버튼 크기
- **일관성**: 통일된 컴포넌트 사용

## 🔐 보안 및 권한 관리

### 사용자 역할
1. **시스템 관리자** (System Admin)
   - 모든 기능 접근
   - 사용자 관리
   - 시스템 설정

2. **관리자** (Manager)
   - 대시보드 조회
   - 재고 관리
   - 리포트 생성

3. **일반 사용자** (Operator)
   - 교체 기록 입력
   - QR 스캔
   - 제한된 조회 권한

### 보안 기능
- Row Level Security (RLS)
- API 키 관리
- 작업 로그 기록
- 자동 로그아웃

## 📈 성능 및 확장성

### 성능 최적화
- 서버 사이드 렌더링
- 이미지 최적화
- 캐싱 전략
- 지연 로딩

### 확장성 고려사항
- 모듈형 아키텍처
- API 기반 설계
- 마이크로서비스 준비
- 수평적 확장 가능

## 🔄 워크플로우

### 앤드밀 교체 프로세스
```
1. Tool Life 모니터링
   ↓
2. 교체 알림 발생
   ↓
3. CAM Sheet 확인
   ↓
4. 재고 확인
   ↓
5. QR 스캔으로 공구 선택
   ↓
6. 교체 작업 수행
   ↓
7. 시스템 기록 업데이트
   ↓
8. 재고 자동 차감
```

### 재고 관리 프로세스
```
1. 재고 모니터링
   ↓
2. 최소 재고 이하 감지
   ↓
3. 자동 알림 발생
   ↓
4. 발주서 생성
   ↓
5. 승인 및 발주
   ↓
6. 입고 처리
   ↓
7. QR 라벨 생성
   ↓
8. 재고 업데이트
```

## 🚀 MVP 구현 전략

### 1단계 MVP (핵심 기능)
- ✅ 기본 대시보드
- ✅ 앤드밀 교체 기록
- ✅ 재고 현황 조회
- 사용자 인증
- 기본 보고서

### 2단계 확장
- QR 스캔 기능
- CAM Sheet 연동
- 고급 분석
- 자동 발주 시스템

### 3단계 고도화
- AI 기반 예측
- 모바일 앱
- API 연동
- 고급 리포트

## 📦 설치 및 실행

### 개발 환경 설정
```bash
# 프로젝트 클론
git clone [repository-url]
cd cnc-endmill-management

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# Supabase 설정 정보 입력

# 개발 서버 실행
npm run dev
```

### 프로덕션 배포
```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

## 🤝 기여 가이드

### 개발 규칙
- TypeScript 엄격 모드 사용
- ESLint/Prettier 준수
- 컴포넌트 단위 개발
- 테스트 코드 작성

### Git 규칙
- Conventional Commits 사용
- Feature 브랜치 전략
- Pull Request 필수
- 코드 리뷰 진행

## 📞 지원 및 문의

### 기술 지원
- 개발팀: dev@company.com
- 시스템 관리: admin@company.com

### 사용자 가이드
- 한국어 매뉴얼: [링크]
- 베트남어 매뉴얼: [링크]
- 비디오 튜토리얼: [링크]

---

**© 2025 CNC Endmill Management System. All rights reserved.**

*본 시스템은 제조업의 디지털 전환을 위한 포괄적인 솔루션을 제공합니다.*
