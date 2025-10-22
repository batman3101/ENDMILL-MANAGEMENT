/**
 * Gemini API 테스트 스크립트
 *
 * 사용법:
 * node scripts/test-gemini.js
 */

require('dotenv').config({ path: '.env.local' })
const { GoogleGenerativeAI } = require('@google/generative-ai')

async function testGeminiAPI() {
  console.log('🤖 Gemini API 연결 테스트 시작...\n')

  // API 키 확인
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ 오류: GEMINI_API_KEY가 설정되지 않았습니다.')
    console.log('\n📝 다음 단계를 따라주세요:')
    console.log('1. https://aistudio.google.com/app/apikey 접속')
    console.log('2. "Create API Key" 버튼 클릭')
    console.log('3. 생성된 API 키 복사')
    console.log('4. .env.local 파일에서 GEMINI_API_KEY 값 수정')
    console.log('5. 다시 이 스크립트 실행\n')
    process.exit(1)
  }

  console.log('✅ API 키 확인 완료\n')

  try {
    // Gemini API 클라이언트 초기화
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-pro' })

    console.log(`📡 모델: ${process.env.GEMINI_MODEL || 'gemini-1.5-pro'}`)
    console.log('🔄 테스트 요청 전송 중...\n')

    // 간단한 테스트 요청
    const prompt = '안녕하세요! Gemini API 테스트입니다. 간단히 인사해주세요.'
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    console.log('✅ 응답 수신 성공!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📩 요청: ', prompt)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🤖 응답:', text)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // SQL 생성 테스트
    console.log('🔄 SQL 생성 테스트 중...\n')
    const sqlPrompt = `
당신은 SQL 쿼리 생성 전문가입니다.
다음 질문을 PostgreSQL 쿼리로 변환하세요.

테이블 스키마:
- tool_changes 테이블
  - change_date: DATE (교체 날짜)
  - change_reason: TEXT (교체 사유: '수명완료', '파손', '마모' 등)
  - model: TEXT (장비 모델)

질문: "최근 한달간 파손이 가장 많았던 모델은?"

순수 SQL만 반환하세요 (설명 없이):
`

    const sqlResult = await model.generateContent(sqlPrompt)
    const sqlText = sqlResult.response.text()

    console.log('✅ SQL 생성 성공!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 생성된 SQL:')
    console.log(sqlText)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('🎉 모든 테스트 통과!')
    console.log('✅ Gemini API가 정상적으로 작동합니다.\n')

  } catch (error) {
    console.error('\n❌ 테스트 실패:')

    if (error.message?.includes('API_KEY_INVALID')) {
      console.error('→ API 키가 유효하지 않습니다.')
      console.error('→ https://aistudio.google.com/app/apikey 에서 새 키를 발급받으세요.')
    } else if (error.message?.includes('quota')) {
      console.error('→ API 할당량이 초과되었습니다.')
      console.error('→ Google AI Studio에서 할당량을 확인하세요.')
    } else {
      console.error('→', error.message)
    }

    console.error('\n상세 오류:', error)
    process.exit(1)
  }
}

// 실행
testGeminiAPI()
