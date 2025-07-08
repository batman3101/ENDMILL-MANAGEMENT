const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createAdminUser() {
  console.log('👤 Supabase Auth를 통한 관리자 계정 생성...\n');

  // Service Role 키로 관리자 권한 클라이언트 생성
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('1️⃣ 관리자 계정 생성');
    
    const adminEmail = 'admin@almustech.com';
    const adminPassword = 'admin123!@#';
    
    // 1. Auth에서 사용자 생성
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // 이메일 인증 생략
      user_metadata: {
        name: '시스템 관리자',
        department: '종합관리실',
        position: '관리자',
        shift: 'A',
        role: 'system_admin'
      }
    });

    if (error) {
      console.log('❌ 사용자 생성 실패:', error.message);
      
      // 이미 존재하는 사용자인지 확인
      if (error.message.includes('already registered')) {
        console.log('ℹ️  이미 등록된 사용자입니다. 로그인을 시도해보세요.');
        return false;
      }
      
      return false;
    }

    console.log('✅ Auth 사용자 생성 성공:', data.user.email);

    // 2. 간단한 연결 테스트
    console.log('\n2️⃣ 데이터베이스 연결 테스트');
    
    // 기본 테이블 확인
    const { data: tables, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);

    if (tableError) {
      console.log('❌ 테이블 조회 실패:', tableError.message);
      console.log('💡 힌트: 아직 스키마가 생성되지 않았을 수 있습니다.');
    } else {
      console.log('✅ 데이터베이스 연결 성공');
      console.log('📊 발견된 테이블들:', tables?.map(t => t.table_name).join(', ') || '없음');
    }

    // 3. 로그인 테스트
    console.log('\n3️⃣ 생성된 계정으로 로그인 테스트');
    
    const testClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (loginError) {
      console.log('❌ 로그인 테스트 실패:', loginError.message);
      return false;
    }

    console.log('✅ 로그인 테스트 성공');
    console.log('👤 사용자 정보:', {
      id: loginData.user.id,
      email: loginData.user.email,
      metadata: loginData.user.user_metadata
    });

    // 로그아웃
    await testClient.auth.signOut();
    console.log('✅ 로그아웃 완료');

    console.log('\n🎉 관리자 계정 생성 및 테스트 완료!');
    console.log(`📧 이메일: ${adminEmail}`);
    console.log(`🔑 비밀번호: ${adminPassword}`);
    console.log('🔗 로그인 페이지: http://localhost:3000/login');

    return true;

  } catch (error) {
    console.error('❌ 관리자 계정 생성 중 오류:', error);
    return false;
  }
}

// 추가 테스트: 환경변수 확인
function checkEnvironment() {
  console.log('🔍 환경변수 확인:');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: 설정됨 (길이: ${value.length})`);
    } else {
      console.log(`❌ ${varName}: 누락됨`);
      allPresent = false;
    }
  });

  return allPresent;
}

// 실행
async function main() {
  console.log('🚀 Supabase 관리자 계정 생성 및 테스트 시작\n');
  
  // 환경변수 확인
  if (!checkEnvironment()) {
    console.log('\n❌ 필수 환경변수가 누락되었습니다.');
    process.exit(1);
  }
  
  console.log('');
  
  // 관리자 계정 생성
  const success = await createAdminUser();
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error); 