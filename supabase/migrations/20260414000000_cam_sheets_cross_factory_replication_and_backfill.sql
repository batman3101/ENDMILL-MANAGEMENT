-- Purpose: Support multi-factory CAM Sheet replication.
-- 1) Drop the old UNIQUE (model, process, cam_version) constraint which blocks
--    per-factory duplicates of the same sheet definition.
-- 2) Add a composite UNIQUE (model, process, cam_version, factory_id) so that
--    each factory can hold its own copy but twins remain de-duped per factory.
-- 3) Backfill: for every cam_sheet in factory ALT (1공장) create a twin in
--    factory ALV (2공장) plus copy all cam_sheet_endmills, skipping rows that
--    already exist.

ALTER TABLE cam_sheets
  DROP CONSTRAINT IF EXISTS cam_sheets_model_process_cam_version_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'cam_sheets'::regclass
      AND conname = 'cam_sheets_model_process_cam_version_factory_id_key'
  ) THEN
    ALTER TABLE cam_sheets
      ADD CONSTRAINT cam_sheets_model_process_cam_version_factory_id_key
      UNIQUE (model, process, cam_version, factory_id);
  END IF;
END $$;

WITH alt_id AS (
  SELECT id FROM factories WHERE code = 'ALT' LIMIT 1
),
alv_id AS (
  SELECT id FROM factories WHERE code = 'ALV' LIMIT 1
),
inserted_twins AS (
  INSERT INTO cam_sheets (model, process, cam_version, version_date, created_by, factory_id)
  SELECT
    cs.model,
    cs.process,
    cs.cam_version,
    cs.version_date,
    cs.created_by,
    (SELECT id FROM alv_id)
  FROM cam_sheets cs
  WHERE cs.factory_id = (SELECT id FROM alt_id)
    AND NOT EXISTS (
      SELECT 1 FROM cam_sheets existing
      WHERE existing.factory_id = (SELECT id FROM alv_id)
        AND existing.model = cs.model
        AND existing.process = cs.process
        AND existing.cam_version = cs.cam_version
    )
  RETURNING id, model, process, cam_version
)
INSERT INTO cam_sheet_endmills (
  cam_sheet_id, t_number, endmill_type_id, tool_life,
  endmill_code, endmill_name, specifications
)
SELECT
  twin.id,
  src_em.t_number,
  src_em.endmill_type_id,
  src_em.tool_life,
  src_em.endmill_code,
  src_em.endmill_name,
  src_em.specifications
FROM inserted_twins twin
JOIN cam_sheets src
  ON src.factory_id = (SELECT id FROM factories WHERE code = 'ALT')
 AND src.model = twin.model
 AND src.process = twin.process
 AND src.cam_version = twin.cam_version
JOIN cam_sheet_endmills src_em ON src_em.cam_sheet_id = src.id;

INSERT INTO cam_sheet_endmills (
  cam_sheet_id, t_number, endmill_type_id, tool_life,
  endmill_code, endmill_name, specifications
)
SELECT
  alv_twin.id,
  src_em.t_number,
  src_em.endmill_type_id,
  src_em.tool_life,
  src_em.endmill_code,
  src_em.endmill_name,
  src_em.specifications
FROM cam_sheets alt_src
JOIN cam_sheet_endmills src_em ON src_em.cam_sheet_id = alt_src.id
JOIN cam_sheets alv_twin
  ON alv_twin.factory_id = (SELECT id FROM factories WHERE code = 'ALV')
 AND alv_twin.model = alt_src.model
 AND alv_twin.process = alt_src.process
 AND alv_twin.cam_version = alt_src.cam_version
WHERE alt_src.factory_id = (SELECT id FROM factories WHERE code = 'ALT')
  AND NOT EXISTS (
    SELECT 1 FROM cam_sheet_endmills existing
    WHERE existing.cam_sheet_id = alv_twin.id
      AND existing.t_number = src_em.t_number
  );
