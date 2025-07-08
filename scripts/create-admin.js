const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

// 환경변수에서 Supabase 설정 읽기
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // 서비스 역할 키 필요

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase URL 또는 Service Role Key가 설정되지 않았습니다.')
  console.log('📝 .env.local 파일에 다음 변수들을 설정해주세요:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

// 서비스 역할을 사용하는 Supabase 클라이언트
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function createAdminUser() {
  console.log('🔧 CNC 앤드밀 관리 시스템 - 관리자 계정 생성')
  console.log('================================================')
  
  try {
    const email = await askQuestion('📧 관리자 이메일: ')
    const password = await askQuestion('🔒 비밀번호 (최소 6자): ')
    const name = await askQuestion('👤 관리자 이름: ')
    const employeeId = await askQuestion('🆔 사번: ')
    
    console.log('\n⏳ 관리자 계정을 생성하는 중...')
    
    // 관리자 사용자 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // 이메일 인증 자동 완료
      user_metadata: {
        name: name,
        employeeId: employeeId,
        department: '종합관리실',
        position: '시스템 관리자',
        shift: 'A',
        isActive: true,
        role: 'system_admin',
        createdBy: 'setup_script',
        createdAt: new Date().toISOString()
      }
    })

    if (error) {
      console.error('❌ 관리자 계정 생성 실패:', error.message)
      
      if (error.message.includes('already registered')) {
        console.log('💡 이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.')
      }
    } else {
      console.log('✅ 관리자 계정이 성공적으로 생성되었습니다!')
      console.log(`📧 이메일: ${data.user?.email}`)
      console.log(`🆔 사용자 ID: ${data.user?.id}`)
      console.log('\n🎉 이제 로그인 페이지에서 생성한 계정으로 로그인할 수 있습니다.')
      console.log('🌐 http://localhost:3000/login')
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message)
  } finally {
    rl.close()
  }
}

// 기본 관리자 계정 생성 (자동)
async function createDefaultAdmin() {
  console.log('🔧 기본 관리자 계정 생성 중...')
  
  const defaultAdmin = {
    email: 'admin@almustech.com',
    password: 'admin123!',
    name: '시스템 관리자',
    employeeId: 'ADMIN001'
  }
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: defaultAdmin.email,
      password: defaultAdmin.password,
      email_confirm: true,
      user_metadata: {
        name: defaultAdmin.name,
        employeeId: defaultAdmin.employeeId,
        department: '종합관리실',
        position: '시스템 관리자',
        shift: 'A',
        isActive: true,
        role: 'system_admin',
        createdBy: 'setup_script',
        createdAt: new Date().toISOString()
      }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ 기본 관리자 계정이 이미 존재합니다.')
        console.log(`📧 이메일: ${defaultAdmin.email}`)
        console.log(`🔒 비밀번호: ${defaultAdmin.password}`)
      } else {
        console.error('❌ 기본 관리자 계정 생성 실패:', error.message)
      }
    } else {
      console.log('✅ 기본 관리자 계정이 생성되었습니다!')
      console.log(`📧 이메일: ${defaultAdmin.email}`)
      console.log(`🔒 비밀번호: ${defaultAdmin.password}`)
      console.log(`🆔 사용자 ID: ${data.user?.id}`)
      console.log('\n⚠️  보안을 위해 로그인 후 비밀번호를 변경해주세요.')
    }
    
    console.log('\n🌐 로그인 페이지: http://localhost:3000/login')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message)
  }
}

// 명령행 인수 확인
const args = process.argv.slice(2)

if (args.includes('--default')) {
  createDefaultAdmin()
} else {
  createAdminUser()
} 