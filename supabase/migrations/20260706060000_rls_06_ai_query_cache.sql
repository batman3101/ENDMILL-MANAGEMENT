-- RLS 수정 #6: ai_query_cache (서버 전용 캐시 테이블)
--
-- 선행 코드 수정(#6-fix): lib/utils/queryCache.ts를 anon 클라이언트에서 service-role
-- 클라이언트로 전환 — 이 모듈은 /api/ai/query 라우트에서만 사용되는 서버 전용 모듈인데
-- anon 클라이언트로는 서버에서 사용자 세션이 없어 RLS 활성화 시 차단되기 때문.
--
-- 정책 없음 = anon/authenticated 전면 차단, service-role(AI 쿼리 API)만 접근.
-- 검증(2026-07-06): service-role 왕복 테스트 4/4 통과(upsert→RPC조회→삭제→미스) / anon 0건.
-- 롤백: ALTER TABLE public.ai_query_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_query_cache ENABLE ROW LEVEL SECURITY;
