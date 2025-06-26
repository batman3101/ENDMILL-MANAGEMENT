# CNC 앤드밀 관리 시스템 개발 계획

## 📋 개발 개요

PRD 기반 단계별 모듈 개발을 통해 800대 CNC 설비를 위한 포괄적인 앤드밀 관리 시스템을 구축합니다.

### 🎯 Phase 1: MVP (현재 진행)
**목표**: 기본 설비 관리, 앤드밀 교체 기록, 재고 현황 조회, 사용자 인증

---

## 📊 전체 진행 상황

| 단계 | 모듈 | 상태 | 진행률 |
|-----|-----|------|-------|
| Step 0 | UI/UX 기반 | ✅ 완료 | 100% |
| Step 1 | 기반 인프라 | ✅ 완료 | 100% |
| Step 2 | 사용자 인증 | ⏳ 대기 | 0% |
| Step 3 | 설비 관리 | ⏳ 대기 | 0% |
| Step 4 | 재고 관리 | ⏳ 대기 | 0% |

---

## 🔧 Step 1: 기반 인프라 설정

### 📝 작업 목록
- [ ] **1.1 패키지 설치**
  - [ ] @supabase/supabase-js
  - [ ] @tanstack/react-query
  - [ ] @tanstack/react-query-devtools
  - [ ] zod (타입 검증)

- [ ] **1.2 환경설정**
  - [ ] .env.local 파일 생성
  - [ ] Supabase 프로젝트 설정
  - [ ] 환경변수 구성

- [ ] **1.3 데이터베이스 스키마**
  - [ ] 핵심 테이블 생성 SQL
  - [ ] RLS 정책 설정
  - [ ] 초기 시드 데이터

- [ ] **1.4 API 구조**
  - [ ] Supabase 클라이언트 설정
  - [ ] TypeScript 타입 정의
  - [ ] 기본 API 구조 생성

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

## 🔐 Step 2: 사용자 인증 시스템

### 📝 작업 목록
- [ ] **2.1 Supabase Auth 설정**
  - [ ] 이메일/비밀번호 인증 활성화
  - [ ] 사용자 역할 관리 테이블
  - [ ] RLS 정책 설정

- [ ] **2.2 인증 컴포넌트**
  - [ ] 로그인 페이지 기능 구현
  - [ ] 로그아웃 기능
  - [ ] 사용자 상태 관리

- [ ] **2.3 권한 관리**
  - [ ] 역할 기반 접근 제어 (admin, manager, operator)
  - [ ] 보호된 라우트 미들웨어
  - [ ] 페이지별 권한 검증

### 📋 사용자 역할 정의
- **Admin**: 전체 시스템 관리, 사용자 관리
- **Manager**: 대시보드 조회, 재고 관리, 리포트 생성
- **Operator**: 교체 기록 입력, QR 스캔, 제한된 조회

---

## 🏭 Step 3: 설비 관리 모듈

### 📝 작업 목록
- [ ] **3.1 설비 CRUD**
  - [ ] 설비 목록 조회
  - [ ] 설비 등록/수정/삭제
  - [ ] 설비 상태 관리

- [ ] **3.2 공정 관리**
  - [ ] 공정 등록/관리
  - [ ] 공구 위치 (T1-T24) 관리
  - [ ] 설비별 공정 연결

- [ ] **3.3 실시간 모니터링**
  - [ ] 설비 상태 대시보드
  - [ ] 가동률 통계
  - [ ] 알림 시스템

---

## 📦 Step 4: 재고 관리 모듈

### 📝 작업 목록
- [ ] **4.1 앤드밀 타입 관리**
  - [ ] 카테고리별 분류
  - [ ] 타입 등록/수정
  - [ ] 사양 관리

- [ ] **4.2 재고 현황**
  - [ ] 실시간 재고 조회
  - [ ] 입출고 기록
  - [ ] 최소 재고 알림

- [ ] **4.3 재고 트랜잭션**
  - [ ] 입고 처리
  - [ ] 출고 처리
  - [ ] 재고 이력 관리

---

## 🔄 다음 단계 (Phase 2)

1. **실시간 대시보드**
2. **QR 코드 시스템**
3. **자동 알림**
4. **기본 보고서**

---

## 📝 진행 노트

### 2025-01-21
- ✅ 기본 UI/UX 완성
- ✅ 대시보드 404 에러 해결
- 🔄 Step 1 시작 예정

### 체크포인트
각 Step 완료 후 사용자와 상의하여 다음 단계 진행 결정

---

**🎯 현재 목표**: Step 1 (기반 인프라 설정) 완료 후 사용자 상의 