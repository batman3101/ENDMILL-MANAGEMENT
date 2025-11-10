/**
 * 특정 이메일로 가입 테스트
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

const testEmail = process.argv[2] || 'tranluong2106986@gmail.com'
const testPassword = 'Test123!@#'

async function testEmailSignup() {
  console.log(`🧪 "${testEmail}" 가입 테스트 중...\n`)

  // 1. 먼저 이메일이 존재하는지 확인
  console.log('1️⃣ 기존 사용자 확인 중...')
  const { data: users } = await supabase.auth.admin.listUsers()
  const existingUser = users?.users.find(u => u.email === testEmail)

  if (existingUser) {
    console.log(`⚠️  이미 존재하는 사용자 발견:`)
    console.log(`   ID: ${existingUser.id}`)
    console.log(`   Email: ${existingUser.email}`)
    console.log(`   Created: ${existingUser.created_at}`)
    console.log(`   Banned: ${existingUser.banned_until || 'No'}`)
    console.log('')

    // 삭제 시도
    console.log('🗑️  기존 사용자 삭제 시도...')
    const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)

    if (deleteError) {
      console.error('❌ 삭제 실패:', deleteError.message)
      console.log('\n관련 데이터 확인 필요')
      return
    }
    console.log('✅ 기존 사용자 삭제 완료\n')
  } else {
    console.log('✅ 이메일 사용 가능\n')
  }

  // 2. Admin API로 가입 시도
  console.log('2️⃣ Admin API로 사용자 생성 시도...')
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      name: 'Test User'
    }
  })

  if (createError) {
    console.error('❌ Admin API 생성 실패:', createError.message)
    console.error('   상세:', JSON.stringify(createError, null, 2))

    // Supabase 설정 확인 필요
    console.log('\n📋 확인 사항:')
    console.log('   1. Supabase Dashboard > Authentication > Settings')
    console.log('   2. "Enable email confirmations" 설정 확인')
    console.log('   3. "Banned emails" 목록 확인')
    console.log('   4. Email provider 설정 확인')
    return
  }

  console.log('✅ Admin API 생성 성공!')
  console.log(`   User ID: ${createData.user?.id}`)
  console.log('')

  // 3. 일반 signUp으로 시도 (클라이언트가 사용하는 방식)
  console.log('3️⃣ 일반 signUp으로 테스트 (다른 이메일로)...')
  const testEmail2 = testEmail.replace('@', '+test@')

  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail2,
    password: testPassword
  })

  if (signupError) {
    console.error('❌ 일반 signUp 실패:', signupError.message)
    console.error('   상세:', JSON.stringify(signupError, null, 2))
  } else {
    console.log('✅ 일반 signUp 성공!')
    console.log(`   User ID: ${signupData.user?.id}`)

    // 생성된 테스트 사용자 삭제
    if (signupData.user) {
      await supabase.auth.admin.deleteUser(signupData.user.id)
      console.log('   (테스트 사용자 삭제됨)')
    }
  }

  // 생성한 사용자 삭제
  if (createData.user) {
    console.log('\n🗑️  테스트 사용자 삭제 중...')
    await supabase.auth.admin.deleteUser(createData.user.id)
    console.log('✅ 테스트 사용자 삭제 완료')
  }
}

// 실행
testEmailSignup()
  .then(() => {
    console.log('\n✅ 테스트 완료')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ 에러 발생:', error)
    process.exit(1)
  })
