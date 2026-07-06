# RLS 마이그레이션 로그 (브랜치: RLS-수정-1)

> 2026-07-06 진행. 과거 RLS 전면 적용이 앱 전체 장애를 일으켜 긴급 롤백된 이력
> (`20260309014504_emergency_rollback_all_rls_changes`)이 있어, 이번에는
> **배치 넘버링 + apply-test-rollback** 방식으로 운영 DB에 단계 적용했다.

## 정책 모델 (2-Stage)

- **Stage 1 (이번 브랜치)** — *행동 보존형 하드닝*: `TO authenticated`에 현행 접근을
  그대로 허용(`USING (true)`)하고 **anon(공개 키, 비로그인) 접근만 차단**한다.
  service-role(서버 API)은 RLS를 우회하므로 영향이 없다.
  트레이드오프: advisor에 `rls_policy_always_true` WARN이 남는다(의도됨).
- **Stage 2 (추후 별도 트랙)** — 공장(factory_id)·역할 스코프로 정책 조임,
  SECURITY DEFINER 함수 EXECUTE 정리, 공개 버킷 리스팅 정리.

## 배치별 상태

| # | 대상 테이블 | 정책 | 상태 | 검증 |
|---|---|---|---|---|
| 1 | arbors, arbor_inspections | SELECT authenticated(공장 스코프) | ✅ 적용 | anon 0건, 앱 API 정상 |
| 2 | suppliers, endmill_categories, app_settings, system_settings, activity_logs, inventory_transactions | SELECT authenticated | ✅ 적용 | anon 0건, 임베디드 조인·Realtime 정상 |
| 3 | equipment, endmill_types, endmill_supplier_prices, cam_sheets, cam_sheet_endmills, tool_positions | FOR ALL authenticated | ✅ 적용 | anon 0건, 쓰기 시뮬 통과, 4개 페이지 스윕 |
| 4 | inventory, tool_changes | FOR ALL authenticated | ✅ 적용 | anon 0건, 트리거 발화 포함 쓰기 통과, 공장 실사용 중 무중단 |
| 5 | user_profiles, user_roles, notifications | FOR ALL authenticated | ⚠️ **적용→7분 만에 롤백** | 아래 참조 |
| 6 | ai_query_cache | 정책 없음(서버 전용) | ✅ 적용 | service-role 왕복 4/4, anon 0건 |

## #5 롤백 상세 (재발 방지 핵심 기록)

- **증상**: 전체 페이지 새로고침 시 헤더가 "사용자/직위 없음"으로 강등, 관리자 메뉴 소실,
  사용자 목록의 역할이 전원 "알 수 없음".
- **원인**: `useAuth`의 초기 프로필 조회(user_profiles 직접 REST)가 클라이언트 토큰 복원
  레이스로 **anon 컨텍스트**로 실행 → RLS가 0행 반환(406) → 권한 없는 폴백 프로필.
  RLS 이전에는 anon도 전체 조회가 가능해 우연히 동작했다. **과거 전면 장애와 동일 메커니즘.**
- **수정(#5-fix, 본 브랜치에 포함)**: `/api/auth/me`가 profile(user_roles 포함)을 반환하도록
  확장하고, `useAuth`는 서버 우선 조회 + 직접 쿼리 폴백으로 전환. 쿠키는 브라우저가 항상
  자동 첨부하므로 레이스가 원천적으로 불가능하다.
- **재적용 절차**: ① 본 브랜치 머지 → ② 프로덕션 배포 → ③ `20260706050000` 마이그레이션
  내용 재적용(새 마이그레이션으로) → ④ 새로고침/로그인/사용자 관리 즉시 검증.
  **배포 전에 재적용하면 프로덕션 사용자 전원이 새로고침 시 권한을 잃는다.**

## 검증 방법론 (배치 공통)

1. 사전: 대상 테이블 관련 **트리거 전수 스캔**(연쇄 실패 방지), 롤백 SQL 사전 작성
2. 적용 직후: `SET LOCAL role anon/authenticated` 프로브(가시성 + 쓰기 시뮬레이션, ROLLBACK)
3. 브라우저: 관련 페이지 스윕(로그인 세션), Realtime 구독 상태(SUBSCRIBED) 콘솔 확인
4. 실패 시: 준비된 롤백 즉시 실행 → 원인 규명 → 코드 수정 후 재시도

## 추가 테스트 (PR 전, 2026-07-06)

| # | 테스트 | 결과 |
|---|---|---|
| 1 | Realtime 실이벤트 배달 (RLS-on activity_logs에 SQL INSERT/DELETE) | ✅ 브라우저 `📡` 이벤트 수신 — WALRUS가 authenticated 구독자에 배달. 공장 작업자의 라이브 tool_changes 이벤트도 동시 수신 확인 |
| 2 | 공장 전환 (ALT→ALV→ALT) | ✅ 공장 스코프 정확 분리 (ALV에서 ALT arbor 미노출) |
| 3 | Arbor 쓰기 전체 사이클 (ALV에서 등록→재검사 자동조회→Runout 60→D판정→저장→D등급 하드삭제) | ✅ 전 단계 UI 통과, DB 완전 정리(0/0). 부수 발견: 삭제/등록 후 등급 통계 카드 미갱신 버그 → refetchStats 추가로 수정 |
| 4 | AI 자연어 쿼리 (#6 통합) | ✅ 답변 생성(10.2s) + RLS-on ai_query_cache에 service-role 캐시 저장 확인 |
| 5 | 분석&리포트 · 폐기 관리(기존 RLS 테이블) 페이지 | ✅ 정상 로드, 회귀 없음 |
| 6 | 전체 새로고침 반복 (#5-fix 재검증) | ✅ 프로필·메뉴 유지, 브라우저→user_profiles 직접 REST 0건 |
| 7 | 프로덕션 빌드 (`next build`, dev 중지 후 클린 빌드) | 결과는 커밋 메시지 참조 |

**미검증(사용자 직접 확인 권장)**: 로그아웃→재로그인 플로우 — 테스트 시 현재 세션이 파괴되어
자동화에서 제외. #5-fix가 SIGNED_IN 핸들러도 서버 조회로 바꿨으므로 한 번 확인 권장.

## Advisor 잔여 항목 (2026-07-06 기준)

- `rls_disabled_in_public` ERROR 3건: user_profiles, user_roles, notifications (#5 재적용 대기)
- `rls_enabled_no_policy` INFO 1건: ai_query_cache (의도된 서버 전용 설계)
- `rls_policy_always_true` WARN 10건: Stage 1 의도된 트레이드오프 → Stage 2에서 스코프 조임
- SECURITY DEFINER 함수 anon/authenticated EXECUTE WARN, 공개 버킷 리스팅 WARN: Stage 2 후보
