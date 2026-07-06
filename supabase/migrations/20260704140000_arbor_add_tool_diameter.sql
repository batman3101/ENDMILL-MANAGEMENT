-- 공구경(샹크경) 규격 — BT 규격(arbor_model)과 별개의 두 번째 규격 축
alter table public.arbors add column if not exists tool_diameter varchar(20);
