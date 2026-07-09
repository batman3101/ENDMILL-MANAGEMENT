-- Probe management v2:
--  - 등급제(A/B/C) 폐지 → OK/NG 판정 (반복도 5µm 단일 임계값은 앱 설정에서 관리)
--  - 고장유형 5종 개편 (방수불량/충돌/FPCB/정밀도미달/스타일러스교체)
--  - 수리 승인 워크플로우: reported(요청) → approved(승인) → sent(발송) → completed(입고)
--  - 장비간 프로브 이동 추적 테이블 신규
--  - 모델 nullable (사전 등록 시리얼은 모델 미지정 가능)
--  - get_probe_stats OK/NG 재작성
-- RLS 미적용 정책 유지 (프로젝트 전면 롤백 상태), anon/authenticated 신규 GRANT 없음

-- ============ 1) probes: current_grade → current_result (OK/NG), model nullable ============
ALTER TABLE public.probes DROP CONSTRAINT IF EXISTS probes_current_grade_check;
ALTER TABLE public.probes RENAME COLUMN current_grade TO current_result;
ALTER TABLE public.probes
  ALTER COLUMN current_result TYPE varchar(2)
  USING (CASE WHEN current_result IS NULL THEN NULL WHEN current_result = 'C' THEN 'NG' ELSE 'OK' END);
ALTER TABLE public.probes ADD CONSTRAINT probes_current_result_check CHECK (current_result IN ('OK','NG'));
ALTER TABLE public.probes ALTER COLUMN model DROP NOT NULL;

-- ============ 2) probe_inspections: judged/previous_grade → result (OK/NG) ============
ALTER TABLE public.probe_inspections DROP CONSTRAINT IF EXISTS probe_inspections_judged_grade_check;
ALTER TABLE public.probe_inspections DROP CONSTRAINT IF EXISTS probe_inspections_previous_grade_check;
ALTER TABLE public.probe_inspections RENAME COLUMN judged_grade TO judged_result;
ALTER TABLE public.probe_inspections RENAME COLUMN previous_grade TO previous_result;
ALTER TABLE public.probe_inspections
  ALTER COLUMN judged_result TYPE varchar(2)
  USING (CASE WHEN judged_result = 'C' THEN 'NG' ELSE 'OK' END);
ALTER TABLE public.probe_inspections
  ALTER COLUMN previous_result TYPE varchar(2)
  USING (CASE WHEN previous_result IS NULL THEN NULL WHEN previous_result = 'C' THEN 'NG' ELSE 'OK' END);
ALTER TABLE public.probe_inspections ADD CONSTRAINT probe_inspections_judged_result_check CHECK (judged_result IN ('OK','NG'));
ALTER TABLE public.probe_inspections ADD CONSTRAINT probe_inspections_previous_result_check CHECK (previous_result IN ('OK','NG'));

-- ============ 3) probe_repairs: 고장유형 5종, 승인 상태, 승인 컬럼, type-status CHECK 갱신 ============
-- 기존 고장유형 데이터(crash 등)를 신규 셋으로 매핑 후 CHECK 교체 (crash는 유지, 나머지는 근접값)
UPDATE public.probe_repairs SET failure_type = CASE failure_type
  WHEN 'crash' THEN 'crash'
  WHEN 'coolant_ingress' THEN 'waterproof'
  WHEN 'battery' THEN 'fpcb'
  WHEN 'drift' THEN 'precision'
  ELSE 'stylus' END
WHERE failure_type NOT IN ('waterproof','crash','fpcb','precision','stylus');

ALTER TABLE public.probe_repairs DROP CONSTRAINT IF EXISTS probe_repairs_failure_type_check;
ALTER TABLE public.probe_repairs ADD CONSTRAINT probe_repairs_failure_type_check
  CHECK (failure_type IN ('waterproof','crash','fpcb','precision','stylus'));

ALTER TABLE public.probe_repairs DROP CONSTRAINT IF EXISTS probe_repairs_status_check;
ALTER TABLE public.probe_repairs ADD CONSTRAINT probe_repairs_status_check
  CHECK (status IN ('reported','approved','sent','completed'));

ALTER TABLE public.probe_repairs ADD COLUMN IF NOT EXISTS approved_at date;
ALTER TABLE public.probe_repairs ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.user_profiles(id);

-- 유형-상태 결합 CHECK: internal은 즉시완료, external/rbe는 reported→approved→sent→completed
ALTER TABLE public.probe_repairs DROP CONSTRAINT IF EXISTS chk_probe_repairs_type_status;
ALTER TABLE public.probe_repairs ADD CONSTRAINT chk_probe_repairs_type_status CHECK (
  CASE repair_type
    WHEN 'internal' THEN (sent_at IS NULL AND returned_at IS NULL AND approved_at IS NULL AND status = 'completed' AND completed_at IS NOT NULL)
    WHEN 'external' THEN (completed_at IS NULL
      AND (status <> 'sent' OR sent_at IS NOT NULL)
      AND (status <> 'completed' OR returned_at IS NOT NULL))
    WHEN 'rbe' THEN (completed_at IS NULL
      AND (status <> 'sent' OR sent_at IS NOT NULL)
      AND (status <> 'completed' OR (returned_at IS NOT NULL AND serial_after IS NOT NULL)))
    ELSE false
  END
);

-- ============ 4) 장비간 프로브 이동 추적 ============
CREATE TABLE IF NOT EXISTS public.probe_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_id uuid NOT NULL REFERENCES public.probes(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  from_equipment_id uuid REFERENCES public.equipment(id),
  to_equipment_id uuid REFERENCES public.equipment(id),
  moved_at date NOT NULL DEFAULT CURRENT_DATE,
  moved_by uuid REFERENCES public.user_profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_probe_movements_probe ON public.probe_movements(probe_id, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_probe_movements_factory ON public.probe_movements(factory_id, moved_at DESC);

-- ============ 5) get_probe_stats: OK/NG 재작성 ============
CREATE OR REPLACE FUNCTION public.get_probe_stats(p_factory_id uuid, p_interval_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'ok', count(*) FILTER (WHERE current_result = 'OK'),
    'ng', count(*) FILTER (WHERE current_result = 'NG'),
    'uninspected', count(*) FILTER (WHERE current_result IS NULL),
    'inUse', count(*) FILTER (WHERE status = 'in_use'),
    'spare', count(*) FILTER (WHERE status = 'spare'),
    'inRepair', count(*) FILTER (WHERE status = 'in_repair'),
    'disposed', count(*) FILTER (WHERE status = 'disposed'),
    'lost', count(*) FILTER (WHERE status = 'lost'),
    'overdue', count(*) FILTER (
      WHERE status NOT IN ('disposed','lost')
        AND last_inspected_at IS NOT NULL
        AND last_inspected_at < (now() - make_interval(days => p_interval_days))
    )
  )
  FROM public.probes
  WHERE factory_id = p_factory_id;
$$;
