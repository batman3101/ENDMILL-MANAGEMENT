-- ==================================================
-- CNC 앤드밀 관리 시스템 - Supabase 데이터베이스 스키마
-- ==================================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================================================
-- 1. ENUMS 정의
-- ==================================================

-- 사용자 역할 타입
CREATE TYPE user_role_type AS ENUM ('system_admin', 'admin', 'user');

-- 설비 상태
CREATE TYPE equipment_status AS ENUM ('가동중', '점검중', '셋업중');

-- 설비 위치
CREATE TYPE equipment_location AS ENUM ('A동', 'B동');

-- 재고 상태
CREATE TYPE inventory_status AS ENUM ('sufficient', 'low', 'critical');

-- 교체 사유
CREATE TYPE change_reason AS ENUM (
  '정기교체', 
  '마모', 
  '파손', 
  '품질불량', 
  '공구수명', 
  '긴급교체', 
  '기타'
);

-- 교대 타입
CREATE TYPE shift_type AS ENUM ('A', 'B', 'C');

-- 알림 타입
CREATE TYPE notification_type AS ENUM (
  'equipment_status', 
  'inventory_low', 
  'tool_change', 
  'system'
);

-- 번역 네임스페이스
CREATE TYPE translation_namespace AS ENUM (
  'common', 
  'navigation', 
  'dashboard', 
  'equipment', 
  'endmill', 
  'inventory', 
  'camSheets', 
  'toolChanges', 
  'reports', 
  'settings', 
  'users', 
  'auth'
);

-- 언어 코드
CREATE TYPE language_code AS ENUM ('ko', 'vi');

-- ==================================================
-- 2. 사용자 관련 테이블
-- ==================================================

-- 사용자 역할 테이블
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type user_role_type NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 확장 정보 테이블 (Supabase Auth 확장)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL,
  role_id UUID REFERENCES user_roles(id) NOT NULL,
  shift shift_type NOT NULL DEFAULT 'A',
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ==================================================
-- 3. 설비 관련 테이블
-- ==================================================

-- 설비 테이블
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_number VARCHAR(10) UNIQUE NOT NULL, -- C001-C800
  location equipment_location NOT NULL,
  status equipment_status NOT NULL DEFAULT '가동중',
  current_model VARCHAR(50),
  process VARCHAR(50),
  tool_positions_used INTEGER NOT NULL DEFAULT 0,
  tool_positions_total INTEGER NOT NULL DEFAULT 21,
  last_maintenance DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 4. 앤드밀 관련 테이블
-- ==================================================

-- 앤드밀 카테고리 테이블
CREATE TABLE endmill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL, -- FLAT, BALL, T-CUT, etc.
  name_ko VARCHAR(100) NOT NULL,
  name_vi VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 공급업체 테이블
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  quality_rating DECIMAL(3,2) DEFAULT 0.00, -- 0.00-5.00
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 앤드밀 타입 테이블 (마스터 데이터)
CREATE TABLE endmill_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL, -- AT001, AT002, etc.
  name VARCHAR(200) NOT NULL,
  category_id UUID REFERENCES endmill_categories(id) NOT NULL,
  specifications JSONB NOT NULL DEFAULT '{}', -- 직경, 플루트 수, 코팅 등
  standard_life INTEGER NOT NULL DEFAULT 0, -- 표준 수명 (분)
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 앤드밀 공급업체별 가격 정보
CREATE TABLE endmill_supplier_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endmill_type_id UUID REFERENCES endmill_types(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  unit_price DECIMAL(15,2) NOT NULL, -- VND
  min_order_quantity INTEGER NOT NULL DEFAULT 1,
  lead_time INTEGER NOT NULL DEFAULT 7, -- 리드타임 (일)
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(endmill_type_id, supplier_id)
);

-- ==================================================
-- 5. 재고 관련 테이블
-- ==================================================

-- 재고 테이블
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endmill_type_id UUID REFERENCES endmill_types(id) NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 0,
  status inventory_status NOT NULL DEFAULT 'sufficient',
  location VARCHAR(50),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(endmill_type_id)
);

-- 재고 이동 이력
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15,2),
  supplier_id UUID REFERENCES suppliers(id),
  equipment_number VARCHAR(10),
  t_number INTEGER,
  purpose TEXT,
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 6. 공구 위치 및 설치 관련 테이블
-- ==================================================

