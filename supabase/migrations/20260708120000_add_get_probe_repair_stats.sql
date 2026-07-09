-- T12a: 프로브 수리 통계 리포트 RPC
-- 월별 건수 / 고장유형 분포 / 모델별 빈도 / 장비별 빈도(상위 20)를 단일 JSON으로 반환한다.
-- 조회 기간: occurred_at 기준 최근 p_months개월 (기본 12개월).
create or replace function public.get_probe_repair_stats(
  p_factory_id uuid,
  p_months int default 12
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with base as (
    select r.repair_type, r.failure_type, r.occurred_at, p.model, p.equipment_id
    from public.probe_repairs r
    join public.probes p on p.id = r.probe_id
    where r.factory_id = p_factory_id
      and r.occurred_at >= (current_date - make_interval(months => p_months))::date
  ),
  monthly as (
    select to_char(date_trunc('month', occurred_at), 'YYYY-MM') as month, count(*) as cnt
    from base
    group by 1
    order by 1
  ),
  by_failure as (
    select failure_type, count(*) as cnt
    from base
    group by failure_type
    order by cnt desc
  ),
  by_model as (
    select model, count(*) as cnt
    from base
    group by model
    order by cnt desc
  ),
  by_equipment as (
    select e.id as equipment_id, e.equipment_number, count(*) as cnt
    from base b
    join public.equipment e on e.id = b.equipment_id
    group by e.id, e.equipment_number
    order by cnt desc
    limit 20
  )
  select jsonb_build_object(
    'monthly', coalesce(
      (select jsonb_agg(jsonb_build_object('month', month, 'count', cnt)) from monthly), '[]'::jsonb),
    'byFailureType', coalesce(
      (select jsonb_agg(jsonb_build_object('failureType', failure_type, 'count', cnt)) from by_failure), '[]'::jsonb),
    'byModel', coalesce(
      (select jsonb_agg(jsonb_build_object('model', model, 'count', cnt)) from by_model), '[]'::jsonb),
    'byEquipment', coalesce(
      (select jsonb_agg(jsonb_build_object('equipmentId', equipment_id, 'equipmentNumber', equipment_number, 'count', cnt)) from by_equipment), '[]'::jsonb)
  );
$$;
