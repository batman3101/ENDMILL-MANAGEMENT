const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function simpleSupabaseTest() {
  console.log('🔍 Supabase 기본 연결 테스트\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

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
    // 1. 기본 연결 테스트
    console.log('1️⃣ 기본 연결 테스트');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('_dummy_table_that_does_not_exist')
      .select('*')
      .limit(1);

    if (connectionError && connectionError.message.includes('relation "_dummy_table_that_does_not_exist" does not exist')) {
      console.log('✅ Supabase 연결 성공 (테이블 없음 오류는 정상)');
    } else {
      console.log('❌ 예상치 못한 응답:', connectionError?.message || 'Unknown');
    }

    // 2. 스키마 정보 확인
    console.log('\n2️⃣ 현재 데이터베이스 스키마 확인');
    const { data: tables, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tableError) {
      console.log('❌ 테이블 정보 조회 실패:', tableError.message);
    } else {
      console.log(`✅ public 스키마의 테이블 (${tables.length}개):`);
      if (tables.length === 0) {
        console.log('   📝 테이블이 없습니다. 스키마를 먼저 생성해야 합니다.');
      } else {
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
      }
    }

    // 3. Auth 기능 테스트 (간단한 사용자 생성)
    console.log('\n3️⃣ Auth 기능 테스트');
    
    const testEmail = 'test@example.com';
    const testPassword = 'test123456';

    // 기존 테스트 사용자 삭제 시도
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === testEmail);
    
    if (existingUser) {
      console.log('🗑️  기존 테스트 사용자 삭제 중...');
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    // 새 테스트 사용자 생성
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
        role: 'user'
      }
    });

    if (createError) {
      console.log('❌ 테스트 사용자 생성 실패:', createError.message);
    } else {
      console.log('✅ 테스트 사용자 생성 성공:', createData.user.email);

      // 로그인 테스트
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (loginError) {
        console.log('❌ 로그인 테스트 실패:', loginError.message);
      } else {
        console.log('✅ 로그인 테스트 성공');
        
        // 로그아웃
        await supabase.auth.signOut();
        console.log('✅ 로그아웃 완료');
      }

      // 테스트 사용자 삭제
      await supabaseAdmin.auth.admin.deleteUser(createData.user.id);
      console.log('🗑️  테스트 사용자 삭제 완료');
    }

    // 4. 현재 사용자 목록
    console.log('\n4️⃣ 현재 등록된 사용자 목록');
    const { data: allUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ 사용자 목록 조회 실패:', usersError.message);
    } else {
      console.log(`✅ 등록된 사용자: ${allUsers.users.length}명`);
      allUsers.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (생성: ${new Date(user.created_at).toLocaleDateString()})`);
      });
    }

    return true;

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
    return false;
  }
}

simpleSupabaseTest()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Supabase 기본 테스트 완료!');
      console.log('\n📋 다음 단계:');
      console.log('1. 스키마가 없다면: node scripts/apply-schema.js 실행');
      console.log('2. 관리자 계정 생성: node scripts/create-admin-via-supabase.js 실행');
      console.log('3. 웹 애플리케이션에서 로그인 테스트');
    } else {
      console.log('\n💥 테스트 실패');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 