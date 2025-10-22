# AI 인사이트 기능 - 제품 요구사항 정의서 (PRD)

**버전**: 1.0
**작성일**: 2025-10-21
**프로젝트**: CNC Endmill Management System - AI Insights Feature

---

## 📋 목차

1. [개요](#1-개요)
2. [비즈니스 목표](#2-비즈니스-목표)
3. [핵심 기능](#3-핵심-기능)
4. [사용자 시나리오](#4-사용자-시나리오)
5. [기술 아키텍처](#5-기술-아키텍처)
6. [UI/UX 요구사항](#6-uiux-요구사항)
7. [데이터 요구사항](#7-데이터-요구사항)
8. [보안 요구사항](#8-보안-요구사항)
9. [성능 요구사항](#9-성능-요구사항)
10. [제약사항 및 고려사항](#10-제약사항-및-고려사항)
11. [성공 지표](#11-성공-지표)

---

## 1. 개요

### 1.1 배경

현재 CNC Endmill Management System은 800대의 CNC 장비에 대한 공구 교체, 재고 관리, 보고서 생성 등의 기능을 제공합니다. 그러나 데이터 분석을 위해서는 전문 지식이 필요하며, 현장 관리자들이 즉각적인 인사이트를 얻기 어려운 상황입니다.

### 1.2 목적

Google Gemini API를 활용하여 자연어 기반의 데이터 분석 및 인사이트 도출 기능을 제공함으로써:
- 비전문가도 쉽게 데이터 분석 가능
- 실시간 의사결정 지원
- 데이터 기반 공구 관리 최적화

### 1.3 범위

**Phase 1 (MVP):**
- 자연어 기반 데이터베이스 질의응답
- 기본 인사이트 생성 (공구 교체, 파손 분석)
- 인사이트 저장 및 공유

**Phase 2 (향후 확장):**
- 고급 데이터 시각화
- 예측 분석 (공구 수명 예측, 재고 최적화)
- 자동 보고서 생성

**Out of Scope (Phase 1):**
- 음성 인터페이스
- 실시간 알림/경고
- 외부 시스템 연동

---

## 2. 비즈니스 목표

### 2.1 주요 목표

1. **데이터 접근성 향상**: 현장 관리자가 기술적 지식 없이 데이터 분석 가능
2. **의사결정 속도 향상**: 즉각적인 인사이트 제공으로 빠른 대응
3. **운영 효율성 증대**: 공구 파손 패턴 분석을 통한 예방 조치

### 2.2 성공 기준

- 사용자의 80% 이상이 주 1회 이상 AI 인사이트 기능 사용
- 데이터 분석 시간 평균 70% 단축
- 공구 파손률 10% 감소 (3개월 내)

---

## 3. 핵심 기능

### 3.1 자연어 질의응답 (Natural Language Query)

**설명**: 사용자가 한국어/베트남어로 질문하면 AI가 데이터베이스를 조회하여 답변

**예시 질문:**
- "최근 한달간 공구파손이 가장 많았던 모델, 공정, 앤드밀 코드를 알려 줘"
- "PA1 모델의 T5 위치에서 지난주 교체된 공구는 몇 개야?"
- "재고가 부족한 엔드밀 목록을 보여줘"
- "A조와 B조 중 어느 조에서 공구 파손이 더 많아?"

**기능 요구사항:**
- [x] 자연어 입력 (한국어/베트남어)
- [x] SQL 쿼리 자동 생성
- [x] 안전한 쿼리 실행 (SQL Injection 방어)
- [x] 자연어 응답 생성
- [x] 관련 데이터 시각화 (차트/그래프)

### 3.2 인사이트 대시보드

**설명**: AI가 데이터베이스를 분석하여 자동으로 발견한 인사이트를 표시

**자동 인사이트 예시:**
- 특정 모델/공정에서 평균보다 높은 공구 파손률 감지
- 재고 부족 예상 알림
- 비정상적인 공구 교체 패턴 감지
- 비용 절감 기회 발견

**기능 요구사항:**
- [x] 주요 인사이트 카드 형태로 표시
- [x] 우선순위 정렬 (중요도/긴급도)
- [x] 상세 분석 페이지 이동
- [x] 인사이트 기각/승인 기능

### 3.3 인사이트 편집 및 후가공

**설명**: AI가 생성한 인사이트를 사용자가 수정/보완 가능

**기능 요구사항:**
- [x] 텍스트 편집 (WYSIWYG 에디터)
- [x] 차트 커스터마이징 (타입 변경, 색상, 필터)
- [x] 주석/메모 추가
- [x] 버전 관리 (편집 히스토리)

### 3.4 저장 및 공유

**설명**: 인사이트를 저장하고 팀원과 공유

**기능 요구사항:**
- [x] 인사이트 저장 (개인/팀 폴더)
- [x] PDF/Excel 내보내기
- [x] 팀원 공유 (권한 관리)
- [x] 댓글 기능
- [x] 북마크/즐겨찾기

### 3.5 대화 히스토리

**설명**: 이전 질문과 답변 기록 유지

**기능 요구사항:**
- [x] 대화 세션 저장
- [x] 검색 기능
- [x] 재질문/후속 질문 지원
- [x] 히스토리 기반 컨텍스트 유지

---

## 4. 사용자 시나리오

### 4.1 현장 관리자 - 긴급 파손 분석

**사용자**: 김현장 (현장 관리자, 40세)
**상황**: PA2 모델에서 오늘 공구 파손이 3건 발생
**목표**: 파손 원인 파악 및 예방 조치

**시나리오:**
1. AI 인사이트 페이지 접속
2. "PA2 모델에서 오늘 파손된 공구 정보를 알려줘" 입력
3. AI가 파손 공구 목록, T 위치, 공정 정보 제공
4. "지난 한달간 PA2에서 파손이 많았던 T 위치는?" 추가 질문
5. AI가 T3, T7 위치에서 파손 빈도가 높다고 분석
6. 인사이트를 저장하고 보전팀에 공유
7. 해당 T 위치 공구 점검 지시

### 4.2 관리자 - 월간 보고서 작성

**사용자**: 이관리 (관리자, 35세)
**상황**: 월간 공구 관리 보고서 작성 필요
**목표**: 빠르게 핵심 데이터 수집

**시나리오:**
1. AI 인사이트 페이지 접속
2. "지난달 공구 교체 현황을 요약해줘" 입력
3. AI가 총 교체 건수, 비용, 주요 모델 정보 제공
4. "모델별 교체 비용을 차트로 보여줘" 요청
5. 막대 차트 생성됨
6. 차트 타입을 파이 차트로 변경
7. 텍스트 설명 추가 및 편집
8. PDF로 내보내기하여 보고서에 첨부

### 4.3 재고 관리자 - 발주 계획

**사용자**: 박재고 (재고 관리자, 32세)
**상황**: 주간 발주 계획 수립
**목표**: 재고 부족 예상 품목 파악

**시나리오:**
1. AI 인사이트 대시보드 확인
2. "재고 부족 경고" 카드 클릭
3. 상세 내역 확인 (엔드밀 코드, 현재고, 주간 사용량)
4. "이 엔드밀들의 지난 3개월 사용 추이를 보여줘" 질문
5. AI가 트렌드 차트 제공
6. 발주 수량 결정 후 메모 추가
7. 구매팀에 공유

---

## 5. 기술 아키텍처

### 5.1 시스템 구조 (RAG 방식)

```
┌─────────────┐
│   사용자    │
│ (한국어/베트남어) │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend (Next.js + React)         │
│  - ChatInterface.tsx                │
│  - InsightCard.tsx                  │
│  - InsightEditor.tsx                │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  API Routes (Next.js API)           │
│  - /api/ai/chat                     │
│  - /api/ai/insights                 │
│  - /api/ai/query                    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Gemini Service Layer               │
│  - naturalLanguageQuery.ts          │
│  - schemaContext.ts                 │
│  - geminiService.ts                 │
└──────┬──────────────────────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Gemini   │  │ Supabase │  │ saved_   │
│ API      │  │ Database │  │ insights │
└──────────┘  └──────────┘  └──────────┘
```

### 5.2 주요 컴포넌트

**Backend:**
- `lib/services/geminiService.ts` - Gemini API 클라이언트
- `lib/services/naturalLanguageQuery.ts` - 자연어 → SQL 변환
- `lib/utils/schemaContext.ts` - DB 스키마 컨텍스트 관리
- `lib/utils/sqlValidator.ts` - SQL 안전성 검증
- `app/api/ai/chat/route.ts` - 채팅 엔드포인트
- `app/api/ai/query/route.ts` - 자연어 쿼리 엔드포인트
- `app/api/ai/insights/route.ts` - 인사이트 생성 엔드포인트

**Frontend:**
- `app/dashboard/ai-insights/page.tsx` - 메인 페이지
- `components/features/ai/ChatInterface.tsx` - 채팅 UI
- `components/features/ai/InsightCard.tsx` - 인사이트 카드
- `components/features/ai/InsightEditor.tsx` - 편집기
- `components/features/ai/ChartCustomizer.tsx` - 차트 커스터마이징
- `lib/hooks/useGemini.ts` - TanStack Query 훅
- `lib/hooks/useSavedInsights.ts` - 저장된 인사이트 관리

### 5.3 데이터 흐름

**자연어 질의 흐름:**

1. 사용자가 질문 입력 (예: "최근 한달간 파손이 많았던 모델은?")
2. Frontend → API `/api/ai/query`로 요청
3. API가 DB 스키마 + 질문을 Gemini에 전달
4. Gemini가 SQL 쿼리 생성
5. SQL 검증 (sqlValidator)
6. Supabase에서 쿼리 실행
7. 결과 + 질문을 다시 Gemini에 전달
8. Gemini가 자연어 답변 생성
9. Frontend에 응답 반환

**인사이트 생성 흐름:**

1. 정기적으로 (예: 매일 오전 6시) `/api/ai/insights` 호출
2. 최근 데이터를 Gemini에 전달
3. Gemini가 이상 패턴, 주요 인사이트 감지
4. `saved_insights` 테이블에 저장
5. 사용자 로그인 시 대시보드에 표시

---

## 6. UI/UX 요구사항

### 6.1 메인 화면 구성

```
┌────────────────────────────────────────────────────────┐
│  🤖 AI 인사이트                              [설정] [?] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  💬 무엇을 도와드릴까요?                       │    │
│  │  ___________________________________________  │    │
│  │                                       [전송] │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  📊 주요 인사이트                         [모두 보기] │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ ⚠️ 공구 파손 │ │ 📉 재고 부족│ │ 💰 비용 절감│   │
│  │ PA2 모델    │ │ EM-2024-01 │ │ 기회 발견   │   │
│  │ 증가 추세   │ │ 3일 내 소진 │ │ -15% 가능  │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                        │
│  📜 최근 대화 기록                        [모두 보기] │
│  • 오늘 오전 10:30 - PA2 파손 분석                   │
│  • 어제 오후 3:15 - 월간 재고 현황                    │
│  • 2일 전 - A조 공구 교체 패턴                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 6.2 채팅 인터페이스

```
┌────────────────────────────────────────────────────────┐
│  💬 AI 대화                        [새 대화] [히스토리] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  사용자: 최근 한달간 파손이 많았던 모델은?            │
│  ⏰ 오전 10:25                                        │
│                                                        │
│  🤖 AI: 최근 한 달간 공구 파손이 가장 많았던 모델은   │
│  PA2입니다. 총 45건의 파손이 발생했으며, 특히 T3와   │
│  T7 위치에서 집중적으로 발생했습니다.                │
│                                                        │
│  [상세 데이터 보기] [차트로 보기] [저장]              │
│  ⏰ 오전 10:25                                        │
│                                                        │
│  사용자: T3 위치의 파손 원인을 분석해줘               │
│  ⏰ 오전 10:26                                        │
│                                                        │
│  🤖 AI: 분석 중...                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
│  무엇을 도와드릴까요? _____________________ [전송]    │
└────────────────────────────────────────────────────────┘
```

### 6.3 인사이트 편집기

```
┌────────────────────────────────────────────────────────┐
│  📝 인사이트 편집                    [저장] [공유] [X] │
├────────────────────────────────────────────────────────┤
│  제목: PA2 모델 공구 파손 분석 보고서                 │
│  ───────────────────────────────────────────────────  │
│                                                        │
│  [B] [I] [U] [링크] [차트] [표]                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  ## 요약                                      │    │
│  │  최근 한 달간 PA2 모델에서 총 45건의 공구    │    │
│  │  파손이 발생했습니다.                        │    │
│  │                                               │    │
│  │  [차트: 모델별 파손 현황]                    │    │
│  │                                               │    │
│  │  주요 발견사항:                              │    │
│  │  - T3 위치: 18건 (40%)                      │    │
│  │  - T7 위치: 12건 (27%)                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  📊 차트 설정                                         │
│  유형: [막대 차트 ▼] 색상: [파랑 ▼]                  │
│  데이터: [지난 30일 ▼] 필터: [모델: PA2]             │
│                                                        │
│  👥 공유 설정                                         │
│  ○ 나만 보기  ● 팀 공유  ○ 전체 공개                 │
│  권한: [편집 가능 ▼]                                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 6.4 디자인 가이드라인

**색상:**
- Primary (AI): `#10b981` (녹색 - 인사이트)
- Warning (알림): `#f59e0b` (주황색)
- Danger (긴급): `#ef4444` (빨강)
- 기존 시스템 Primary: `#1e3a8a` (회사 파랑)

**타이포그래피:**
- 제목: `font-semibold text-lg`
- 본문: `font-normal text-base`
- AI 응답: `font-light text-base leading-relaxed`

**간격:**
- 카드 간격: `gap-4`
- 섹션 간격: `space-y-6`
- 터치 영역: `min-h-[44px] min-w-[44px]`

**아이콘:**
- AI: 🤖
- 인사이트: 💡
- 경고: ⚠️
- 성공: ✅
- 차트: 📊

---

## 7. 데이터 요구사항

### 7.1 새로운 테이블

**saved_insights**
```sql
CREATE TABLE saved_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'markdown', -- markdown, html
  chart_config JSONB, -- 차트 설정
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[], -- 공유 대상 사용자 ID 배열
  tags TEXT[],
  metadata JSONB -- 추가 메타데이터
);

CREATE INDEX idx_saved_insights_created_by ON saved_insights(created_by);
CREATE INDEX idx_saved_insights_tags ON saved_insights USING GIN(tags);
```

**ai_chat_history**
```sql
CREATE TABLE ai_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  session_id UUID NOT NULL,
  message_type TEXT NOT NULL, -- 'user', 'ai'
  content TEXT NOT NULL,
  query_result JSONB, -- SQL 결과 (해당하는 경우)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX idx_ai_chat_history_session_id ON ai_chat_history(session_id);
```

**insight_comments**
```sql
CREATE TABLE insight_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_id UUID REFERENCES saved_insights(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insight_comments_insight_id ON insight_comments(insight_id);
```

### 7.2 기존 테이블 활용

**주요 쿼리 대상 테이블:**
- `tool_changes` - 공구 교체 이력
- `equipment` - 장비 정보
- `endmill_types` - 엔드밀 사양
- `inventory` - 재고 현황
- `inventory_transactions` - 입출고 이력
- `user_profiles` - 사용자 정보

### 7.3 데이터 접근 권한

**RLS (Row Level Security) 정책:**
- `saved_insights`: 본인 작성 or 공유받은 인사이트만 조회 가능
- `ai_chat_history`: 본인 대화 기록만 조회 가능
- `insight_comments`: 인사이트 접근 권한 있는 사용자만 댓글 가능

---

## 8. 보안 요구사항

### 8.1 API 키 관리

- [x] Gemini API 키는 환경 변수로 관리 (`GEMINI_API_KEY`)
- [x] 서버 사이드에서만 API 호출 (클라이언트 노출 금지)
- [x] API 키 로테이션 정책 수립

### 8.2 SQL Injection 방어

- [x] Gemini 생성 쿼리는 실행 전 검증 필수
- [x] 화이트리스트 방식 쿼리 검증
  - SELECT만 허용 (INSERT, UPDATE, DELETE 금지)
  - 특정 테이블만 접근 가능
  - UNION, JOIN 제한
- [x] Supabase RLS 활용 (데이터 접근 권한 제어)

### 8.3 민감 데이터 보호

- [x] 개인정보 필드 제외 (사용자명은 익명화)
- [x] 비용 정보는 관리자만 접근
- [x] 인사이트 공유 시 권한 확인

### 8.4 Rate Limiting

- [x] 사용자당 분당 10회 쿼리 제한
- [x] IP당 시간당 100회 제한
- [x] 비정상 트래픽 감지 시 차단

---

## 9. 성능 요구사항

### 9.1 응답 시간

- 자연어 쿼리 응답: 평균 2초 이내, 최대 5초
- 인사이트 로딩: 1초 이내
- 대화 히스토리 로딩: 0.5초 이내

### 9.2 동시 사용자

- Phase 1: 최대 50명 동시 사용자 지원
- Phase 2: 최대 200명 동시 사용자 지원

### 9.3 캐싱 전략

- [x] 동일 질문 반복 시 캐시된 응답 사용 (5분 TTL)
- [x] 스키마 컨텍스트는 메모리 캐싱
- [x] 인사이트 카드는 CDN 캐싱

### 9.4 비용 최적화

- [x] Gemini API 호출 최소화
  - 유사 질문 탐지 및 재사용
  - 배치 처리 (가능한 경우)
- [x] 월 예상 비용: $100-300 (Gemini API Pro 기준)

---

## 10. 제약사항 및 고려사항

### 10.1 기술적 제약사항

- **Gemini API 한계**:
  - 요청당 최대 토큰: 32K (입력) / 8K (출력)
  - 분당 요청 제한: 60 RPM (Free tier), 1000 RPM (Paid)
  - 한국어 정확도: 영어 대비 약간 낮을 수 있음

- **데이터베이스**:
  - 복잡한 JOIN 쿼리는 성능 저하 가능
  - 대용량 테이블 (tool_changes > 100만 건) 시 최적화 필요

### 10.2 사용자 경험 고려사항

- **학습 곡선**:
  - 사용자가 효과적인 질문 방법을 학습하는 시간 필요
  - 예시 질문 템플릿 제공

- **신뢰성**:
  - AI 응답의 정확성을 사용자가 검증할 수 있어야 함
  - "데이터 출처 보기" 기능 필수

- **다국어**:
  - 베트남어 지원은 Phase 1.5에서 추가 (한국어 먼저 안정화)

### 10.3 법적/규정 고려사항

- **데이터 프라이버시**:
  - Gemini API로 전송되는 데이터는 Google 정책 준수
  - 민감한 개인정보는 전송 전 마스킹

- **책임 소재**:
  - AI 응답은 참고용이며, 최종 결정은 사용자 책임
  - 면책 조항 표시

---

## 11. 성공 지표 (KPI)

### 11.1 사용률 지표

- **DAU (Daily Active Users)**: 전체 사용자의 30% 이상
- **주간 쿼리 수**: 평균 100회 이상
- **인사이트 저장률**: 생성된 인사이트의 40% 이상 저장
- **공유율**: 저장된 인사이트의 20% 이상 공유

### 11.2 만족도 지표

- **CSAT (Customer Satisfaction)**: 4.0/5.0 이상
- **정확도 평가**: AI 응답의 80% 이상이 "정확함"으로 평가
- **재사용률**: 사용자의 60% 이상이 주 2회 이상 사용

### 11.3 비즈니스 임팩트

- **데이터 분석 시간 단축**: 평균 70% 감소
- **공구 파손률 감소**: 3개월 내 10% 감소
- **재고 최적화**: 과잉/부족 재고 20% 감소

### 11.4 기술 지표

- **평균 응답 시간**: 2초 이하
- **API 성공률**: 99% 이상
- **시스템 가동률**: 99.5% 이상

---

## 부록

### A. 용어집

- **RAG (Retrieval-Augmented Generation)**: 검색 기반 생성 AI 기술
- **자연어 쿼리**: 일반 언어로 데이터베이스 질의
- **인사이트**: 데이터 분석을 통해 발견한 유용한 정보/패턴
- **SQL Injection**: 악의적인 SQL 코드 삽입 공격

### B. 참고 자료

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes Best Practices](https://nextjs.org/docs/api-routes/introduction)

### C. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 1.0  | 2025-10-21 | 초안 작성 | Claude |

---

**승인:**
- [ ] 프로젝트 매니저
- [ ] 기술 리더
- [ ] 사용자 대표

**다음 단계:**
1. AI_INSIGHTS_IMPLEMENTATION_PLAN.md 작성
2. AI_INSIGHTS_TODO.md 작성
3. 개발 시작
