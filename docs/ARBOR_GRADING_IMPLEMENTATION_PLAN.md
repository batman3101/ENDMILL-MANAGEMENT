# Arbor 등급 관리 구현 계획 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 30,000개 Arbor(1공장 20,000/2공장 10,000)의 개별 등급(A/B/C/D) 관리 기능 — **Excel 일괄 등록을 최우선 경로**로 구축.

**Architecture:** 신규 테이블 2개(`arbors` 마스터 + `arbor_inspections` 이력, RLS 차후)를 기존 다공장 패턴(`factory_id` + fail-closed API)에 얹는다. 브라우저는 항상 서버 페이지네이션된 50행만 받고, 집계는 SQL(RPC)이 수행한다. 등급 판정은 앱 레이어 순수 함수(worst-of)로 하고 판정 근거를 `rule_snapshot`으로 보존한다.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase(PG 17), TanStack Query v5, Zod, ExcelJS, i18next(ko/vi), Tailwind.

**스펙 문서:** [ARBOR_GRADING_PRD.md](./ARBOR_GRADING_PRD.md) — 등급 기준 수치는 §11 기본값 잠정 채택 상태.

**검증 방식(프로젝트 관례):** 이 프로젝트에는 테스트 프레임워크가 없다. 각 태스크는
`npx tsc --noEmit`(타입) → 스테이지 말미 `npm run build` + `npm run lint` + 수동 검증(curl/SQL/화면)으로 확인한다.

**금지 사항(PRD §4.4):** ① `arbors`/`arbor_inspections`를 Realtime publication에 추가하지 않는다
② 전체 행을 반환하는 API를 만들지 않는다 ③ 모든 arbor API는 `factoryId` 누락 시 400 (fail-closed).

---

## 파일 구조 맵

```
supabase/migrations/20260704120000_add_arbor_grading.sql   [생성] 테이블/인덱스
supabase/migrations/20260704130000_add_arbor_stats_rpc.sql [생성] 통계 RPC (Stage D)
lib/types/database.ts            [수정] arbors / arbor_inspections 타입 추가
lib/types/arbor.ts               [생성] 도메인 타입·상수 (단일 책임: 타입만)
lib/types/settings.ts            [수정] arbor 설정 카테고리 + 기본값 (Stage C)
lib/auth/permissions.ts          [수정] 'arbors' 리소스 등록
lib/utils/arborExcelTemplate.ts  [생성] 템플릿 생성/파싱/검증/내보내기 (ExcelJS)
lib/utils/arborGrade.ts          [생성] 등급 판정 순수 함수 (Stage C)
lib/hooks/useArbors.ts           [생성] 목록/상세/통계 훅 (Stage B, D)
app/api/arbors/route.ts                    [생성] GET 목록(페이지네이션)/POST 단건
app/api/arbors/bulk-upload/route.ts        [생성] Excel 일괄 등록 (Stage A 핵심)
app/api/arbors/[id]/route.ts               [생성] GET/PUT/DELETE 단건 (Stage B)
app/api/arbors/[id]/inspections/route.ts   [생성] GET 이력(Stage B)/POST 검사(Stage C)
app/api/arbors/stats/route.ts              [생성] 통계 (Stage D)
components/features/arbor/ArborExcelUploader.tsx      [생성] 업로더 모달
components/features/arbor/ArborGradeRulesSettings.tsx [생성] 등급 기준 설정 (Stage C)
app/dashboard/arbors/page.tsx              [생성] 목록 (Stage A v1: 업로더 → Stage B v2: 테이블)
app/dashboard/arbors/[id]/page.tsx         [생성] 상세+이력 (Stage B)
app/dashboard/arbors/inspect/page.tsx      [생성] 연속 검사 모드 (Stage C)
app/dashboard/layout.tsx                   [수정] 사이드바 메뉴 항목 (~line 243 뒤)
lib/i18n.ts                                [수정] arbor 네임스페이스 ko/vi
```

---

# Stage A (PR #1) — 스키마 + Excel 일괄 등록 ★최우선

## Task 1: 브랜치 생성

- [ ] **Step 1: main에서 새 브랜치**

```bash
git checkout main && git pull origin main
git checkout -b feat/arbor-bulk-registration
```

## Task 2: DB 마이그레이션 (테이블 + 인덱스)

**Files:**
- Create: `supabase/migrations/20260704120000_add_arbor_grading.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- Arbor 등급 관리: 마스터 + 검사 이력
-- RLS는 사용자 결정(2026-07-04)에 따라 차후 별도 트랙에서 일괄 적용 (PRD §4.4-3)

create table if not exists public.arbors (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id),
  serial_number varchar(30) not null,
  arbor_model varchar(50),
  status varchar(20) not null default 'active'
    check (status in ('active','repair','disposed','lost')),
  current_grade char(1) check (current_grade in ('A','B','C','D')),
  last_inspected_at timestamptz,
  last_runout_um numeric(6,2),
  last_taper_condition varchar(20),
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_arbors_factory_serial unique (factory_id, serial_number)
);

-- 인덱스 최소주의(쓰기 IO 절감, 2026-06-29 장애 교훈). UNIQUE가 시리얼 조회를 커버한다.
create index if not exists idx_arbors_factory_grade  on public.arbors (factory_id, current_grade);
create index if not exists idx_arbors_factory_status on public.arbors (factory_id, status);
create index if not exists idx_arbors_last_inspected on public.arbors (factory_id, last_inspected_at);

create table if not exists public.arbor_inspections (
  id uuid primary key default gen_random_uuid(),
  arbor_id uuid not null references public.arbors(id),
  factory_id uuid not null references public.factories(id),
  runout_um numeric(6,2) not null check (runout_um >= 0),
  taper_condition varchar(20) not null,
  judged_grade char(1) not null check (judged_grade in ('A','B','C','D')),
  previous_grade char(1),
  rule_snapshot jsonb not null,
  inspected_by uuid references public.user_profiles(id),
  inspected_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_arbor_inspections_arbor
  on public.arbor_inspections (arbor_id, inspected_at desc);
create index if not exists idx_arbor_inspections_factory_date
  on public.arbor_inspections (factory_id, inspected_at desc);
-- inspected_by는 감사용 컬럼이므로 인덱스 제외 (postmortem 권고)
```

- [ ] **Step 2: 적용** — 다음 중 한 가지

```bash
npx supabase db push        # CLI가 프로젝트에 링크되어 있는 경우
```
또는 Supabase 대시보드 SQL Editor / MCP `apply_migration`으로 위 SQL 실행.

- [ ] **Step 3: 적용 확인** — SQL Editor에서 실행

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('arbors','arbor_inspections');
-- 기대: 2행 반환

select count(*) from pg_publication_tables
where pubname='supabase_realtime' and tablename in ('arbors','arbor_inspections');
-- 기대: 0  (Realtime 미등록 확인 — PRD §4.4-1)
```

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260704120000_add_arbor_grading.sql
git commit -m "feat(arbor): add arbors and arbor_inspections tables

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 3: database.ts 타입 추가

**Files:**
- Modify: `lib/types/database.ts` — `Tables` 섹션에 두 블록 추가 (기존 테이블 타입과 동일한 스타일, 알파벳 순서상 적절한 위치)

- [ ] **Step 1: arbors 타입 블록 추가**

```typescript
      arbors: {
        Row: {
          id: string
          factory_id: string
          serial_number: string
          arbor_model: string | null
          status: string
          current_grade: string | null
          last_inspected_at: string | null
          last_runout_um: number | null
          last_taper_condition: string | null
          purchase_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          serial_number: string
          arbor_model?: string | null
          status?: string
          current_grade?: string | null
          last_inspected_at?: string | null
          last_runout_um?: number | null
          last_taper_condition?: string | null
          purchase_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          serial_number?: string
          arbor_model?: string | null
          status?: string
          current_grade?: string | null
          last_inspected_at?: string | null
          last_runout_um?: number | null
          last_taper_condition?: string | null
          purchase_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'arbors_factory_id_fkey'
            columns: ['factory_id']
            isOneToOne: false
            referencedRelation: 'factories'
            referencedColumns: ['id']
          }
        ]
      }
```

- [ ] **Step 2: arbor_inspections 타입 블록 추가**

```typescript
      arbor_inspections: {
        Row: {
          id: string
          arbor_id: string
          factory_id: string
          runout_um: number
          taper_condition: string
          judged_grade: string
          previous_grade: string | null
          rule_snapshot: Json
          inspected_by: string | null
          inspected_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          arbor_id: string
          factory_id: string
          runout_um: number
          taper_condition: string
          judged_grade: string
          previous_grade?: string | null
          rule_snapshot: Json
          inspected_by?: string | null
          inspected_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          runout_um?: number
          taper_condition?: string
          judged_grade?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'arbor_inspections_arbor_id_fkey'
            columns: ['arbor_id']
            isOneToOne: false
            referencedRelation: 'arbors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'arbor_inspections_factory_id_fkey'
            columns: ['factory_id']
            isOneToOne: false
            referencedRelation: 'factories'
            referencedColumns: ['id']
          }
        ]
      }
```

- [ ] **Step 3: 타입 체크** — `npx tsc --noEmit` → 에러 0 기대

## Task 4: 도메인 타입 파일

**Files:**
- Create: `lib/types/arbor.ts`

- [ ] **Step 1: 파일 작성 (전체 코드)**

```typescript
// Arbor 등급 관리 도메인 타입/상수
export const ARBOR_GRADES = ['A', 'B', 'C', 'D'] as const
export type ArborGrade = (typeof ARBOR_GRADES)[number]

export const TAPER_CONDITIONS = ['good', 'minor_wear', 'worn', 'damaged'] as const
export type TaperCondition = (typeof TAPER_CONDITIONS)[number]

export const ARBOR_STATUSES = ['active', 'repair', 'disposed', 'lost'] as const
export type ArborStatus = (typeof ARBOR_STATUSES)[number]

// 시리얼: 대문자 영숫자+하이픈, 3~30자 (예: ALT-00001)
export const ARBOR_SERIAL_REGEX = /^[A-Z0-9][A-Z0-9-]{2,29}$/

