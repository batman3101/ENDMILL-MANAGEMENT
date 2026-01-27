-- Backfill user_factory_access for existing users
-- 기존 사용자에게 ALT(1공장) + ALV(2공장) 양쪽 접근 권한 부여
-- 근거: 기존 사용자 중 어떤 공장에서 근무하는지 데이터가 없으므로,
-- 양쪽 모두 접근 권한을 부여하고 관리자가 추후 조정하도록 함.

-- ALT (1공장) - is_default = true
INSERT INTO user_factory_access (user_id, factory_id, is_default)
SELECT up.user_id, f.id, true
FROM user_profiles up
CROSS JOIN factories f
WHERE f.code = 'ALT'
  AND up.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_factory_access ufa
    WHERE ufa.user_id = up.user_id AND ufa.factory_id = f.id
  );

-- ALV (2공장) - is_default = false
INSERT INTO user_factory_access (user_id, factory_id, is_default)
SELECT up.user_id, f.id, false
FROM user_profiles up
CROSS JOIN factories f
WHERE f.code = 'ALV'
  AND up.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_factory_access ufa
    WHERE ufa.user_id = up.user_id AND ufa.factory_id = f.id
  );

-- Set default_factory_id for users without one
UPDATE user_profiles
SET default_factory_id = (SELECT id FROM factories WHERE code = 'ALT')
WHERE default_factory_id IS NULL AND user_id IS NOT NULL;
