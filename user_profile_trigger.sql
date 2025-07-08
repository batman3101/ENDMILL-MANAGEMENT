-- ==================================================
-- Supabase Auth 사용자와 user_profiles 연동 트리거
-- ==================================================

-- 사용자 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- 기본 역할 ID 조회 (일반 사용자)
  SELECT id INTO default_role_id 
  FROM public.user_roles 
  WHERE type = 'user' AND is_system_role = true 
  LIMIT 1;

  -- user_profiles 테이블에 레코드 생성
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    employee_id,
    department,
    position,
    role_id,
    shift,
    is_active,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'employeeId', 'EMP' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'department', '미분류'),
    COALESCE(NEW.raw_user_meta_data->>'position', '직원'),
    COALESCE((NEW.raw_user_meta_data->>'role_id')::UUID, default_role_id),
    COALESCE(NEW.raw_user_meta_data->>'shift', 'A')::shift_type,
    COALESCE((NEW.raw_user_meta_data->>'isActive')::boolean, true),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블의 INSERT 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 사용자 삭제 시 프로필도 삭제하는 함수
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블의 DELETE 트리거 생성
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete(); 