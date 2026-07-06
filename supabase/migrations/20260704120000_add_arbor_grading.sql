-- Arbor 등급 관리: 마스터 + 검사 이력
-- RLS는 사용자 결정(2026-07-04)에 따라 차후 별도 트랙에서 일괄 적용 (PRD §4.4-3)

create table if not exists public.arbors (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id),
  serial_number varchar(30) not null,
  arbor_model varchar(50),
  status varchar(20) not null default 'active'
    check (status in ('active','repair','disposed','lost')),
  current_grade char(1) check (current_grade in ('A','B','C','D')),
  last_inspected_at timestamptz,
  last_runout_um numeric(6,2),
  last_taper_condition varchar(20),
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_arbors_factory_serial unique (factory_id, serial_number)
);

-- 인덱스 최소주의(쓰기 IO 절감, 2026-06-29 장애 교훈). UNIQUE가 시리얼 조회를 커버한다.
create index if not exists idx_arbors_factory_grade  on public.arbors (factory_id, current_grade);
create index if not exists idx_arbors_factory_status on public.arbors (factory_id, status);
create index if not exists idx_arbors_last_inspected on public.arbors (factory_id, last_inspected_at);

create table if not exists public.arbor_inspections (
  id uuid primary key default gen_random_uuid(),
  arbor_id uuid not null references public.arbors(id),
  factory_id uuid not null references public.factories(id),
  runout_um numeric(6,2) not null check (runout_um >= 0),
  taper_condition varchar(20) not null,
  judged_grade char(1) not null check (judged_grade in ('A','B','C','D')),
  previous_grade char(1),
  rule_snapshot jsonb not null,
  inspected_by uuid references public.user_profiles(id),
  inspected_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_arbor_inspections_arbor
  on public.arbor_inspections (arbor_id, inspected_at desc);
create index if not exists idx_arbor_inspections_factory_date
  on public.arbor_inspections (factory_id, inspected_at desc);
-- inspected_by는 감사용 컬럼이므로 인덱스 제외 (postmortem 권고)
