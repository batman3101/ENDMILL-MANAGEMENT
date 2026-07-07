-- RLS 전면 롤백 (2026-07-07): #1~#4, #6 배치를 0daed22 시점 상태로 되돌림
--
-- 배경: RLS #1~#6 적용 후 프로덕션에서 접속·데이터 읽기 장애가 재발(2번째).
--   #5-fix(useAuth 서버 프로필 조회)로 user_profiles 레이스는 막았으나, 나머지
--   16개 데이터 테이블은 여전히 'TO authenticated' 정책이라 브라우저 클라이언트가
--   JWT를 신뢰성 있게 첨부하지 못하거나 토큰 복원 레이스가 발생하면 anon으로 읽혀
--   0행(406)을 반환한다 — #5 롤백과 동일 메커니즘이 데이터 테이블 전반에서 재현됨.
--
-- 결정: 마지막 정상 커밋 0daed22(PR#47, arbor-grading 머지) 상태로 전면 롤백.
--   0daed22 시점에는 아래 17개 테이블에 RLS가 없었다. 라이브 DB는 이미 해제 완료했고,
--   이 마이그레이션은 그 해제를 리포에 기록해 향후 db push 시 재활성화를 원천 차단한다.
--   (신규 DB에도 안전: #1~#6 enable 마이그레이션이 켠 뒤 이 파일이 최종적으로 끈다.)
--
-- 유지 대상(건드리지 않음): user_profiles/user_roles/notifications(#5에서 이미 롤백),
--   그리고 0daed22 이전부터 정상 운영되던 baseline RLS 테이블
--   (factories, user_factory_access, endmill_disposals, saved_insights,
--    insight_comments, ai_chat_history, settings_history).
--
-- 재적용은 이 파일을 되돌린 뒤 별도 트랙에서 진행할 것(Stage 2: 클라이언트 JWT
--   첨부 신뢰성 확보 → 공장/역할 스코프 정책). 그 전엔 절대 재활성화 금지.

-- #1 arbor
DROP POLICY IF EXISTS arbors_select_factory ON public.arbors;
DROP POLICY IF EXISTS arbor_inspections_select_factory ON public.arbor_inspections;
ALTER TABLE public.arbors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbor_inspections DISABLE ROW LEVEL SECURITY;

-- #2 저위험 6개
DROP POLICY IF EXISTS suppliers_select_authenticated ON public.suppliers;
DROP POLICY IF EXISTS endmill_categories_select_authenticated ON public.endmill_categories;
DROP POLICY IF EXISTS app_settings_select_authenticated ON public.app_settings;
DROP POLICY IF EXISTS system_settings_select_authenticated ON public.system_settings;
DROP POLICY IF EXISTS activity_logs_select_authenticated ON public.activity_logs;
DROP POLICY IF EXISTS inventory_transactions_select_authenticated ON public.inventory_transactions;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.endmill_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions DISABLE ROW LEVEL SECURITY;

-- #3 마스터 6개
DROP POLICY IF EXISTS equipment_all_authenticated ON public.equipment;
DROP POLICY IF EXISTS endmill_types_all_authenticated ON public.endmill_types;
DROP POLICY IF EXISTS endmill_supplier_prices_all_authenticated ON public.endmill_supplier_prices;
DROP POLICY IF EXISTS cam_sheets_all_authenticated ON public.cam_sheets;
DROP POLICY IF EXISTS cam_sheet_endmills_all_authenticated ON public.cam_sheet_endmills;
DROP POLICY IF EXISTS tool_positions_all_authenticated ON public.tool_positions;
ALTER TABLE public.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.endmill_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.endmill_supplier_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cam_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cam_sheet_endmills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_positions DISABLE ROW LEVEL SECURITY;

-- #4 트랜잭션 2개
DROP POLICY IF EXISTS inventory_all_authenticated ON public.inventory;
DROP POLICY IF EXISTS tool_changes_all_authenticated ON public.tool_changes;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_changes DISABLE ROW LEVEL SECURITY;

-- #6 AI 캐시 (정책 없음)
ALTER TABLE public.ai_query_cache DISABLE ROW LEVEL SECURITY;
