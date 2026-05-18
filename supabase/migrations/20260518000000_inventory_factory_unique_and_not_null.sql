-- inventory.factory_id NOT NULL + (endmill_type_id, factory_id) UNIQUE
-- 한 앤드밀 코드는 공장당 한 행만 존재하도록 강제하여
-- 입/출고 차감이 항상 동일 행에 일관되게 반영되도록 한다.

ALTER TABLE inventory ALTER COLUMN factory_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_endmill_factory_unique
  ON inventory (endmill_type_id, factory_id);
