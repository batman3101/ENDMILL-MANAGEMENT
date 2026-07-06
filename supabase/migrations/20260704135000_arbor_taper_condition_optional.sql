-- Taper 외관은 Samsung 정밀도 점검 표준상 등급 산정에 사용되지 않는다(런아웃 단독 기준).
-- 따라서 검사 이력의 taper_condition을 선택(관찰) 항목으로 완화한다.
alter table public.arbor_inspections alter column taper_condition drop not null;
