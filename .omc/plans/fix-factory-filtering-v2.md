# Fix Factory Filtering v2 - Critic 피드백 반영

## Context

### Root Cause
모든 API route GET 핸들러는 `searchParams.get('factoryId')` (camelCase)로 파싱한다.
그러나 `useInventory.ts`와 `useCAMSheets.ts`는 `factory_id` (snake_case)로 쿼리 파라미터를 전송.
결과: API에서 factoryId가 null이 되어 전체 데이터 반환.

추가로 `endmill/page.tsx`와 `endmill-disposal/page.tsx`는 `useFactory` 자체를 사용하지 않아 factoryId를 아예 전달하지 않음.

### Critic v1 거부 사유 및 대응
1. **통일 방향 수정**: `factoryId`(camelCase)로 통일 (대다수 API/훅이 이미 사용)
2. **inventory 하위 라우트**: inbound/outbound도 확인 완료 - GET은 `factoryId`로 파싱, POST body는 `factory_id` 수신
3. **stale closure**: 앤드밀/폐기 페이지에서 useEffect 의존성에 factoryId 추가
4. **전체 API 목록 명시**: 아래 테이블 참조

## API Route GET 파라미터 파싱 현황 (모두 `factoryId` camelCase)

| API Route | GET 파싱 코드 | 변경 필요 |
|-----------|--------------|----------|
| `api/dashboard/route.ts:17` | `searchParams.get('factoryId')` | NO |
| `api/equipment/route.ts:72` | `searchParams.get('factoryId')` | NO |
| `api/equipment/bulk-upload/route.ts:194` | `searchParams.get('factoryId')` | NO |
| `api/inventory/route.ts:66` | `searchParams.get('factoryId')` | NO |
| `api/inventory/inbound/route.ts:16` | `searchParams.get('factoryId')` | NO |
| `api/inventory/outbound/route.ts:13` | `searchParams.get('factoryId')` | NO |
| `api/cam-sheets/route.ts:47` | `searchParams.get('factoryId')` | NO |
| `api/tool-changes/route.ts:68` | `searchParams.get('factoryId')` | NO |
| `api/tool-changes/stats/route.ts:45` | `searchParams.get('factoryId')` | NO |
| `api/tool-changes/auto-fill/route.ts:14` | `searchParams.get('factoryId')` | NO |
| `api/endmill/route.ts:12` | `searchParams.get('factoryId')` | NO |
| `api/endmill-disposals/route.ts:55` | `searchParams.get('factoryId')` | NO |

**결론: API 서버 코드 변경 불필요. 훅/페이지만 수정.**

## Hook GET 파라미터 전송 현황

| Hook | 현재 GET 파라미터 | 변경 필요 |
|------|-------------------|----------|
| `useEquipment.ts:54` | `params.set('factoryId', factoryId)` | NO (이미 올바름) |
| `useInventory.ts:66` | `{ factory_id: factoryId }` | **YES -> `{ factoryId }`** |
| `useCAMSheets.ts:61` | `{ factory_id: factoryId }` | **YES -> `{ factoryId }`** |
| `useCAMSheets.ts:213` | `factory_id=${factoryId}` (DELETE) | **YES -> `factoryId=${factoryId}`** |

## Must Have
- 훅의 GET 쿼리 파라미터를 `factoryId` (camelCase)로 변경
- POST/PUT body의 `factory_id` (snake_case)는 유지 (DB 컬럼명)
- 앤드밀/폐기 페이지에 `useFactory` 연동

## Must NOT Have
- API route 서버 코드 변경
- DB 스키마 변경
- 새 파일 생성

## Task Flow

```
Task 1 (useInventory GET 파라미터 수정) ──┐
Task 2 (useCAMSheets GET 파라미터 수정) ──┤── 독립 수행 가능
Task 3 (endmill page useFactory 연동) ────┤
Task 4 (endmill-disposal page useFactory 연동) ─┘
```

## Detailed TODOs

### Task 1: useInventory.ts GET 파라미터 수정
**File:** `lib/hooks/useInventory.ts`

**변경 1곳 (GET 쿼리 파라미터):**
- Line 66: `...(factoryId && { factory_id: factoryId })` -> `...(factoryId && { factoryId })`

**변경하지 않는 곳 (POST/PUT body - DB 컬럼명이므로 유지):**
- Line 138: `factory_id: factoryId` (POST body) - 유지
- Line 180: `factory_id: factoryId` (PUT body) - 유지

**Acceptance Criteria:**
- GET `/api/inventory?factoryId=xxx` 형태로 요청됨
- POST/PUT body는 `{ factory_id: "xxx" }` 유지

---

### Task 2: useCAMSheets.ts GET 파라미터 수정
**File:** `lib/hooks/useCAMSheets.ts`

