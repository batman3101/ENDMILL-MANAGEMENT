const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkUsers() {
  console.log('👥 Supabase 사용자 목록 확인\n');

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
    // 1. 사용자 목록 조회
    console.log('1️⃣ 등록된 사용자 목록 조회');
    
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.log('❌ 사용자 목록 조회 실패:', error.message);
      return false;
    }

    console.log(`✅ 총 ${data.users.length}명의 사용자가 등록되어 있습니다.\n`);

    if (data.users.length === 0) {
      console.log('📝 등록된 사용자가 없습니다.');
    } else {
      data.users.forEach((user, index) => {
        console.log(`${index + 1}. 사용자 정보:`);
        console.log(`   📧 이메일: ${user.email}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   📅 생성일: ${user.created_at}`);
        console.log(`   🔐 마지막 로그인: ${user.last_sign_in_at || '없음'}`);
        console.log(`   ✅ 이메일 인증: ${user.email_confirmed_at ? '완료' : '미완료'}`);
        
        if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
          console.log(`   📋 메타데이터:`, user.user_metadata);
        }
        console.log('');
      });
    }

    // 2. 특정 이메일 확인
    const targetEmail = 'zetooo1972@gmail.com';
    const existingUser = data.users.find(u => u.email === targetEmail);
    
    if (existingUser) {
      console.log(`🔍 대상 이메일 (${targetEmail}) 상태:`);
      console.log(`   ✅ 이미 등록되어 있음`);
      console.log(`   🆔 사용자 ID: ${existingUser.id}`);
      console.log(`   📅 생성일: ${existingUser.created_at}`);
      console.log(`   🔐 마지막 로그인: ${existingUser.last_sign_in_at || '없음'}`);
      
      // 로그인 테스트
      console.log('\n🔐 로그인 테스트...');
      
      const testClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
        email: targetEmail,
        password: 'youkillme-1'
      });

      if (loginError) {
        console.log('❌ 로그인 실패:', loginError.message);
        console.log('💡 비밀번호가 다르거나 계정에 문제가 있을 수 있습니다.');
      } else {
        console.log('✅ 로그인 성공!');
        console.log('👤 로그인 사용자 정보:', {
          id: loginData.user.id,
          email: loginData.user.email,
          metadata: loginData.user.user_metadata
        });
        
        // 로그아웃
        await testClient.auth.signOut();
        console.log('✅ 로그아웃 완료');
      }
    } else {
      console.log(`🔍 대상 이메일 (${targetEmail}) 상태:`);
      console.log(`   ❌ 등록되지 않음`);
      console.log('   💡 새로 생성이 필요합니다.');
    }

    return true;

  } catch (error) {
    console.error('❌ 오류:', error);
    return false;
  }
}

checkUsers()
  .then((success) => {
    if (success) {
      console.log('\n✅ 사용자 확인 완료!');
    } else {
      console.log('\n💥 사용자 확인 실패!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 