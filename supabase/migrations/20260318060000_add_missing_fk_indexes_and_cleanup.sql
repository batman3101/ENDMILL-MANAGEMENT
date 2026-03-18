-- 누락된 FK 인덱스 추가 (8개)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_equipment_id ON public.inventory_transactions USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_processed_by ON public.inventory_transactions USING btree (processed_by);
CREATE INDEX IF NOT EXISTS idx_cam_sheets_created_by ON public.cam_sheets USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_cam_sheet_endmills_endmill_type_id ON public.cam_sheet_endmills USING btree (endmill_type_id);
CREATE INDEX IF NOT EXISTS idx_tool_changes_changed_by ON public.tool_changes USING btree (changed_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_settings_history_setting_id ON public.settings_history USING btree (setting_id);

-- 중복 인덱스 제거 (사용량 0인 것만, unique 제약 조건과 중복)
-- idx_ai_query_cache_query_hash: ai_query_cache_query_hash_key (UNIQUE)와 중복, 0 scans
DROP INDEX IF EXISTS idx_ai_query_cache_query_hash;
-- idx_app_settings_category_key: app_settings_category_key_unique (UNIQUE)와 중복, 0 scans
DROP INDEX IF EXISTS idx_app_settings_category_key;
-- idx_app_settings_key: app_settings_key_key (UNIQUE)와 중복, 0 scans
DROP INDEX IF EXISTS idx_app_settings_key;
-- 참고: idx_cam_sheet_endmills_unique는 95,808 scans으로 활발히 사용 중이므로 유지
