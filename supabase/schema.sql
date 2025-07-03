-- CNC 앤드밀 관리 시스템 데이터베이스 스키마
-- PRD 기반 설계

-- 1. 설비 관리 테이블
CREATE TABLE equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(10) NOT NULL, -- PA1, PA2, PS, B7, Q7
  equipment_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline')),
  location VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 유니크 제약 조건
  UNIQUE(model_code, equipment_number)
);

-- 2. 공정 관리 테이블
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE,
  process_name VARCHAR(50) NOT NULL, -- CNC#1, CNC#2
  process_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 유니크 제약 조건 (설비당 공정명 중복 방지)
  UNIQUE(equipment_id, process_name)
);

-- 3. 앤드밀 카테고리 테이블
CREATE TABLE endmill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL
  name_ko VARCHAR(50) NOT NULL,
  name_vi VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 앤드밀 타입 테이블
CREATE TABLE endmill_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, -- AT001, AT002
  category_id UUID REFERENCES endmill_categories(id) ON DELETE RESTRICT,
  description_ko VARCHAR(200),
  description_vi VARCHAR(200),
  specifications JSONB, -- 직경, 날 수 등 {diameter: 12, flutes: 4, length: 50}
  unit_cost DECIMAL(10,2),
  standard_life INTEGER DEFAULT 2000, -- 표준 수명 (회전수)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 공구 위치 테이블 (T1-T24)
CREATE TABLE tool_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipments(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  position_number INTEGER CHECK (position_number BETWEEN 1 AND 24), -- T1~T24
  endmill_type_id UUID REFERENCES endmill_types(id) ON DELETE SET NULL,
  current_endmill_id UUID, -- 현재 장착된 개별 앤드밀 (추후 endmill_instances 테이블과 연결)
  standard_life INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 유니크 제약 조건 (공정당 위치 번호 중복 방지)
  UNIQUE(process_id, position_number)
);

-- 6. 재고 관리 테이블
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endmill_type_id UUID REFERENCES endmill_types(id) ON DELETE CASCADE,
  current_stock INTEGER DEFAULT 0 CHECK (current_stock >= 0),
  min_stock INTEGER DEFAULT 10 CHECK (min_stock >= 0),
  max_stock INTEGER DEFAULT 100 CHECK (max_stock >= min_stock),
  location VARCHAR(50), -- A구역-01, B구역-02 등
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 앤드밀 타입당 하나의 재고 기록
  UNIQUE(endmill_type_id)
);

