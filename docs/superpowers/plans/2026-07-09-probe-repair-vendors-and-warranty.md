# 프로브 수리 업체 관리 + 보증 계산 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로브 외주/내부 수리에 업체(vendor)를 연결·추적하고, 외주 6개월(2회-리셋)·내부 3개월 보증을 자동 계산한다.

**Architecture:** 신규 `probe_vendors` 테이블 + `probe_repairs.vendor_id`. 보증 분류는 순수 함수(`lib/domain/probeWarranty.ts`)로 분리해 단위 테스트하고, 수리 등록 API가 이를 호출해 `original_repair_id`를 자동 설정한다. `warranty_until`은 유형 인지 GENERATED 컬럼으로 유지. UI는 업체 관리 페이지 + 수리 모달 드롭다운/현황 + 수리 현황 필터.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase(Postgres, service-role 서버 클라이언트), Zod, jest(+next/jest), i18next.

**Spec:** `docs/superpowers/specs/2026-07-09-probe-repair-vendors-and-warranty-design.md`

---

## File Structure

**생성:**
- `supabase/migrations/20260709110000_probe_vendors_and_warranty.sql` — 스키마
- `lib/domain/probeWarranty.ts` — 순수 보증 분류 함수
- `lib/domain/__tests__/probeWarranty.test.ts` — 단위 테스트
- `jest.config.js`, `jest.setup.ts` — 테스트 설정
- `app/api/probe-vendors/route.ts` — 업체 GET/POST
- `app/api/probe-vendors/[id]/route.ts` — 업체 PUT/DELETE
- `lib/hooks/useProbeVendors.ts` — 업체 목록 훅
- `app/dashboard/probes/vendors/page.tsx` — 업체 관리 페이지
- `components/features/probe/ProbeVendorModal.tsx` — 업체 추가/수정 모달

**수정:**
- `lib/types/probe.ts` — `ProbeVendor` 타입, `ProbeRepair`에 `vendor_id`
- `app/api/probes/[id]/repairs/route.ts` — vendor_id + 자동 보증 분류
- `app/api/probes/repairs/route.ts` — vendorId 필터 + vendor 조인
- `components/features/probe/ProbeRepairModal.tsx` — 업체 드롭다운 + 보증 현황
- `app/dashboard/probes/repairs/page.tsx` — 업체 컬럼 + 필터
- `app/dashboard/probes/page.tsx` — "업체 관리" 링크
- `lib/i18n.ts` — 신규 번역 키(ko/vi)
- `package.json` — test 스크립트

---

## Task 1: 마이그레이션 (스키마)

**Files:**
- Create: `supabase/migrations/20260709110000_probe_vendors_and_warranty.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 프로브 수리 업체 관리 + 유형 인지 보증
-- 1) probe_vendors: 외주수리/부품구매 업체. 한 업체가 두 역할 겸할 수 있음.
create table if not exists public.probe_vendors (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id),
  name varchar(100) not null,
  is_repair_vendor boolean not null default false,
  is_parts_vendor  boolean not null default false,
  contact_name varchar(50),
  phone varchar(30),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_probe_vendors_role check (is_repair_vendor or is_parts_vendor)
);
create unique index if not exists uq_probe_vendors_factory_name
  on public.probe_vendors (factory_id, lower(name));
create index if not exists idx_probe_vendors_factory_active
  on public.probe_vendors (factory_id, is_active);

-- 2) probe_repairs.vendor_id (nullable — 기존 이력 보존)
alter table public.probe_repairs
  add column if not exists vendor_id uuid references public.probe_vendors(id);
create index if not exists idx_probe_repairs_probe_vendor
  on public.probe_repairs (probe_id, vendor_id);

-- 3) warranty_until GENERATED 재정의: internal=완료일+3mo, external/rbe=반환일+6mo
--    date + interval → ::date 는 IMMUTABLE 이라 GENERATED 안전.
drop index if exists idx_probe_repairs_factory_warranty;
alter table public.probe_repairs drop column if exists warranty_until;
alter table public.probe_repairs add column warranty_until date
  generated always as (
    case repair_type
      when 'internal' then (completed_at + interval '3 months')::date
      else (returned_at + interval '6 months')::date
    end
  ) stored;
create index if not exists idx_probe_repairs_factory_warranty
  on public.probe_repairs (factory_id, warranty_until);
```

- [ ] **Step 2: 원격 DB에 적용**

Supabase MCP `apply_migration` (name: `probe_vendors_and_warranty`, query: 위 SQL) 로 원격 적용.
Expected: 성공. 오류 시 `warranty_until` 의존 객체(뷰 등) 확인.

- [ ] **Step 3: 적용 검증 (SQL)**

