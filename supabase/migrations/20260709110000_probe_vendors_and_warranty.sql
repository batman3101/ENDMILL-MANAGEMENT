-- 프로브 수리 업체 관리 + 유형 인지 보증
-- 1) probe_vendors: 외주수리/부품구매 업체. 한 업체가 두 역할 겸할 수 있음(최소 1개 역할).
create table if not exists public.probe_vendors (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id),
  name varchar(100) not null,
  is_repair_vendor boolean not null default false,
  is_parts_vendor  boolean not null default false,
  contact_name varchar(50),
  phone varchar(30),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_probe_vendors_role check (is_repair_vendor or is_parts_vendor)
);
create unique index if not exists uq_probe_vendors_factory_name
  on public.probe_vendors (factory_id, lower(name));
create index if not exists idx_probe_vendors_factory_active
  on public.probe_vendors (factory_id, is_active);

-- 2) probe_repairs.vendor_id (nullable — 기존 이력 보존). 외주/RBE=수리 업체, 내부=부품 구매 업체.
alter table public.probe_repairs
  add column if not exists vendor_id uuid references public.probe_vendors(id);
create index if not exists idx_probe_repairs_probe_vendor
  on public.probe_repairs (probe_id, vendor_id);

-- 3) warranty_until GENERATED 재정의: internal=완료일+3개월, external/rbe=반환일+6개월.
--    date + interval → ::date 는 IMMUTABLE 이라 GENERATED 컬럼에 안전.
--    (기존 정의는 returned_at+6mo 하드코딩이라 internal 수리는 warranty_until이 null이었음)
drop index if exists idx_probe_repairs_factory_warranty;
alter table public.probe_repairs drop column if exists warranty_until;
alter table public.probe_repairs add column warranty_until date
  generated always as (
    case repair_type
      when 'internal' then (completed_at + interval '3 months')::date
      else (returned_at + interval '6 months')::date
    end
  ) stored;
create index if not exists idx_probe_repairs_factory_warranty
  on public.probe_repairs (factory_id, warranty_until);