-- 7. 재고 거래 이력 테이블
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endmill_type_id UUID REFERENCES endmill_types(id) ON DELETE CASCADE,
  transaction_type VARCHAR(10) CHECK (transaction_type IN ('in', 'out')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reference_id UUID, -- 교체 기록 등 참조
  operator_id UUID, -- 추후 users 테이블과 연결
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_equipments_model_code ON equipments(model_code);
CREATE INDEX idx_equipments_status ON equipments(status);
CREATE INDEX idx_processes_equipment_id ON processes(equipment_id);
CREATE INDEX idx_endmill_types_category_id ON endmill_types(category_id);
CREATE INDEX idx_endmill_types_code ON endmill_types(code);
CREATE INDEX idx_tool_positions_equipment_id ON tool_positions(equipment_id);
CREATE INDEX idx_tool_positions_process_id ON tool_positions(process_id);
CREATE INDEX idx_inventory_endmill_type_id ON inventory(endmill_type_id);
CREATE INDEX idx_inventory_transactions_type_id ON inventory_transactions(endmill_type_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- 9. 트리거 함수 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_equipments_updated_at BEFORE UPDATE ON equipments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_positions_updated_at BEFORE UPDATE ON tool_positions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. RLS (Row Level Security) 정책 활성화
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE endmill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE endmill_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자는 모든 데이터 조회 가능 (추후 세분화)
CREATE POLICY "Anyone can view equipments" ON equipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view processes" ON processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view endmill_categories" ON endmill_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view endmill_types" ON endmill_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view tool_positions" ON tool_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view inventory" ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view inventory_transactions" ON inventory_transactions FOR SELECT TO authenticated USING (true);

-- 11. 초기 데이터 삽입
INSERT INTO endmill_categories (code, name_ko, name_vi, description) VALUES
('FLAT', '플랫 앤드밀', 'Phay đầu phẳng', '평면 가공용 앤드밀'),
('BALL', '볼 앤드밀', 'Phay đầu cầu', '곡면 가공용 앤드밀'),
('T-CUT', 'T-컷 앤드밀', 'Phay T-Cut', 'T자 홈 가공용'),
('C-CUT', 'C-컷 앤드밀', 'Phay C-Cut', 'C자 홈 가공용'),
('REAMER', '리머', 'Dao khoét', '구멍 다듬기용'),
('DRILL', '드릴', 'Mũi khoan', '구멍 가공용');

-- 샘플 앤드밀 타입 데이터
INSERT INTO endmill_types (code, category_id, description_ko, description_vi, specifications, unit_cost, standard_life) 
SELECT 
  'AT001', 
  id, 
  'FLAT 12mm 4날', 
  'Phay đầu phẳng 12mm 4 lưỡi',
  '{"diameter": 12, "flutes": 4, "length": 50, "coating": "TiAlN"}'::jsonb,
  45000,
  2500
FROM endmill_categories WHERE code = 'FLAT';

INSERT INTO endmill_types (code, category_id, description_ko, description_vi, specifications, unit_cost, standard_life) 
SELECT 
  'AT002', 
  id, 
  'BALL 6mm 2날', 
  'Phay đầu cầu 6mm 2 lưỡi',
  '{"diameter": 6, "flutes": 2, "length": 30, "coating": "TiAlN"}'::jsonb,
  38000,
  2000
FROM endmill_categories WHERE code = 'BALL';

INSERT INTO endmill_types (code, category_id, description_ko, description_vi, specifications, unit_cost, standard_life) 
SELECT 
  'AT003', 
  id, 
  'T-CUT 8mm 3날', 
  'Phay T-Cut 8mm 3 lưỡi',
  '{"diameter": 8, "flutes": 3, "length": 40, "coating": "TiN"}'::jsonb,
  52000,
  1800
FROM endmill_categories WHERE code = 'T-CUT';

-- 샘플 설비 데이터
INSERT INTO equipments (model_code, equipment_number, status, location) VALUES
('PA1', 1, 'active', '1공장 A구역'),
('PA1', 2, 'active', '1공장 A구역'),
('PA2', 1, 'maintenance', '1공장 B구역'),
('PS', 1, 'active', '2공장 A구역'),
('B7', 1, 'offline', '2공장 B구역');

-- 샘플 공정 데이터
INSERT INTO processes (equipment_id, process_name, process_order)
SELECT id, 'CNC#1', 1 FROM equipments WHERE model_code = 'PA1' AND equipment_number = 1;

INSERT INTO processes (equipment_id, process_name, process_order)
SELECT id, 'CNC#2', 2 FROM equipments WHERE model_code = 'PA1' AND equipment_number = 1;

-- 샘플 재고 데이터
INSERT INTO inventory (endmill_type_id, current_stock, min_stock, max_stock, location)
SELECT id, 50, 10, 100, 'A구역-01' FROM endmill_types WHERE code = 'AT001';

INSERT INTO inventory (endmill_type_id, current_stock, min_stock, max_stock, location)
SELECT id, 25, 15, 80, 'B구역-02' FROM endmill_types WHERE code = 'AT002';

INSERT INTO inventory (endmill_type_id, current_stock, min_stock, max_stock, location)
SELECT id, 12, 10, 60, 'B구역-01' FROM endmill_types WHERE code = 'AT003';

-- =================================================================
-- 번역 관리 시스템 테이블
-- =================================================================

-- 1. 번역 네임스페이스 테이블
CREATE TABLE translation_namespaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- common, navigation, dashboard 등
  name_ko VARCHAR(100) NOT NULL,
  name_vi VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 번역 키 테이블
CREATE TABLE translation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace_id UUID REFERENCES translation_namespaces(id) ON DELETE CASCADE,
  key_name VARCHAR(100) NOT NULL, -- loginTitle, dashboard 등
  context TEXT, -- 번역 컨텍스트 설명
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 네임스페이스 내에서 키 이름 중복 방지
  UNIQUE(namespace_id, key_name)
);

-- 3. 번역 값 테이블
CREATE TABLE translation_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL CHECK (language_code IN ('ko', 'vi')),
  translated_text TEXT NOT NULL,
  is_auto_translated BOOLEAN DEFAULT false, -- Google Translate 자동 번역 여부
  translation_confidence DECIMAL(3,2), -- 번역 신뢰도 (0.00-1.00)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100), -- 번역 작성자
  updated_by VARCHAR(100), -- 번역 수정자
  
  -- 키와 언어 조합 중복 방지
  UNIQUE(key_id, language_code)
);

