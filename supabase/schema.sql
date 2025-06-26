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
SELECT id, 25, 20, 100, 'A구역-01' FROM endmill_types WHERE code = 'AT001';

INSERT INTO inventory (endmill_type_id, current_stock, min_stock, max_stock, location)
SELECT id, 5, 15, 80, 'A구역-02' FROM endmill_types WHERE code = 'AT002';

INSERT INTO inventory (endmill_type_id, current_stock, min_stock, max_stock, location)
SELECT id, 12, 10, 60, 'B구역-01' FROM endmill_types WHERE code = 'AT003'; 