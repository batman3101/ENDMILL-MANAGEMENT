/**
 * Gemini Service
 * Google Gemini API와의 통신을 담당하는 서비스
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Gemini 응답 타입
export interface GeminiResponse {
  text: string
  tokensUsed?: number
  responseTimeMs?: number
}

// SQL 생성 응답 타입
export interface SQLGenerationResponse {
  sql: string
  explanation?: string
}

// 인사이트 타입
export interface Insight {
  title: string
  summary: string
  priority: 'high' | 'medium' | 'low'
  category: string
  data?: any
}

class GeminiService {
  private client: GoogleGenerativeAI
  private model: GenerativeModel
  private modelName: string

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not configured in environment variables')
    }

    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro'
    this.client = new GoogleGenerativeAI(apiKey)
    this.model = this.client.getGenerativeModel({ model: this.modelName })
  }

  /**
   * 일반 텍스트 생성
   */
  async generateContent(prompt: string): Promise<GeminiResponse> {
    const startTime = Date.now()

    try {
      const result = await this.model.generateContent(prompt)
      const response = result.response
      const text = response.text()
      const responseTimeMs = Date.now() - startTime

      return {
        text,
        responseTimeMs,
      }
    } catch (error: any) {
      console.error('Gemini API Error:', error)
      throw new Error(`Gemini API request failed: ${error.message}`)
    }
  }

  /**
   * 자연어를 SQL 쿼리로 변환
   */
  async generateSQLFromNaturalLanguage(
    question: string,
    schemaContext: string,
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<SQLGenerationResponse> {
    // 대화 히스토리를 프롬프트에 포함
    let historyContext = ''
    if (chatHistory.length > 0) {
      historyContext = '\n## 이전 대화 내역\n'
      chatHistory.forEach((item, index) => {
        const role = item.role === 'user' ? '사용자' : 'AI'
        historyContext += `${index + 1}. ${role}: ${item.content}\n`
      })
      historyContext += '\n위 대화 내용을 참고하여 현재 질문에 답변하세요.\n'
    }

    const prompt = `
당신은 PostgreSQL 전문가입니다.
사용자의 자연어 질문을 PostgreSQL 쿼리로 정확하게 변환하세요.

## 데이터베이스 스키마
${schemaContext}
${historyContext}
## 규칙
1. SELECT 쿼리만 생성하세요 (INSERT, UPDATE, DELETE 금지)
2. 위 스키마에 있는 테이블과 컬럼만 사용하세요
3. WHERE 절에 적절한 조건을 추가하세요
4. 날짜 계산은 PostgreSQL 함수를 사용하세요 (NOW(), INTERVAL 등)
5. 한국어 값은 정확히 매칭하세요 (예: '파손', '수명완료' 등)
6. **대소문자 구분 없는 비교**:
   - 카테고리, 상태, 모델명 등 텍스트 비교는 ILIKE를 사용하세요
   - 예: WHERE category ILIKE 'flat' (대소문자 구분 없음)
   - 한국어 텍스트는 = 연산자 사용 (예: WHERE reason = '파손')
7. **중요**: 순수 SQL 쿼리만 반환하세요
   - SELECT로 시작해야 합니다
   - 세미콜론(;)은 있어도 되고 없어도 됩니다
   - 설명, 주석, 헤더는 절대 포함하지 마세요
   - SQL 코드 블록(\`\`\`)도 사용하지 마세요
   - "SQL 쿼리:", "SQL:", "쿼리:" 같은 텍스트 포함 금지

## 사용자 질문
${question}

아래에 SELECT로 시작하는 SQL 쿼리만 작성하세요:
`.trim()

    const response = await this.generateContent(prompt)

    // SQL 정리
    let sql = response.text.trim()

    // 1. SQL 코드 블록 제거 (```sql ... ``` 또는 ``` ... ```)
    sql = sql.replace(/^```sql\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/, '')

    // 2. "SQL 쿼리:", "SQL:", "쿼리:" 같은 헤더 제거
    sql = sql.replace(/^(SQL\s*쿼리\s*:|SQL\s*:|쿼리\s*:)\s*/i, '')

    // 3. SELECT로 시작하는 줄 찾기 (앞에 설명이 있는 경우)
    const lines = sql.split('\n')
    const selectLineIndex = lines.findIndex(line =>
      line.trim().toUpperCase().startsWith('SELECT')
    )

    if (selectLineIndex > 0) {
      // SELECT 이전의 줄들 제거
      sql = lines.slice(selectLineIndex).join('\n')
    }

    // 4. 세미콜론 이후의 텍스트 제거 (설명이 뒤에 있는 경우)
    const semicolonIndex = sql.indexOf(';')
    if (semicolonIndex > -1) {
      sql = sql.substring(0, semicolonIndex + 1)
    }

    // 5. 최종 정리
    sql = sql.trim()

    return {
      sql,
      explanation: undefined, // 필요시 추가 프롬프트로 설명 생성
    }
  }

  /**
   * 쿼리 결과를 자연어로 설명
   */
  async explainQueryResult(question: string, data: any[]): Promise<string> {
    const dataJson = JSON.stringify(data, null, 2)

    const prompt = `
당신은 데이터 분석 전문가입니다.
사용자의 질문과 데이터베이스 쿼리 결과를 보고 명확하고 친절하게 답변하세요.

## 사용자 질문
${question}

## 쿼리 결과 데이터
${dataJson}

## 답변 규칙
1. 데이터를 분석하여 질문에 직접적으로 답변하세요
2. 한국어로 자연스럽게 설명하세요
3. 핵심 정보를 강조하세요
4. 데이터가 없으면 "해당 조건에 맞는 데이터가 없습니다"라고 답변하세요
5. 필요시 추가 인사이트나 제안을 제공하세요
6. 간결하게 2-3문장으로 답변하세요

답변:
`.trim()

    const response = await this.generateContent(prompt)
    return response.text
  }

  /**
   * 데이터에서 인사이트 발견
   */
  async analyzeDataForInsights(data: any[]): Promise<Insight[]> {
    const dataJson = JSON.stringify(data, null, 2)

    const prompt = `
당신은 데이터 분석 전문가입니다.
다음 CNC 공구 관리 데이터를 분석하여 중요한 인사이트를 발견하세요.

## 데이터
${dataJson}

## 찾아야 할 인사이트 유형
1. 비정상적인 패턴 (예: 특정 모델/공정에서 파손률 급증)
2. 재고 부족 경고
3. 비용 절감 기회
4. 효율성 개선 제안
5. 예방 조치 필요 사항

## 응답 형식 (JSON 배열)
[
  {
    "title": "인사이트 제목",
    "summary": "2-3문장 요약",
    "priority": "high|medium|low",
    "category": "파손|재고|비용|효율성|유지보수",
    "data": { 관련 데이터 }
  }
]

JSON 배열만 반환하세요:
`.trim()

    const response = await this.generateContent(prompt)

    try {
      // JSON 파싱
      let jsonText = response.text.trim()
      // 코드 블록 제거
      jsonText = jsonText.replace(/^```json\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/, '')
      const insights = JSON.parse(jsonText)
      return insights as Insight[]
    } catch (error) {
      console.error('Failed to parse insights JSON:', error)
      return []
    }
  }

  /**
   * 대화형 채팅 (히스토리 포함)
   */
  async chat(
    message: string,
    history: Array<{ role: 'user' | 'model'; parts: string }> = []
  ): Promise<string> {
    try {
      // 히스토리를 Gemini 형식으로 변환
      const chat = this.model.startChat({
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }],
        })),
      })

      const result = await chat.sendMessage(message)
      const response = result.response
      return response.text()
    } catch (error: any) {
      console.error('Gemini Chat Error:', error)
      throw new Error(`Chat request failed: ${error.message}`)
    }
  }

  /**
   * 모델 정보 가져오기
   */
  getModelInfo() {
    return {
      modelName: this.modelName,
      maxTokensInput: parseInt(process.env.AI_MAX_TOKENS_INPUT || '30000'),
      maxTokensOutput: parseInt(process.env.AI_MAX_TOKENS_OUTPUT || '8000'),
    }
  }
}

// 싱글톤 인스턴스
let geminiServiceInstance: GeminiService | null = null

export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService()
  }
  return geminiServiceInstance
}

export default getGeminiService
