-- 검사 모드 숫자 스캔: 접두사(ATP-/AVP-) 없이 번호만 입력해도 해당 프로브를 찾는다.
-- asset_number의 '끝자리 숫자 런'을 추출해 zero-pad 무관하게 비교 (예: '1' / '0001' 모두 ATP-0001 매칭).
-- 공장 스코핑 필수(p_factory_id). bigint 캐스트 대신 선행 0 제거 후 텍스트 비교로 오버플로 방지.
CREATE OR REPLACE FUNCTION public.find_probes_by_number(p_factory_id uuid, p_number bigint)
RETURNS SETOF public.probes
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT *
  FROM public.probes
  WHERE factory_id = p_factory_id
    AND substring(asset_number FROM '(\d+)$') IS NOT NULL
    AND regexp_replace(substring(asset_number FROM '(\d+)$'), '^0+', '') =
        regexp_replace(p_number::text, '^0+', '')
  ORDER BY asset_number
  LIMIT 50;
$$;
