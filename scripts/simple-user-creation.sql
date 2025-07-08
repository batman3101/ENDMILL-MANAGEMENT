-- 🚀 간단한 관리자 계정 생성 SQL (Supabase Dashboard에서 실행)
-- 이 코드를 복사해서 Supabase Dashboard > SQL Editor에서 실행하세요

-- 1단계: 기존 사용자 확인 및 삭제 (필요시)
DELETE FROM auth.users WHERE email = 'zetooo1972@gmail.com';

-- 2단계: 새 관리자 사용자 생성
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'zetooo1972@gmail.com',
  crypt('youkillme-1', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"시스템 최고 관리자","department":"최고경영진","position":"시스템 소유자","shift":"A","role":"system_admin","employeeId":"CEO001"}',
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
);

-- 3단계: 생성 확인
SELECT 
  '✅ 계정 생성 완료!' as status,
  email,
  created_at,
  raw_user_meta_data->>'name' as name
FROM auth.users 
WHERE email = 'zetooo1972@gmail.com';

-- 로그인 정보
SELECT 
  '📧 이메일: zetooo1972@gmail.com' as email,
  '🔑 비밀번호: youkillme-1' as password,
  '🌐 로그인: http://localhost:3000/login' as url; 