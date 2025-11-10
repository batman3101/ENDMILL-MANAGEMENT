/**
 * 특정 이메일 주소로 사용자 검색
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const targetEmail = process.argv[2] || 'tranluong2106986@gmail.com'

async function findUserByEmail() {
  console.log(`🔍 "${targetEmail}" 검색 중...\n`)

  // auth.users에서 검색
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ auth.users 조회 실패:', authError)
    return
  }

  const authUser = authUsers.users.find(u => u.email === targetEmail)

  if (authUser) {
    console.log('✅ auth.users에서 발견:')
    console.log(`   User ID: ${authUser.id}`)
    console.log(`   Email: ${authUser.email}`)
    console.log(`   Created: ${authUser.created_at}`)
    console.log(`   Last Sign In: ${authUser.last_sign_in_at}`)
    console.log('')

    // user_profiles에서 확인
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (profile) {
      console.log('✅ user_profiles에서도 발견:')
      console.log(`   Profile ID: ${profile.id}`)
      console.log(`   Name: ${profile.name}`)
      console.log(`   Employee ID: ${profile.employee_id}`)
      console.log('')
    } else {
      console.log('⚠️  user_profiles에는 없음 (orphaned user)')
      console.log('')

      // 삭제 시도
      console.log('🗑️  삭제 시도 중...')
      const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id)

      if (deleteError) {
        console.error('❌ 삭제 실패:', deleteError.message)

        // 관련 데이터 확인
        console.log('\n🔍 관련 데이터 확인 중...')

        // tool_changes 확인
        const { data: toolChanges } = await supabase
          .from('tool_changes')
          .select('id')
          .eq('changed_by', authUser.id)
          .limit(5)

        if (toolChanges && toolChanges.length > 0) {
          console.log(`   - tool_changes: ${toolChanges.length}개 레코드 발견`)
        }
      } else {
        console.log('✅ 삭제 성공!')
      }
    }
  } else {
    console.log(`❌ "${targetEmail}"을 찾을 수 없습니다.`)
    console.log('   이미 삭제되었거나 존재하지 않습니다.')
  }
}

// 실행
findUserByEmail()
  .then(() => {
    console.log('\n✅ 검색 완료')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error)
    process.exit(1)
  })
