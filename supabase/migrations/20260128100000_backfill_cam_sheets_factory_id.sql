-- Backfill cam_sheets with null factory_id to ALT factory
UPDATE cam_sheets
SET factory_id = (SELECT id FROM factories WHERE code = 'ALT' LIMIT 1)
WHERE factory_id IS NULL;