-- 공구 위치 테이블
CREATE TABLE tool_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES equipment(id) NOT NULL,
  position_number INTEGER NOT NULL, -- 1-21 (T1-T21)
  endmill_type_id UUID REFERENCES endmill_types(id),
  current_life INTEGER DEFAULT 0,
  total_life INTEGER DEFAULT 0,
  install_date TIMESTAMP WITH TIME ZONE,
  last_maintenance TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'empty', -- 'empty', 'installed', 'warning', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(equipment_id, position_number)
);

-- ==================================================
-- 7. CAM Sheet 관련 테이블
-- ==================================================

-- CAM Sheet 테이블
CREATE TABLE cam_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model VARCHAR(100) NOT NULL,
  process VARCHAR(100) NOT NULL,
  cam_version VARCHAR(50) NOT NULL,
  version_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  UNIQUE(model, process, cam_version)
);

-- CAM Sheet 앤드밀 상세
CREATE TABLE cam_sheet_endmills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cam_sheet_id UUID REFERENCES cam_sheets(id) ON DELETE CASCADE,
  t_number INTEGER NOT NULL,
  endmill_type_id UUID REFERENCES endmill_types(id) NOT NULL,
  tool_life INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cam_sheet_id, t_number)
);

-- ==================================================
-- 8. 교체 이력 테이블
-- ==================================================

-- 교체 이력 테이블
CREATE TABLE tool_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_date DATE NOT NULL,
  equipment_id UUID REFERENCES equipment(id) NOT NULL,
  production_model VARCHAR(100) NOT NULL,
  process VARCHAR(100) NOT NULL,
  t_number INTEGER NOT NULL,
  endmill_type_id UUID REFERENCES endmill_types(id) NOT NULL,
  previous_life INTEGER DEFAULT 0,
  change_reason change_reason NOT NULL,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 9. 시스템 설정 테이블
-- ==================================================

-- 시스템 설정 테이블
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(category, key)
);

-- 설정 변경 이력
CREATE TABLE settings_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_id UUID REFERENCES system_settings(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- ==================================================
-- 10. 번역 관련 테이블
-- ==================================================

-- 번역 테이블
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  namespace translation_namespace NOT NULL,
  key VARCHAR(255) NOT NULL,
  ko TEXT,
  vi TEXT,
  context TEXT,
  is_auto_translated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(namespace, key)
);

-- 번역 변경 이력
CREATE TABLE translation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  translation_id UUID REFERENCES translations(id) ON DELETE CASCADE,
  namespace translation_namespace NOT NULL,
  key VARCHAR(255) NOT NULL,
  language language_code NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'auto_translate'
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- ==================================================
-- 11. 알림 및 로그 테이블
-- ==================================================

