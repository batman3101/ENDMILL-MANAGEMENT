const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testActualTables() {
  console.log('🔍 실제 테이블 구조 확인...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('❌ 필수 환경변수가 없습니다.')
    return
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    console.log('✅ 서비스 역할 클라이언트 생성 성공')

    // 우리 스키마의 주요 테이블들 확인
    const testTables = [
      'user_roles',
      'user_profiles', 
      'equipment',
      'endmill_categories',
      'endmill_types',
      'suppliers',
      'inventory',
      'cam_sheets',
      'tool_changes'
    ]

    console.log('\n📋 주요 테이블 존재 여부 확인:')
    
    for (const tableName of testTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`)
        } else {
          console.log(`✅ ${tableName}: ${count !== null ? count + '개 행' : '존재함'}`)
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`)
      }
    }

    // auth.users 테이블 확인
    console.log('\n🔐 Auth 사용자 확인:')
    try {
      const { data: users, error } = await supabase.auth.admin.listUsers()
      if (error) {
        console.log('❌ Auth 사용자 조회 실패:', error.message)
      } else {
        console.log(`✅ Auth 사용자: ${users.users.length}명`)
      }
    } catch (err) {
      console.log('❌ Auth 사용자 조회 에러:', err.message)
    }

  } catch (error) {
    console.log('❌ 전체 테스트 실패:', error.message)
  }
}

testActualTables() 