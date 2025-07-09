require('dotenv').config({ path: '.env.local' })

console.log('🔍 환경변수 디버깅...')

console.log('\n📋 환경변수 상세 정보:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY 길이:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length)
console.log('SUPABASE_SERVICE_ROLE_KEY 길이:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length)

console.log('\n🔍 .env.local 파일 경로 확인:')
console.log('현재 작업 디렉토리:', process.cwd())

console.log('\n📝 실제 환경변수 값 (마스킹):')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (url) {
  console.log('URL 시작:', url.substring(0, 20) + '...')
  console.log('URL 끝:', '...' + url.substring(url.length - 20))
}

if (anonKey) {
  console.log('ANON_KEY 시작:', anonKey.substring(0, 20) + '...')
  console.log('ANON_KEY 끝:', '...' + anonKey.substring(anonKey.length - 20))
}

if (serviceKey) {
  console.log('SERVICE_KEY 시작:', serviceKey.substring(0, 20) + '...')
  console.log('SERVICE_KEY 끝:', '...' + serviceKey.substring(serviceKey.length - 20))
} 