const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nzbhybxssbvbqwxzjrcmt.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56Ymh5Ynhzc2J2YnF3eHpqcmNtdCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzQ2Nzc4NjMsImV4cCI6MjA1MDI1Mzg2M30.PGxWtNBGjN8hdKPO9FLTXcElf1L5WX7UDBHQZ2FhJGo';

async function checkActualUser() {
  console.log('🔍 실제 사용자 상태 확인...\n');
  
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // 1. Auth 사용자 목록 확인
    console.log('1️⃣ Auth 사용자 확인:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth 사용자 조회 실패:', authError);
      return;
    }
    
    const targetUser = authUsers.users.find(user => user.email === 'zetooo1972@gmail.com');
    
    if (!targetUser) {
      console.log('❌ zetooo1972@gmail.com 사용자가 auth.users에 존재하지 않습니다!');
      console.log('📋 현재 등록된 사용자들:');
      authUsers.users.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
      return;
    }
    
    console.log('✅ 사용자 발견:', {
      id: targetUser.id,
      email: targetUser.email,
      created_at: targetUser.created_at,
      email_confirmed_at: targetUser.email_confirmed_at,
      last_sign_in_at: targetUser.last_sign_in_at,
      is_email_confirmed: !!targetUser.email_confirmed_at,
      user_metadata: targetUser.user_metadata
    });
    
    // 2. 사용자 프로필 확인
    console.log('\n2️⃣ 사용자 프로필 확인:');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', targetUser.id);
    
    if (profileError) {
      console.error('❌ 프로필 조회 실패:', profileError);
    } else if (profiles && profiles.length > 0) {
      console.log('✅ 프로필 발견:', profiles[0]);
    } else {
      console.log('⚠️ 프로필이 존재하지 않습니다');
    }
    
    // 3. 역할 확인
    console.log('\n3️⃣ 역할 정보 확인:');
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('*');
    
    if (roleError) {
      console.error('❌ 역할 조회 실패:', roleError);
    } else {
      console.log('📋 사용 가능한 역할들:');
      roles.forEach(role => {
        console.log(`   - ${role.name} (${role.type}) - ID: ${role.id}`);
      });
    }
    
    // 4. 로그인 테스트
    console.log('\n4️⃣ 실제 로그인 테스트:');
    const clientSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56Ymh5Ynhzc2J2YnF3eHpqcmNtdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0Njc3ODYzLCJleHAiOjIwNTAyNTM4NjN9.eQGz9v-LPUy4hllmrI0NRUJVSk52CQnJWnWgJQYoJD8');
    
    const { data: loginData, error: loginError } = await clientSupabase.auth.signInWithPassword({
      email: 'zetooo1972@gmail.com',
      password: 'youkillme-1'
    });
    
    if (loginError) {
      console.error('❌ 로그인 테스트 실패:', {
        message: loginError.message,
        status: loginError.status,
        details: loginError
      });
      
      // 비밀번호 재설정 시도
      console.log('\n🔄 비밀번호 재설정 시도...');
      const resetResult = await supabase.auth.admin.updateUserById(targetUser.id, {
        password: 'youkillme-1'
      });
      
      if (resetResult.error) {
        console.error('❌ 비밀번호 재설정 실패:', resetResult.error);
      } else {
        console.log('✅ 비밀번호 재설정 성공');
        
        // 재설정 후 다시 로그인 테스트
        console.log('🔄 재설정 후 로그인 재시도...');
        const { data: retryLogin, error: retryError } = await clientSupabase.auth.signInWithPassword({
          email: 'zetooo1972@gmail.com',
          password: 'youkillme-1'
        });
        
        if (retryError) {
          console.error('❌ 재시도 로그인 실패:', retryError);
        } else {
          console.log('✅ 재시도 로그인 성공!', {
            user_id: retryLogin.user?.id,
            email: retryLogin.user?.email
          });
        }
      }
    } else {
      console.log('✅ 로그인 테스트 성공!', {
        user_id: loginData.user?.id,
        email: loginData.user?.email,
        session_expires_at: loginData.session?.expires_at
      });
    }
    
  } catch (error) {
    console.error('💥 전체 프로세스 실패:', error);
  }
}

checkActualUser(); 