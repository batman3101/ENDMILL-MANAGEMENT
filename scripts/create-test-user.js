const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createTestUser() {
  console.log('👤 테스트 사용자 생성 시작...\n');

  const supabase = createClient(
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
    // 1. 기본 역할들이 존재하는지 확인
    console.log('1️⃣ 시스템 역할 확인 및 생성');
    
    const defaultRoles = [
      {
        id: 'role-system-admin',
        name: '시스템 관리자',
        type: 'system_admin',
        description: '시스템 전체 관리 권한',
        permissions: {
          dashboard: ['create', 'read', 'update', 'delete', 'manage'],
          equipment: ['create', 'read', 'update', 'delete', 'manage'],
          endmill: ['create', 'read', 'update', 'delete', 'manage'],
          inventory: ['create', 'read', 'update', 'delete', 'manage'],
          camSheets: ['create', 'read', 'update', 'delete', 'manage'],
          toolChanges: ['create', 'read', 'update', 'delete', 'manage'],
          reports: ['create', 'read', 'update', 'delete', 'manage'],
          settings: ['create', 'read', 'update', 'delete', 'manage'],
          users: ['create', 'read', 'update', 'delete', 'manage']
        },
        is_system_role: true,
        is_active: true
      },
      {
        id: 'role-admin',
        name: '관리자',
        type: 'admin',
        description: '관리 권한',
        permissions: {
          dashboard: ['read', 'update'],
          equipment: ['create', 'read', 'update', 'delete'],
          endmill: ['create', 'read', 'update', 'delete'],
          inventory: ['create', 'read', 'update', 'delete'],
          camSheets: ['create', 'read', 'update', 'delete'],
          toolChanges: ['create', 'read', 'update', 'delete'],
          reports: ['read', 'create'],
          settings: ['read', 'update'],
          users: ['read', 'update']
        },
        is_system_role: true,
        is_active: true
      },
      {
        id: 'role-user',
        name: '일반 사용자',
        type: 'user',
        description: '기본 사용자 권한',
        permissions: {
          dashboard: ['read'],
          equipment: ['read'],
          endmill: ['read'],
          inventory: ['read'],
          camSheets: ['read'],
          toolChanges: ['create', 'read'],
          reports: ['read'],
          settings: ['read'],
          users: ['read']
        },
        is_system_role: true,
        is_active: true
      }
    ];

    for (const role of defaultRoles) {
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('id', role.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // 역할이 존재하지 않으면 생성
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(role);

        if (insertError) {
          console.log(`❌ 역할 생성 실패 (${role.name}):`, insertError.message);
        } else {
          console.log(`✅ 역할 생성 성공: ${role.name}`);
        }
      } else {
        console.log(`✅ 역할 이미 존재: ${role.name}`);
      }
    }

    // 2. 테스트 사용자 생성
    console.log('\n2️⃣ 테스트 사용자 생성');
    
    const testUsers = [
      {
        email: 'admin@almustech.com',
        password: 'admin123',
        name: '시스템 관리자',
        employeeId: 'ADM001',
        department: '종합관리실',
        position: '시스템 관리자',
        roleId: 'role-system-admin',
        shift: 'A'
      },
      {
        email: 'manager@almustech.com', 
        password: 'manager123',
        name: '공구관리실장',
        employeeId: 'MGR001',
        department: '공구관리실',
        position: '실장',
        roleId: 'role-admin',
        shift: 'A'
      },
      {
        email: 'operator@almustech.com',
        password: 'operator123', 
        name: '작업자',
        employeeId: 'OPR001',
        department: '기술팀',
        position: '기술자',
        roleId: 'role-user',
        shift: 'B'
      }
    ];

    for (const userData of testUsers) {
      try {
        // 사용자 생성
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            employeeId: userData.employeeId,
            department: userData.department,
            position: userData.position,
            shift: userData.shift
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`✅ 사용자 이미 존재: ${userData.email}`);
          } else {
            console.log(`❌ 사용자 생성 실패 (${userData.email}):`, authError.message);
          }
          continue;
        }

        console.log(`✅ 사용자 생성 성공: ${userData.email}`);

        // user_profiles 테이블에 추가 정보 저장
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: authData.user.id,
            email: userData.email,
            name: userData.name,
            employee_id: userData.employeeId,
            department: userData.department,
            position: userData.position,
            role_id: userData.roleId,
            shift: userData.shift,
            is_active: true
          });

        if (profileError) {
          console.log(`❌ 프로필 저장 실패 (${userData.email}):`, profileError.message);
        } else {
          console.log(`✅ 프로필 저장 성공: ${userData.email}`);
        }

      } catch (error) {
        console.log(`❌ 사용자 생성 중 오류 (${userData.email}):`, error.message);
      }
    }

    // 3. 생성된 사용자 확인
    console.log('\n3️⃣ 생성된 사용자 확인');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ 사용자 목록 조회 실패:', usersError.message);
    } else {
      console.log(`✅ 총 등록된 사용자: ${users.users.length}명`);
      users.users.forEach(user => {
        console.log(`   - ${user.email} (생성일: ${new Date(user.created_at).toLocaleDateString()})`);
      });
    }

    // 4. 프로필 정보 확인
    console.log('\n4️⃣ 사용자 프로필 정보 확인');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select(`
        email,
        name,
        employee_id,
        department,
        position,
        shift,
        is_active,
        user_roles (
          name,
          type
        )
      `);

    if (profilesError) {
      console.log('❌ 프로필 조회 실패:', profilesError.message);
    } else {
      console.log(`✅ 프로필 정보 조회 성공 (${profiles.length}명)`);
      profiles.forEach(profile => {
        console.log(`   - ${profile.name} (${profile.email})`);
        console.log(`     사번: ${profile.employee_id}, 부서: ${profile.department}`);
        console.log(`     역할: ${profile.user_roles?.name || '미설정'}, 교대: ${profile.shift}`);
        console.log(`     상태: ${profile.is_active ? '활성' : '비활성'}\n`);
      });
    }

    console.log('🎉 테스트 사용자 생성 완료!');
    console.log('\n📋 로그인 정보:');
    console.log('1. 시스템 관리자: admin@almustech.com / admin123');
    console.log('2. 관리자: manager@almustech.com / manager123');
    console.log('3. 일반 사용자: operator@almustech.com / operator123');

  } catch (error) {
    console.error('❌ 테스트 사용자 생성 중 오류:', error);
  }
}

createTestUser()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 