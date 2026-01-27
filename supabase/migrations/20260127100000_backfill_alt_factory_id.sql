-- Backfill NULL factory_id with ALT factory UUID
-- 기존 데이터(factory_id IS NULL)를 모두 ALT(1공장) 소속으로 업데이트

DO $$
DECLARE
  alt_factory_id UUID;
BEGIN
  SELECT id INTO alt_factory_id FROM factories WHERE code = 'ALT';

  IF alt_factory_id IS NULL THEN
    RAISE EXCEPTION 'ALT factory not found in factories table';
  END IF;

  -- equipment
  UPDATE equipment SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- tool_changes
  UPDATE tool_changes SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- inventory
  UPDATE inventory SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- inventory_transactions
  UPDATE inventory_transactions SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- cam_sheets
  UPDATE cam_sheets SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- endmill_disposals (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'endmill_disposals') THEN
    UPDATE endmill_disposals SET factory_id = alt_factory_id WHERE factory_id IS NULL;
  END IF;

  RAISE NOTICE 'Backfill complete. ALT factory_id: %', alt_factory_id;
END $$;
