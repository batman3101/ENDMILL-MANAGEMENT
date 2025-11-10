/**
 * Supabase에서 orphaned auth users 정리
 * user_profiles에는 없지만 auth.users에만 남아있는 사용자 삭제
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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupOrphanedUsers() {
  console.log('🔍 orphaned auth users 검색 중...\n')

  // 1. user_profiles에 있는 모든 user_id 가져오기
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id')

  if (profilesError) {
    console.error('❌ user_profiles 조회 실패:', profilesError)
    return
  }

  const validUserIds = new Set(
    profiles
      .filter(p => p.user_id)
      .map(p => p.user_id)
  )

  console.log(`✅ user_profiles에 ${validUserIds.size}명의 사용자 존재\n`)

  // 2. auth.users에서 모든 사용자 가져오기
  const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers()

  if (authError || !authUsersData) {
    console.error('❌ auth.users 조회 실패:', authError)
    return
  }

  console.log(`📋 auth.users에 ${authUsersData.users.length}명의 사용자 존재\n`)

  // 3. orphaned users 찾기
  const orphanedUsers = authUsersData.users.filter(
    authUser => !validUserIds.has(authUser.id)
  )

  if (orphanedUsers.length === 0) {
    console.log('✅ orphaned users 없음')
    return
  }

  console.log(`⚠️  ${orphanedUsers.length}명의 orphaned users 발견:\n`)

  orphanedUsers.forEach((user, index) => {
    console.log(`${index + 1}. Email: ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Created: ${user.created_at}`)
    console.log('')
  })

  // 4. 삭제 확인
  console.log('🗑️  orphaned users 삭제 중...\n')

  let successCount = 0
  let failCount = 0

  for (const user of orphanedUsers) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error(`❌ 삭제 실패: ${user.email} - ${deleteError.message}`)
      failCount++
    } else {
      console.log(`✅ 삭제 성공: ${user.email}`)
      successCount++
    }
  }

  console.log(`\n📊 결과:`)
  console.log(`  - 성공: ${successCount}명`)
  console.log(`  - 실패: ${failCount}명`)
}

// 실행
cleanupOrphanedUsers()
  .then(() => {
    console.log('\n✅ 정리 완료')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error)
    process.exit(1)
  })
