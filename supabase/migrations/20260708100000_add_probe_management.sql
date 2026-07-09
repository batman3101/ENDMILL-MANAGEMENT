-- Renishaw 프로브 관리: 마스터 + 검사 이력 + 수리 이력
-- RLS는 사용자 결정(2026-07-07 RLS 전면 롤백)에 따라 신규 테이블에도 적용하지 않는다.
-- service_role API(app/api/probes/**) 경유 접근만 허용.

create table if not exists public.probes (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id),
  asset_number varchar(50) not null,
  renishaw_serial varchar(50),
  model varchar(20) not null
    check (model in ('OMP40-2','OMP400')),
  status varchar(20) not null default 'spare'
    check (status in ('in_use','spare','in_repair','disposed','lost')),
  current_grade char(1) check (current_grade in ('A','B','C')),
  equipment_id uuid references public.equipment(id),
  last_inspected_at timestamptz,
  last_repeatability_um numeric(6,3),
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_probes_factory_asset unique (factory_id, asset_number)
);

create index if not exists idx_probes_factory_grade     on public.probes (factory_id, current_grade);
create index if not exists idx_probes_factory_status    on public.probes (factory_id, status);
create index if not exists idx_probes_factory_inspected on public.probes (factory_id, last_inspected_at);
create index if not exists idx_probes_factory_equipment on public.probes (factory_id, equipment_id);

create table if not exists public.probe_inspections (
  id uuid primary key default gen_random_uuid(),
  probe_id uuid not null references public.probes(id),
  factory_id uuid not null references public.factories(id),
  repeatability_um numeric(6,3) not null check (repeatability_um >= 0),
  judged_grade char(1) not null check (judged_grade in ('A','B','C')),
  previous_grade char(1) check (previous_grade in ('A','B','C')),
  rule_snapshot jsonb not null,
  trigger_reason varchar(20) not null
    check (trigger_reason in ('periodic','after_crash','stylus_change','after_maintenance')),
  inspected_by uuid references public.user_profiles(id),
  inspected_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_probe_inspections_probe
  on public.probe_inspections (probe_id, inspected_at desc);
create index if not exists idx_probe_inspections_factory_date
  on public.probe_inspections (factory_id, inspected_at desc);
-- inspected_by는 감사용 컬럼이므로 인덱스 제외 (arbor_inspections와 동일 정책)

-- 수리 날짜 4컬럼은 명시적 date 타입 고정: timestamptz로 선언하면
-- (returned_at + interval)::date 캐스트가 STABLE로 취급되어 warranty_until
-- GENERATED 컬럼 생성이 실패한다. date + interval → ::date는 IMMUTABLE이라 안전.
create table if not exists public.probe_repairs (
  id uuid primary key default gen_random_uuid(),
  probe_id uuid not null references public.probes(id),
  factory_id uuid not null references public.factories(id),
  repair_type varchar(20) not null
    check (repair_type in ('internal','external','rbe')),
  failure_type varchar(20) not null
    check (failure_type in ('crash','coolant_ingress','battery','drift','other')),
  status varchar(20) not null default 'reported'
    check (status in ('reported','sent','completed')),
  occurred_at date not null,
  sent_at date,
  returned_at date,
  completed_at date,
  warranty_until date generated always as ((returned_at + interval '6 months')::date) stored,
  original_repair_id uuid references public.probe_repairs(id),
  serial_before varchar(50),
  serial_after varchar(50),
  replaced_parts text,
  description text,
  requested_by uuid references public.user_profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  -- 유형 인지 상태 머신: 사내수리=등록 즉시 완료 고정, 외주/RBE=reported→sent→completed
  constraint chk_probe_repairs_type_status check (
    case repair_type
      when 'internal' then
        sent_at is null and returned_at is null
        and status = 'completed' and completed_at is not null
      when 'external' then
        completed_at is null
        and (status <> 'sent' or sent_at is not null)
        and (status <> 'completed' or returned_at is not null)
      when 'rbe' then
        completed_at is null
        and (status <> 'sent' or sent_at is not null)
        and (status <> 'completed' or (returned_at is not null and serial_after is not null))
      else false
    end
  )
);

-- 프로브당 오픈 수리 1건 제약: 사내수리는 즉시 완료이므로 오픈 수리는 외주/RBE뿐.
-- "수리중" 카운트의 단일 소스는 probes.status가 되도록 보장.
create unique index if not exists uq_probe_repairs_open_per_probe
  on public.probe_repairs (probe_id)
  where status <> 'completed';

create index if not exists idx_probe_repairs_probe_occurred
  on public.probe_repairs (probe_id, occurred_at desc);
create index if not exists idx_probe_repairs_factory_status
  on public.probe_repairs (factory_id, status);
create index if not exists idx_probe_repairs_factory_warranty
  on public.probe_repairs (factory_id, warranty_until);

-- original_repair_id 동일 개체 보증 (서버 검증과 이중화)
create or replace function public.check_probe_repair_original_same_probe()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.original_repair_id is not null then
    if not exists (
      select 1 from public.probe_repairs
      where id = new.original_repair_id
        and probe_id = new.probe_id
    ) then
      raise exception 'original_repair_id must reference a repair of the same probe_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_probe_repairs_check_original on public.probe_repairs;
create trigger trg_probe_repairs_check_original
  before insert or update on public.probe_repairs
  for each row
  execute function public.check_probe_repair_original_same_probe();

-- 외주/RBE 입고 마감: repair 갱신 + RBE 시리얼 교체 + probes.status 복귀를
-- 단일 plpgsql 함수(=단일 트랜잭션)로 원자화. search_path 고정으로 린터 경고 해소.
create or replace function public.close_probe_repair(
  p_repair_id uuid,
  p_returned_at date,
  p_serial_after varchar default null,
  p_probe_status varchar default 'spare'
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_probe_id uuid;
  v_repair_type varchar;
begin
  select probe_id, repair_type into v_probe_id, v_repair_type
  from public.probe_repairs
  where id = p_repair_id
  for update;

  if v_probe_id is null then
    raise exception 'probe_repairs row % not found', p_repair_id;
  end if;

  if v_repair_type = 'internal' then
    raise exception 'close_probe_repair is not applicable to internal repairs';
  end if;

  update public.probe_repairs
  set returned_at = p_returned_at,
      status = 'completed',
      serial_after = case when v_repair_type = 'rbe' then p_serial_after else serial_after end
  where id = p_repair_id;

  if v_repair_type = 'rbe' and p_serial_after is not null then
    update public.probes
    set renishaw_serial = p_serial_after,
        status = p_probe_status
    where id = v_probe_id;
  else
    update public.probes
    set status = p_probe_status
    where id = v_probe_id;
  end if;
end;
$$;

-- 등급별(A/B/C, D 없음)/상태별/미검사/검사지연 카운트
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
