-- Add factory_id to AI-related tables for multi-factory support

-- 1. ai_chat_history 테이블에 factory_id 추가
ALTER TABLE ai_chat_history
ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id);

-- 2. saved_insights 테이블에 factory_id 추가
ALTER TABLE saved_insights
ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id);

-- 3. 기존 데이터를 ALT 공장으로 backfill
UPDATE ai_chat_history
SET factory_id = (SELECT id FROM factories WHERE code = 'ALT' LIMIT 1)
WHERE factory_id IS NULL;

UPDATE saved_insights
SET factory_id = (SELECT id FROM factories WHERE code = 'ALT' LIMIT 1)
WHERE factory_id IS NULL;

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_factory_id ON ai_chat_history(factory_id);
CREATE INDEX IF NOT EXISTS idx_saved_insights_factory_id ON saved_insights(factory_id);
