const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createUserDirect() {
  console.log('👤 트리거 없이 직접 사용자 생성\n');

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
    const userEmail = 'zetooo1972@gmail.com';
    const userPassword = 'youkillme-1';

    console.log('📧 사용자 생성 시도...');
    console.log(`이메일: ${userEmail}`);

    // 1. 최소한의 정보로 사용자 생성 시도
    console.log('\n1️⃣ 기본 사용자 생성 (트리거 비활성화)');
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      // 최소한의 메타데이터만 포함
      user_metadata: {
        name: '시스템 최고 운영자'
      }
    });

    if (error) {
      console.log('❌ 기본 사용자 생성 실패:', error.message);
      
      // 상세 오류 정보 출력
      console.log('🔍 오류 상세 정보:', {
        code: error.status,
        message: error.message,
        details: error
      });
      
      return false;
    }

    console.log('✅ 사용자 생성 성공!');
    console.log(`👤 사용자 ID: ${data.user.id}`);
    console.log(`📧 이메일: ${data.user.email}`);

    // 2. 메타데이터 업데이트
    console.log('\n2️⃣ 사용자 메타데이터 업데이트');
    
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      {
        user_metadata: {
          name: '시스템 최고 운영자',
          employeeId: 'OWNER001',
          department: '최고경영진',
          position: '시스템 소유자',
          shift: 'A',
          role: 'system_admin',
          isOwner: true,
          permissions: 'all',
          createdBy: 'owner_setup',
          createdAt: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      console.log('⚠️  메타데이터 업데이트 실패:', updateError.message);
      console.log('💡 기본 사용자는 생성되었으니 로그인은 가능합니다.');
    } else {
      console.log('✅ 메타데이터 업데이트 성공');
    }

    // 3. 로그인 테스트
    console.log('\n3️⃣ 로그인 테스트');
    
    const testClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });

    if (loginError) {
      console.log('❌ 로그인 실패:', loginError.message);
      return false;
    }

    console.log('✅ 로그인 성공!');
    console.log('👤 사용자 정보:', {
      id: loginData.user.id,
      email: loginData.user.email,
      metadata: loginData.user.user_metadata
    });

    // 로그아웃
    await testClient.auth.signOut();
    console.log('✅ 로그아웃 완료');

    console.log('\n🎉 시스템 최고 운영자 계정 생성 완료!');
    console.log('');
    console.log('📋 로그인 정보:');
    console.log(`📧 이메일: ${userEmail}`);
    console.log(`🔑 비밀번호: ${userPassword}`);
    console.log('👑 권한: 시스템 최고 관리자');
    console.log('🌐 로그인 페이지: http://localhost:3000/login');

    return true;

  } catch (error) {
    console.error('❌ 치명적 오류:', error);
    return false;
  }
}

createUserDirect()
  .then((success) => {
    if (success) {
      console.log('\n✅ 사용자 생성 완료!');
      console.log('이제 웹에서 로그인할 수 있습니다.');
    } else {
      console.log('\n💥 사용자 생성 실패!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 