export interface Arbor {
  id: string
  factory_id: string
  serial_number: string
  arbor_model: string | null
  status: ArborStatus
  current_grade: ArborGrade | null
  last_inspected_at: string | null
  last_runout_um: number | null
  last_taper_condition: TaperCondition | null
  purchase_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ArborInspection {
  id: string
  arbor_id: string
  factory_id: string
  runout_um: number
  taper_condition: TaperCondition
  judged_grade: ArborGrade
  previous_grade: ArborGrade | null
  rule_snapshot: Record<string, unknown>
  inspected_by: string | null
  inspected_at: string
  notes: string | null
}

// Excel 한 행 (템플릿 컬럼과 1:1)
export interface ArborExcelRow {
  serial_number: string
  arbor_model?: string
  purchase_date?: string        // YYYY-MM-DD
  initial_grade?: ArborGrade    // 기존 조사 데이터 이관용 (선택)
  runout_um?: number            // 선택
  taper_condition?: TaperCondition // 선택
  notes?: string
}

export interface ArborListParams {
  page: number
  pageSize: number
  grade?: ArborGrade
  status?: ArborStatus
  search?: string   // 시리얼 전방일치
  sortBy?: 'serial_number' | 'current_grade' | 'status' | 'last_inspected_at' | 'arbor_model' | 'created_at'
  sortDir?: 'asc' | 'desc'
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

## Task 5: 권한 리소스 등록

**Files:**
- Modify: `lib/auth/permissions.ts`

- [ ] **Step 1: `AVAILABLE_RESOURCES` 배열(~line 221)에 추가**

```typescript
  'arbors',
```

- [ ] **Step 2: `RESOURCE_AVAILABLE_ACTIONS`(~line 246)에 추가**

```typescript
  arbors: ['create', 'read', 'update', 'delete', 'manage'],
```

- [ ] **Step 3: `DEFAULT_PERMISSIONS`(~line 12) — admin 배열에 추가**

```typescript
  { resource: 'arbors', action: 'manage' },
```

**user 배열에 추가** (현장 작업자: 조회 + 검사 입력. tool_changes의 user-create 선례와 동일):

```typescript
  { resource: 'arbors', action: 'read' },
  { resource: 'arbors', action: 'create' },
```

- [ ] **Step 4: 페이지 접근 매핑(`pagePermissions`, ~line 91)에 추가**

```typescript
  '/dashboard/arbors': { resource: 'arbors', action: 'read' },
```

- [ ] **Step 5: 타입 체크 후 커밋**

```bash
npx tsc --noEmit
git add lib/types/database.ts lib/types/arbor.ts lib/auth/permissions.ts
git commit -m "feat(arbor): add domain types and permission resource

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 6: Excel 템플릿/파서 유틸 (ExcelJS)

**Files:**
- Create: `lib/utils/arborExcelTemplate.ts`
- 참조 패턴: `lib/utils/equipmentExcelTemplate.ts` (동일 라이브러리 ExcelJS)

- [ ] **Step 1: 파일 작성 (전체 코드)**

```typescript
import ExcelJS from 'exceljs'
import {
  ArborExcelRow, ARBOR_GRADES, TAPER_CONDITIONS, ARBOR_SERIAL_REGEX,
  ArborGrade, TaperCondition
} from '../types/arbor'

// 템플릿 컬럼 정의 (순서 고정 — 파서와 1:1)
export const ARBOR_EXCEL_HEADERS = [
  '시리얼번호', '규격(모델)', '구매일(YYYY-MM-DD)', '초기등급(A~D)',
  'Runout(um)', 'Taper상태', '비고'
] as const

// Taper 한국어 입력값 ↔ 코드 매핑 (엑셀에는 한국어로 기입)
const TAPER_KO_TO_CODE: Record<string, TaperCondition> = {
  '양호': 'good', '경미': 'minor_wear', '마모': 'worn', '손상': 'damaged'
}
export const TAPER_CODE_TO_KO: Record<TaperCondition, string> = {
  good: '양호', minor_wear: '경미', worn: '마모', damaged: '손상'
}

export async function generateArborTemplate(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Arbor목록')
  ws.addRow([...ARBOR_EXCEL_HEADERS])
  ws.getRow(1).font = { bold: true }
  ws.columns.forEach(col => { col.width = 18 })
  // 예시 행 2개
  ws.addRow(['ALT-00001', 'BT40', '2025-01-15', 'A', 3.5, '양호', ''])
  ws.addRow(['ALT-00002', 'BT40', '', '', '', '', '신규 라벨 부착'])

  const guide = wb.addWorksheet('작성방법')
  guide.addRow(['컬럼', '필수', '설명'])
  guide.getRow(1).font = { bold: true }
  guide.addRow(['시리얼번호', 'O', '공장 내 유일. 대문자 영숫자/하이픈 3~30자 (예: ALT-00001)'])
  guide.addRow(['규격(모델)', 'X', 'BT30 / BT40 / HSK63 등'])
  guide.addRow(['구매일', 'X', 'YYYY-MM-DD 형식'])
  guide.addRow(['초기등급', 'X', 'A/B/C/D — 기존 조사 결과가 있을 때만 기입'])
  guide.addRow(['Runout(um)', 'X', '숫자(0 이상). 초기등급과 함께 기입 권장'])
  guide.addRow(['Taper상태', 'X', '양호/경미/마모/손상 중 하나'])
  guide.addRow(['비고', 'X', '자유 입력'])
  guide.columns.forEach(col => { col.width = 30 })
  return wb
}

export async function downloadArborTemplate(): Promise<void> {
  const wb = await generateArborTemplate()
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, 'arbor_template.xlsx')
}

// 실패/잔여 행 재다운로드용 (업로더에서 재사용)
export async function exportArborRowsToExcel(
  rows: ArborExcelRow[], filename: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Arbor목록')
  ws.addRow([...ARBOR_EXCEL_HEADERS])
  ws.getRow(1).font = { bold: true }
  rows.forEach(r => ws.addRow([
    r.serial_number, r.arbor_model ?? '', r.purchase_date ?? '',
    r.initial_grade ?? '', r.runout_um ?? '',
    r.taper_condition ? TAPER_CODE_TO_KO[r.taper_condition] : '', r.notes ?? ''
  ]))
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, filename)
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function parseArborExcel(file: File): Promise<ArborExcelRow[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet('Arbor목록') ?? wb.worksheets[0]
  if (!ws) return []

  const rows: ArborExcelRow[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // 헤더
    const cell = (i: number): string => {
      const v = row.getCell(i).value
      if (v === null || v === undefined) return ''
      if (v instanceof Date) return v.toISOString().slice(0, 10)
      return String(typeof v === 'object' && 'result' in v ? (v as { result: unknown }).result ?? '' : v).trim()
    }
    const serial = cell(1).toUpperCase()
    if (!serial) return // 빈 행 스킵
    const runoutRaw = cell(5)
    const taperRaw = cell(6)
    rows.push({
      serial_number: serial,
      arbor_model: cell(2) || undefined,
      purchase_date: cell(3) || undefined,
      initial_grade: (cell(4).toUpperCase() || undefined) as ArborGrade | undefined,
      runout_um: runoutRaw === '' ? undefined : Number(runoutRaw),
      taper_condition: taperRaw ? TAPER_KO_TO_CODE[taperRaw] : undefined,
      notes: cell(7) || undefined
    })
  })
  return rows
}

export function validateArborData(rows: ArborExcelRow[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const seen = new Set<string>()
  rows.forEach((r, i) => {
    const line = i + 2 // 헤더 다음부터
    if (!ARBOR_SERIAL_REGEX.test(r.serial_number)) {
      errors.push(`${line}행: 시리얼번호 형식 오류 (${r.serial_number})`)
    }
    if (seen.has(r.serial_number)) {
      errors.push(`${line}행: 파일 내 시리얼 중복 (${r.serial_number})`)
    }
    seen.add(r.serial_number)
    if (r.purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(r.purchase_date)) {
      errors.push(`${line}행: 구매일 형식 오류 (YYYY-MM-DD)`)
    }
    if (r.initial_grade && !ARBOR_GRADES.includes(r.initial_grade)) {
      errors.push(`${line}행: 초기등급은 A~D만 허용 (${r.initial_grade})`)
    }
    if (r.runout_um !== undefined && (Number.isNaN(r.runout_um) || r.runout_um < 0)) {
      errors.push(`${line}행: Runout은 0 이상의 숫자`)
    }
    if (r.taper_condition && !TAPER_CONDITIONS.includes(r.taper_condition)) {
      errors.push(`${line}행: Taper상태는 양호/경미/마모/손상 중 하나`)
    }
  })
  return { isValid: errors.length === 0, errors }
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

## Task 7: 목록/단건 API (GET 페이지네이션 + POST)

**Files:**
- Create: `app/api/arbors/route.ts`

- [ ] **Step 1: 파일 작성 (전체 코드)**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../lib/supabase/client'
import { ARBOR_GRADES, ARBOR_STATUSES, ARBOR_SERIAL_REGEX } from '../../../lib/types/arbor'

const SORTABLE = ['serial_number', 'current_grade', 'status', 'last_inspected_at', 'arbor_model', 'created_at'] as const

// GET /api/arbors?factoryId=&page=1&pageSize=50&grade=&status=&search=&serial=&sortBy=&sortDir=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const factoryId = sp.get('factoryId')
    if (!factoryId) { // fail-closed (PRD §4.4-4)
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const page = Math.max(1, Number(sp.get('page') ?? 1))
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? 50)))
    const grade = sp.get('grade')
    const status = sp.get('status')
    const search = sp.get('search')?.toUpperCase()
    const serial = sp.get('serial')?.toUpperCase() // 정확 일치 (검사 모드 스캔용)
    const sortBy = (SORTABLE as readonly string[]).includes(sp.get('sortBy') ?? '')
      ? (sp.get('sortBy') as string) : 'serial_number'
    const sortDir = sp.get('sortDir') === 'desc' ? false : true

    const supabase = createServerClient()
    let query = supabase
      .from('arbors')
      .select('*', { count: 'exact' })
      .eq('factory_id', factoryId)

    if (grade && (ARBOR_GRADES as readonly string[]).includes(grade)) query = query.eq('current_grade', grade)
    if (grade === 'none') query = query.is('current_grade', null) // 미검사 필터
    if (status && (ARBOR_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status)
    if (serial) query = query.eq('serial_number', serial)
    else if (search) query = query.ilike('serial_number', `${search}%`)

    const from = (page - 1) * pageSize
    const { data, count, error } = await query
      .order(sortBy, { ascending: sortDir })
      .range(from, from + pageSize - 1) // ← 브라우저에는 페이지 분량만 전송

    if (error) throw error
    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: { page, pageSize, total: count ?? 0 }
    })
  } catch (error) {
    console.error('GET /api/arbors error:', error)
    return NextResponse.json({ success: false, error: 'Arbor 목록 조회 실패' }, { status: 500 })
  }
}

const createSchema = z.object({
  factoryId: z.string().uuid(),
  serial_number: z.string().regex(ARBOR_SERIAL_REGEX),
  arbor_model: z.string().max(50).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional()
})

