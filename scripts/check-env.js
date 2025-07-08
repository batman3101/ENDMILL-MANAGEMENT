require('dotenv').config({ path: '.env.local' });

console.log('🔍 환경변수 확인\n');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}:`);
    console.log(`   길이: ${value.length} 문자`);
    console.log(`   시작: ${value.substring(0, 20)}...`);
    console.log(`   끝: ...${value.substring(value.length - 20)}`);
    console.log('');
  } else {
    console.log(`❌ ${varName}: 누락됨`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log('🎉 모든 필수 환경변수가 설정되어 있습니다!');
} else {
  console.log('💥 일부 환경변수가 누락되었습니다.');
}

// Supabase URL 형식 확인
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url) {
  if (url.includes('.supabase.co')) {
    console.log('✅ Supabase URL 형식이 올바릅니다.');
  } else {
    console.log('⚠️  Supabase URL 형식을 확인해주세요.');
  }
} 