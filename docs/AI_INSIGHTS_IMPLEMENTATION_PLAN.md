# AI 인사이트 기능 - 구축 계획서

**버전**: 1.0
**작성일**: 2025-10-21
**예상 기간**: 2-3주
**방법론**: RAG (Retrieval-Augmented Generation) 방식

---

## 📋 목차

1. [개발 로드맵](#1-개발-로드맵)
2. [Phase 1: 기반 구축](#2-phase-1-기반-구축)
3. [Phase 2: 핵심 기능](#3-phase-2-핵심-기능)
4. [Phase 3: 고급 기능](#4-phase-3-고급-기능)
5. [기술 스택](#5-기술-스택)
6. [디렉토리 구조](#6-디렉토리-구조)
7. [데이터베이스 마이그레이션](#7-데이터베이스-마이그레이션)
8. [환경 설정](#8-환경-설정)
9. [테스트 전략](#9-테스트-전략)
10. [배포 계획](#10-배포-계획)

---

## 1. 개발 로드맵

### 전체 일정 (3주)

```
Week 1: 기반 구축 + 데이터베이스
├─ Day 1-2: 환경 설정 및 패키지 설치
├─ Day 3-4: 데이터베이스 마이그레이션
└─ Day 5: Gemini Service 기본 구조

Week 2: 핵심 기능 개발
├─ Day 6-8: 자연어 쿼리 엔진
├─ Day 9-10: 채팅 인터페이스
└─ Day 11-12: 인사이트 대시보드

Week 3: 고급 기능 및 마무리
├─ Day 13-14: 인사이트 편집기
├─ Day 15-16: 저장/공유 기능
├─ Day 17-18: 테스트 및 버그 수정
└─ Day 19-21: 문서화 및 배포
```

### Phase별 완료 기준

| Phase | 목표 | 완료 기준 |
|-------|------|-----------|
| Phase 1 | 기반 구축 | Gemini API 연결 성공, 간단한 쿼리 테스트 통과 |
| Phase 2 | 핵심 기능 | 자연어 질문 → SQL → 응답 전체 흐름 동작 |
| Phase 3 | 고급 기능 | 인사이트 저장/편집/공유 기능 완성 |

---

## 2. Phase 1: 기반 구축

**목표**: AI 인사이트 기능의 기술적 기반 마련
**기간**: 5일

### 2.1 환경 설정

#### 2.1.1 패키지 설치

```bash
# Gemini API SDK
npm install @google/generative-ai

# 추가 유틸리티
npm install zod                  # 스키마 검증
npm install date-fns             # 날짜 처리

# UI 라이브러리 (편집기용)
npm install @tiptap/react @tiptap/starter-kit
npm install recharts             # 차트 라이브러리
npm install react-markdown       # 마크다운 렌더링
```

#### 2.1.2 환경 변수 추가

**`.env.local`**
```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro  # 또는 gemini-1.5-flash (빠르지만 덜 정확)

# AI 기능 설정
AI_RATE_LIMIT_PER_MINUTE=10
AI_CACHE_TTL_SECONDS=300
AI_MAX_TOKENS_INPUT=30000
AI_MAX_TOKENS_OUTPUT=8000
```

### 2.2 데이터베이스 마이그레이션

#### 2.2.1 새 테이블 생성

**Migration 파일**: `supabase/migrations/YYYYMMDDHHMMSS_create_ai_tables.sql`

```sql
-- saved_insights 테이블
CREATE TABLE saved_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'markdown' CHECK (content_type IN ('markdown', 'html')),
  chart_config JSONB,
  created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[],
  tags TEXT[],
  metadata JSONB,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0
);

CREATE INDEX idx_saved_insights_created_by ON saved_insights(created_by);
CREATE INDEX idx_saved_insights_tags ON saved_insights USING GIN(tags);
CREATE INDEX idx_saved_insights_created_at ON saved_insights(created_at DESC);

-- RLS 정책
ALTER TABLE saved_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 본인 인사이트 조회 가능"
  ON saved_insights FOR SELECT
  USING (
    created_by = auth.uid() OR
    is_public = true OR
    auth.uid() = ANY(shared_with)
  );

CREATE POLICY "사용자는 본인 인사이트 생성 가능"
  ON saved_insights FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "사용자는 본인 인사이트 수정 가능"
  ON saved_insights FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "사용자는 본인 인사이트 삭제 가능"
  ON saved_insights FOR DELETE
  USING (created_by = auth.uid());

-- ai_chat_history 테이블
CREATE TABLE ai_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  query_result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tokens_used INTEGER,
  response_time_ms INTEGER
);

CREATE INDEX idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX idx_ai_chat_history_session_id ON ai_chat_history(session_id);
CREATE INDEX idx_ai_chat_history_created_at ON ai_chat_history(created_at DESC);

-- RLS 정책
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 본인 대화만 조회 가능"
  ON ai_chat_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "사용자는 본인 대화만 생성 가능"
  ON ai_chat_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- insight_comments 테이블
CREATE TABLE insight_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insight_id UUID REFERENCES saved_insights(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insight_comments_insight_id ON insight_comments(insight_id);
CREATE INDEX idx_insight_comments_user_id ON insight_comments(user_id);

-- RLS 정책
ALTER TABLE insight_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 접근 가능한 인사이트의 댓글 조회 가능"
  ON insight_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_insights
      WHERE id = insight_id AND (
        created_by = auth.uid() OR
        is_public = true OR
        auth.uid() = ANY(shared_with)
      )
    )
  );

CREATE POLICY "사용자는 댓글 생성 가능"
  ON insight_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ai_query_cache 테이블 (성능 최적화용)
CREATE TABLE ai_query_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_hash TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sql_query TEXT,
  result_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_ai_query_cache_query_hash ON ai_query_cache(query_hash);
CREATE INDEX idx_ai_query_cache_expires_at ON ai_query_cache(expires_at);

-- 만료된 캐시 자동 삭제 함수
CREATE OR REPLACE FUNCTION delete_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_query_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 캐시 조회 및 히트 카운트 증가 함수
CREATE OR REPLACE FUNCTION get_cached_query(p_query_hash TEXT)
RETURNS TABLE(answer TEXT, sql_query TEXT, result_data JSONB) AS $$
BEGIN
  UPDATE ai_query_cache
  SET hit_count = hit_count + 1
  WHERE query_hash = p_query_hash AND expires_at > NOW();

  RETURN QUERY
  SELECT a.answer, a.sql_query, a.result_data
  FROM ai_query_cache a
  WHERE a.query_hash = p_query_hash AND a.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;
```

#### 2.2.2 마이그레이션 실행

```bash
# Supabase CLI로 마이그레이션 적용
npx supabase db push

# 또는 Supabase MCP 사용
# (app/api/migrations/apply 엔드포인트 통해 실행)
```

### 2.3 기본 서비스 구조 생성

#### 2.3.1 Gemini Service 생성

**파일**: `lib/services/geminiService.ts`

**기능**:
- Gemini API 클라이언트 초기화
- 프롬프트 전송 및 응답 수신
- 에러 핸들링
- 토큰 사용량 추적

**주요 메서드**:
```typescript
class GeminiService {
  async generateContent(prompt: string): Promise<string>
  async generateSQLFromNaturalLanguage(question: string, schema: DBSchema): Promise<string>
  async explainQueryResult(question: string, sqlResult: any[]): Promise<string>
  async analyzeDataForInsights(data: any[]): Promise<Insight[]>
}
```

#### 2.3.2 스키마 컨텍스트 관리

**파일**: `lib/utils/schemaContext.ts`

**기능**:
- 데이터베이스 스키마 정보를 Gemini가 이해할 수 있는 형식으로 변환
- 테이블, 컬럼, 관계 정보 제공
- 샘플 쿼리 예시 포함

**예시 출력**:
```typescript
const schemaContext = `
데이터베이스 스키마:

1. tool_changes (공구 교체 기록)
   - id: UUID (기본키)
   - change_date: DATE (교체 날짜)
   - change_reason: ENUM ('수명완료', '파손', '마모', ...)
   - model: TEXT (장비 모델: PA1, PA2, PS, B7, Q7)
   - process: TEXT (공정명)
   - endmill_code: TEXT (엔드밀 코드)
   - t_number: INTEGER (공구 위치)

2. equipment (장비 정보)
   - id: UUID
   - equipment_number: INTEGER (장비 번호)
   - model_code: TEXT (모델)
   - location: ENUM ('A동', 'B동')

... (나머지 테이블)

예시 쿼리:
Q: "최근 한달간 파손이 많았던 모델은?"
A: SELECT model, COUNT(*) as count
   FROM tool_changes
   WHERE change_date >= NOW() - INTERVAL '1 month'
     AND change_reason = '파손'
   GROUP BY model
   ORDER BY count DESC
   LIMIT 1;
`
```

---

## 3. Phase 2: 핵심 기능

**목표**: 자연어 질의응답 전체 흐름 구현
**기간**: 7일

### 3.1 자연어 쿼리 엔진

#### 3.1.1 NL → SQL 변환 서비스

**파일**: `lib/services/naturalLanguageQuery.ts`

**주요 로직**:

```typescript
// 1. 사용자 질문 + DB 스키마 컨텍스트 → Gemini
// 2. Gemini가 SQL 쿼리 생성
// 3. SQL 검증 (화이트리스트 체크)
// 4. Supabase 실행
// 5. 결과 + 원래 질문 → Gemini
// 6. Gemini가 자연어 답변 생성

async function executeNaturalLanguageQuery(question: string) {
  // 1. 캐시 확인
  const cached = await checkQueryCache(question)
  if (cached) return cached

  // 2. SQL 생성
  const sql = await geminiService.generateSQLFromNaturalLanguage(
    question,
    schemaContext
  )

  // 3. SQL 검증
  validateSQL(sql) // 화이트리스트 체크

  // 4. 실행
  const result = await supabase.rpc('execute_safe_query', { query: sql })

  // 5. 자연어 답변 생성
  const answer = await geminiService.explainQueryResult(question, result.data)

  // 6. 캐싱
  await cacheQuery(question, answer, sql, result.data)

  return { answer, sql, data: result.data }
}
```

#### 3.1.2 SQL 검증기

**파일**: `lib/utils/sqlValidator.ts`

**검증 규칙**:
```typescript
const VALIDATION_RULES = {
  // 허용된 명령어
  allowedCommands: ['SELECT'],

  // 허용된 테이블
  allowedTables: [
    'tool_changes',
    'equipment',
    'endmill_types',
    'inventory',
    'inventory_transactions',
    'user_profiles'
  ],

  // 금지된 패턴
  forbiddenPatterns: [
    /DROP\s+TABLE/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+/i,
    /INSERT\s+INTO/i,
    /TRUNCATE/i,
    /ALTER\s+TABLE/i,
    /;.*SELECT/i, // 다중 쿼리 방지
  ],

  // 금지된 함수
  forbiddenFunctions: [
    'pg_sleep',
    'pg_read_file',
    'copy',
  ]
}

function validateSQL(sql: string): void {
  // 1. 명령어 체크
  if (!sql.trim().toUpperCase().startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed')
  }

  // 2. 테이블 체크
  const tables = extractTableNames(sql)
  const invalidTables = tables.filter(t => !allowedTables.includes(t))
  if (invalidTables.length > 0) {
    throw new Error(`Unauthorized tables: ${invalidTables.join(', ')}`)
  }

  // 3. 금지 패턴 체크
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(sql)) {
      throw new Error('Query contains forbidden pattern')
    }
  }

  // 4. 금지 함수 체크
  // ...
}
```

### 3.2 API 엔드포인트 구축

#### 3.2.1 채팅 API

**파일**: `app/api/ai/chat/route.ts`

```typescript
// POST /api/ai/chat
// Body: { sessionId, message }

export async function POST(request: Request) {
  const { sessionId, message } = await request.json()
  const user = await getUser()

  // Rate limiting 체크
  await checkRateLimit(user.id)

  // 대화 히스토리 로드 (컨텍스트 유지)
  const history = await loadChatHistory(sessionId, 5) // 최근 5개

  // Gemini에 전달
  const response = await geminiService.chat(message, history)

  // 히스토리 저장
  await saveChatHistory(sessionId, user.id, message, response)

  return NextResponse.json({ response })
}
```

#### 3.2.2 쿼리 API

**파일**: `app/api/ai/query/route.ts`

```typescript
// POST /api/ai/query
// Body: { question }

export async function POST(request: Request) {
  const { question } = await request.json()
  const user = await getUser()

  // 권한 체크
  if (!hasPermission(user.role, 'ai_insights', 'use')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const result = await executeNaturalLanguageQuery(question)

    // 사용 로그 기록
    await logAIUsage(user.id, question, result)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('AI query error:', error)
    return NextResponse.json(
      { error: 'Query execution failed' },
      { status: 500 }
    )
  }
}
```

#### 3.2.3 인사이트 생성 API

**파일**: `app/api/ai/insights/route.ts`

```typescript
// GET /api/ai/insights - 자동 인사이트 목록 조회
// POST /api/ai/insights - 수동 인사이트 생성

export async function GET(request: Request) {
  const user = await getUser()

  // 최근 7일 데이터 분석
  const recentData = await fetchRecentData(7)

  // Gemini가 인사이트 발견
  const insights = await geminiService.analyzeDataForInsights(recentData)

  return NextResponse.json({ insights })
}
```

### 3.3 프론트엔드 컴포넌트

#### 3.3.1 채팅 인터페이스

**파일**: `components/features/ai/ChatInterface.tsx`

**기능**:
- 메시지 입력 및 전송
- 대화 히스토리 표시
- 타이핑 애니메이션
- 코드 블록 하이라이팅

**주요 구조**:
```tsx
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const { mutate: sendMessage, isLoading } = useSendMessage()

  const handleSubmit = () => {
    sendMessage({ sessionId, message: input }, {
      onSuccess: (response) => {
        setMessages(prev => [...prev,
          { type: 'user', content: input },
          { type: 'ai', content: response }
        ])
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  )
}
```

#### 3.3.2 인사이트 카드

**파일**: `components/features/ai/InsightCard.tsx`

**기능**:
- 인사이트 요약 표시
- 우선순위 시각화
- 액션 버튼 (상세 보기, 저장, 공유)

```tsx
export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant={insight.priority}>
            {insight.priority === 'high' ? '⚠️ 긴급' : '💡 정보'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(insight.createdAt)}
          </span>
        </div>
        <CardTitle>{insight.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{insight.summary}</p>
        {insight.chart && <MiniChart data={insight.chart} />}
      </CardContent>
      <CardFooter>
        <Button onClick={handleViewDetails}>상세 보기</Button>
        <Button variant="outline" onClick={handleSave}>저장</Button>
      </CardFooter>
    </Card>
  )
}
```

#### 3.3.3 메인 페이지

**파일**: `app/dashboard/ai-insights/page.tsx`

**레이아웃**:
```tsx
export default function AIInsightsPage() {
  const { data: insights } = useInsights()
  const { data: chatHistory } = useChatHistory()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 질문 입력 섹션 */}
      <QuickQueryInput />

      {/* 주요 인사이트 */}
      <section>
        <h2>주요 인사이트</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights?.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>

      {/* 최근 대화 */}
      <section>
        <h2>최근 대화 기록</h2>
        <ChatHistoryList history={chatHistory} />
      </section>
    </div>
  )
}
```

### 3.4 React Query 훅

**파일**: `lib/hooks/useAI.ts`

```typescript
// 메시지 전송
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, message }) => {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message })
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatHistory'])
    }
  })
}

// 자연어 쿼리
export function useNaturalLanguageQuery() {
  return useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ question })
      })
      return res.json()
    }
  })
}

// 인사이트 목록
export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const res = await fetch('/api/ai/insights')
      return res.json()
    },
    staleTime: 5 * 60 * 1000 // 5분
  })
}
```

---

## 4. Phase 3: 고급 기능

**목표**: 인사이트 편집, 저장, 공유 기능 완성
**기간**: 7일

### 4.1 인사이트 편집기

#### 4.1.1 Tiptap 에디터 통합

**파일**: `components/features/ai/InsightEditor.tsx`

```typescript
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function InsightEditor({ initialContent, onSave }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
  })

  const handleSave = async () => {
    const content = editor.getHTML()
    await onSave(content)
  }

  return (
    <div>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="prose" />
      <Button onClick={handleSave}>저장</Button>
    </div>
  )
}
```

#### 4.1.2 차트 커스터마이저

**파일**: `components/features/ai/ChartCustomizer.tsx`

```typescript
export function ChartCustomizer({ data, config, onChange }) {
  const [chartType, setChartType] = useState(config.type || 'bar')
  const [colors, setColors] = useState(config.colors || defaultColors)

  return (
    <div className="space-y-4">
      <Select value={chartType} onValueChange={setChartType}>
        <SelectItem value="bar">막대 차트</SelectItem>
        <SelectItem value="line">선 그래프</SelectItem>
        <SelectItem value="pie">파이 차트</SelectItem>
      </Select>

      <ColorPicker colors={colors} onChange={setColors} />

      <ChartPreview
        data={data}
        type={chartType}
        colors={colors}
      />
    </div>
  )
}
```

### 4.2 저장 및 공유

#### 4.2.1 저장 API

**파일**: `app/api/ai/insights/[id]/route.ts`

```typescript
// POST /api/ai/insights - 새 인사이트 저장
export async function POST(request: Request) {
  const user = await getUser()
  const { title, content, chartConfig, tags } = await request.json()

  const { data, error } = await supabase
    .from('saved_insights')
    .insert({
      title,
      content,
      chart_config: chartConfig,
      tags,
      created_by: user.id
    })
    .select()
    .single()

  return NextResponse.json(data)
}

// PUT /api/ai/insights/[id] - 인사이트 업데이트
export async function PUT(request: Request, { params }) {
  const user = await getUser()
  const { title, content, chartConfig } = await request.json()

  const { data } = await supabase
    .from('saved_insights')
    .update({ title, content, chart_config: chartConfig })
    .eq('id', params.id)
    .eq('created_by', user.id) // 본인 것만 수정 가능
    .select()
    .single()

  return NextResponse.json(data)
}
```

#### 4.2.2 공유 기능

**파일**: `components/features/ai/ShareDialog.tsx`

```typescript
export function ShareDialog({ insightId, onClose }) {
  const [shareWith, setShareWith] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)

  const handleShare = async () => {
    await fetch(`/api/ai/insights/${insightId}/share`, {
      method: 'POST',
      body: JSON.stringify({ shareWith, isPublic })
    })
    onClose()
  }

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>인사이트 공유</DialogHeader>

        <div className="space-y-4">
          <Switch
            checked={isPublic}
            onCheckedChange={setIsPublic}
            label="모두에게 공개"
          />

          {!isPublic && (
            <UserMultiSelect
              value={shareWith}
              onChange={setShareWith}
              placeholder="공유할 사용자 선택"
            />
          )}

          <Button onClick={handleShare}>공유</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 4.3 내보내기 기능

#### 4.3.1 PDF 내보내기

**파일**: `lib/utils/exportToPDF.ts`

```typescript
import jsPDF from 'jspdf'

export async function exportInsightToPDF(insight: Insight) {
  const pdf = new jsPDF()

  // 제목
  pdf.setFontSize(20)
  pdf.text(insight.title, 20, 20)

  // 내용 (HTML → Plain text)
  pdf.setFontSize(12)
  const content = stripHtml(insight.content)
  pdf.text(content, 20, 40, { maxWidth: 170 })

  // 차트 (Canvas → Image)
  if (insight.chartConfig) {
    const chartImage = await generateChartImage(insight.chartConfig)
    pdf.addImage(chartImage, 'PNG', 20, 100, 170, 100)
  }

  // 다운로드
  pdf.save(`${insight.title}.pdf`)
}
```

#### 4.3.2 Excel 내보내기

**파일**: `lib/utils/exportToExcel.ts`

```typescript
import * as XLSX from 'xlsx'

export function exportInsightToExcel(insight: Insight) {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: 요약
  const summarySheet = XLSX.utils.json_to_sheet([{
    제목: insight.title,
    작성자: insight.createdBy,
    작성일: insight.createdAt
  }])
  XLSX.utils.book_append_sheet(workbook, summarySheet, '요약')

  // Sheet 2: 데이터
  if (insight.data) {
    const dataSheet = XLSX.utils.json_to_sheet(insight.data)
    XLSX.utils.book_append_sheet(workbook, dataSheet, '데이터')
  }

  // 다운로드
  XLSX.writeFile(workbook, `${insight.title}.xlsx`)
}
```

---

## 5. 기술 스택

### 5.1 Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14 | API Routes, SSR |
| Google Gemini API | 1.5 Pro/Flash | AI 엔진 |
| Supabase | Latest | 데이터베이스, Auth |
| Zod | ^3.22 | 스키마 검증 |

### 5.2 Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18 | UI 라이브러리 |
| TanStack Query | 5 | 서버 상태 관리 |
| Tiptap | ^2.0 | WYSIWYG 에디터 |
| Recharts | ^2.10 | 차트 라이브러리 |
| React Markdown | ^9.0 | 마크다운 렌더링 |

### 5.3 DevOps

| 기술 | 용도 |
|------|------|
| Vercel | 배포 플랫폼 |
| Supabase CLI | DB 마이그레이션 |
| GitHub Actions | CI/CD (선택사항) |

---

## 6. 디렉토리 구조

```
app/
├── api/
│   └── ai/
│       ├── chat/
│       │   └── route.ts           # 채팅 API
│       ├── query/
│       │   └── route.ts           # 자연어 쿼리 API
│       ├── insights/
│       │   ├── route.ts           # 인사이트 목록/생성
│       │   └── [id]/
│       │       ├── route.ts       # 인사이트 CRUD
│       │       └── share/
│       │           └── route.ts   # 공유 API
│       └── cache/
│           └── route.ts           # 캐시 관리
│
└── dashboard/
    └── ai-insights/
        ├── page.tsx               # 메인 페이지
        ├── chat/
        │   └── [sessionId]/
        │       └── page.tsx       # 채팅 세션 페이지
        └── saved/
            ├── page.tsx           # 저장된 인사이트 목록
            └── [id]/
                └── page.tsx       # 인사이트 상세/편집

components/
└── features/
    └── ai/
        ├── ChatInterface.tsx      # 채팅 UI
        ├── MessageList.tsx        # 메시지 목록
        ├── MessageInput.tsx       # 입력창
        ├── InsightCard.tsx        # 인사이트 카드
        ├── InsightEditor.tsx      # 편집기
        ├── ChartCustomizer.tsx    # 차트 커스터마이징
        ├── ShareDialog.tsx        # 공유 다이얼로그
        └── QuickQueryInput.tsx    # 빠른 질문 입력

lib/
├── services/
│   ├── geminiService.ts           # Gemini API 클라이언트
│   ├── naturalLanguageQuery.ts   # NL → SQL 변환
│   └── insightGenerator.ts        # 인사이트 자동 생성
│
├── hooks/
│   ├── useAI.ts                   # AI 관련 훅
│   ├── useSavedInsights.ts        # 저장된 인사이트 훅
│   └── useChatHistory.ts          # 대화 히스토리 훅
│
└── utils/
    ├── schemaContext.ts           # DB 스키마 컨텍스트
    ├── sqlValidator.ts            # SQL 검증
    ├── queryCache.ts              # 쿼리 캐싱
    ├── exportToPDF.ts             # PDF 내보내기
    └── exportToExcel.ts           # Excel 내보내기
```

---

## 7. 데이터베이스 마이그레이션

### 7.1 마이그레이션 순서

1. **기본 테이블 생성** (Day 3)
   - saved_insights
   - ai_chat_history
   - insight_comments
   - ai_query_cache

2. **인덱스 추가** (Day 4)
   - 성능 최적화용 인덱스

3. **RLS 정책 설정** (Day 4)
   - 각 테이블별 보안 정책

4. **함수 및 트리거** (Day 5)
   - 캐시 만료 자동 삭제
   - 업데이트 시간 자동 갱신

### 7.2 롤백 계획

각 마이그레이션 파일에 `down.sql` 포함:

```sql
-- up.sql
CREATE TABLE saved_insights (...);

-- down.sql
DROP TABLE IF EXISTS saved_insights CASCADE;
```

---

## 8. 환경 설정

### 8.1 로컬 개발 환경

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# GEMINI_API_KEY 입력

# 3. Supabase 로컬 환경 (선택사항)
npx supabase start

# 4. 마이그레이션 실행
npx supabase db push

# 5. 개발 서버 실행
npm run dev
```

### 8.2 프로덕션 환경

**Vercel 환경 변수 설정**:
```
GEMINI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 9. 테스트 전략

### 9.1 단위 테스트

**테스트 대상**:
- `sqlValidator.ts` - SQL 검증 로직
- `schemaContext.ts` - 스키마 변환
- `queryCache.ts` - 캐싱 로직

**도구**: Jest

```bash
npm run test:unit
```

### 9.2 통합 테스트

**테스트 시나리오**:
1. 자연어 질문 → SQL 생성 → 실행 → 응답
2. 인사이트 생성 → 저장 → 조회 → 수정 → 삭제
3. 공유 기능 (권한 확인)

**도구**: Playwright (선택사항)

### 9.3 수동 테스트

**테스트 케이스**:
- [ ] "최근 한달간 파손이 많았던 모델은?" 정확한 답변
- [ ] "재고 부족 엔드밀 목록" 올바른 데이터 반환
- [ ] 잘못된 SQL 차단 확인
- [ ] Rate limiting 동작 확인
- [ ] 캐시 히트/미스 확인

---

## 10. 배포 계획

### 10.1 배포 체크리스트

**배포 전**:
- [ ] 모든 테스트 통과
- [ ] 환경 변수 설정 완료
- [ ] DB 마이그레이션 프로덕션 적용
- [ ] API 키 비용 한도 설정
- [ ] 에러 추적 설정 (Sentry 등)

**배포 후**:
- [ ] 기본 시나리오 테스트
- [ ] 성능 모니터링
- [ ] API 사용량 확인
- [ ] 사용자 피드백 수집

### 10.2 단계별 배포 (Canary)

1. **Alpha (내부 테스트)**: 개발팀만 사용 (1-2일)
2. **Beta (제한된 사용자)**: 관리자 5명에게 공개 (3-5일)
3. **GA (General Availability)**: 전체 공개

### 10.3 모니터링

**주요 지표**:
- API 응답 시간
- Gemini API 호출 횟수 및 비용
- 에러율
- 사용자 만족도

**대시보드**: Vercel Analytics + Supabase Dashboard

---

## 부록

### A. Gemini API 프롬프트 예시

**SQL 생성 프롬프트**:
```
당신은 SQL 쿼리 생성 전문가입니다.
사용자의 자연어 질문을 PostgreSQL 쿼리로 변환하세요.

데이터베이스 스키마:
{schemaContext}

규칙:
1. SELECT 쿼리만 생성
2. 테이블은 위 스키마에 있는 것만 사용
3. WHERE 절에 적절한 필터 추가
4. 날짜 계산은 PostgreSQL 함수 사용
5. 결과는 순수 SQL만 반환 (설명 없이)

질문: {userQuestion}

SQL:
```

### B. 트러블슈팅

**문제**: Gemini API 429 에러 (Rate limit)
**해결**:
- 캐싱 강화
- 요청 간격 조절
- Paid tier로 업그레이드

**문제**: SQL Injection 우회 시도 감지
**해결**:
- 검증 로직 강화
- 로그 모니터링
- IP 차단

### C. 참고 링크

- [Gemini API Cookbook](https://github.com/google-gemini/cookbook)
- [Supabase RLS Examples](https://supabase.com/docs/guides/auth/row-level-security)
- [Tiptap Documentation](https://tiptap.dev/docs/editor/introduction)

---

**다음 문서**: AI_INSIGHTS_TODO.md