// POST /api/arbors — 단건 수기 등록 (보조 경로)
export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json())
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('arbors')
      .insert({
        factory_id: body.factoryId,
        serial_number: body.serial_number.toUpperCase(),
        arbor_model: body.arbor_model ?? null,
        purchase_date: body.purchase_date ?? null,
        notes: body.notes ?? null
      })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: '해당 공장에 이미 같은 시리얼이 존재합니다.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    }
    console.error('POST /api/arbors error:', error)
    return NextResponse.json({ success: false, error: 'Arbor 등록 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입 체크 후 커밋**

```bash
npx tsc --noEmit
git add lib/utils/arborExcelTemplate.ts app/api/arbors/route.ts
git commit -m "feat(arbor): add excel template util and paginated list API

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 8: 일괄 등록 API ★핵심

**Files:**
- Create: `app/api/arbors/bulk-upload/route.ts`
- 참조 패턴: `app/api/equipment/bulk-upload/route.ts` (단, 개별 create 대신 **배열 insert**로 개선)

- [ ] **Step 1: 파일 작성 (전체 코드)**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { ARBOR_SERIAL_REGEX } from '../../../../lib/types/arbor'

export const maxDuration = 300 // 대량 배치 대비 (equipment 패턴과 동일)

const rowSchema = z.object({
  serial_number: z.string().regex(ARBOR_SERIAL_REGEX),
  arbor_model: z.string().max(50).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  initial_grade: z.enum(['A', 'B', 'C', 'D']).optional(),
  runout_um: z.number().min(0).optional(),
  taper_condition: z.enum(['good', 'minor_wear', 'worn', 'damaged']).optional(),
  notes: z.string().optional()
})

const bodySchema = z.object({
  factoryId: z.string().uuid(),
  arbors: z.array(rowSchema).min(1).max(1000) // 요청당 1,000행 (클라이언트가 청크 분할)
})

const INSERT_CHUNK = 500

// GET: 업로더의 템플릿 안내용 메타 (equipment 패턴 유지)
export async function GET() {
  return NextResponse.json({
    success: true,
    template: { maxRowsPerRequest: 1000, requiredColumns: ['시리얼번호'] }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { factoryId, arbors } = bodySchema.parse(await request.json())
    const supabase = createServerClient()

    const results = {
      success: [] as string[],
      failed: [] as { serial_number: string; reason: string }[],
      duplicates: [] as string[],
      inspectionsCreated: 0
    }

    // 1) 이 배치의 시리얼만 대상으로 기존 중복 조회 (IN 절 — 전체 30K 프리페치 금지)
    const serials = arbors.map(a => a.serial_number.toUpperCase())
    const { data: existing, error: dupError } = await supabase
      .from('arbors')
      .select('serial_number')
      .eq('factory_id', factoryId)
      .in('serial_number', serials)
    if (dupError) throw dupError
    const existingSet = new Set((existing ?? []).map(e => e.serial_number))

    const fresh = arbors.filter(a => {
      const s = a.serial_number.toUpperCase()
      if (existingSet.has(s)) { results.duplicates.push(s); return false }
      return true
    })

    // 2) 500행 단위 배열 insert. 청크 실패 시 개별 insert로 강등해 행 단위 사유 수집
    for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
      const chunk = fresh.slice(i, i + INSERT_CHUNK)
      const payload = chunk.map(a => ({
        factory_id: factoryId,
        serial_number: a.serial_number.toUpperCase(),
        arbor_model: a.arbor_model ?? null,
        purchase_date: a.purchase_date ?? null,
        notes: a.notes ?? null,
        current_grade: a.initial_grade ?? null,
        last_runout_um: a.runout_um ?? null,
        last_taper_condition: a.taper_condition ?? null,
        last_inspected_at: a.initial_grade ? new Date().toISOString() : null
      }))

      const { data: inserted, error } = await supabase
        .from('arbors')
        .insert(payload)
        .select('id, serial_number')

      if (error) {
        for (const row of payload) { // 개별 강등
          const { data: one, error: oneError } = await supabase
            .from('arbors').insert(row).select('id, serial_number').single()
          if (oneError) {
            results.failed.push({
              serial_number: row.serial_number,
              reason: oneError.code === '23505' ? '이미 존재하는 시리얼' : oneError.message
            })
          } else if (one) {
            results.success.push(one.serial_number)
            await createImportInspection(supabase, factoryId, one.id, chunk, one.serial_number, results)
          }
        }
        continue
      }

      results.success.push(...(inserted ?? []).map(r => r.serial_number))

      // 3) 초기 등급+측정값이 모두 있는 행은 검사 이력도 생성 (이관 데이터 보존)
      const idBySerial = new Map((inserted ?? []).map(r => [r.serial_number, r.id]))
      const inspections = chunk
        .filter(a => a.initial_grade && a.taper_condition && a.runout_um !== undefined)
        .map(a => ({
          arbor_id: idBySerial.get(a.serial_number.toUpperCase())!,
          factory_id: factoryId,
          runout_um: a.runout_um!,
          taper_condition: a.taper_condition!,
          judged_grade: a.initial_grade!,
          previous_grade: null,
          rule_snapshot: { source: 'excel_import' },
          notes: 'Excel 일괄 등록 이관'
        }))
        .filter(r => r.arbor_id)
      if (inspections.length > 0) {
        const { error: insError } = await supabase.from('arbor_inspections').insert(inspections)
        if (!insError) results.inspectionsCreated += inspections.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `총 ${arbors.length}건 중 ${results.success.length}건 등록 (중복 ${results.duplicates.length}, 실패 ${results.failed.length})`,
      results
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력 형식 오류', details: error.issues.slice(0, 5) }, { status: 400 })
    }
    console.error('POST /api/arbors/bulk-upload error:', error)
    return NextResponse.json({ success: false, error: '일괄 등록 실패' }, { status: 500 })
  }
}

// 개별 강등 경로에서도 이관 검사 이력 생성
async function createImportInspection(
  supabase: ReturnType<typeof createServerClient>,
  factoryId: string,
  arborId: string,
  chunk: z.infer<typeof rowSchema>[],
  serial: string,
  results: { inspectionsCreated: number }
): Promise<void> {
  const src = chunk.find(c => c.serial_number.toUpperCase() === serial)
  if (!src?.initial_grade || !src.taper_condition || src.runout_um === undefined) return
  const { error } = await supabase.from('arbor_inspections').insert({
    arbor_id: arborId,
    factory_id: factoryId,
    runout_um: src.runout_um,
    taper_condition: src.taper_condition,
    judged_grade: src.initial_grade,
    previous_grade: null,
    rule_snapshot: { source: 'excel_import' },
    notes: 'Excel 일괄 등록 이관'
  })
  if (!error) results.inspectionsCreated += 1
}
```

- [ ] **Step 2: 타입 체크 후 커밋**

```bash
npx tsc --noEmit
git add app/api/arbors/bulk-upload/route.ts
git commit -m "feat(arbor): add bulk excel upload API with chunked array insert

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 9: 업로더 컴포넌트 (클라이언트 청크 분할 + 진행률)

**Files:**
- Create: `components/features/arbor/ArborExcelUploader.tsx`
- 참조 패턴: `components/features/EquipmentExcelUploader.tsx` (props/토스트/모달 관례 동일)

- [ ] **Step 1: 파일 작성 (전체 코드)**

```tsx
'use client'

import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useFactory } from '../../../lib/hooks/useFactory'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import {
  parseArborExcel, validateArborData, downloadArborTemplate, exportArborRowsToExcel
} from '../../../lib/utils/arborExcelTemplate'
import { ArborExcelRow } from '../../../lib/types/arbor'

interface ArborExcelUploaderProps {
  onUploadSuccess: () => void
  onCancel: () => void
}

const REQUEST_CHUNK = 1000 // 서버 Zod 상한과 동일

interface UploadSummary {
  success: string[]
  failed: { serial_number: string; reason: string }[]
  duplicates: string[]
  inspectionsCreated: number
}

export default function ArborExcelUploader({ onUploadSuccess, onCancel }: ArborExcelUploaderProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const { currentFactory } = useFactory()
  const dragRef = useDraggableModal()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<ArborExcelRow[]>([])
  const [fileName, setFileName] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0) // 0~100
  const [summary, setSummary] = useState<UploadSummary | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showError(t('arbor.fileFormatError'), t('arbor.excelFileOnly'))
      return
    }
    setFileName(file.name)
    setSummary(null)
    const parsed = await parseArborExcel(file)
    if (parsed.length === 0) {
      showError(t('arbor.noData'), t('arbor.excelNoData'))
      return
    }
    const { errors } = validateArborData(parsed)
    setRows(parsed)
    setValidationErrors(errors)
  }

  const handleUpload = async () => {
    if (!currentFactory?.id) {
      showError(t('arbor.noFactory'), t('arbor.selectFactoryFirst'))
      return
    }
    if (validationErrors.length > 0 || rows.length === 0) return
    setIsUploading(true)
    setProgress(0)

    const total: UploadSummary = { success: [], failed: [], duplicates: [], inspectionsCreated: 0 }
    const chunks: ArborExcelRow[][] = []
    for (let i = 0; i < rows.length; i += REQUEST_CHUNK) chunks.push(rows.slice(i, i + REQUEST_CHUNK))

    try {
      for (let i = 0; i < chunks.length; i++) {
        const res = await fetch('/api/arbors/bulk-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ factoryId: currentFactory.id, arbors: chunks[i] })
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          // 남은 행(현재 청크 포함) 재다운로드 제공 후 중단
          const remaining = chunks.slice(i).flat()
          await exportArborRowsToExcel(remaining, 'arbor_remaining_rows.xlsx')
          showError(t('arbor.uploadInterrupted'), t('arbor.remainingDownloaded'))
          break
        }
        total.success.push(...json.results.success)
        total.failed.push(...json.results.failed)
        total.duplicates.push(...json.results.duplicates)
        total.inspectionsCreated += json.results.inspectionsCreated
        setProgress(Math.round(((i + 1) / chunks.length) * 100))
      }
      setSummary(total)
      if (total.success.length > 0) {
        showSuccess(t('arbor.uploadComplete'), `${total.success.length}${t('arbor.itemsRegistered')}`)
        onUploadSuccess()
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadFailed = async () => {
    if (!summary) return
    const failedSet = new Set([...summary.failed.map(f => f.serial_number), ...summary.duplicates])
    await exportArborRowsToExcel(rows.filter(r => failedSet.has(r.serial_number.toUpperCase())), 'arbor_failed_rows.xlsx')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dragRef} className="w-full max-w-lg rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">{t('arbor.bulkUploadTitle')}</h2>

        <div className="mb-4 flex gap-2">
          <button onClick={() => downloadArborTemplate()} className="min-h-touch rounded border px-3 text-sm">
            {t('arbor.downloadTemplate')}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="min-h-touch rounded border px-3 text-sm">
            {t('arbor.selectFile')}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
        </div>

        {fileName && <p className="mb-2 text-sm text-secondary-600">{fileName} — {rows.length}{t('arbor.rowsParsed')}</p>}

        {validationErrors.length > 0 && (
          <div className="mb-3 max-h-40 overflow-y-auto rounded border border-danger/40 bg-danger/5 p-2 text-xs text-danger">
            {validationErrors.slice(0, 50).map((err, i) => <div key={i}>{err}</div>)}
            {validationErrors.length > 50 && <div>… 외 {validationErrors.length - 50}건</div>}
          </div>
        )}

        {isUploading && (
          <div className="mb-3">
            <div className="h-2 w-full rounded bg-secondary-200">
              <div className="h-2 rounded bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-center text-xs">{progress}%</p>
          </div>
        )}

        {summary && (
          <div className="mb-3 rounded border p-3 text-sm">
            <p>{t('arbor.resultSuccess')}: {summary.success.length}</p>
            <p>{t('arbor.resultDuplicates')}: {summary.duplicates.length}</p>
            <p>{t('arbor.resultFailed')}: {summary.failed.length}</p>
            <p>{t('arbor.resultInspections')}: {summary.inspectionsCreated}</p>
            {(summary.failed.length > 0 || summary.duplicates.length > 0) && (
              <button onClick={handleDownloadFailed} className="mt-2 rounded border px-2 py-1 text-xs">
                {t('arbor.downloadFailedRows')}
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="min-h-touch rounded border px-4">{t('common.cancel')}</button>
          <button
            onClick={handleUpload}
            disabled={isUploading || rows.length === 0 || validationErrors.length > 0}
            className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50"
          >
            {isUploading ? t('arbor.uploading') : t('arbor.startUpload')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit` → 에러 0

## Task 10: 진입 페이지 v1 + 메뉴 + i18n

**Files:**
- Create: `app/dashboard/arbors/page.tsx` (v1: 업로더 + 등록 총계. Stage B에서 목록 테이블로 확장)
- Modify: `app/dashboard/layout.tsx` — 메뉴 배열의 tool-changes 항목(~line 243) 뒤에 삽입
- Modify: `lib/i18n.ts` — ko/vi 두 translation 객체에 `arbor` 네임스페이스와 `navigation.arbors` 키 추가

- [ ] **Step 1: 페이지 v1 작성 (전체 코드)**

```tsx
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { useFactory } from '../../../lib/hooks/useFactory'

const ArborExcelUploader = dynamic(
  () => import('../../../components/features/arbor/ArborExcelUploader'),
  { ssr: false }
)

export default function ArborsPage() {
  const { t } = useTranslation()
  const { currentFactory } = useFactory()
  const [showUploader, setShowUploader] = useState(false)
  const [total, setTotal] = useState<number | null>(null)

  const fetchTotal = useCallback(async () => {
    if (!currentFactory?.id) return
    const res = await fetch(`/api/arbors?factoryId=${currentFactory.id}&page=1&pageSize=1`)
    const json = await res.json()
    if (json.success) setTotal(json.pagination.total)
  }, [currentFactory?.id])

  useEffect(() => { fetchTotal() }, [fetchTotal])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('arbor.title')}</h1>
          <p className="text-sm text-secondary-600">{t('arbor.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="min-h-touch rounded bg-primary px-4 text-white"
        >
          {t('arbor.bulkUploadTitle')}
        </button>
      </div>

      <div className="rounded-md border border-divider bg-paper-warm p-6">
        <p className="text-sm text-secondary-600">{t('arbor.totalRegistered')}</p>
        <p className="text-3xl font-bold">{total === null ? '—' : total.toLocaleString()}</p>
      </div>

      {showUploader && (
        <ArborExcelUploader
          onUploadSuccess={() => { setShowUploader(false); fetchTotal() }}
          onCancel={() => setShowUploader(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 사이드바 메뉴 항목 추가** — `app/dashboard/layout.tsx`
  상단 lucide import에 `Disc3` 추가 후, tool-changes 항목 뒤에:

```tsx
    {
      href: '/dashboard/arbors',
      Icon: Disc3,
      labelKey: 'navigation.arbors',
      descriptionKey: 'arbor.subtitle',
      active: pathname.startsWith('/dashboard/arbors'),
      requiresPermission: false,
    },
```

- [ ] **Step 3: i18n 키 추가** — `lib/i18n.ts` 의 ko/vi translation 객체에 기존 네임스페이스와 동일한 형태로 삽입

한국어(ko):

```typescript
    'navigation.arbors': 'Arbor 관리',
    'arbor.title': 'Arbor 관리',
    'arbor.subtitle': 'Arbor 등급(A~D)·검사 이력 관리',
    'arbor.totalRegistered': '등록된 Arbor',
    'arbor.bulkUploadTitle': 'Excel 일괄 등록',
    'arbor.downloadTemplate': '템플릿 다운로드',
    'arbor.selectFile': '파일 선택',
    'arbor.rowsParsed': '행 인식됨',
    'arbor.startUpload': '등록 시작',
    'arbor.uploading': '등록 중…',
    'arbor.uploadComplete': '일괄 등록 완료',
    'arbor.itemsRegistered': '건 등록됨',
    'arbor.uploadInterrupted': '업로드 중단',
    'arbor.remainingDownloaded': '남은 행을 파일로 내려받았습니다. 재업로드하세요.',
    'arbor.resultSuccess': '성공',
    'arbor.resultDuplicates': '중복(건너뜀)',
    'arbor.resultFailed': '실패',
    'arbor.resultInspections': '검사 이력 이관',
    'arbor.downloadFailedRows': '실패/중복 행 다운로드',
    'arbor.fileFormatError': '파일 형식 오류',
    'arbor.excelFileOnly': 'Excel 파일(.xlsx)만 업로드할 수 있습니다.',
    'arbor.noData': '데이터 없음',
    'arbor.excelNoData': '엑셀에 인식 가능한 행이 없습니다.',
    'arbor.noFactory': '공장 미선택',
    'arbor.selectFactoryFirst': '먼저 공장을 선택하세요.',
```

베트남어(vi):

```typescript
    'navigation.arbors': 'Quản lý Arbor',
    'arbor.title': 'Quản lý Arbor',
    'arbor.subtitle': 'Quản lý cấp độ Arbor (A~D) và lịch sử kiểm tra',
    'arbor.totalRegistered': 'Arbor đã đăng ký',
    'arbor.bulkUploadTitle': 'Đăng ký hàng loạt bằng Excel',
    'arbor.downloadTemplate': 'Tải mẫu',
    'arbor.selectFile': 'Chọn tệp',
    'arbor.rowsParsed': 'dòng được nhận dạng',
    'arbor.startUpload': 'Bắt đầu đăng ký',
    'arbor.uploading': 'Đang đăng ký…',
    'arbor.uploadComplete': 'Hoàn tất đăng ký hàng loạt',
    'arbor.itemsRegistered': ' mục đã đăng ký',
    'arbor.uploadInterrupted': 'Tải lên bị gián đoạn',
    'arbor.remainingDownloaded': 'Các dòng còn lại đã được tải xuống. Vui lòng tải lên lại.',
    'arbor.resultSuccess': 'Thành công',
    'arbor.resultDuplicates': 'Trùng lặp (bỏ qua)',
    'arbor.resultFailed': 'Thất bại',
    'arbor.resultInspections': 'Lịch sử kiểm tra đã chuyển',
    'arbor.downloadFailedRows': 'Tải các dòng thất bại/trùng lặp',
    'arbor.fileFormatError': 'Lỗi định dạng tệp',
    'arbor.excelFileOnly': 'Chỉ chấp nhận tệp Excel (.xlsx).',
    'arbor.noData': 'Không có dữ liệu',
    'arbor.excelNoData': 'Không có dòng hợp lệ trong tệp Excel.',
    'arbor.noFactory': 'Chưa chọn nhà máy',
    'arbor.selectFactoryFirst': 'Vui lòng chọn nhà máy trước.',
```

> lib/i18n.ts가 중첩 객체 형태라면 위 플랫 키를 동일 의미의 중첩 구조로 삽입한다
> (기존 `equipment.*` 키가 어떤 형태로 저장돼 있는지 그대로 따를 것).

- [ ] **Step 4: 커밋**

```bash
npx tsc --noEmit
git add components/features/arbor/ArborExcelUploader.tsx app/dashboard/arbors/page.tsx app/dashboard/layout.tsx lib/i18n.ts
git commit -m "feat(arbor): add bulk uploader UI, arbors page v1, nav menu, i18n

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

## Task 11: Stage A 검증 + PR

- [ ] **Step 1: 빌드/린트**

```bash
npm run build   # 기대: 성공 (TypeScript 에러 0)
npm run lint    # 기대: 에러 0
```

- [ ] **Step 2: 수동 검증 시나리오**

1. `npm run dev` → `/dashboard/arbors` 진입 → 등록 총계 카드 `0` 표시 확인
2. 템플릿 다운로드 → 3행 샘플 작성(정상 2행 + 시리얼 형식 오류 1행) → 파일 선택 → **검증 오류 1건 표시** 확인
3. 오류 행 제거 후 업로드 → 성공 2건 → SQL 확인:

```sql
select serial_number, current_grade, last_runout_um from arbors order by created_at desc limit 5;
select count(*) from arbor_inspections;  -- 초기등급+측정값 있던 행 수와 일치
```

4. **같은 파일 재업로드** → 중복 2건으로 분류(등록 0건) 확인 — 멱등성
5. 1,000행 생성 파일(스프레드시트에서 채우기)로 업로드 → 진행률 표시 → 소요 시간 기록 (30K 리허설 근거)

- [ ] **Step 3: 커밋 & PR**

```bash
git push -u origin feat/arbor-bulk-registration
gh pr create --title "feat(arbor): Arbor 마스터 스키마 + Excel 일괄 등록" --body "PRD: docs/ARBOR_GRADING_PRD.md (Stage A)

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

# Stage B (PR #2) — 목록/상세/단건 CRUD

> 브랜치: `feat/arbor-list-detail` (Stage A 머지 후 main에서 분기)

## Task 12: 단건/이력 API

**Files:**
- Create: `app/api/arbors/[id]/route.ts`
- Create: `app/api/arbors/[id]/inspections/route.ts` (이번 태스크는 GET만, POST는 Task 19)

- [ ] **Step 1: `app/api/arbors/[id]/route.ts` 작성 (전체 코드)** — UUID 라우팅 (설비 버그 감사 #1 교훈: 번호 라우팅 금지)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { ARBOR_STATUSES } from '../../../../lib/types/arbor'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from('arbors').select('*').eq('id', params.id).single()
    if (error) return NextResponse.json({ success: false, error: 'Arbor를 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: '조회 실패' }, { status: 500 })
  }
}

const updateSchema = z.object({
  arbor_model: z.string().max(50).nullable().optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(ARBOR_STATUSES).optional(),
  notes: z.string().nullable().optional()
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = updateSchema.parse(await request.json())
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('arbors')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값 오류' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: '수정 실패' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    // 검사 이력이 있으면 삭제 대신 폐기 처리 유도 (이력 보존)
    const { count } = await supabase
      .from('arbor_inspections').select('id', { count: 'exact', head: true }).eq('arbor_id', params.id)
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { success: false, error: '검사 이력이 있는 Arbor는 삭제할 수 없습니다. 상태를 폐기(disposed)로 변경하세요.' },
        { status: 409 }
      )
    }
    const { error } = await supabase.from('arbors').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 2: `app/api/arbors/[id]/inspections/route.ts` GET 작성 (전체 코드)**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/client'

// GET /api/arbors/[id]/inspections — 해당 Arbor의 이력만 (최근 100건)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('arbor_inspections')
      .select('*, inspected_by_profile:user_profiles!arbor_inspections_inspected_by_fkey(name)')
      .eq('arbor_id', params.id)
      .order('inspected_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('GET inspections error:', error)
    return NextResponse.json({ success: false, error: '검사 이력 조회 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 타입 체크 후 커밋** (`feat(arbor): add detail/update/delete and inspections list API`)

## Task 13: useArbors 훅

**Files:**
- Create: `lib/hooks/useArbors.ts`

- [ ] **Step 1: 파일 작성 (전체 코드)**

```typescript
'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useFactory } from './useFactory'
import { Arbor, ArborInspection, ArborListParams } from '../types/arbor'

interface ArborListResponse {
  success: boolean
  data: Arbor[]
  pagination: { page: number; pageSize: number; total: number }
}

export function useArbors(params: ArborListParams) {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  return useQuery<ArborListResponse>({
    queryKey: ['arbors', factoryId, params],
    enabled: !!factoryId, // factoryId 확정 전 fetch 차단 (fail-closed, 버그 감사 #2 교훈)
    placeholderData: keepPreviousData, // 페이지 전환 시 깜빡임 제거
    queryFn: async () => {
      const sp = new URLSearchParams({
        factoryId: factoryId!,
        page: String(params.page),
        pageSize: String(params.pageSize)
      })
      if (params.grade) sp.set('grade', params.grade)
      if (params.status) sp.set('status', params.status)
      if (params.search) sp.set('search', params.search)
      if (params.sortBy) sp.set('sortBy', params.sortBy)
      if (params.sortDir) sp.set('sortDir', params.sortDir)
      const res = await fetch(`/api/arbors?${sp.toString()}`)
      if (!res.ok) throw new Error('Arbor 목록 조회 실패')
      return res.json()
    }
  })
}

export function useArborDetail(id: string | null) {
  return useQuery<{ success: boolean; data: Arbor }>({
    queryKey: ['arbor', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/arbors/${id}`)
      if (!res.ok) throw new Error('Arbor 조회 실패')
      return res.json()
    }
  })
}

export function useArborInspections(id: string | null) {
  return useQuery<{ success: boolean; data: (ArborInspection & { inspected_by_profile: { name: string } | null })[] }>({
    queryKey: ['arbor-inspections', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/arbors/${id}/inspections`)
      if (!res.ok) throw new Error('검사 이력 조회 실패')
      return res.json()
    }
  })
}
```

- [ ] **Step 2: 타입 체크** — `npx tsc --noEmit`

## Task 14: 목록 페이지 v2 (테이블/필터/페이지네이션)

**Files:**
- Modify: `app/dashboard/arbors/page.tsx` — v1을 아래 전체 코드로 교체

- [ ] **Step 1: 전체 코드로 교체**

```tsx
'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useArbors } from '../../../lib/hooks/useArbors'
import { ArborGrade, ArborListParams, ArborStatus, ARBOR_GRADES, ARBOR_STATUSES } from '../../../lib/types/arbor'

const ArborExcelUploader = dynamic(
  () => import('../../../components/features/arbor/ArborExcelUploader'),
  { ssr: false }
)

const GRADE_COLOR: Record<string, string> = {
  A: 'bg-success/10 text-success', B: 'bg-primary-100 text-primary-800',
  C: 'bg-warning/10 text-warning', D: 'bg-danger/10 text-danger'
}

export default function ArborsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [showUploader, setShowUploader] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [params, setParams] = useState<ArborListParams>({
    page: 1, pageSize: 50, sortBy: 'serial_number', sortDir: 'asc'
  })

  // 검색 디바운스 300ms — 타이핑마다 요청 방지
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(p => ({ ...p, page: 1, search: searchInput.toUpperCase() || undefined }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, refetch } = useArbors(params)
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / params.pageSize))

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t('arbor.title')}</h1>
          <p className="text-sm text-secondary-600">
            {t('arbor.totalRegistered')}: {total.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/dashboard/arbors/inspect')}
            className="min-h-touch rounded border border-primary px-4 text-primary">
            {t('arbor.inspectMode')}
          </button>
          <button onClick={() => setShowUploader(true)}
            className="min-h-touch rounded bg-primary px-4 text-white">
            {t('arbor.bulkUploadTitle')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder={t('arbor.searchPlaceholder')}
          className="min-h-touch w-56 rounded border border-divider px-3"
        />
        <select
          value={params.grade ?? ''}
          onChange={e => setParams(p => ({ ...p, page: 1, grade: (e.target.value || undefined) as ArborGrade | undefined }))}
          className="min-h-touch rounded border border-divider px-2"
        >
          <option value="">{t('arbor.allGrades')}</option>
          {ARBOR_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={params.status ?? ''}
          onChange={e => setParams(p => ({ ...p, page: 1, status: (e.target.value || undefined) as ArborStatus | undefined }))}
          className="min-h-touch rounded border border-divider px-2"
        >
          <option value="">{t('arbor.allStatuses')}</option>
          {ARBOR_STATUSES.map(s => <option key={s} value={s}>{t(`arbor.status_${s}`)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-divider bg-paper-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <th className="p-3">{t('arbor.colSerial')}</th>
              <th className="p-3">{t('arbor.colModel')}</th>
              <th className="p-3">{t('arbor.colGrade')}</th>
              <th className="p-3">{t('arbor.colRunout')}</th>
              <th className="p-3">{t('arbor.colStatus')}</th>
              <th className="p-3">{t('arbor.colLastInspected')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-secondary-500">{t('common.loading')}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-secondary-500">{t('arbor.emptyList')}</td></tr>
            ) : rows.map(a => (
              <tr key={a.id}
                onClick={() => router.push(`/dashboard/arbors/${a.id}`)} // UUID 라우팅 (감사 #1 교훈)
                className="cursor-pointer border-b border-divider/60 hover:bg-secondary-50">
                <td className="p-3 font-mono">{a.serial_number}</td>
                <td className="p-3">{a.arbor_model ?? '—'}</td>
                <td className="p-3">
                  {a.current_grade
                    ? <span className={`rounded px-2 py-0.5 text-xs font-bold ${GRADE_COLOR[a.current_grade]}`}>{a.current_grade}</span>
                    : <span className="text-xs text-secondary-400">{t('arbor.uninspected')}</span>}
                </td>
                <td className="p-3">{a.last_runout_um != null ? `${a.last_runout_um}µm` : '—'}</td>
                <td className="p-3">{t(`arbor.status_${a.status}`)}</td>
                <td className="p-3">{a.last_inspected_at ? a.last_inspected_at.slice(0, 10) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button disabled={params.page <= 1}
          onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
          className="min-h-touch rounded border px-3 disabled:opacity-40">{t('common.prev')}</button>
        <span className="text-sm">{params.page} / {lastPage}</span>
        <button disabled={params.page >= lastPage}
          onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
          className="min-h-touch rounded border px-3 disabled:opacity-40">{t('common.next')}</button>
      </div>

      {showUploader && (
        <ArborExcelUploader
          onUploadSuccess={() => { setShowUploader(false); refetch() }}
          onCancel={() => setShowUploader(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: i18n 키 추가** (Task 10과 동일 위치, ko/vi 모두 — vi는 동일 의미로 번역)

```typescript
    'arbor.inspectMode': '검사 모드',
    'arbor.searchPlaceholder': '시리얼 검색 (전방일치)',
    'arbor.allGrades': '전체 등급',
    'arbor.allStatuses': '전체 상태',
    'arbor.status_active': '사용중',
    'arbor.status_repair': '수리중',
    'arbor.status_disposed': '폐기',
    'arbor.status_lost': '분실',
    'arbor.colSerial': '시리얼',
    'arbor.colModel': '규격',
    'arbor.colGrade': '등급',
    'arbor.colRunout': 'Runout',
    'arbor.colStatus': '상태',
    'arbor.colLastInspected': '최근 검사일',
    'arbor.uninspected': '미검사',
    'arbor.emptyList': '등록된 Arbor가 없습니다.',
```

- [ ] **Step 3: 커밋** (`feat(arbor): server-paginated list page with filters`)

## Task 15: 상세 페이지 (마스터 + 이력 타임라인)

**Files:**
- Create: `app/dashboard/arbors/[id]/page.tsx`

- [ ] **Step 1: 파일 작성 (전체 코드)**

```tsx
'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useArborDetail, useArborInspections } from '../../../../lib/hooks/useArbors'
import { TAPER_CODE_TO_KO } from '../../../../lib/utils/arborExcelTemplate'
import { TaperCondition } from '../../../../lib/types/arbor'

export default function ArborDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: detail, isLoading } = useArborDetail(params.id)
  const { data: history } = useArborInspections(params.id)

  if (isLoading) return <div className="p-6">{t('common.loading')}</div>
  const arbor = detail?.data
  if (!arbor) return <div className="p-6">{t('arbor.notFound')}</div>

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <button onClick={() => router.back()} className="text-sm text-secondary-600">← {t('common.back')}</button>

      <div className="rounded-md border border-divider bg-paper-warm p-6">
        <div className="flex items-center gap-4">
          <h1 className="font-mono text-2xl font-bold">{arbor.serial_number}</h1>
          <span className="rounded bg-primary-100 px-3 py-1 text-lg font-bold text-primary-800">
            {arbor.current_grade ?? t('arbor.uninspected')}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div><span className="text-secondary-500">{t('arbor.colModel')}</span><p>{arbor.arbor_model ?? '—'}</p></div>
          <div><span className="text-secondary-500">{t('arbor.colStatus')}</span><p>{t(`arbor.status_${arbor.status}`)}</p></div>
          <div><span className="text-secondary-500">{t('arbor.colRunout')}</span><p>{arbor.last_runout_um != null ? `${arbor.last_runout_um}µm` : '—'}</p></div>
          <div><span className="text-secondary-500">{t('arbor.colLastInspected')}</span><p>{arbor.last_inspected_at?.slice(0, 10) ?? '—'}</p></div>
        </div>
      </div>

      <div className="rounded-md border border-divider bg-paper-warm p-6">
        <h2 className="mb-3 text-lg font-bold">{t('arbor.inspectionHistory')}</h2>
        {!history?.data?.length ? (
          <p className="text-sm text-secondary-500">{t('arbor.noInspections')}</p>
        ) : (
          <ul className="space-y-2">
            {history.data.map(ins => (
              <li key={ins.id} className="flex flex-wrap items-center gap-3 border-b border-divider/60 pb-2 text-sm">
                <span className="w-24 font-bold">{ins.judged_grade}{ins.previous_grade ? ` (← ${ins.previous_grade})` : ''}</span>
                <span>{ins.runout_um}µm</span>
                <span>{TAPER_CODE_TO_KO[ins.taper_condition as TaperCondition] ?? ins.taper_condition}</span>
                <span className="text-secondary-500">{ins.inspected_at.slice(0, 16).replace('T', ' ')}</span>
                <span className="text-secondary-500">{ins.inspected_by_profile?.name ?? ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: i18n 키 추가** (ko/vi)

```typescript
    'arbor.notFound': 'Arbor를 찾을 수 없습니다.',
    'arbor.inspectionHistory': '검사 이력',
    'arbor.noInspections': '검사 이력이 없습니다.',
```

- [ ] **Step 3: 커밋** (`feat(arbor): detail page with inspection timeline`)

## Task 16: Stage B 검증 + PR

- [ ] **Step 1:** `npm run build` + `npm run lint` → 성공
- [ ] **Step 2: 수동 검증** — 목록 진입(50행 표시), 등급/상태 필터, 시리얼 검색 디바운스 동작, 페이지 이동 시 깜빡임 없음(keepPreviousData), 행 클릭 → 상세 → 이관 이력 표시. 브라우저 Network 탭에서 목록 요청 응답 크기 **50KB 미만** 확인 (전체-fetch 아님을 증명)
- [ ] **Step 3:** push + `gh pr create` (Stage A와 동일 요령)

---

# Stage C (PR #3) — 검사 워크플로우 + 등급 판정 + 기준 설정

> 브랜치: `feat/arbor-inspection`

## Task 17: 설정 타입 + 기본값

**Files:**
- Modify: `lib/types/settings.ts` — `SystemSettings` 인터페이스와 기본값 객체(~line 148-219)에 `arbor` 카테고리 추가

- [ ] **Step 1: 인터페이스에 추가**

```typescript
  arbor: {
    gradeRules: {
      runoutThresholds: { A: number; B: number; C: number }  // µm, D는 C 초과
      taperGradeCap: { good: 'A' | 'B' | 'C' | 'D'; minor_wear: 'A' | 'B' | 'C' | 'D'; worn: 'A' | 'B' | 'C' | 'D'; damaged: 'A' | 'B' | 'C' | 'D' }
    }
    inspectionIntervalDays: number
  }
```

- [ ] **Step 2: 기본값 객체에 추가** (PRD §11-2 잠정 기본값 — 확정 시 이 값만 변경)

```typescript
  arbor: {
    gradeRules: {
      runoutThresholds: { A: 5, B: 10, C: 20 },
      taperGradeCap: { good: 'A', minor_wear: 'B', worn: 'C', damaged: 'D' }
    },
    inspectionIntervalDays: 180
  },
```

- [ ] **Step 3:** `npx tsc --noEmit` — useSettings 소비처에서 타입 에러가 없는지 확인

## Task 18: 등급 판정 순수 함수

**Files:**
- Create: `lib/utils/arborGrade.ts`

> 💡 이 함수는 순수 비즈니스 로직이므로 **사용자가 직접 작성해 보기 좋은 지점**이다.
> 아래는 참조 구현 — 직접 작성 시 검증 매트릭스만 통과하면 된다.

- [ ] **Step 1: 파일 작성 (전체 코드)**

```typescript
import { ArborGrade, TaperCondition, ARBOR_GRADES } from '../types/arbor'

export interface ArborGradeRules {
  runoutThresholds: { A: number; B: number; C: number } // µm 상한 (이하 포함)
  taperGradeCap: Record<TaperCondition, ArborGrade>     // 외관별 등급 상한
}

function runoutGrade(runoutUm: number, th: ArborGradeRules['runoutThresholds']): ArborGrade {
  if (runoutUm <= th.A) return 'A'
  if (runoutUm <= th.B) return 'B'
  if (runoutUm <= th.C) return 'C'
  return 'D'
}

// worst-of: Runout 등급과 Taper 상한 중 나쁜 쪽 (PRD §7)
export function judgeArborGrade(
  runoutUm: number,
  taperCondition: TaperCondition,
  rules: ArborGradeRules
): ArborGrade {
  const byRunout = runoutGrade(runoutUm, rules.runoutThresholds)
  const cap = rules.taperGradeCap[taperCondition]
  return ARBOR_GRADES[Math.max(ARBOR_GRADES.indexOf(byRunout), ARBOR_GRADES.indexOf(cap))]
}
```

- [ ] **Step 2: 검증 매트릭스** — Task 21의 검사 API 수동 검증에서 아래 케이스를 curl로 확인한다
  (기본값 A≤5/B≤10/C≤20 기준):

| runout_um | taper | 기대 등급 | 근거 |
|---|---|---|---|
| 4 | good | **A** | 둘 다 A |
| 5 | good | **A** | 경계값 포함(≤) |
| 5.01 | good | **B** | Runout이 B |
| 4 | minor_wear | **B** | Taper 상한 B |
| 12 | good | **C** | Runout이 C |
| 8 | damaged | **D** | Taper 상한 D |
| 25 | good | **D** | Runout 초과 |

## Task 19: 검사 저장 API (판정 + 이력 + 마스터 갱신)

**Files:**
- Modify: `app/api/arbors/[id]/inspections/route.ts` — POST 핸들러 추가 (기존 GET 유지)

- [ ] **Step 1: POST 추가 (전체 코드 — 파일 상단 import 병합)**

```typescript
import { z } from 'zod'
import { judgeArborGrade, ArborGradeRules } from '../../../../../lib/utils/arborGrade'
import { TAPER_CONDITIONS } from '../../../../../lib/types/arbor'
import { createClient } from '@/lib/supabase/server' // 검사자 식별용 (쿠키 세션)

const inspectionSchema = z.object({
  factoryId: z.string().uuid(),
  runout_um: z.number().min(0).max(9999),
  taper_condition: z.enum(TAPER_CONDITIONS),
  notes: z.string().optional()
})

const DEFAULT_RULES: ArborGradeRules = {
  runoutThresholds: { A: 5, B: 10, C: 20 },
  taperGradeCap: { good: 'A', minor_wear: 'B', worn: 'C', damaged: 'D' }
}

async function loadRules(supabase: ReturnType<typeof createServerClient>): Promise<ArborGradeRules> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('category', 'arbor')
    .eq('key', 'gradeRules')
    .maybeSingle()
  return (data?.value as ArborGradeRules | null) ?? DEFAULT_RULES
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = inspectionSchema.parse(await request.json())
    const supabase = createServerClient()

    // 대상 arbor 확인 + fail-closed 공장 검증
    const { data: arbor, error: arborError } = await supabase
      .from('arbors')
      .select('id, factory_id, current_grade, status')
      .eq('id', params.id)
      .single()
    if (arborError || !arbor) {
      return NextResponse.json({ success: false, error: 'Arbor를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (arbor.factory_id !== body.factoryId) {
      return NextResponse.json({ success: false, error: '선택한 공장의 Arbor가 아닙니다.' }, { status: 403 })
    }
    if (arbor.status === 'disposed') {
      return NextResponse.json({ success: false, error: '폐기된 Arbor는 검사할 수 없습니다.' }, { status: 409 })
    }

    // 검사자 식별 (없어도 저장은 진행 — 기록용)
    const authClient = createClient()
    const { data: { user } } = await authClient.auth.getUser()
    let inspectedBy: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles').select('id').eq('user_id', user.id).maybeSingle()
      inspectedBy = profile?.id ?? null
    }

    const rules = await loadRules(supabase)
    const judged = judgeArborGrade(body.runout_um, body.taper_condition, rules)
    const now = new Date().toISOString()

    // 1) 이력 insert
    const { data: inspection, error: insError } = await supabase
      .from('arbor_inspections')
      .insert({
        arbor_id: arbor.id,
        factory_id: arbor.factory_id,
        runout_um: body.runout_um,
        taper_condition: body.taper_condition,
        judged_grade: judged,
        previous_grade: arbor.current_grade,
        rule_snapshot: rules as unknown as Record<string, unknown>,
        inspected_by: inspectedBy,
        inspected_at: now,
        notes: body.notes ?? null
      })
      .select('id')
      .single()
    if (insError) throw insError

    // 2) 마스터 갱신 — 실패 시 이력 삭제(보상 롤백, 재고 outbound 패턴)
    const { error: updError } = await supabase
      .from('arbors')
      .update({
        current_grade: judged,
        last_runout_um: body.runout_um,
        last_taper_condition: body.taper_condition,
        last_inspected_at: now,
        updated_at: now
      })
      .eq('id', arbor.id)
    if (updError) {
      await supabase.from('arbor_inspections').delete().eq('id', inspection.id)
      throw updError
    }

    return NextResponse.json({
      success: true,
      data: { judged_grade: judged, previous_grade: arbor.current_grade, rule_snapshot: rules }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: '입력값 오류' }, { status: 400 })
    }
    console.error('POST inspection error:', error)
    return NextResponse.json({ success: false, error: '검사 저장 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입 체크 후 커밋** (`feat(arbor): inspection API with auto grading and compensating rollback`)

## Task 20: 연속 검사 모드 페이지

**Files:**
- Create: `app/dashboard/arbors/inspect/page.tsx`

- [ ] **Step 1: 파일 작성 (전체 코드)** — USB 스캐너=키보드 입력 가정(재고 입고 패턴), 저장 후 자동으로 스캔 입력 포커스 복귀

```tsx
'use client'

import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFactory } from '../../../../lib/hooks/useFactory'
import { useToast } from '../../../../components/shared/Toast'
import { Arbor, ArborGrade, TaperCondition, TAPER_CONDITIONS } from '../../../../lib/types/arbor'
import { TAPER_CODE_TO_KO } from '../../../../lib/utils/arborExcelTemplate'

const GRADE_STYLE: Record<ArborGrade, string> = {
  A: 'bg-success text-white', B: 'bg-primary-600 text-white',
  C: 'bg-warning text-white', D: 'bg-danger text-white'
}

export default function ArborInspectPage() {
  const { t } = useTranslation()
  const { currentFactory } = useFactory()
  const { showError } = useToast()
  const scanRef = useRef<HTMLInputElement>(null)

  const [serialInput, setSerialInput] = useState('')
  const [arbor, setArbor] = useState<Arbor | null>(null)
  const [runout, setRunout] = useState('')
  const [taper, setTaper] = useState<TaperCondition | null>(null)
  const [result, setResult] = useState<ArborGrade | null>(null)
  const [saving, setSaving] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)

  const resetForNext = useCallback(() => {
    setSerialInput(''); setArbor(null); setRunout(''); setTaper(null)
    setTimeout(() => scanRef.current?.focus(), 50) // 다음 스캔 대기
  }, [])

  const lookupSerial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentFactory?.id || !serialInput.trim()) return
    setResult(null)
    const res = await fetch(
      `/api/arbors?factoryId=${currentFactory.id}&serial=${encodeURIComponent(serialInput.trim().toUpperCase())}&page=1&pageSize=1`
    )
    const json = await res.json()
    if (!json.success || json.data.length === 0) {
      showError(t('arbor.notFound'), serialInput)
      setSerialInput('')
      return
    }
    setArbor(json.data[0])
  }

  const save = async () => {
    if (!arbor || !currentFactory?.id || !taper || runout === '') return
    setSaving(true)
    try {
      const res = await fetch(`/api/arbors/${arbor.id}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: currentFactory.id,
          runout_um: Number(runout),
          taper_condition: taper
        })
      })
      const json = await res.json()
      if (!json.success) { showError(t('arbor.saveFailed'), json.error ?? ''); return }
      setResult(json.data.judged_grade)
      setSessionCount(c => c + 1)
      setTimeout(resetForNext, 1200) // 등급 확인 시간 후 다음 건
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('arbor.inspectMode')}</h1>
        <span className="text-sm text-secondary-600">{t('arbor.sessionCount')}: {sessionCount}</span>
      </div>

      <form onSubmit={lookupSerial}>
        <input
          ref={scanRef}
          autoFocus
          value={serialInput}
          onChange={e => setSerialInput(e.target.value)}
          placeholder={t('arbor.scanPlaceholder')}
          className="min-h-touch w-full rounded border-2 border-primary px-4 font-mono text-lg"
        />
      </form>

      {arbor && (
        <div className="space-y-4 rounded-md border border-divider bg-paper-warm p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xl font-bold">{arbor.serial_number}</span>
            <span className="text-sm text-secondary-600">
              {t('arbor.currentGrade')}: {arbor.current_grade ?? t('arbor.uninspected')}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Runout (µm)</label>
            <input
              type="number" inputMode="decimal" min="0" step="0.1"
              value={runout}
              onChange={e => setRunout(e.target.value)}
              className="min-h-touch w-full rounded border border-divider px-4 text-lg"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('arbor.taperCondition')}</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TAPER_CONDITIONS.map(c => (
                <button key={c} type="button"
                  onClick={() => setTaper(c)}
                  className={`min-h-touch rounded border px-2 py-3 text-sm font-medium
                    ${taper === c ? 'border-primary bg-primary-100 text-primary-800' : 'border-divider'}`}>
                  {TAPER_CODE_TO_KO[c]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || runout === '' || !taper}
            className="min-h-touch w-full rounded bg-primary py-3 text-lg font-bold text-white disabled:opacity-40"
          >
            {saving ? t('common.saving') : t('arbor.saveInspection')}
          </button>
        </div>
      )}

      {result && (
        <div className={`rounded-md p-8 text-center ${GRADE_STYLE[result]}`}>
          <p className="text-sm">{t('arbor.judgedGrade')}</p>
          <p className="text-6xl font-black">{result}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: i18n 키 추가** (ko/vi)

```typescript
    'arbor.scanPlaceholder': '시리얼 스캔 또는 입력 후 Enter',
    'arbor.currentGrade': '현재 등급',
    'arbor.taperCondition': 'Taper 외관',
    'arbor.saveInspection': '검사 저장',
    'arbor.judgedGrade': '판정 등급',
    'arbor.sessionCount': '이번 세션',
    'arbor.saveFailed': '저장 실패',
```

- [ ] **Step 3: 커밋** (`feat(arbor): continuous inspection mode page`)

## Task 21: 등급 기준 설정 UI + settings PUT 권한 가드

**Files:**
- Create: `components/features/arbor/ArborGradeRulesSettings.tsx`
- Modify: `app/dashboard/settings/page.tsx` — 기존 카테고리 섹션 나열부에 `<ArborGradeRulesSettings />` 1줄 마운트
- Modify: `app/api/settings/route.ts` — PUT 핸들러 시작부에 권한 가드 (버그 감사 #3의 검증된 수정안, 등급 기준 보호 목적)

- [ ] **Step 1: 설정 컴포넌트 작성 (전체 코드)** — 저장은 기존 `/api/settings` PUT(category `arbor`) 사용

```tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useSettings } from '../../../lib/hooks/useSettings'
import { ArborGrade, TAPER_CONDITIONS, TaperCondition } from '../../../lib/types/arbor'
import { TAPER_CODE_TO_KO } from '../../../lib/utils/arborExcelTemplate'

export default function ArborGradeRulesSettings() {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const { settings } = useSettings()

  const [thresholds, setThresholds] = useState({ A: 5, B: 10, C: 20 })
  const [caps, setCaps] = useState<Record<TaperCondition, ArborGrade>>({
    good: 'A', minor_wear: 'B', worn: 'C', damaged: 'D'
  })
  const [intervalDays, setIntervalDays] = useState(180)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const a = settings.arbor
    if (a) {
      setThresholds(a.gradeRules.runoutThresholds)
      setCaps(a.gradeRules.taperGradeCap)
      setIntervalDays(a.inspectionIntervalDays)
    }
  }, [settings.arbor])

  const save = async () => {
    if (!(thresholds.A < thresholds.B && thresholds.B < thresholds.C)) {
      showError(t('arbor.rulesInvalid'), t('arbor.thresholdOrderError'))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'arbor',
          updates: {
            gradeRules: { runoutThresholds: thresholds, taperGradeCap: caps },
            inspectionIntervalDays: intervalDays
          }
        })
      })
      const json = await res.json()
      if (json.success) showSuccess(t('common.saved'), t('arbor.rulesSaved'))
      else showError(t('arbor.saveFailed'), json.error ?? '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-md border border-divider bg-paper-warm p-6">
      <h2 className="mb-4 text-lg font-bold">{t('arbor.gradeRulesTitle')}</h2>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {(['A', 'B', 'C'] as const).map(g => (
          <div key={g}>
            <label className="mb-1 block text-sm">{g} {t('arbor.maxRunout')} (µm)</label>
            <input type="number" min="0" step="0.1" value={thresholds[g]}
              onChange={e => setThresholds(v => ({ ...v, [g]: Number(e.target.value) }))}
              className="min-h-touch w-full rounded border border-divider px-3" />
          </div>
        ))}
      </div>
      <p className="mb-4 text-xs text-secondary-500">{t('arbor.dGradeNote')}</p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TAPER_CONDITIONS.map(c => (
          <div key={c}>
            <label className="mb-1 block text-sm">{TAPER_CODE_TO_KO[c]} {t('arbor.gradeCap')}</label>
            <select value={caps[c]}
              onChange={e => setCaps(v => ({ ...v, [c]: e.target.value as ArborGrade }))}
              className="min-h-touch w-full rounded border border-divider px-2">
              {(['A', 'B', 'C', 'D'] as const).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="mb-4 w-48">
        <label className="mb-1 block text-sm">{t('arbor.inspectionInterval')} ({t('common.days')})</label>
        <input type="number" min="1" value={intervalDays}
          onChange={e => setIntervalDays(Number(e.target.value))}
          className="min-h-touch w-full rounded border border-divider px-3" />
      </div>

      <button onClick={save} disabled={saving}
        className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50">
        {saving ? t('common.saving') : t('common.save')}
      </button>
    </section>
  )
}
```

- [ ] **Step 2: settings PUT 권한 가드** — `app/api/settings/route.ts` PUT 핸들러 `try {` 직후에 삽입
  (버그 감사 #3에서 검증된 패턴 — POST/DELETE에도 동일 적용 권장이나 이번 범위는 PUT 필수):

```typescript
    const authClient = createClient() // '@/lib/supabase/server' — 쿠키 바인딩 JWT 검증
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await authClient
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()
    const roleType = (profile as { user_roles?: { type?: string } } | null)?.user_roles?.type
    if (roleType !== 'admin' && roleType !== 'system_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
```

- [ ] **Step 3: i18n 키 추가** (ko/vi)

```typescript
    'arbor.gradeRulesTitle': 'Arbor 등급 기준',
    'arbor.maxRunout': '등급 Runout 상한',
    'arbor.dGradeNote': 'C 상한을 초과하면 D등급으로 판정됩니다.',
    'arbor.gradeCap': '등급 상한',
    'arbor.inspectionInterval': '검사 주기',
    'arbor.rulesInvalid': '기준값 오류',
    'arbor.thresholdOrderError': 'A < B < C 순서여야 합니다.',
    'arbor.rulesSaved': '등급 기준이 저장되었습니다.',
```

- [ ] **Step 4: 커밋** (`feat(arbor): grade rules settings UI and settings PUT permission guard`)

## Task 22: Stage C 검증 + PR

- [ ] **Step 1:** `npm run build` + `npm run lint` → 성공
- [ ] **Step 2: 판정 매트릭스 검증** — Task 18의 표 7케이스를 검사 모드 화면(또는 curl)으로 실행, 기대 등급 일치 확인:

```bash
curl -X POST http://localhost:3000/api/arbors/<ARBOR_ID>/inspections \
  -H "Content-Type: application/json" \
  -d '{"factoryId":"<FACTORY_ID>","runout_um":4,"taper_condition":"minor_wear"}'
# 기대: {"success":true,"data":{"judged_grade":"B", ...}}
```

- [ ] **Step 3:** 검사 저장 후 상세 페이지 이력에 previous_grade/rule_snapshot 반영 확인:

```sql
select judged_grade, previous_grade, rule_snapshot->>'source' is null as live_rule
from arbor_inspections order by inspected_at desc limit 3;
```

- [ ] **Step 4:** 설정에서 A 상한을 3으로 변경 → 같은 4µm 검사 시 B로 판정 변경 확인 → 과거 이력의 판정은 불변 확인. **role='user' 계정으로 설정 PUT 시 403** 확인 (권한 가드)
- [ ] **Step 5:** push + PR

---

# Stage D (PR #4) — 통계 + 내보내기 + 상태 전환

> 브랜치: `feat/arbor-stats`

## Task 23: 통계 RPC + API

**Files:**
- Create: `supabase/migrations/20260704130000_add_arbor_stats_rpc.sql`
- Create: `app/api/arbors/stats/route.ts`

- [ ] **Step 1: RPC 마이그레이션 (전체 코드)** — 집계는 SQL로, 행이 아닌 숫자만 반환 (PRD §4.4-5)

```sql
create or replace function public.get_arbor_stats(
  p_factory_id uuid,
  p_interval_days int default 180
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'total',       count(*) filter (where status <> 'disposed'),
    'gradeA',      count(*) filter (where current_grade = 'A' and status = 'active'),
    'gradeB',      count(*) filter (where current_grade = 'B' and status = 'active'),
    'gradeC',      count(*) filter (where current_grade = 'C' and status = 'active'),
    'gradeD',      count(*) filter (where current_grade = 'D' and status = 'active'),
    'uninspected', count(*) filter (where current_grade is null and status = 'active'),
    'repair',      count(*) filter (where status = 'repair'),
    'disposed',    count(*) filter (where status = 'disposed'),
    'overdue',     count(*) filter (where status = 'active'
                     and (last_inspected_at is null
                          or last_inspected_at < now() - make_interval(days => p_interval_days)))
  )
  from public.arbors
  where factory_id = p_factory_id;
$$;
```

- [ ] **Step 2: 적용 + 확인** — `npx supabase db push` 후:

```sql
select public.get_arbor_stats((select id from factories where code='ALT'));
-- 기대: {"total": N, "gradeA": ..., "overdue": ...} JSON 1행
```

- [ ] **Step 3: `app/api/arbors/stats/route.ts` 작성 (전체 코드)**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const factoryId = request.nextUrl.searchParams.get('factoryId')
    if (!factoryId) {
      return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    }
    const intervalDays = Number(request.nextUrl.searchParams.get('intervalDays') ?? 180)
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_arbor_stats', {
      p_factory_id: factoryId,
      p_interval_days: intervalDays
    })
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/arbors/stats error:', error)
    return NextResponse.json({ success: false, error: '통계 조회 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 커밋** (`feat(arbor): stats RPC and API`)

## Task 24: 통계 카드 (목록 상단)

**Files:**
- Modify: `lib/hooks/useArbors.ts` — `useArborStats` 추가
- Modify: `app/dashboard/arbors/page.tsx` — 헤더 아래 카드 그리드 삽입

- [ ] **Step 1: 훅 추가**

```typescript
export interface ArborStats {
  total: number; gradeA: number; gradeB: number; gradeC: number; gradeD: number
  uninspected: number; repair: number; disposed: number; overdue: number
}

export function useArborStats() {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  return useQuery<{ success: boolean; data: ArborStats }>({
    queryKey: ['arbor-stats', factoryId],
    enabled: !!factoryId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/arbors/stats?factoryId=${factoryId}`)
      if (!res.ok) throw new Error('통계 조회 실패')
      return res.json()
    }
  })
}
```

- [ ] **Step 2: 목록 페이지에 카드 삽입** — `const { data, isLoading, refetch } = useArbors(params)` 아래에 훅 호출을,
  필터 영역 위에 카드 그리드를 추가:

```tsx
  const { data: statsRes } = useArborStats()
  const stats = statsRes?.data
```

```tsx
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([['A', stats.gradeA], ['B', stats.gradeB], ['C', stats.gradeC], ['D', stats.gradeD]] as const).map(([g, n]) => (
            <div key={g} className="rounded-md border border-divider bg-paper-warm p-3 text-center">
              <p className="text-xs text-secondary-500">{g}{t('arbor.gradeSuffix')}</p>
              <p className="text-xl font-bold">{n.toLocaleString()}</p>
            </div>
          ))}
          <div className="rounded-md border border-divider bg-paper-warm p-3 text-center">
            <p className="text-xs text-secondary-500">{t('arbor.uninspected')}</p>
            <p className="text-xl font-bold">{stats.uninspected.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-warning bg-warning/5 p-3 text-center">
            <p className="text-xs text-warning">{t('arbor.overdue')}</p>
            <p className="text-xl font-bold text-warning">{stats.overdue.toLocaleString()}</p>
          </div>
        </div>
      )}
```

- [ ] **Step 3: i18n** — `'arbor.gradeSuffix': '등급'`, `'arbor.overdue': '검사 지연'` (ko/vi). 검사 저장 성공 시
  `['arbor-stats']` 쿼리 무효화가 필요하면 검사 페이지에서 `useQueryClient().invalidateQueries({ queryKey: ['arbor-stats'] })` 호출 추가.
- [ ] **Step 4: 커밋** (`feat(arbor): grade distribution cards on list page`)

## Task 25: Excel 내보내기 (청크 방식)

**Files:**
- Modify: `lib/utils/arborExcelTemplate.ts` — 내보내기 함수 추가
- Modify: `app/dashboard/arbors/page.tsx` — 내보내기 버튼 추가

- [ ] **Step 1: 유틸 함수 추가** — 전체-fetch 금지 원칙에 따라 1,000행씩 순차 조회하며 조립

```typescript
import { Arbor } from '../types/arbor'

export async function exportArborsToExcel(
  factoryId: string,
  filters: { grade?: string; status?: string; search?: string },
  onProgress?: (pct: number) => void
): Promise<void> {
  const pageSize = 1000
  let page = 1
  let total = Infinity
  const all: Arbor[] = []
  while ((page - 1) * pageSize < total) {
    const sp = new URLSearchParams({ factoryId, page: String(page), pageSize: String(pageSize) })
    if (filters.grade) sp.set('grade', filters.grade)
    if (filters.status) sp.set('status', filters.status)
    if (filters.search) sp.set('search', filters.search)
    const res = await fetch(`/api/arbors?${sp.toString()}`)
    const json = await res.json()
    if (!json.success) throw new Error('내보내기 조회 실패')
    all.push(...json.data)
    total = json.pagination.total
    onProgress?.(Math.min(100, Math.round((all.length / Math.max(1, total)) * 100)))
    page += 1
    if (json.data.length === 0) break
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Arbor목록')
  ws.addRow(['시리얼번호', '규격', '등급', 'Runout(um)', 'Taper상태', '상태', '최근검사일', '구매일', '비고'])
  ws.getRow(1).font = { bold: true }
  all.forEach(a => ws.addRow([
    a.serial_number, a.arbor_model ?? '', a.current_grade ?? '미검사',
    a.last_runout_um ?? '', a.last_taper_condition ? TAPER_CODE_TO_KO[a.last_taper_condition] : '',
    a.status, a.last_inspected_at?.slice(0, 10) ?? '', a.purchase_date ?? '', a.notes ?? ''
  ]))
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, `arbors_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
```

- [ ] **Step 2: 버튼 추가** — 목록 페이지 헤더 버튼 그룹에:

```tsx
          <button
            onClick={() => currentFactory?.id && exportArborsToExcel(
              currentFactory.id,
              { grade: params.grade, status: params.status, search: params.search }
            )}
            className="min-h-touch rounded border px-4"
          >
            {t('arbor.exportExcel')}
          </button>
```

(페이지 상단에 `useFactory` 훅과 `exportArborsToExcel` import 추가. i18n: `'arbor.exportExcel': 'Excel 내보내기'` ko/vi)

- [ ] **Step 3: 커밋** (`feat(arbor): chunked excel export`)

## Task 26: 상태 전환 UI (상세 페이지)

**Files:**
- Modify: `app/dashboard/arbors/[id]/page.tsx` — 마스터 카드에 상태 변경 셀렉트 추가

- [ ] **Step 1: 상세 페이지에 핸들러+UI 추가** — 마스터 정보 그리드 아래:

```tsx
  const changeStatus = async (status: string) => {
    const res = await fetch(`/api/arbors/${arbor.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    const json = await res.json()
    if (json.success) location.reload()
  }
```

```tsx
        <div className="mt-4 flex items-center gap-2">
          <label className="text-sm text-secondary-500">{t('arbor.changeStatus')}</label>
          <select
            value={arbor.status}
            onChange={e => changeStatus(e.target.value)}
            className="min-h-touch rounded border border-divider px-2"
          >
            {ARBOR_STATUSES.map(s => <option key={s} value={s}>{t(`arbor.status_${s}`)}</option>)}
          </select>
        </div>
```

(import에 `ARBOR_STATUSES` 추가. i18n: `'arbor.changeStatus': '상태 변경'` ko/vi.
수리(repair) 후 재검사하면 검사 API가 등급을 갱신하므로 별도 "등급 복귀" 로직은 불필요 — FR-10 충족)

- [ ] **Step 2: 커밋** (`feat(arbor): status transition on detail page`)

## Task 27: 최종 검증 + 30K 리허설 체크리스트 + PR

- [ ] **Step 1:** `npm run build` + `npm run lint` → 성공
- [ ] **Step 2: 통계 정합성** — 검사 1건 수행 후 카드 수치 변화 확인, SQL 교차 검증:

```sql
select current_grade, count(*) from arbors
where factory_id = (select id from factories where code='ALT') group by 1;
```

- [ ] **Step 3: 30,000행 리허설 체크리스트** (프로덕션 투입 전 1회)
  - 실데이터 Excel 30K행(1공장 20K + 2공장 10K, 공장별 파일 분리) 준비, 시리얼 중복 사전 점검
  - 업무 시간 외에 공장별로 업로드 (각 20~30분 이내 예상: 1,000행/요청 × 20~30요청)
  - 업로드 직후 Supabase 대시보드 Reports에서 Disk IO/CPU 확인 (6/29 런북 절차)
  - `analyze public.arbors;` 실행 (통계 갱신 — equipment의 stale 통계 사례 예방)
  - 목록/검색/통계 응답 시간 확인 (<1초 목표)
- [ ] **Step 4:** push + PR

---

## 계획 자체 점검 결과 (self-review)

- **스펙 커버리지**: FR-1(T7/T12) FR-2(T6/T8/T9) FR-3(T7/T14) FR-4(T15) FR-5(T18~20) FR-6(T20)
  FR-7(T17/T21) FR-8(T19 rule_snapshot) FR-9(T23/T24) FR-10(T26+T19) FR-11(T25) FR-12(후속 트랙 — PRD 조정 완료)
- **의도적 제외**: RLS(사용자 결정, 차후 트랙), Realtime(설계 원칙상 금지), 대시보드 메인 카드(Arbor 목록
  상단 카드로 1차 충족 — 메인 대시보드 노출은 후속 요청 시)
- **일관성**: 타입/함수명(`judgeArborGrade`, `useArbors`, `ArborGradeRules`)과 API 응답 형태
  `{ success, data, pagination }`를 전 태스크에서 통일함
