create or replace function public.get_arbor_stats(
  p_factory_id uuid,
  p_interval_days int default 180
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'total',       count(*) filter (where status <> 'disposed'),
    'gradeA',      count(*) filter (where current_grade = 'A' and status = 'active'),
    'gradeB',      count(*) filter (where current_grade = 'B' and status = 'active'),
    'gradeC',      count(*) filter (where current_grade = 'C' and status = 'active'),
    'gradeD',      count(*) filter (where current_grade = 'D' and status = 'active'),
    'uninspected', count(*) filter (where current_grade is null and status = 'active'),
    'repair',      count(*) filter (where status = 'repair'),
    'disposed',    count(*) filter (where status = 'disposed'),
    'overdue',     count(*) filter (where status = 'active'
                     and (last_inspected_at is null
                          or last_inspected_at < now() - make_interval(days => p_interval_days)))
  )
  from public.arbors
  where factory_id = p_factory_id;
$$;
