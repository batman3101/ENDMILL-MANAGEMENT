-- 후속 보강 (T1 완료 후 T3/T6 도메인 타입과 대조하여 발견된 정합성 갭 해소):
-- 1) probe_repairs.updated_at 컬럼 추가: lib/types/probe.ts의 ProbeRepair.updated_at과 정합.
--    수리 건은 reported→sent→completed로 갱신되는 가변 레코드이므로 arbors/probes와
--    동일하게 수정 시각 추적이 타당하다. API(PUT/close_probe_repair)에서 명시적으로 갱신한다
--    (arbors PUT 패턴과 동일 — DB 트리거 없이 앱 레벨에서 설정).
-- 2) get_probe_stats에 상태별 in_use/spare 분리 카운트 추가:
--    lib/hooks/useProbes.ts의 ProbeStats가 inUse/spare 필드를 요구한다.

alter table public.probe_repairs
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.get_probe_stats(
  p_factory_id uuid,
  p_interval_days int default 90
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'total',       count(*) filter (where status <> 'disposed'),
    'gradeA',      count(*) filter (where current_grade = 'A' and status in ('in_use','spare')),
    'gradeB',      count(*) filter (where current_grade = 'B' and status in ('in_use','spare')),
    'gradeC',      count(*) filter (where current_grade = 'C' and status in ('in_use','spare')),
    'uninspected', count(*) filter (where current_grade is null and status in ('in_use','spare')),
    'inUse',       count(*) filter (where status = 'in_use'),
    'spare',       count(*) filter (where status = 'spare'),
    'inRepair',    count(*) filter (where status = 'in_repair'),
    'disposed',    count(*) filter (where status = 'disposed'),
    'lost',        count(*) filter (where status = 'lost'),
    'overdue',     count(*) filter (where status in ('in_use','spare')
                     and (last_inspected_at is null
                          or last_inspected_at < now() - make_interval(days => p_interval_days)))
  )
  from public.probes
  where factory_id = p_factory_id;
$$;
