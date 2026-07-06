-- 검사 모드: 시리얼 끝자리 숫자만 입력 시 arbor 조회 (예: "1" → AL-00001)
-- zero-pad 폭에 무관하게 시리얼 끝 숫자를 정수로 추출하여 정확 매칭.
--   "AL-00001" → substring '(00001)' → 1  (매칭)
--   "AL-00021" → 21                        (미매칭, suffix-string 방식의 오매칭 방지)
-- search_path 고정 + 스키마 정규화 (function_search_path_mutable 린터 해소).
CREATE OR REPLACE FUNCTION public.find_arbors_by_number(p_factory_id uuid, p_num bigint)
RETURNS SETOF public.arbors
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT *
  FROM public.arbors
  WHERE factory_id = p_factory_id
    AND serial_number ~ '[0-9]+$'
    AND (substring(serial_number from '([0-9]+)$'))::bigint = p_num
  ORDER BY serial_number
  LIMIT 5;
$$;

COMMENT ON FUNCTION public.find_arbors_by_number(uuid, bigint)
  IS '검사 모드 스캔: 시리얼 끝자리 숫자로 arbor 조회 (padding 폭 무관 정수 매칭). search_path 고정.';
