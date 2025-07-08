const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createSimpleAdmin() {
  console.log('👤 간단한 관리자 계정 생성\n');

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
    const adminEmail = 'admin@almustech.com';
    const adminPassword = 'admin123';

    console.log('📧 관리자 계정 생성 중...');
    console.log(`이메일: ${adminEmail}`);
    console.log(`비밀번호: ${adminPassword}`);

    // 기존 사용자 확인 및 삭제
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === adminEmail);
    
    if (existingUser) {
      console.log('🗑️  기존 관리자 계정 삭제 중...');
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      console.log('✅ 기존 계정 삭제 완료');
    }

    // 새 관리자 계정 생성
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
      console.log('❌ 관리자 계정 생성 실패:', error.message);
      return false;
    }

    console.log('✅ 관리자 계정 생성 성공!');
    console.log(`👤 사용자 ID: ${data.user.id}`);
    console.log(`📧 이메일: ${data.user.email}`);

    // 로그인 테스트
    console.log('\n🔐 로그인 테스트 중...');
    
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

    console.log('✅ 로그인 테스트 성공!');
    console.log(`🔑 액세스 토큰: ${loginData.session.access_token.substring(0, 20)}...`);

    // 로그아웃
    await testClient.auth.signOut();
    console.log('✅ 로그아웃 완료');

    console.log('\n🎉 관리자 계정 생성 및 테스트 완료!');
    console.log('\n📋 로그인 정보:');
    console.log(`📧 이메일: ${adminEmail}`);
    console.log(`🔑 비밀번호: ${adminPassword}`);
    console.log('🌐 로그인 페이지: http://localhost:3000/login');

    return true;

  } catch (error) {
    console.error('❌ 오류:', error);
    return false;
  }
}

createSimpleAdmin()
  .then((success) => {
    if (success) {
      console.log('\n✅ 성공적으로 완료되었습니다!');
      console.log('이제 웹 브라우저에서 http://localhost:3000/login 으로 이동하여 로그인을 테스트해보세요.');
    } else {
      console.log('\n💥 실패했습니다.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 