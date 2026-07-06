-- get_arbor_stats의 function_search_path_mutable 경고 해소.
-- 본문이 unqualified 테이블명을 쓰므로 '' 대신 public 고정(비파괴적).
ALTER FUNCTION public.get_arbor_stats(uuid, integer) SET search_path = public;