`execute_sql`로 확인:
```sql
select column_name, data_type from information_schema.columns
where table_name='probe_repairs' and column_name in ('vendor_id','warranty_until');
select count(*) filter (where warranty_until is not null) as internal_now_has_warranty
from probe_repairs where repair_type='internal';
```
Expected: `vendor_id`(uuid)·`warranty_until`(date) 존재. 기존 internal 수리에 warranty_until이 채워짐(있다면).

- [ ] **Step 4: 로컬 마이그레이션 파일 커밋**

```bash
git add supabase/migrations/20260709110000_probe_vendors_and_warranty.sql
git commit -m "feat(probe): probe_vendors 테이블 + vendor_id + 유형 인지 warranty_until"
```

---

## Task 2: 타입 정의

**Files:**
- Modify: `lib/types/probe.ts`

- [ ] **Step 1: ProbeVendor 타입 + ProbeRepair.vendor_id 추가**

`lib/types/probe.ts` 하단 및 `ProbeRepair` 인터페이스에 추가:
```ts
export interface ProbeVendor {
  id: string
  factory_id: string
  name: string
  is_repair_vendor: boolean
  is_parts_vendor: boolean
  contact_name: string | null
  phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
```
`ProbeRepair` 인터페이스에 필드 추가(기존 인터페이스 내부):
```ts
  vendor_id: string | null
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS (probe.ts 관련 오류 없음). `database.ts`의 자동생성 타입은 `as any` 캐스팅으로 접근 중이므로 재생성 불필요.

- [ ] **Step 3: 커밋**

```bash
git add lib/types/probe.ts
git commit -m "feat(probe): ProbeVendor 타입 + ProbeRepair.vendor_id"
```

---

## Task 3: jest 테스트 설정

**Files:**
- Create: `jest.config.js`, `jest.setup.ts`
- Modify: `package.json`

- [ ] **Step 1: jest.config.js 작성 (next/jest 사용 — 추가 의존성 불필요)**

```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
}
module.exports = createJestConfig(customJestConfig)
```

- [ ] **Step 2: jest.setup.ts 작성**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: package.json에 test 스크립트 추가**

`scripts`에 추가:
```json
    "test": "jest",
    "test:watch": "jest --watch"
```

- [ ] **Step 4: 빈 실행으로 설정 확인**

Run: `npx jest --passWithNoTests`
Expected: "No tests found ... passWithNoTests" 로 종료 코드 0.

- [ ] **Step 5: 커밋**

```bash
git add jest.config.js jest.setup.ts package.json
git commit -m "chore(test): jest(next/jest) 설정 추가"
```

---

## Task 4: 보증 분류 순수 함수 (TDD)

**Files:**
- Create: `lib/domain/probeWarranty.ts`
- Test: `lib/domain/__tests__/probeWarranty.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/domain/__tests__/probeWarranty.test.ts`:
```ts
import { classifyExternalWarranty, PriorRepair } from '../probeWarranty'

const origin = (over: Partial<PriorRepair>): PriorRepair => ({
  id: 'r0', repair_type: 'external', vendor_id: 'V', status: 'completed',
  returned_at: '2026-01-10', original_repair_id: null, warranty_until: '2026-07-10', ...over,
})

