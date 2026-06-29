# 장애 사후분석 (Postmortem) — 2026-06-29 Supabase 리소스 소진 / 로그인 401

## 1. 요약 (TL;DR)

최고 관리자 계정으로 로그인 시 `POST /api/auth/login`이 **401**을 반환하고, 앱 전반에서
`인증이 필요합니다` 오류가 발생했다. 원인은 **계정·자격증명 문제가 아니라 Supabase
컴퓨트(Disk IO/CPU/연결) 소진으로 DB가 응답 불능**이 된 것이었다. 클라이언트 재시도와
Realtime 재연결이 부하를 증폭시키는 **death spiral**이 회복을 방해했다.

- **영향:** 프로덕션(Vercel `endmill-management-v0.0.1`) 로그인 및 데이터 조회 불가
- **근본 원인:** 컴퓨트 리소스 소진 + Auth DB 연결 캡(10) 포화
- **복구:** 컴퓨트 업그레이드(사용자) → DB 정상화, 로그인 복구 확인
- **재발 방지:** 클라이언트 부하 증폭 차단 코드 패치 배포 + DB 정리 + Auth 연결 권고

## 2. 타임라인

| 시각(UTC) | 사건 |
|---|---|
| ~사건 발생 | API Gateway 24h 누적 77,072 요청 / Realtime 에러 1,680건 폭발 → DB 연결 타임아웃 |
| 진단 중 | DB SQL 6회 연속 `connection timeout`, 어드바이저 조회도 타임아웃 |
| 사용자 조치 | **Supabase 컴퓨트 업그레이드** (수정·배포 이전 완료) |
| 05:29 | 관리자(zetooo1972@gmail.com) **로그인 성공** 기록 (복구 확인) |
| 이후 | 재발 방지 코드 패치 `main` 머지·배포(READY), DB 정리 마이그레이션 적용 |

## 3. 근본 원인 분석

### 인과 사슬
```
리소스 소진(Disk IO 버스트/CPU/연결) 
  → Postgres 연결 타임아웃 
  → Auth(GoTrue)가 DB 연결을 못 얻음 → 비밀번호 검증 실패(401)
  → 클라이언트 자동 재시도(3회) + Realtime 자동 재연결
  → 부하 가중 → 회복 불가 (death spiral)
```

### 핵심 증거
- 로그인 라우트(`app/api/auth/login/route.ts`)는 `signInWithPassword` 실패 시에만 401 →
  자격증명이 아니라 **검증 수행 불가**가 원인.
- `pg_stat_statements` 상위 IO 쿼리는 앱 비즈니스 쿼리가 아니라 **auth 세션 검증
  (`sessions`/`mfa_amr_claims` 각 ~20,000회)과 Realtime publication 조회(4,356회)** 였음.
- `auth_db_connections_absolute`: Auth 서버가 **최대 10개 연결**로 고정 → `max_connections`가
  90으로 올라도 Auth는 11%만 사용 가능. 폭주 시 Auth 연결만 포화 → **로그인만 콕 집어 실패**.
- `cache_hit_pct = 100%` → 문제는 읽기 IO가 아니라 **쓰기 IO·연결·CPU**.

## 4. 조치 내역

### 4-1. 인프라 (사용자)
- Supabase **컴퓨트 업그레이드** → `max_connections` 90, DB 정상 응답 회복.

### 4-2. 코드 패치 (커밋 `5b33989`, `main` 배포 완료)
- `lib/hooks/useRealtime.ts`
  - 전역 킬스위치 `NEXT_PUBLIC_REALTIME_ENABLED` 추가 (`false` 시 전체 Realtime 비활성화)
  - `unsubscribe()` → `supabase.removeChannel()` (재연결 채널 누수/churn 차단)
  - `useMultiTableRealtime`에 `enabled` 파라미터 추가
- `lib/providers/QueryProvider.tsx`
  - 재시도 3회 → 1회 (장애 시 요청 4배 증폭 제거), 403도 재시도 제외
  - 지수 백오프 + 지터로 동시 재시도(thundering herd) 분산
- `lib/hooks/useDashboard.ts`
  - `gcTime` 1분 → 10분 (재마운트 시 불필요한 재요청 제거)
- `.env.example` / `.env.local`: 킬스위치 문서화

### 4-3. DB 정리 (마이그레이션 `perf_cleanup_unused_indexes_fk_index_backup_tables`)
- 미사용 인덱스 53개 + 중복 인덱스 1개 드롭 (쓰기 IO/디스크 절감)
- 누락 FK 인덱스 1개 추가: `idx_endmill_supplier_prices_supplier_id`
- 백업 잔재 테이블 4개 드롭(`_*_20260518`, inbound FK 0 확인): 디스크 회수

## 5. 어드바이저 Before / After

| Lint | 전 | 후 |
|---|---|---|
| unused_index | 53 | 1 |
| no_primary_key | 4 | 0 |
| duplicate_index | 1 | 0 |
| unindexed_foreign_keys | 1 | 24 |
| auth_rls_initplan | 16 | 16 |
| multiple_permissive_policies | 13 | 13 |
| auth_db_connections_absolute | 1 | 1 |
| **합계** | **89** | **55** |

> ⚠️ **트레이드오프:** 드롭한 "미사용 인덱스" 다수가 FK 커버링 인덱스였기에
> `unindexed_foreign_keys`가 1→24로 증가. 두 lint는 같은 인덱스를 반대 시각에서 보는 상충 관계.
> 현재 테이블 규모(소형)·cache_hit 100%에서는 INFO 수준 영향이며, 데이터 증가 시
> 아래 권고대로 **선별 재추가** 권장.

## 6. 미해결 / 후속 권고

| 항목 | 우선순위 | 비고 |
|---|---|---|
| **Auth 연결 퍼센트 할당** | 🔴 높음 | Auth 풀 10 고정 → 퍼센트 기반. **Supabase 지원 요청 필요**(내부 설정). 로그인 재발 방지 핵심 |
| FK 인덱스 선별 재추가 | 🟡 중간 | 성장 테이블의 JOIN/필터 컬럼만: `tool_changes(equipment_id, endmill_type_id)`, `inventory_transactions(inventory_id, equipment_id, factory_id)`, `notifications(recipient_id)`. 감사 컬럼(`*_by`)은 제외 |
| RLS 효율화 (P3) | 🟡 중간 | `auth_rls_initplan` 16 → `auth.fn()`을 `(select auth.fn())`로 래핑. `multiple_permissive_policies` 13 → 정책 통합 |
| Realtime 이중 구독 정리 | 🟢 낮음 | `notifications`가 대시보드 + `useNotifications` 양쪽 구독. 싱글톤 매니저로 통합 시 채널 수 감소 |

## 7. 운영 비상 레버 (Runbook)

리소스 소진/로그인 장애 재발 시:
1. **Supabase 대시보드 → Reports**에서 포화 자원(CPU/Disk IO/연결) 확인
2. **부하 차단:** Vercel 프로젝트 일시정지(전면 다운, 최후 수단) 또는
   `NEXT_PUBLIC_REALTIME_ENABLED=false` 환경변수 추가 후 재배포(Realtime만 차단)
3. **용량 확보:** 컴퓨트 업그레이드(무중단) / Pause→Resume / Restart
4. 안정화 후 로그인 검증
