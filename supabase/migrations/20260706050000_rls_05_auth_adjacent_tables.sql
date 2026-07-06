-- RLS 수정 #5: 인증 인접 3개 테이블 (user_profiles, user_roles, notifications)
-- Stage 1 행동 보존형: FOR ALL TO authenticated, anon 전면 차단.
-- ⚠️ 적용 직후 문제 발견되어 20260706051000에서 롤백됨 — 아래 롤백 마이그레이션 참조.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_all_authenticated ON public.user_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY user_roles_all_authenticated ON public.user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY notifications_all_authenticated ON public.notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
