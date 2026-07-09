-- close_probe_repair가 마감 시 probe_repairs.updated_at도 갱신하도록 보강
-- (20260708110000에서 추가한 updated_at 컬럼과 정합).
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
      serial_after = case when v_repair_type = 'rbe' then p_serial_after else serial_after end,
      updated_at = now()
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
