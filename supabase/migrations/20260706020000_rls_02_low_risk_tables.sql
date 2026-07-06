-- RLS 수정 #2: 저위험 6개 테이블 (서버전용/구독·임베디드조인 전용)
--
-- 정책 모델(Stage 1 행동 보존형): 로그인 사용자(authenticated) SELECT 현행 유지, anon 전면 차단.
-- 쓰기: 전부 service-role API 경유(트리거 스캔 0건 확인) → 쓰기 정책 불요, service-role은 RLS 우회.
-- 브라우저 의존성: suppliers·endmill_categories는 endmill/inventory 목록의 임베디드 조인 +
--   endmill 페이지의 endmill_categories Realtime 구독 → authenticated SELECT 정책으로 유지됨.
--
-- 검증(2026-07-06): anon 6개 테이블 0건 / authenticated 전체 가시(suppliers 6, categories 13,
--   app_settings 42, system_settings 18, inv_tx 22,925) / 엔드밀·재고 페이지 임베디드 조인 정상 /
--   대시보드 Realtime 4종(tool_changes·inventory_transactions·notifications·activity_logs) SUBSCRIBED.
-- 롤백: 정책 6개 DROP 후 6개 테이블 DISABLE ROW LEVEL SECURITY.

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endmill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select_authenticated ON public.suppliers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY endmill_categories_select_authenticated ON public.endmill_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY app_settings_select_authenticated ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY system_settings_select_authenticated ON public.system_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY activity_logs_select_authenticated ON public.activity_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY inventory_transactions_select_authenticated ON public.inventory_transactions
  FOR SELECT TO authenticated USING (true);