-- 알림 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  recipient_id UUID REFERENCES auth.users(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 시스템 활동 로그
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 12. 인덱스 생성
-- ==================================================

-- 사용자 관련 인덱스
CREATE INDEX idx_user_profiles_role_id ON user_profiles(role_id);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_profiles_employee_id ON user_profiles(employee_id);

-- 설비 관련 인덱스
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_location ON equipment(location);
CREATE INDEX idx_equipment_model ON equipment(current_model);

-- 앤드밀 관련 인덱스
CREATE INDEX idx_endmill_types_category ON endmill_types(category_id);
CREATE INDEX idx_endmill_types_code ON endmill_types(code);
CREATE INDEX idx_endmill_supplier_prices_endmill ON endmill_supplier_prices(endmill_type_id);

-- 재고 관련 인덱스
CREATE INDEX idx_inventory_endmill_type ON inventory(endmill_type_id);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_transactions_inventory ON inventory_transactions(inventory_id);

-- 공구 위치 인덱스
CREATE INDEX idx_tool_positions_equipment ON tool_positions(equipment_id);
CREATE INDEX idx_tool_positions_endmill_type ON tool_positions(endmill_type_id);

-- CAM Sheet 인덱스
CREATE INDEX idx_cam_sheets_model_process ON cam_sheets(model, process);
CREATE INDEX idx_cam_sheet_endmills_sheet ON cam_sheet_endmills(cam_sheet_id);

-- 교체 이력 인덱스
CREATE INDEX idx_tool_changes_date ON tool_changes(change_date);
CREATE INDEX idx_tool_changes_equipment ON tool_changes(equipment_id);
CREATE INDEX idx_tool_changes_endmill_type ON tool_changes(endmill_type_id);

-- 설정 및 번역 인덱스
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_translations_namespace ON translations(namespace);

-- 알림 및 로그 인덱스
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ==================================================
-- 13. 트리거 함수 생성
-- ==================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 재고 상태 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock THEN
    NEW.status = 'critical';
  ELSIF NEW.current_stock <= (NEW.min_stock * 1.5) THEN
    NEW.status = 'low';
  ELSE
    NEW.status = 'sufficient';
  END IF;
  
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 활동 로그 자동 생성 함수
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- ==================================================
-- 14. 트리거 생성
-- ==================================================

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_endmill_types_updated_at BEFORE UPDATE ON endmill_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tool_positions_updated_at BEFORE UPDATE ON tool_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cam_sheets_updated_at BEFORE UPDATE ON cam_sheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 재고 상태 자동 업데이트 트리거
CREATE TRIGGER update_inventory_status_trigger BEFORE INSERT OR UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- 중요 테이블 활동 로그 트리거
CREATE TRIGGER log_equipment_activity AFTER INSERT OR UPDATE OR DELETE ON equipment FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_tool_changes_activity AFTER INSERT OR UPDATE OR DELETE ON tool_changes FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_inventory_activity AFTER INSERT OR UPDATE OR DELETE ON inventory FOR EACH ROW EXECUTE FUNCTION log_activity();

-- ==================================================
-- 15. RLS (Row Level Security) 정책
-- ==================================================

-- RLS 활성화
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE endmill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE endmill_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE endmill_supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cam_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cam_sheet_endmills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 사용자 역할 확인 함수
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role_type AS $$
BEGIN
  RETURN (
    SELECT ur.type 
    FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE up.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자가 활성화되어 있는지 확인 함수
CREATE OR REPLACE FUNCTION auth.user_is_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT up.is_active 
    FROM user_profiles up
    WHERE up.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- 16. RLS 정책 생성
-- ==================================================

-- 사용자 역할 테이블 정책
CREATE POLICY "사용자 역할 조회" ON user_roles FOR SELECT USING (auth.user_is_active());
CREATE POLICY "시스템 관리자만 역할 관리" ON user_roles FOR ALL USING (auth.user_role() = 'system_admin');

-- 사용자 프로필 테이블 정책
CREATE POLICY "본인 프로필 조회" ON user_profiles FOR SELECT USING (id = auth.uid() OR auth.user_role() IN ('admin', 'system_admin'));
CREATE POLICY "본인 프로필 수정" ON user_profiles FOR UPDATE USING (id = auth.uid() OR auth.user_role() IN ('admin', 'system_admin'));
CREATE POLICY "관리자만 사용자 생성" ON user_profiles FOR INSERT WITH CHECK (auth.user_role() IN ('admin', 'system_admin'));
CREATE POLICY "시스템 관리자만 사용자 삭제" ON user_profiles FOR DELETE USING (auth.user_role() = 'system_admin');

-- 설비 테이블 정책
CREATE POLICY "활성 사용자 설비 조회" ON equipment FOR SELECT USING (auth.user_is_active());
CREATE POLICY "관리자 설비 수정" ON equipment FOR UPDATE USING (auth.user_role() IN ('admin', 'system_admin'));
CREATE POLICY "시스템 관리자 설비 생성삭제" ON equipment FOR ALL USING (auth.user_role() = 'system_admin');

-- 앤드밀 관련 테이블 정책
CREATE POLICY "활성 사용자 앤드밀 조회" ON endmill_categories FOR SELECT USING (auth.user_is_active());
CREATE POLICY "활성 사용자 앤드밀 타입 조회" ON endmill_types FOR SELECT USING (auth.user_is_active());
CREATE POLICY "관리자 앤드밀 관리" ON endmill_types FOR ALL USING (auth.user_role() IN ('admin', 'system_admin'));

-- 공급업체 테이블 정책
CREATE POLICY "활성 사용자 공급업체 조회" ON suppliers FOR SELECT USING (auth.user_is_active());
CREATE POLICY "관리자 공급업체 관리" ON suppliers FOR ALL USING (auth.user_role() IN ('admin', 'system_admin'));

-- 재고 테이블 정책
CREATE POLICY "활성 사용자 재고 조회" ON inventory FOR SELECT USING (auth.user_is_active());
CREATE POLICY "사용자 재고 업데이트" ON inventory FOR UPDATE USING (auth.user_is_active());
CREATE POLICY "관리자 재고 생성삭제" ON inventory FOR INSERT WITH CHECK (auth.user_role() IN ('admin', 'system_admin'));
CREATE POLICY "관리자 재고 삭제" ON inventory FOR DELETE USING (auth.user_role() IN ('admin', 'system_admin'));

-- 재고 거래 정책
CREATE POLICY "활성 사용자 재고거래 조회" ON inventory_transactions FOR SELECT USING (auth.user_is_active());
CREATE POLICY "활성 사용자 재고거래 생성" ON inventory_transactions FOR INSERT WITH CHECK (auth.user_is_active());

-- 공구 위치 정책
CREATE POLICY "활성 사용자 공구위치 조회" ON tool_positions FOR SELECT USING (auth.user_is_active());
CREATE POLICY "사용자 공구위치 업데이트" ON tool_positions FOR UPDATE USING (auth.user_is_active());
CREATE POLICY "관리자 공구위치 관리" ON tool_positions FOR ALL USING (auth.user_role() IN ('admin', 'system_admin'));

-- CAM Sheet 정책
CREATE POLICY "활성 사용자 CAM시트 조회" ON cam_sheets FOR SELECT USING (auth.user_is_active());
CREATE POLICY "사용자 CAM시트 생성수정" ON cam_sheets FOR INSERT WITH CHECK (auth.user_is_active());
CREATE POLICY "본인 또는 관리자 CAM시트 수정" ON cam_sheets FOR UPDATE USING (created_by = auth.uid() OR auth.user_role() IN ('admin', 'system_admin'));
CREATE POLICY "관리자 CAM시트 삭제" ON cam_sheets FOR DELETE USING (auth.user_role() IN ('admin', 'system_admin'));

-- CAM Sheet 상세 정책
CREATE POLICY "활성 사용자 CAM시트 상세 조회" ON cam_sheet_endmills FOR SELECT USING (auth.user_is_active());
CREATE POLICY "사용자 CAM시트 상세 관리" ON cam_sheet_endmills FOR ALL USING (auth.user_is_active());

-- 교체 이력 정책
CREATE POLICY "활성 사용자 교체이력 조회" ON tool_changes FOR SELECT USING (auth.user_is_active());
CREATE POLICY "활성 사용자 교체이력 생성" ON tool_changes FOR INSERT WITH CHECK (auth.user_is_active());
CREATE POLICY "본인 또는 관리자 교체이력 수정" ON tool_changes FOR UPDATE USING (changed_by = auth.uid() OR auth.user_role() IN ('admin', 'system_admin'));
CREATE POLICY "관리자 교체이력 삭제" ON tool_changes FOR DELETE USING (auth.user_role() IN ('admin', 'system_admin'));

-- 시스템 설정 정책
CREATE POLICY "활성 사용자 설정 조회" ON system_settings FOR SELECT USING (auth.user_is_active());
CREATE POLICY "시스템 관리자만 설정 관리" ON system_settings FOR ALL USING (auth.user_role() = 'system_admin');

-- 번역 정책
CREATE POLICY "활성 사용자 번역 조회" ON translations FOR SELECT USING (auth.user_is_active());
CREATE POLICY "관리자 번역 관리" ON translations FOR ALL USING (auth.user_role() IN ('admin', 'system_admin'));

-- 알림 정책
CREATE POLICY "본인 알림만 조회" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "본인 알림만 수정" ON notifications FOR UPDATE USING (recipient_id = auth.uid());

-- 활동 로그 정책
CREATE POLICY "관리자만 로그 조회" ON activity_logs FOR SELECT USING (auth.user_role() IN ('admin', 'system_admin'));

-- ==================================================
-- 17. 기본 데이터 삽입
-- ==================================================

-- 기본 사용자 역할 생성
INSERT INTO user_roles (name, type, description, permissions, is_system_role) VALUES
('시스템 관리자', 'system_admin', '시스템 전체 관리', '{
  "dashboard": ["read"],
  "equipment": ["create", "read", "update", "delete", "manage"],
  "endmill": ["create", "read", "update", "delete", "manage"],
  "inventory": ["create", "read", "update", "delete", "manage"],
  "camSheets": ["create", "read", "update", "delete", "manage"],
  "toolChanges": ["create", "read", "update", "delete", "manage"],
  "reports": ["create", "read", "update", "delete", "manage"],
  "settings": ["create", "read", "update", "delete", "manage"],
  "users": ["create", "read", "update", "delete", "manage"]
}', true),
('관리자', 'admin', '일반 관리자', '{
  "dashboard": ["read"],
  "equipment": ["create", "read", "update", "delete"],
  "endmill": ["create", "read", "update", "delete"],
  "inventory": ["create", "read", "update", "delete"],
  "camSheets": ["create", "read", "update", "delete"],
  "toolChanges": ["create", "read", "update", "delete"],
  "reports": ["create", "read", "update", "delete"],
  "settings": ["read"],
  "users": ["create", "read", "update", "delete"]
}', true),
('사용자', 'user', '일반 사용자', '{
  "dashboard": ["read"],
  "equipment": ["read", "update"],
  "endmill": ["read"],
  "inventory": ["create", "read", "update"],
  "camSheets": ["read"],
  "toolChanges": ["create", "read", "update"],
  "reports": ["read"],
  "settings": [],
  "users": ["read"]
}', true);

-- 기본 앤드밀 카테고리 생성
INSERT INTO endmill_categories (code, name_ko, name_vi, description) VALUES
('FLAT', '플랫', 'Phẳng', '플랫 엔드밀'),
('BALL', '볼', 'Bi', '볼 엔드밀'),
('T-CUT', 'T-CUT', 'T-CUT', 'T-슬롯 커터'),
('C-CUT', 'C-CUT', 'C-CUT', 'C형 커터'),
('REAMER', '리머', 'Dao khoét', '리머'),
('DRILL', '드릴', 'Mũi khoan', '드릴');

-- 기본 공급업체 생성
INSERT INTO suppliers (name, contact_person, is_preferred, quality_rating) VALUES
('ALMUS TECH', '김영호', true, 4.8),
('TOOL KOREA', '이철수', true, 4.6),
('VIETNAM TOOLS', 'Nguyen Van A', false, 4.2),
('PRECISION TOOL', '박민수', false, 4.4);

-- 기본 시스템 설정
INSERT INTO system_settings (category, key, value, description) VALUES
('system', 'defaultLanguage', '"ko"', '기본 언어'),
('system', 'currency', '"VND"', '기본 통화'),
('system', 'itemsPerPage', '20', '페이지당 표시 항목 수'),
('equipment', 'totalCount', '800', '총 설비 수'),
('equipment', 'toolPositionCount', '21', '설비당 공구 위치 수'),
('inventory', 'criticalPercent', '10', '위험 재고 임계값 (%)'),
('inventory', 'lowPercent', '25', '부족 재고 임계값 (%)');

-- ==================================================
-- 18. 뷰 생성 (선택사항)
-- ==================================================

-- 설비 현황 뷰
CREATE VIEW equipment_status_summary AS
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM equipment
GROUP BY status;

-- 재고 알림 뷰
CREATE VIEW inventory_alerts AS
SELECT 
  i.id,
  et.code,
  et.name,
  i.current_stock,
  i.min_stock,
  i.status,
  ec.name_ko as category_name
FROM inventory i
JOIN endmill_types et ON i.endmill_type_id = et.id
JOIN endmill_categories ec ON et.category_id = ec.id
WHERE i.status IN ('low', 'critical')
ORDER BY 
  CASE i.status 
    WHEN 'critical' THEN 1 
    WHEN 'low' THEN 2 
    ELSE 3 
  END,
  i.current_stock;

-- 월별 교체 통계 뷰
CREATE VIEW monthly_tool_change_stats AS
SELECT 
  DATE_TRUNC('month', change_date) as month,
  COUNT(*) as total_changes,
  COUNT(DISTINCT equipment_id) as equipment_count,
  COUNT(DISTINCT endmill_type_id) as endmill_type_count
FROM tool_changes
GROUP BY DATE_TRUNC('month', change_date)
ORDER BY month DESC;

COMMIT; 