-- 4. 번역 변경 이력 테이블
CREATE TABLE translation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES translation_keys(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  change_type VARCHAR(20) CHECK (change_type IN ('create', 'update', 'delete', 'auto_translate')),
  changed_by VARCHAR(100) NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 번역 캐시 테이블 (Google Translate API 캐시)
CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  source_language VARCHAR(5) NOT NULL,
  target_language VARCHAR(5) NOT NULL,
  translated_text TEXT NOT NULL,
  cache_key VARCHAR(255) UNIQUE NOT NULL, -- 해시된 캐시 키
  confidence_score DECIMAL(3,2),
  api_response JSONB, -- 전체 API 응답 저장
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 캐시 효율성을 위한 인덱스
  INDEX idx_translation_cache_key (cache_key),
  INDEX idx_translation_cache_expires (expires_at)
);

-- 6. API 사용량 추적 테이블
CREATE TABLE translation_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  character_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10,4), -- USD 기준 예상 비용
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 일별 사용량 중복 방지
  UNIQUE(date)
);

-- =================================================================
-- 번역 관리 인덱스 생성
-- =================================================================

CREATE INDEX idx_translation_namespaces_code ON translation_namespaces(code);
CREATE INDEX idx_translation_namespaces_active ON translation_namespaces(is_active);
CREATE INDEX idx_translation_keys_namespace ON translation_keys(namespace_id);
CREATE INDEX idx_translation_keys_active ON translation_keys(is_active);
CREATE INDEX idx_translation_values_key ON translation_values(key_id);
CREATE INDEX idx_translation_values_language ON translation_values(language_code);
CREATE INDEX idx_translation_values_auto ON translation_values(is_auto_translated);
CREATE INDEX idx_translation_history_key ON translation_history(key_id);
CREATE INDEX idx_translation_history_changed_at ON translation_history(changed_at);
CREATE INDEX idx_translation_api_usage_date ON translation_api_usage(date);

-- =================================================================
-- 번역 관리 트리거 생성
-- =================================================================

CREATE TRIGGER update_translation_namespaces_updated_at BEFORE UPDATE ON translation_namespaces 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translation_keys_updated_at BEFORE UPDATE ON translation_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translation_values_updated_at BEFORE UPDATE ON translation_values 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- 번역 관리 RLS 정책 설정
-- =================================================================

ALTER TABLE translation_namespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_api_usage ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자는 모든 번역 데이터 조회 가능
CREATE POLICY "Anyone can view translation_namespaces" ON translation_namespaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view translation_keys" ON translation_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view translation_values" ON translation_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view translation_history" ON translation_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view translation_cache" ON translation_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view translation_api_usage" ON translation_api_usage FOR SELECT TO authenticated USING (true);

-- 관리자만 번역 데이터 수정 가능 (추후 사용자 역할 테이블 연동)
CREATE POLICY "Admins can insert translation_namespaces" ON translation_namespaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update translation_namespaces" ON translation_namespaces FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can insert translation_keys" ON translation_keys FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update translation_keys" ON translation_keys FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can insert translation_values" ON translation_values FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update translation_values" ON translation_values FOR UPDATE TO authenticated USING (true);
CREATE POLICY "System can insert translation_history" ON translation_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "System can manage translation_cache" ON translation_cache FOR ALL TO authenticated USING (true);
CREATE POLICY "System can track api_usage" ON translation_api_usage FOR ALL TO authenticated USING (true);

-- =================================================================
-- 번역 관리 초기 데이터 삽입
-- =================================================================

-- 기본 네임스페이스 생성
INSERT INTO translation_namespaces (code, name_ko, name_vi, description, display_order) VALUES
('common', '공통', 'Chung', '공통으로 사용되는 번역', 1),
('navigation', '내비게이션', 'Điều hướng', '메뉴 및 네비게이션 관련 번역', 2),
('dashboard', '대시보드', 'Bảng điều khiển', '대시보드 페이지 번역', 3),
('equipment', '설비 관리', 'Quản lý thiết bị', '설비 관리 페이지 번역', 4),
('endmill', '앤드밀 관리', 'Quản lý dao phay', '앤드밀 관리 페이지 번역', 5),
('inventory', '재고 관리', 'Quản lý tồn kho', '재고 관리 페이지 번역', 6),
('camSheets', 'CAM SHEET', 'CAM SHEET', 'CAM SHEET 관리 페이지 번역', 7),
('toolChanges', '교체 이력', 'Lịch sử thay đổi', '공구 교체 이력 페이지 번역', 8),
('reports', '리포트', 'Báo cáo', '리포트 페이지 번역', 9),
('settings', '설정', 'Cài đặt', '설정 페이지 번역', 10),
('users', '사용자 관리', 'Quản lý người dùng', '사용자 관리 페이지 번역', 11),
('auth', '인증', 'Xác thực', '로그인/인증 관련 번역', 12); 