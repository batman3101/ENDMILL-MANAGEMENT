# CNC 앤드밀 관리 시스템 개발 계획

## 📋 개발 개요

PRD 기반 단계별 모듈 개발을 통해 800대 CNC 설비를 위한 포괄적인 앤드밀 관리 시스템을 구축합니다.

### 🎯 Phase 1: MVP (대부분 완료)
**목표**: 기본 설비 관리, 앤드밀 교체 기록, 재고 현황 조회, 사용자 인증

---

## 📊 전체 진행 상황

| 단계 | 모듈 | 상태 | 진행률 |
|-----|-----|------|-------|
| Step 0 | UI/UX 기반 | ✅ 완료 | 100% |
| Step 1 | 기반 인프라 | ✅ 완료 | 100% |
| Step 2 | 사용자 인증 | 🔄 진행중 | 70% |
| Step 3 | 설비 관리 | ✅ 완료 | 95% |
| Step 4 | 재고 관리 | ✅ 완료 | 90% |
| Step 5 | CAM Sheet 관리 | ✅ 완료 | 100% |
| Step 6 | 앤드밀 관리 | ✅ 완료 | 95% |
| Step 7 | 교체 이력 관리 | ✅ 완료 | 90% |

---

## 🔧 Step 1: 기반 인프라 설정 ✅ 완료

### 📝 완료된 작업
- ✅ **1.1 패키지 설치**
  - ✅ @supabase/supabase-js
  - ✅ @tanstack/react-query
  - ✅ @tanstack/react-query-devtools
  - ✅ zod (타입 검증)
  - ✅ xlsx (엑셀 처리)
  - ✅ React Hook Form

- ✅ **1.2 환경설정**
  - ✅ .env.local 파일 구조
  - ✅ Supabase 클라이언트 설정
  - ✅ 환경변수 구성

- ✅ **1.3 데이터베이스 스키마**
  - ✅ 핵심 테이블 생성 SQL (schema.sql)
  - ✅ TypeScript 타입 정의 (database.ts)
  - ✅ Mock 데이터 시스템 구축

- ✅ **1.4 API 구조**
  - ✅ Supabase 클라이언트 설정
  - ✅ TypeScript 타입 정의
  - ✅ API 라우트 구조 생성
  - ✅ 상태 관리 Hooks

### 📋 상세 계획

#### 1.1 데이터베이스 스키마 (PRD 기반)

```sql
-- 설비 관리
CREATE TABLE equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(10) NOT NULL, -- PA1, PA2, PS, B7, Q7
  equipment_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, maintenance, offline
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 공정 관리
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipments(id),
  process_name VARCHAR(50) NOT NULL, -- CNC#1, CNC#2
  process_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 앤드밀 카테고리
CREATE TABLE endmill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL
  name_ko VARCHAR(50) NOT NULL,
  name_vi VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 앤드밀 타입
CREATE TABLE endmill_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- AT001, AT002
  category_id UUID REFERENCES endmill_categories(id),
  description_ko VARCHAR(200),
  description_vi VARCHAR(200),
  specifications JSONB, -- 직경, 날 수 등
  unit_cost DECIMAL(10,2),
  standard_life INTEGER DEFAULT 2000,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 재고 관리
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endmill_type_id UUID REFERENCES endmill_types(id),
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  max_stock INTEGER DEFAULT 100,
  location VARCHAR(50),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.2 API 엔드포인트 구조

```
/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts  
│   └── user/route.ts
├── equipment/
│   ├── route.ts (GET, POST)
│   └── [id]/route.ts (GET, PUT, DELETE)
├── endmill/
│   ├── categories/route.ts
│   ├── types/route.ts
│   └── inventory/route.ts
└── dashboard/
    └── stats/route.ts
```

#### 1.3 상태 관리 구조

```
lib/
├── hooks/
│   ├── useAuth.ts
│   ├── useEquipment.ts
│   ├── useEndmill.ts
│   └── useInventory.ts
├── types/
│   ├── database.ts
│   ├── api.ts
│   └── common.ts
└── utils/
    ├── supabase.ts
    ├── api.ts
    └── validation.ts
