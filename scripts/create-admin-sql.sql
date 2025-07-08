-- Supabase에서 직접 실행할 관리자 계정 생성 SQL
-- 이 코드를 Supabase Dashboard의 SQL Editor에서 실행하세요

-- 1. 먼저 기존 사용자가 있는지 확인 (선택사항)
-- SELECT * FROM auth.users WHERE email = 'zetooo1972@gmail.com';

-- 2. 기존 사용자 삭제 (필요한 경우만)
-- DELETE FROM auth.users WHERE email = 'zetooo1972@gmail.com';

-- 3. 새 관리자 사용자 생성
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'zetooo1972@gmail.com',
  crypt('youkillme-1', gen_salt('bf')), -- 비밀번호 해시화
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"name":"시스템 최고 관리자","department":"최고경영진","position":"시스템 소유자","shift":"A","role":"system_admin","employeeId":"CEO001"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
);

-- 4. 생성된 사용자 확인
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'zetooo1972@gmail.com';

-- 5. 사용자 프로필 테이블이 있다면 추가 정보 삽입 (선택사항)
-- 이 부분은 user_profiles 테이블이 있을 때만 실행하세요
/*
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
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'zetooo1972@gmail.com'),
  'zetooo1972@gmail.com',
  '시스템 최고 관리자',
  'CEO001',
  '최고경영진',
  '시스템 소유자',
  'role-system-admin',
  'A',
  true,
  NOW(),
  NOW()
);
*/

-- 실행 완료 메시지
SELECT '✅ 관리자 계정이 성공적으로 생성되었습니다!' as message;
SELECT '📧 이메일: zetooo1972@gmail.com' as login_info;
SELECT '🔑 비밀번호: youkillme-1' as password_info;
SELECT '🌐 로그인 페이지: http://localhost:3000/login' as login_url; 