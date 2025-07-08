const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createOwnerAdmin() {
  console.log('👑 시스템 최고 운영자 계정 생성\n');

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
    const ownerEmail = 'zetooo1972@gmail.com';
    const ownerPassword = 'youkillme-1';

    console.log('📧 최고 운영자 계정 생성 중...');
    console.log(`이메일: ${ownerEmail}`);
    console.log(`역할: 시스템 최고 관리자`);

    // 기존 사용자 확인
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === ownerEmail);
    
    if (existingUser) {
      console.log('🗑️  기존 계정이 존재합니다. 업데이트 중...');
      
      // 기존 계정 업데이트
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: ownerPassword,
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
            updatedAt: new Date().toISOString()
          }
        }
      );

      if (updateError) {
        console.log('❌ 계정 업데이트 실패:', updateError.message);
        return false;
      }

      console.log('✅ 기존 계정 업데이트 완료');
    } else {
      // 새 계정 생성
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true, // 이메일 인증 생략
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
      });

      if (error) {
        console.log('❌ 최고 운영자 계정 생성 실패:', error.message);
        return false;
      }

      console.log('✅ 최고 운영자 계정 생성 성공!');
      console.log(`👤 사용자 ID: ${data.user.id}`);
    }

    // 로그인 테스트
    console.log('\n🔐 로그인 테스트 중...');
    
    const testClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword
    });

    if (loginError) {
      console.log('❌ 로그인 테스트 실패:', loginError.message);
      return false;
    }

    console.log('✅ 로그인 테스트 성공!');
    console.log('👤 사용자 정보:', {
      id: loginData.user.id,
      email: loginData.user.email,
      name: loginData.user.user_metadata?.name,
      role: loginData.user.user_metadata?.role,
      isOwner: loginData.user.user_metadata?.isOwner
    });

    // 로그아웃
    await testClient.auth.signOut();
    console.log('✅ 로그아웃 완료');

    console.log('\n🎉 시스템 최고 운영자 계정 설정 완료!');
    console.log('');
    console.log('📋 계정 정보:');
    console.log(`📧 이메일: ${ownerEmail}`);
    console.log(`🔑 비밀번호: ${ownerPassword}`);
    console.log('👑 권한: 시스템 최고 관리자 (모든 권한)');
    console.log('🌐 로그인 페이지: http://localhost:3000/login');
    console.log('');
    console.log('🔒 보안 권장사항:');
    console.log('- 로그인 후 비밀번호 변경을 권장합니다');
    console.log('- 2단계 인증 설정을 고려해보세요');
    console.log('- 정기적으로 계정 활동을 모니터링하세요');

    return true;

  } catch (error) {
    console.error('❌ 오류:', error);
    return false;
  }
}

createOwnerAdmin()
  .then((success) => {
    if (success) {
      console.log('\n✅ 시스템 최고 운영자 계정 설정이 완료되었습니다!');
      console.log('이제 웹 브라우저에서 로그인하여 시스템을 관리할 수 있습니다.');
    } else {
      console.log('\n💥 계정 설정에 실패했습니다.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 