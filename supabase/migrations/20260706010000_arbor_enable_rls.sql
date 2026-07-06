-- RLS 수정 #1: arbor 테이블 RLS 활성화 (rls_disabled_in_public ERROR 해소)
--
-- 배경: 앱은 arbor 테이블을 service_role(서버 API)로만 접근하며, 브라우저 anon
-- 클라이언트 직접 쿼리나 Realtime 구독은 사용하지 않는다. 따라서 RLS를 켜도
-- service_role은 RLS를 우회하므로 앱 동작에 영향이 없다.
--
-- 목적: 공개된 anon 키로 PostgREST를 통해 arbor 데이터를 직접 열람/조작하는 경로를 차단.
--   - authenticated: 접근 가능 공장의 데이터만 SELECT (방어적, 앱은 service_role 사용)
--   - anon: 정책 없음 → 전면 차단
--   - INSERT/UPDATE/DELETE: 정책 없음 → service_role(API)만 가능
--
-- 롤백: 아래 두 정책 DROP 후 ALTER TABLE ... DISABLE ROW LEVEL SECURITY.

ALTER TABLE public.arbors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbor_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY arbors_select_factory ON public.arbors
  FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY arbor_inspections_select_factory ON public.arbor_inspections
  FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));