```

---

## �� Step 2: 사용자 인증 시스템 🔄 진행중 (70%)

### 📝 완료된 작업
- ✅ **2.1 UI 컴포넌트**
  - ✅ 로그인 페이지 UI 구현
  - ✅ 레이아웃 구조 완성

### 📝 남은 작업
- [ ] **2.2 Supabase Auth 설정**
  - [ ] 이메일/비밀번호 인증 기능 연동
  - [ ] 사용자 세션 관리
  - [ ] 자동 로그인 처리

- [ ] **2.3 권한 관리**
  - [ ] 역할 기반 접근 제어 (admin, manager, operator)
  - [ ] 보호된 라우트 미들웨어
  - [ ] 페이지별 권한 검증

### 📋 사용자 역할 정의
- **Admin**: 전체 시스템 관리, 사용자 관리
- **Manager**: 대시보드 조회, 재고 관리, 리포트 생성
- **Operator**: 교체 기록 입력, QR 스캔, 제한된 조회

---

## 🏭 Step 3: 설비 관리 모듈 ✅ 완료 (95%)

### 📝 완료된 작업
- ✅ **3.1 설비 CRUD**
  - ✅ 설비 목록 조회 (800대 설비 목록)
  - ✅ 설비 상태 관리 (가동중/점검중/셋업중)
  - ✅ 설비별 필터링 및 검색
  - ✅ 페이지네이션

- ✅ **3.2 실시간 모니터링**
  - ✅ 설비 상태 대시보드
  - ✅ 모델별/공정별 배치 현황
  - ✅ 상태 변경 시스템

### 📝 개선 필요
- [ ] **3.3 고도화**
  - [ ] 실제 설비 데이터 연동
  - [ ] 실시간 상태 업데이트
  - [ ] 설비 점검 스케줄링

---

## 📦 Step 4: 재고 관리 모듈 ✅ 완료 (90%)

### 📝 완료된 작업
- ✅ **4.1 재고 현황 관리**
  - ✅ 실시간 재고 조회
  - ✅ 앤드밀별 재고 상태 (충분/부족/위험)
  - ✅ 공급업체별 재고 관리
  - ✅ 최소/최대 재고 설정

- ✅ **4.2 입출고 시스템**
  - ✅ 입고 처리 페이지 (/dashboard/inventory/inbound)
  - ✅ 출고 처리 페이지 (/dashboard/inventory/outbound)
  - ✅ QR 스캔 기능 준비

### 📝 개선 필요
- [ ] **4.3 고도화**
  - [ ] 실제 QR 스캔 구현
  - [ ] 자동 발주 시스템
  - [ ] 재고 이력 분석

---

## 📋 Step 5: CAM Sheet 관리 ✅ 완료 (100%)

### 📝 완료된 작업
- ✅ **5.1 CAM Sheet CRUD**
  - ✅ CAM Sheet 등록/수정/삭제
  - ✅ 모델별/공정별 관리
  - ✅ 앤드밀 정보 연결

- ✅ **5.2 엑셀 연동**
  - ✅ 엑셀 템플릿 다운로드
  - ✅ 엑셀 일괄 업로드
  - ✅ 데이터 검증 시스템

- ✅ **5.3 분석 기능**
  - ✅ Tool Life 예측 정확도 분석
  - ✅ 교체 주기 분석
  - ✅ 재고 연동률 확인
  - ✅ 표준화 지수 측정

---

## 🔧 Step 6: 앤드밀 관리 ✅ 완료 (95%)

### 📝 완료된 작업
- ✅ **6.1 앤드밀 현황 관리**
  - ✅ 12,000개 앤드밀 목록 관리
  - ✅ 설비별/위치별 현황 조회
  - ✅ 상태별 필터링 (신규/사용중/경고/위험)

- ✅ **6.2 상세 정보 시스템**
  - ✅ 앤드밀별 상세 페이지 (/dashboard/endmill-detail/[code])
  - ✅ 성능 분석 대시보드
  - ✅ 공급업체별 정보 관리
  - ✅ 사용 현황 및 교체 이력

- ✅ **6.3 마스터 데이터 관리**
  - ✅ 엑셀 마스터 업로드 기능
  - ✅ 앤드밀 정보 수정 기능

---

## 📝 Step 7: 교체 이력 관리 ✅ 완료 (90%)

### 📝 완료된 작업
- ✅ **7.1 교체 기록 시스템**
  - ✅ 교체 실적 등록
  - ✅ 교체 이력 조회
  - ✅ CAM Sheet 연동 자동완성

- ✅ **7.2 분석 기능**
  - ✅ 교체 사유별 통계
  - ✅ 설비별 교체 현황
  - ✅ Tool Life 분석

### 📝 개선 필요
- [ ] **7.3 고도화**
  - [ ] 자동 교체 알림
  - [ ] 예측 교체 시스템

---

## 🎯 Phase 2: 고도화 및 최적화

### 📋 진행 예정 작업

#### 🔒 우선순위 1: 인증 시스템 완성
- [ ] Supabase Auth 완전 연동
- [ ] 역할 기반 권한 관리
- [ ] 세션 관리 개선

#### 📊 우선순위 2: 실시간 대시보드
- [ ] 실시간 데이터 연동
- [ ] WebSocket 기반 업데이트
- [ ] 알람 시스템

#### 🏷️ 우선순위 3: QR 코드 시스템
- [ ] QR 코드 생성/스캔
- [ ] 모바일 최적화
- [ ] 오프라인 지원

#### 📈 우선순위 4: 고급 분석
- [ ] AI 기반 예측 분석
- [ ] 비용 최적화 추천
- [ ] 성능 벤치마킹

#### 📱 우선순위 5: 모바일 앱
- [ ] PWA 구현
- [ ] 오프라인 기능
- [ ] 푸시 알림

---

## 🛠️ 기술 스택 현황

### 완료된 기술 스택
- ✅ **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- ✅ **Backend**: Next.js API Routes, Supabase
- ✅ **Database**: PostgreSQL (Supabase)
- ✅ **State Management**: React Query, Custom Hooks
- ✅ **UI Components**: Custom components with Tailwind
- ✅ **Form Handling**: React Hook Form + Zod
- ✅ **File Processing**: xlsx for Excel handling

### 추가 예정 기술
- [ ] **Authentication**: Supabase Auth
- [ ] **Real-time**: Supabase Realtime
- [ ] **Mobile**: PWA
- [ ] **QR Code**: react-qr-code, qr-scanner

---

## 📝 진행 노트

### 2025-01-21
- ✅ 기본 UI/UX 완성
- ✅ CAM Sheet 관리 시스템 완성
- ✅ 앤드밀 관리 시스템 완성
- ✅ 설비 관리 시스템 완성
- ✅ 재고 관리 시스템 기본 완성
- ✅ 교체 이력 관리 시스템 완성
- 🔄 인증 시스템 구현 진행중

### 현재 상태
- **전체 진행률**: 약 85% 완료
- **MVP 기능**: 대부분 완성
- **다음 단계**: 인증 시스템 완성 및 실시간 기능 구현

---

**🎯 현재 목표**: 인증 시스템 완성 후 실시간 기능 및 QR 시스템 구현 