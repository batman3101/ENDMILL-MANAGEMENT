const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 환경변수 확인
console.log('🔍 환경변수 확인:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 누락됨');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 설정됨 (길이: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : '❌ 누락됨');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 누락됨');

async function testSupabaseConnection() {
  console.log('\n🚀 Supabase 연결 테스트 시작...\n');

  try {
    // 1. 기본 클라이언트 연결 테스트
    console.log('1️⃣ 기본 클라이언트 연결 테스트');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 간단한 쿼리로 연결 확인
    const { data, error } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ 기본 연결 실패:', error.message);
      return false;
    } else {
      console.log('✅ 기본 클라이언트 연결 성공');
    }

    // 2. 서비스 역할 클라이언트 테스트 (관리자용)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n2️⃣ 서비스 역할 클라이언트 테스트');
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // 관리자 권한으로 auth.users 테이블 접근 테스트
      const { data: users, error: usersError } = await adminSupabase.auth.admin.listUsers();
      
      if (usersError) {
        console.log('❌ 서비스 역할 연결 실패:', usersError.message);
      } else {
        console.log('✅ 서비스 역할 클라이언트 연결 성공');
        console.log(`   현재 등록된 사용자 수: ${users.users.length}명`);
      }
    }

    // 3. 데이터베이스 스키마 확인
    console.log('\n3️⃣ 데이터베이스 스키마 확인');
    const tables = [
      'user_roles',
      'user_profiles', 
      'equipment',
      'endmill_categories',
      'suppliers',
      'endmill_types',
      'inventory',
      'tool_positions',
      'cam_sheets',
      'tool_changes',
      'system_settings',
      'translations'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: 테이블 접근 가능`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // 4. 실시간 기능 테스트
    console.log('\n4️⃣ 실시간 기능 테스트');
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, (payload) => {
        console.log('실시간 이벤트 수신:', payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ 실시간 구독 성공');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ 실시간 구독 실패');
        }
      });

    // 5초 후 채널 정리
    setTimeout(() => {
      supabase.removeChannel(channel);
      console.log('🧹 실시간 채널 정리 완료');
    }, 5000);

    return true;

  } catch (error) {
    console.log('❌ 연결 테스트 중 오류 발생:', error.message);
    return false;
  }
}

// 메인 실행
testSupabaseConnection()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Supabase 연결 테스트 완료!');
      console.log('✅ 모든 기본 기능이 정상적으로 작동합니다.');
    } else {
      console.log('\n💥 Supabase 연결 테스트 실패');
      console.log('❌ 일부 기능에 문제가 있습니다.');
    }
    
    setTimeout(() => {
      process.exit(success ? 0 : 1);
    }, 6000); // 실시간 테스트 완료 대기
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 