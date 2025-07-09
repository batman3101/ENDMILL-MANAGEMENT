const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkTableStructure() {
  try {
    console.log('🔍 데이터베이스 테이블 구조 상세 확인...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('환경변수가 설정되지 않았습니다');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 주요 테이블의 컬럼 구조 확인 (샘플 데이터로)
    const tables = [
      'user_roles',
      'user_profiles', 
      'equipment',
      'endmill_categories',
      'endmill_types',
      'suppliers',
      'inventory',
      'cam_sheets',
      'tool_changes'
    ];

    for (const tableName of tables) {
      console.log(`📋 ${tableName} 테이블:`);
      
      // 첫 번째 행 조회로 컬럼 구조 확인
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`   ❌ 조회 실패: ${error.message}`);
      } else {
        console.log(`   📈 총 데이터 수: ${count || 0}개`);
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   📊 컬럼 수: ${columns.length}`);
          console.log(`   📝 컬럼 목록: ${columns.join(', ')}`);
        } else {
          console.log(`   📝 데이터가 없어 컬럼 구조를 확인할 수 없습니다`);
        }
      }
      console.log('');
    }

    // Equipment 테이블 샘플 데이터 확인
    console.log('🔧 Equipment 테이블 샘플:');
    const { data: equipmentSample } = await supabase
      .from('equipment')
      .select('*')
      .limit(1);
    
    if (equipmentSample && equipmentSample.length > 0) {
      console.log('   샘플 데이터:', JSON.stringify(equipmentSample[0], null, 2));
    }
    console.log('');

    // Inventory 테이블 샘플 데이터 확인
    console.log('📦 Inventory 테이블 샘플:');
    const { data: inventorySample } = await supabase
      .from('inventory')
      .select('*')
      .limit(1);
    
    if (inventorySample && inventorySample.length > 0) {
      console.log('   샘플 데이터:', JSON.stringify(inventorySample[0], null, 2));
    }
    console.log('');

    // User Profiles 테이블 샘플 데이터 확인
    console.log('👤 User Profiles 테이블 샘플:');
    const { data: userSample } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (userSample && userSample.length > 0) {
      console.log('   샘플 데이터:', JSON.stringify(userSample[0], null, 2));
    }

    console.log('\n✅ 테이블 구조 확인 완료');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

checkTableStructure(); 