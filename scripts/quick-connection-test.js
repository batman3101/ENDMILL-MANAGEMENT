const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function quickTest() {
  console.log('🔍 빠른 연결 테스트...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('📋 환경변수 확인:')
  console.log('- URL:', supabaseUrl ? '✅ 설정됨' : '❌ 없음')
  console.log('- ANON_KEY:', supabaseKey ? '✅ 설정됨' : '❌ 없음')
  console.log('- SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ 설정됨' : '❌ 없음')

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ 필수 환경변수가 없습니다.')
    return
  }

  try {
    // 기본 클라이언트로 테스트
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase 클라이언트 생성 성공')

    // 서비스 역할 키로 테스트
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey)
      console.log('✅ 관리자 클라이언트 생성 성공')
      
      // 간단한 쿼리 테스트
      const { data, error } = await adminClient.from('information_schema.tables').select('table_name').limit(5)
      
      if (error) {
        console.log('❌ 테이블 조회 실패:', error.message)
      } else {
        console.log('✅ 테이블 조회 성공:', data?.length || 0, '개')
      }
    }

  } catch (error) {
    console.log('❌ 연결 테스트 실패:', error.message)
  }
}

quickTest() 