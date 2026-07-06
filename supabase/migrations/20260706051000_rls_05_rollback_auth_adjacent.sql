-- RLS 수정 #5 롤백 (2026-07-06 08:33, 적용 7분 만에 증상 확인 즉시 롤백)
--
-- 증상: 전체 페이지 새로고침 시 헤더가 "사용자/직위 없음"으로 강등, 관리자 메뉴 소실.
-- 원인: useAuth의 초기 프로필 조회(user_profiles 직접 REST)가 클라이언트 토큰 복원
--   레이스로 anon 컨텍스트로 실행됨 → RLS가 0행 반환(406) → 권한 없는 폴백 프로필.
--   (과거 전면 장애와 동일 메커니즘 — RLS 이전엔 anon도 전체 조회 가능해 우연히 동작)
-- 수정: useAuth 프로필 조회를 서버(/api/auth/me, SSR 쿠키 컨텍스트) 우선으로 전환(#5-fix).
-- 재적용 조건: #5-fix가 프로덕션에 배포된 후 (이 브랜치 머지·배포 후 재적용).
DROP POLICY IF EXISTS user_profiles_all_authenticated ON public.user_profiles;
DROP POLICY IF EXISTS user_roles_all_authenticated ON public.user_roles;
DROP POLICY IF EXISTS notifications_all_authenticated ON public.notifications;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