**변경 2곳:**
- Line 61: `...(factoryId && { factory_id: factoryId })` -> `...(factoryId && { factoryId })`
- Line 213: `` `factory_id=${factoryId}` `` -> `` `factoryId=${factoryId}` ``

**변경하지 않는 곳 (POST/PUT body - 유지):**
- Line 118: `factory_id: factoryId` (POST body) - 유지
- Line 155: `factory_id: factoryId` (batch POST body) - 유지
- Line 190: `factory_id: factoryId` (PUT body) - 유지

**Acceptance Criteria:**
- GET `/api/cam-sheets?factoryId=xxx` 형태로 요청됨
- DELETE `/api/cam-sheets?id=xxx&factoryId=xxx` 형태로 요청됨
- POST/PUT body는 `{ factory_id: "xxx" }` 유지

---

### Task 3: endmill page에 useFactory 연동
**File:** `app/dashboard/endmill/page.tsx`

**변경 내용:**
1. import 추가: `import { useFactory } from '@/lib/hooks/useFactory'`
2. 컴포넌트 내부에 추가:
   ```typescript
   const { currentFactory } = useFactory()
   const factoryId = currentFactory?.id
   ```
3. Line 177 `fetch('/api/endmill')` -> `fetch('/api/endmill?' + new URLSearchParams({...(factoryId && { factoryId })}))`
4. Line 217 `fetch('/api/equipment')` -> `fetch('/api/equipment?' + new URLSearchParams({...(factoryId && { factoryId })}))` (공장별 설비 필터링 - getEndmillUsageInfo의 사용 대수 정확도)
5. Line 473 `fetch('/api/endmill/supplier-price-list')` -> factory 필터 필요 여부 확인 (supplier-price-list는 공장 무관할 수 있음)
6. `loadEndmillData`를 호출하는 useEffect의 의존성 배열에 `factoryId` 추가 (stale closure 방지)

**Stale Closure 대응:**
- `loadEndmillData` 함수가 useCallback이면 deps에 factoryId 추가
- 일반 함수면 useEffect deps에 factoryId 추가하여 재실행

**Acceptance Criteria:**
- 공장 전환 시 앤드밀 목록이 해당 공장 것만 표시
- factoryId 변경 시 자동 refetch

---

### Task 4: endmill-disposal page에 useFactory 연동
**File:** `app/dashboard/endmill-disposal/page.tsx`

**변경 내용:**
1. import 추가: `import { useFactory } from '@/lib/hooks/useFactory'`
2. 컴포넌트 내부에 추가:
   ```typescript
   const { currentFactory } = useFactory()
   const factoryId = currentFactory?.id
   ```
3. Line 70 GET: `` `/api/endmill-disposals?start=...&end=...` `` -> `` `/api/endmill-disposals?start=...&end=...${factoryId ? `&factoryId=${factoryId}` : ''}` ``
4. Line 321 POST body: `factory_id: factoryId` 추가
5. Line 403 PUT body: `factory_id: factoryId` 추가
6. useEffect 의존성에 `factoryId` 추가 (Line ~83, `[dateRange]` -> `[dateRange, factoryId]`)

**Stale Closure 대응:**
- loadDisposals 함수가 factoryId를 클로저로 캡처하므로, useEffect deps에 factoryId 포함 필수

**Acceptance Criteria:**
- 공장 전환 시 폐기 기록이 해당 공장 것만 표시
- 새 폐기 등록 시 현재 공장 ID가 body에 포함
- factoryId 변경 시 자동 refetch

## Commit Strategy
단일 커밋: `fix: 공장별 필터링 버그 수정 - GET 파라미터 factoryId(camelCase) 통일 및 앤드밀/폐기 페이지 useFactory 연동`

## Success Criteria
1. 공장 전환 시 inventory 페이지에 해당 공장 데이터만 표시
2. 공장 전환 시 CAM sheets 페이지에 해당 공장 데이터만 표시
3. 공장 전환 시 endmill 페이지에 해당 공장 데이터만 표시
4. 공장 전환 시 endmill-disposal 페이지에 해당 공장 데이터만 표시
5. CRUD 동작 정상 (POST/PUT body의 factory_id 유지)
6. `npm run build` 성공

## Summary of Files to Modify

| # | File | Changes | Complexity |
|---|------|---------|------------|
| 1 | `lib/hooks/useInventory.ts` | L66: GET param `factory_id` -> `factoryId` | LOW |
| 2 | `lib/hooks/useCAMSheets.ts` | L61,213: GET param `factory_id` -> `factoryId` | LOW |
| 3 | `app/dashboard/endmill/page.tsx` | useFactory 연동 + factoryId 전달 + useEffect deps | MEDIUM |
| 4 | `app/dashboard/endmill-disposal/page.tsx` | useFactory 연동 + factoryId 전달 + useEffect deps | MEDIUM |
