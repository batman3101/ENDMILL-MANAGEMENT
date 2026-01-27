-- Migration: Add Multi-Factory Support
-- Created: 2026-01-27
-- Description: Adds factory management, user-factory access control, and factory_id to all relevant tables

-- =====================================================
-- 1. CREATE FACTORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_ko VARCHAR(100),
  name_vi VARCHAR(100),
  country VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial factory data
INSERT INTO factories (code, name, name_ko, name_vi, country, timezone) VALUES
  ('ALT', 'ALMUS TECH', '1공장 (ALT)', 'Nha may 1 (ALT)', 'Korea', 'Asia/Seoul'),
  ('ALV', 'ALMUS VINA', '2공장 (ALV)', 'Nha may 2 (ALV)', 'Vietnam', 'Asia/Ho_Chi_Minh');

-- Create updated_at trigger for factories
CREATE OR REPLACE FUNCTION update_factories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_factories_updated_at
  BEFORE UPDATE ON factories
  FOR EACH ROW
  EXECUTE FUNCTION update_factories_updated_at();

-- =====================================================
-- 2. CREATE USER_FACTORY_ACCESS TABLE (Junction Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_factory_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, factory_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_factory_access_user_id ON user_factory_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_factory_access_factory_id ON user_factory_access(factory_id);

-- =====================================================
-- 3. CREATE RPC FUNCTIONS
-- =====================================================

-- Function 1: Get all factories accessible by a user
CREATE OR REPLACE FUNCTION get_user_accessible_factories(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  code VARCHAR,
  name VARCHAR,
  name_ko VARCHAR,
  name_vi VARCHAR,
  country VARCHAR,
  timezone VARCHAR,
  is_active BOOLEAN,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.code,
    f.name,
    f.name_ko,
    f.name_vi,
    f.country,
    f.timezone,
    f.is_active,
    ufa.is_default
  FROM factories f
  INNER JOIN user_factory_access ufa ON f.id = ufa.factory_id
  WHERE ufa.user_id = p_user_id
  ORDER BY ufa.is_default DESC, f.code ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Check if user has access to a specific factory
CREATE OR REPLACE FUNCTION user_has_factory_access(p_factory_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_factory_access
    WHERE user_id = p_user_id AND factory_id = p_factory_id
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get user's default factory
CREATE OR REPLACE FUNCTION get_user_default_factory(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  code VARCHAR,
  name VARCHAR,
  name_ko VARCHAR,
  name_vi VARCHAR,
  country VARCHAR,
  timezone VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.code,
    f.name,
    f.name_ko,
    f.name_vi,
    f.country,
    f.timezone
  FROM factories f
  INNER JOIN user_factory_access ufa ON f.id = ufa.factory_id
  WHERE ufa.user_id = p_user_id AND ufa.is_default = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ADD FACTORY_ID TO EXISTING TABLES
-- =====================================================

-- Add factory_id to equipments table
ALTER TABLE equipments
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equipments_factory_id ON equipments(factory_id);

-- Add factory_id to tool_changes table
ALTER TABLE tool_changes
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tool_changes_factory_id ON tool_changes(factory_id);

-- Add factory_id to inventory table
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_factory_id ON inventory(factory_id);

-- Add factory_id to inventory_transactions table
ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_factory_id ON inventory_transactions(factory_id);

-- Add factory_id to cam_sheets table
ALTER TABLE cam_sheets
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cam_sheets_factory_id ON cam_sheets(factory_id);

-- Add factory_id to endmill_disposals table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'endmill_disposals'
  ) THEN
    ALTER TABLE endmill_disposals
      ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_endmill_disposals_factory_id ON endmill_disposals(factory_id);
  END IF;
END $$;

-- Add factory_id to endmill_types table
ALTER TABLE endmill_types
  ADD COLUMN IF NOT EXISTS factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_endmill_types_factory_id ON endmill_types(factory_id);

-- =====================================================
-- 5. ADD DEFAULT_FACTORY_ID TO USER_PROFILES
-- =====================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS default_factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_default_factory_id ON user_profiles(default_factory_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on factories table
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active factories
CREATE POLICY "Users can view active factories"
  ON factories FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Policy: Only system admins can modify factories
CREATE POLICY "Only system admins can modify factories"
  ON factories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'system_admin'
    )
  );

-- Enable RLS on user_factory_access table
ALTER TABLE user_factory_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own factory access
CREATE POLICY "Users can view their own factory access"
  ON user_factory_access FOR SELECT
  USING (user_id = auth.uid());

-- Policy: System admins can view all factory access
CREATE POLICY "System admins can view all factory access"
  ON user_factory_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'system_admin'
    )
  );

-- Policy: System admins can manage factory access
CREATE POLICY "System admins can manage factory access"
  ON user_factory_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'system_admin'
    )
  );

-- Policy: Restrict user_profiles default_factory_id updates
CREATE POLICY "Users can only update their own default_factory_id"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    (
      default_factory_id IS NULL OR
      EXISTS (
        SELECT 1 FROM user_factory_access
        WHERE user_id = auth.uid() AND factory_id = default_factory_id
      )
    )
  );

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_accessible_factories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_factory_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_default_factory(UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE factories IS 'Stores factory information for multi-factory support';
COMMENT ON TABLE user_factory_access IS 'Junction table linking users to their accessible factories';
COMMENT ON FUNCTION get_user_accessible_factories(UUID) IS 'Returns all factories accessible by a user';
COMMENT ON FUNCTION user_has_factory_access(UUID, UUID) IS 'Checks if a user has access to a specific factory';
COMMENT ON FUNCTION get_user_default_factory(UUID) IS 'Returns the default factory for a user';