describe('classifyExternalWarranty', () => {
  it('이력 없으면 새 원점(청구 아님)', () => {
    const r = classifyExternalWarranty([], '2026-02-01')
    expect(r).toEqual({ originalRepairId: null, isWarrantyClaim: false, claimSequence: 0, activePeriodOriginId: null })
  })

  it('창 내 1회차는 보증 청구(seq 1)', () => {
    const r = classifyExternalWarranty([origin({})], '2026-03-01')
    expect(r).toEqual({ originalRepairId: 'r0', isWarrantyClaim: true, claimSequence: 1, activePeriodOriginId: 'r0' })
  })

  it('창 내 2회차는 보증 청구(seq 2)', () => {
    const prior = [
      origin({}),
      { id: 'w1', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-03-05', original_repair_id: 'r0', warranty_until: '2026-09-05' },
    ]
    const r = classifyExternalWarranty(prior, '2026-05-01')
    expect(r.isWarrantyClaim).toBe(true)
    expect(r.claimSequence).toBe(2)
    expect(r.originalRepairId).toBe('r0')
  })

  it('창 내 3회차는 새 원점(리셋)', () => {
    const prior = [
      origin({}),
      { id: 'w1', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-03-05', original_repair_id: 'r0', warranty_until: '2026-09-05' },
      { id: 'w2', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-05-04', original_repair_id: 'r0', warranty_until: '2026-11-04' },
    ]
    const r = classifyExternalWarranty(prior, '2026-06-01')
    expect(r).toEqual({ originalRepairId: null, isWarrantyClaim: false, claimSequence: 0, activePeriodOriginId: null })
  })

  it('창 만료 후에는 새 원점', () => {
    const r = classifyExternalWarranty([origin({ warranty_until: '2026-07-10' })], '2026-08-01')
    expect(r.isWarrantyClaim).toBe(false)
    expect(r.originalRepairId).toBeNull()
  })

  it('미완료(open) 원점은 후보 아님 → 새 원점', () => {
    const r = classifyExternalWarranty([origin({ status: 'sent', returned_at: null, warranty_until: null })], '2026-03-01')
    expect(r.isWarrantyClaim).toBe(false)
  })

  it('가장 최근 활성 원점을 사용(리셋 이후 새 원점 우선)', () => {
    const prior = [
      origin({ id: 'r0', returned_at: '2026-01-10', warranty_until: '2026-07-10' }),
      { id: 'w1', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-03-05', original_repair_id: 'r0', warranty_until: '2026-09-05' },
      { id: 'w2', repair_type: 'external' as const, vendor_id: 'V', status: 'completed', returned_at: '2026-05-04', original_repair_id: 'r0', warranty_until: '2026-11-04' },
      origin({ id: 'r1', returned_at: '2026-06-05', warranty_until: '2026-12-05' }),
    ]
    const r = classifyExternalWarranty(prior, '2026-07-01')
    expect(r.originalRepairId).toBe('r1')
    expect(r.claimSequence).toBe(1)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest probeWarranty -v`
Expected: FAIL — "Cannot find module '../probeWarranty'".

- [ ] **Step 3: 최소 구현 작성**

`lib/domain/probeWarranty.ts`:
```ts
// 프로브 외주/RBE 보증 분류 (순수 함수 — DB 접근 없음)
// 규칙(스펙 4.2): (프로브+업체) 단위. 활성 기간-원점(original_repair_id=null, status=completed,
// warranty_until >= occurredAt)이 보증수리 2회 미만이면 그 원점에 보증 청구. 아니면 새 원점.
export type RepairTypeForWarranty = 'internal' | 'external' | 'rbe'

export interface PriorRepair {
  id: string
  repair_type: RepairTypeForWarranty
  vendor_id: string | null
  status: string
  returned_at: string | null
  original_repair_id: string | null
  warranty_until: string | null
}

export interface WarrantyClassification {
  originalRepairId: string | null   // 연결할 기간-원점 (null = 새 원점)
  isWarrantyClaim: boolean
  claimSequence: number             // 청구면 1|2, 새 원점이면 0
  activePeriodOriginId: string | null
}

const NEW_PERIOD: WarrantyClassification = {
  originalRepairId: null, isWarrantyClaim: false, claimSequence: 0, activePeriodOriginId: null,
}

// priorSameProbeVendor: 동일 (probe, vendor)의 기존 external/rbe 수리들.
export function classifyExternalWarranty(
  priorSameProbeVendor: PriorRepair[],
  occurredAt: string
): WarrantyClassification {
  const completed = priorSameProbeVendor.filter(
    r => (r.repair_type === 'external' || r.repair_type === 'rbe') && r.status === 'completed'
  )
  // 후보 원점: original_repair_id=null, 창이 발생일에 열려 있음(warranty_until >= occurredAt)
  const origins = completed
    .filter(r => r.original_repair_id === null && r.warranty_until !== null && r.warranty_until >= occurredAt)
    .sort((a, b) => (b.returned_at ?? '').localeCompare(a.returned_at ?? '')) // 최근 반환일 우선

  for (const o of origins) {
    const claims = completed.filter(r => r.original_repair_id === o.id).length
    if (claims < 2) {
      return {
        originalRepairId: o.id, isWarrantyClaim: true,
        claimSequence: claims + 1, activePeriodOriginId: o.id,
      }
    }
  }
  return NEW_PERIOD
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest probeWarranty -v`
Expected: PASS (7개 테스트 모두).

- [ ] **Step 5: 커밋**

```bash
git add lib/domain/probeWarranty.ts lib/domain/__tests__/probeWarranty.test.ts
git commit -m "feat(probe): 보증 분류 순수 함수 + 단위 테스트"
```

---

## Task 5: 업체 목록/생성 API

**Files:**
- Create: `app/api/probe-vendors/route.ts`

**참조 패턴:** `app/api/probes/repairs/route.ts`(authorizeFactory, createServerClient), `app/api/probes/[id]/repairs/route.ts`(isAdminRole, zod).

- [ ] **Step 1: GET/POST 라우트 작성**

`app/api/probe-vendors/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../lib/supabase/client'
import { authorizeFactory, isAdminRole } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

// GET /api/probe-vendors?factoryId=&role=repair|parts&activeOnly=true — 드롭다운/목록 (user+)
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const factoryId = sp.get('factoryId')
    if (!factoryId) return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    const supabase = createServerClient()
    let query = supabase.from('probe_vendors').select('*').eq('factory_id', factoryId)
    if (sp.get('activeOnly') === 'true') query = query.eq('is_active', true)
    const role = sp.get('role')
    if (role === 'repair') query = query.eq('is_repair_vendor', true)
    else if (role === 'parts') query = query.eq('is_parts_vendor', true)

    const { data, error } = await query.order('name')
    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('GET /api/probe-vendors error:', error)
    return NextResponse.json({ success: false, error: '업체 조회 실패' }, { status: 500 })
  }
}

const createSchema = z.object({
  factoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  is_repair_vendor: z.boolean(),
  is_parts_vendor: z.boolean(),
  contact_name: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().optional(),
}).refine(v => v.is_repair_vendor || v.is_parts_vendor, { message: '최소 1개 역할 필요' })

// POST — 생성 (admin+)
export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json())
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    if (!isAdminRole(auth.me.role)) return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

    const supabase = createServerClient()
    const { data, error } = await supabase.from('probe_vendors').insert({
      factory_id: body.factoryId,
      name: body.name,
      is_repair_vendor: body.is_repair_vendor,
      is_parts_vendor: body.is_parts_vendor,
      contact_name: body.contact_name ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    }).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: '이미 같은 이름의 업체가 있습니다.' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    console.error('POST /api/probe-vendors error:', error)
    return NextResponse.json({ success: false, error: '업체 생성 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS. (`probe_vendors`는 database.ts 자동 타입에 없으므로 필요 시 `.from('probe_vendors' as any)` 캐스팅 — settings route.ts 패턴과 동일.)

- [ ] **Step 3: 커밋**

```bash
git add app/api/probe-vendors/route.ts
git commit -m "feat(probe): 업체 목록/생성 API"
```

---

## Task 6: 업체 수정/삭제 API

**Files:**
- Create: `app/api/probe-vendors/[id]/route.ts`

- [ ] **Step 1: PUT/DELETE 라우트 작성**

`app/api/probe-vendors/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { authorizeFactory, isAdminRole } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  factoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  is_repair_vendor: z.boolean().optional(),
  is_parts_vendor: z.boolean().optional(),
  contact_name: z.string().trim().max(50).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  is_active: z.boolean().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = updateSchema.parse(await request.json())
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    if (!isAdminRole(auth.me.role)) return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { factoryId, ...patch } = body
    const { data, error } = await supabase.from('probe_vendors')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', params.id).eq('factory_id', factoryId).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: '이미 같은 이름의 업체가 있습니다.' }, { status: 409 })
      if (error.code === '23514') return NextResponse.json({ success: false, error: '최소 1개 역할이 필요합니다.' }, { status: 400 })
      throw error
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    console.error('PUT /api/probe-vendors/[id] error:', error)
    return NextResponse.json({ success: false, error: '업체 수정 실패' }, { status: 500 })
  }
}

// DELETE ?factoryId= — 수리에 참조되면 거부(409), 대신 is_active=false 안내
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const factoryId = request.nextUrl.searchParams.get('factoryId')
    if (!factoryId) return NextResponse.json({ success: false, error: 'factoryId가 필요합니다.' }, { status: 400 })
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    if (!isAdminRole(auth.me.role)) return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

    const supabase = createServerClient()
    const { count, error: refError } = await supabase.from('probe_repairs')
      .select('id', { count: 'exact', head: true }).eq('vendor_id', params.id)
    if (refError) throw refError
    if ((count ?? 0) > 0) {
      return NextResponse.json({ success: false, error: '수리 이력에 연결된 업체는 삭제할 수 없습니다. 비활성 처리하세요.' }, { status: 409 })
    }
    const { error } = await supabase.from('probe_vendors').delete().eq('id', params.id).eq('factory_id', factoryId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/probe-vendors/[id] error:', error)
    return NextResponse.json({ success: false, error: '업체 삭제 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 타입체크 + 린트**

Run: `npx tsc --noEmit -p tsconfig.json && npx next lint --file app/api/probe-vendors/[id]/route.ts`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add app/api/probe-vendors/[id]/route.ts
git commit -m "feat(probe): 업체 수정/삭제 API (참조 시 삭제 거부)"
```

---

## Task 7: 수리 등록에 vendor_id + 자동 보증 분류

**Files:**
- Modify: `app/api/probes/[id]/repairs/route.ts`

- [ ] **Step 1: 생성 스키마에 vendor_id 추가 (외주·내부 필수, RBE optional)**

`repairCreateSchema`의 각 분기에 vendor_id 추가:
```ts
const repairCreateSchema = z.discriminatedUnion('repair_type', [
  z.object({
    repair_type: z.literal('internal'),
    completed_at: z.string().regex(DATE_RE),
    replaced_parts: z.string().trim().min(1),
    vendor_id: z.string().uuid(),      // 내부: 부품 구매 업체 필수
    ...baseFields
  }),
  z.object({ repair_type: z.literal('external'), vendor_id: z.string().uuid(), ...baseFields }), // 외주 필수
  z.object({ repair_type: z.literal('rbe'), vendor_id: z.string().uuid().optional(), ...baseFields }) // RBE optional
])
```
그리고 `baseFields`에서 `original_repair_id`는 제거(서버 자동 계산). `baseFields`를 다음으로 교체:
```ts
const baseFields = {
  factoryId: z.string().uuid(),
  failure_type: z.enum(FAILURE_TYPES),
  occurred_at: z.string().regex(DATE_RE),
  notes: z.string().optional()
}
```

- [ ] **Step 2: import 추가**

파일 상단에 추가:
```ts
import { classifyExternalWarranty, PriorRepair } from '@/lib/domain/probeWarranty'
```

- [ ] **Step 3: vendor 역할 검증 + 자동 보증 분류를 insert 앞에 삽입**

기존 POST의 프로브 검증(폐기/분실 체크) 다음, `const isInternal = ...` 앞에 삽입.
기존 `if (body.original_repair_id) { ... }` 블록은 **삭제**(서버 자동 계산으로 대체):
```ts
    // 업체 역할 검증 (vendor_id가 있으면)
    let vendorId: string | null = ('vendor_id' in body ? body.vendor_id : undefined) ?? null
    if (vendorId) {
      const { data: vendor, error: vErr } = await supabase
        .from('probe_vendors').select('id, factory_id, is_repair_vendor, is_parts_vendor, is_active')
        .eq('id', vendorId).maybeSingle()
      if (vErr || !vendor) return NextResponse.json({ success: false, error: '선택한 업체를 찾을 수 없습니다.' }, { status: 400 })
      if (vendor.factory_id !== body.factoryId) return NextResponse.json({ success: false, error: '선택한 공장의 업체가 아닙니다.' }, { status: 403 })
      const needsRepair = body.repair_type === 'external' || body.repair_type === 'rbe'
      if (needsRepair && !vendor.is_repair_vendor) return NextResponse.json({ success: false, error: '외주 수리 업체가 아닙니다.' }, { status: 400 })
      if (body.repair_type === 'internal' && !vendor.is_parts_vendor) return NextResponse.json({ success: false, error: '부품 구매 업체가 아닙니다.' }, { status: 400 })
    }

    // 자동 보증 분류 (external/rbe). internal은 항상 새 건(original 없음).
    let originalRepairId: string | null = null
    if (body.repair_type !== 'internal' && vendorId) {
      const { data: prior, error: priorErr } = await supabase
        .from('probe_repairs')
        .select('id, repair_type, vendor_id, status, returned_at, original_repair_id, warranty_until')
        .eq('probe_id', probe.id).eq('vendor_id', vendorId)
      if (priorErr) throw priorErr
      const cls = classifyExternalWarranty((prior ?? []) as PriorRepair[], body.occurred_at)
      originalRepairId = cls.originalRepairId
    }
```

- [ ] **Step 4: insert 객체에 vendor_id/originalRepairId 반영**

insert의 `original_repair_id`와 `vendor_id` 라인을 다음으로:
```ts
        original_repair_id: originalRepairId,
        vendor_id: vendorId,
```

- [ ] **Step 5: 타입체크 + 린트**

Run: `npx tsc --noEmit -p tsconfig.json && npx next lint --file "app/api/probes/[id]/repairs/route.ts"`
Expected: PASS. (`probe_vendors`/`vendor_id` 타입 미존재 시 `.from('probe_vendors' as any)` / insert 객체 `as any` 캐스팅.)

- [ ] **Step 6: DB 통합 확인 (수동, SQL)**

`execute_sql`로 테스트 업체 1개 생성 후, API로 external 수리 2건 등록 시나리오를 SQL로 시뮬레이션하거나, 개발 서버에서 실제 등록해 `original_repair_id`가 2회차에 채워지는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add "app/api/probes/[id]/repairs/route.ts"
git commit -m "feat(probe): 수리 등록에 업체 연결 + 서버 자동 보증 분류"
```

---

## Task 8: 수리 현황 조회에 vendor 조인 + 필터

**Files:**
- Modify: `app/api/probes/repairs/route.ts`

- [ ] **Step 1: select에 vendor 조인, vendorId 필터 추가**

`.select(...)`를 다음으로 변경:
```ts
.select('*, probe:probes!probe_repairs_probe_id_fkey(asset_number, model, equipment_id), vendor:probe_vendors(id, name)', { count: 'exact' })
```
`factoryId` eq 다음에 필터 추가:
```ts
    const vendorId = sp.get('vendorId')
    if (vendorId) query = query.eq('vendor_id', vendorId)
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS (필요 시 select 문자열은 런타임이므로 영향 없음).

- [ ] **Step 3: 커밋**

```bash
git add app/api/probes/repairs/route.ts
git commit -m "feat(probe): 수리 현황에 업체 조인 + vendorId 필터"
```

---

## Task 9: 업체 목록 훅 + 관리 페이지

**Files:**
- Create: `lib/hooks/useProbeVendors.ts`, `app/dashboard/probes/vendors/page.tsx`, `components/features/probe/ProbeVendorModal.tsx`

**참조:** `lib/hooks/useProbeRepairs`(있으면), `app/dashboard/probes/page.tsx`(페이지 레이아웃/useFactory 사용), `components/features/probe/ProbeMoveModal.tsx`(모달 패턴).

- [ ] **Step 1: 업체 훅 작성**

`lib/hooks/useProbeVendors.ts`:
```ts
import { useQuery } from '@tanstack/react-query'
import { ProbeVendor } from '@/lib/types/probe'

export function useProbeVendors(factoryId: string | null, role?: 'repair' | 'parts', activeOnly = true) {
  return useQuery({
    queryKey: ['probe-vendors', factoryId, role, activeOnly],
    enabled: !!factoryId,
    queryFn: async (): Promise<ProbeVendor[]> => {
      const sp = new URLSearchParams({ factoryId: factoryId! })
      if (role) sp.set('role', role)
      if (activeOnly) sp.set('activeOnly', 'true')
      const res = await fetch(`/api/probe-vendors?${sp.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? '업체 조회 실패')
      return json.data
    },
  })
}
```

- [ ] **Step 2: 업체 모달 작성**

`components/features/probe/ProbeVendorModal.tsx` — `ProbeMoveModal.tsx`의 구조(useDraggableModal, fixed overlay, useToast)를 그대로 따르되 필드: name(필수), is_repair_vendor/is_parts_vendor(체크박스, 최소 1), contact_name, phone, notes, is_active(수정 시). props: `{ factoryId, editVendor?: ProbeVendor | null, onDone, onCancel }`. 저장 시 `POST /api/probe-vendors`(신규) 또는 `PUT /api/probe-vendors/${editVendor.id}`(수정), body에 factoryId 포함. 성공 시 `onDone()`.

```tsx
// 핵심 저장 로직 (모달 내부)
const save = async () => {
  if (!name.trim() || (!isRepair && !isParts)) return
  setSaving(true)
  try {
    const url = editVendor ? `/api/probe-vendors/${editVendor.id}` : '/api/probe-vendors'
    const res = await fetch(url, {
      method: editVendor ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factoryId, name: name.trim(), is_repair_vendor: isRepair, is_parts_vendor: isParts,
        contact_name: contactName.trim() || undefined, phone: phone.trim() || undefined,
        notes: notes.trim() || undefined, ...(editVendor ? { is_active: isActive } : {}),
      }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) { showError(t('probe.vendorSaveFailed'), json.error ?? ''); return }
    showSuccess(t('probe.vendorSaveSuccess'), name.trim()); onDone()
  } finally { setSaving(false) }
}
```

- [ ] **Step 3: 관리 페이지 작성**

`app/dashboard/probes/vendors/page.tsx` — `useFactory()`로 factoryId, `useProbeVendors(factoryId, undefined, false)`로 전체 목록. 테이블 컬럼: 이름·역할(뱃지: 외주수리/부품구매)·담당자·전화·활성. 헤더에 "업체 추가" 버튼(admin+ — `useAuth().hasPermission` 또는 role 확인). 행별 수정 버튼(모달), 삭제 버튼(확인 후 `DELETE /api/probe-vendors/${id}?factoryId=`). 삭제 409면 에러 토스트(비활성 안내). 저장/삭제 후 `queryClient.invalidateQueries({ queryKey: ['probe-vendors'] })`.

- [ ] **Step 4: 타입체크 + 린트**

Run: `npx tsc --noEmit -p tsconfig.json && npx next lint`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/hooks/useProbeVendors.ts app/dashboard/probes/vendors/page.tsx components/features/probe/ProbeVendorModal.tsx
git commit -m "feat(probe): 업체 관리 페이지 + 모달 + 훅"
```

---

## Task 10: 수리 모달 업체 드롭다운 + 보증 현황

**Files:**
- Modify: `components/features/probe/ProbeRepairModal.tsx`

- [ ] **Step 1: previewWarrantyUntil을 유형 인지로 수정**

```ts
function previewWarrantyUntil(baseDate: string, months: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return null
  const d = new Date(`${baseDate}T00:00:00`)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}
// 사용처: internal은 (completedAt, 3), external/rbe는 (returnedAt, 6)
```

- [ ] **Step 2: 업체 드롭다운 상태 + 목록 로드**

`useProbeVendors`로 역할별 목록 로드. `repairType`이 internal이면 `role='parts'`, 아니면 `role='repair'`. 상태 `const [vendorId, setVendorId] = useState(editRepair?.vendor_id ?? '')`. register 모드에서 `repairType` 변경 시 vendorId 초기화.

```tsx
const vendorRole = repairType === 'internal' ? 'parts' : 'repair'
const { data: vendors = [] } = useProbeVendors(factoryId, vendorRole, true)
// 드롭다운 (register/edit 공통, failureType select 아래에 배치)
<div>
  <label className="mb-1 block text-sm font-medium">{t('probe.vendor')}
    {repairType !== 'rbe' && <span className="text-danger"> *</span>}
  </label>
  <select value={vendorId} onChange={e => setVendorId(e.target.value)}
    className="min-h-touch w-full rounded border border-divider bg-white pl-3 pr-8">
    <option value="">{t('common.select')}</option>
    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
  </select>
</div>
```

- [ ] **Step 3: 기존 수동 보증 후보 라디오 제거 + registerValid에 vendor 필수 반영**

`warrantyCandidates` useMemo와 관련 JSX(`repairType !== 'internal' && warrantyCandidates.length > 0 ...`) **삭제**. `originalRepairId` 상태·제출 필드 삭제. `registerValid`에 vendor 필수 추가:
```ts
const registerValid =
  !!failureType && !!occurredAt &&
  (repairType === 'rbe' || !!vendorId) &&   // 외주·내부 업체 필수
  (repairType !== 'internal' || (!!completedAt && replacedParts.trim().length > 0))
```

- [ ] **Step 4: submitRegister body에 vendor_id 반영, original_repair_id 제거**

```ts
body: JSON.stringify({
  factoryId, repair_type: repairType, failure_type: failureType, occurred_at: occurredAt,
  ...(vendorId ? { vendor_id: vendorId } : {}),
  ...(repairType === 'internal' ? { completed_at: completedAt, replaced_parts: replacedParts.trim() } : {}),
  notes: notes.trim() || undefined,
}),
```

- [ ] **Step 5: 보증 현황 텍스트 표시 (register, external/rbe, 업체 선택 시)**

`repairHistory`(prop)를 사용해 클라이언트에서 현황 미리보기(서버가 최종 진실). 선택 vendor + occurredAt 기준으로 `classifyExternalWarranty`를 재사용:
```tsx
import { classifyExternalWarranty, PriorRepair } from '@/lib/domain/probeWarranty'
// ...
const warrantyPreview = useMemo(() => {
  if (mode !== 'register' || repairType === 'internal' || !vendorId) return null
  const ref = occurredAt || new Date().toISOString().slice(0, 10)
  const prior = repairHistory.filter(r => r.vendor_id === vendorId) as unknown as PriorRepair[]
  const cls = classifyExternalWarranty(prior, ref)
  return cls.isWarrantyClaim
    ? { claim: true, seq: cls.claimSequence }
    : { claim: false, seq: 0 }
}, [mode, repairType, vendorId, occurredAt, repairHistory])
// 표시
{warrantyPreview && (
  <p className="text-xs text-secondary-600">
    {warrantyPreview.claim
      ? t('probe.warrantyClaimInfo', { seq: warrantyPreview.seq })
      : t('probe.warrantyNewPeriodInfo')}
  </p>
)}
```
(주의: `repairHistory`의 각 항목에 `vendor_id`/`warranty_until`/`original_repair_id`/`status`/`returned_at`/`repair_type`가 포함되도록, 부모가 넘기는 데이터가 `probe_repairs` 원본 필드를 갖는지 확인. `ProbeRepair` 타입에 이미 존재.)

- [ ] **Step 6: 타입체크 + 린트**

Run: `npx tsc --noEmit -p tsconfig.json && npx next lint --file components/features/probe/ProbeRepairModal.tsx`
Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add components/features/probe/ProbeRepairModal.tsx
git commit -m "feat(probe): 수리 모달 업체 드롭다운 + 보증 현황(자동 분류 미리보기)"
```

---

## Task 11: 수리 현황 페이지 업체 컬럼 + 필터

**Files:**
- Modify: `app/dashboard/probes/repairs/page.tsx`

- [ ] **Step 1: 업체 필터 드롭다운 추가**

`useProbeVendors(factoryId, 'repair', false)` + `useProbeVendors(factoryId, 'parts', false)` 병합(또는 role 미지정 전체 로드)으로 필터 옵션 구성. 필터 상태 `vendorId`를 조회 쿼리스트링 `vendorId`에 반영(기존 status/overdue 필터와 동일 패턴).

- [ ] **Step 2: 테이블에 업체 컬럼 추가**

수리 목록 행 렌더에 `row.vendor?.name ?? '-'` 컬럼 추가(헤더 `t('probe.vendor')`). 조인 응답(`vendor:probe_vendors(id,name)`)에서 옴.

- [ ] **Step 3: 타입체크 + 린트**

Run: `npx tsc --noEmit -p tsconfig.json && npx next lint --file app/dashboard/probes/repairs/page.tsx`
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add app/dashboard/probes/repairs/page.tsx
git commit -m "feat(probe): 수리 현황 업체 컬럼 + 업체별 필터"
```

---

## Task 12: 업체 관리 링크 + i18n

**Files:**
- Modify: `app/dashboard/probes/page.tsx`, `lib/i18n.ts`

- [ ] **Step 1: 프로브 관리 페이지에 "업체 관리" 링크 추가**

`app/dashboard/probes/page.tsx` 헤더 버튼 영역에 `router.push('/dashboard/probes/vendors')` 버튼 추가(admin+ 노출).

- [ ] **Step 2: i18n 키 추가 (ko/vi)**

`lib/i18n.ts`의 `probe` 카테고리에 ko/vi 양쪽 추가:
```
probe.vendor = '업체' / 'Nhà cung cấp'
probe.vendorManage = '업체 관리' / 'Quản lý nhà cung cấp'
probe.vendorAdd = '업체 추가' / 'Thêm nhà cung cấp'
probe.roleRepair = '외주 수리' / 'Sửa ngoài'
probe.roleParts = '부품 구매' / 'Mua linh kiện'
probe.vendorContact = '담당자' / 'Người phụ trách'
probe.vendorPhone = '전화' / 'Điện thoại'
probe.vendorActive = '활성' / 'Kích hoạt'
probe.vendorSaveSuccess = '업체가 저장되었습니다' / 'Đã lưu nhà cung cấp'
probe.vendorSaveFailed = '업체 저장 실패' / 'Lưu nhà cung cấp thất bại'
probe.vendorDeleteFailed = '업체 삭제 실패' / 'Xóa nhà cung cấp thất bại'
probe.warrantyClaimInfo = '보증 청구 {{seq}}/2회차' / 'Bảo hành lần {{seq}}/2'
probe.warrantyNewPeriodInfo = '새 보증 기간으로 등록됩니다' / 'Đăng ký kỳ bảo hành mới'
```
(기존 i18n.ts의 키 구조/문법에 맞춰 삽입.)

- [ ] **Step 3: 타입체크 + 린트**

Run: `npx tsc --noEmit -p tsconfig.json && npx next lint`
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add app/dashboard/probes/page.tsx lib/i18n.ts
git commit -m "feat(probe): 업체 관리 링크 + i18n(ko/vi)"
```

---

## Task 13: 최종 검증

- [ ] **Step 1: 전체 타입체크 + 린트 + 단위테스트**

Run: `npx tsc --noEmit -p tsconfig.json && npx next lint && npx jest`
Expected: 모두 PASS.

- [ ] **Step 2: 개발 서버 E2E 확인 (수동)**

`npm run dev` 후: ① 업체 2개 생성(외주/부품) ② 프로브 external 수리 등록(업체 선택, 현황 "새 보증") → 마감 ③ 같은 프로브·업체로 재등록 시 "보증 청구 1/2회차" 표시 ④ 3회차에 "새 보증 기간" ⑤ 수리 현황에서 업체 컬럼/필터 동작 ⑥ 참조된 업체 삭제 시 409.

- [ ] **Step 3: 최종 커밋 & 푸시**

```bash
git add -A && git commit -m "chore(probe): 업체/보증 기능 최종 검증" ; git push origin main
```

---

## 구현 순서 요약

Task 1(마이그레이션) → 2(타입) → 3(jest) → 4(보증함수 TDD) → 5·6(업체 API) → 7(수리 등록 통합) → 8(현황 조회) → 9(업체 페이지) → 10(수리 모달) → 11(현황 UI) → 12(링크·i18n) → 13(검증).
