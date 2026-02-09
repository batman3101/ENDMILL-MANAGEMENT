# Multi-Factory Filtering Plan - 대시보드 이외 전체 페이지 (v2 - Revised)

## Context

### Original Request
ALV(2공장) 선택 시 대시보드 이외 모든 페이지에서 factory_id 필터링 적용

### Completed Work
- `app/api/dashboard/route.ts`: 13개 쿼리에 factoryId 필터 완료
- `lib/hooks/useDashboard.ts`: useFactory() 연동 완료
- DB 마이그레이션: 모든 관련 테이블에 factory_id 컬럼 추가 완료
- `applyFactoryFilter()` 헬퍼 함수가 dashboard/route.ts에 정의됨

### Key Rules (Revised)
- **기존 NULL 데이터는 마이그레이션으로 ALT factory_id 일괄 UPDATE** (Task -1)
- NULL 데이터가 없으므로 `applyFactoryFilter`는 단순 `.eq('factory_id', factoryId)` 사용
- 데이터 생성 시 현재 선택된 factory_id를 반드시 저장

### Data Ownership Classification (Architect 결정)
| 구분 | 테이블 | factory_id 필터 |
|------|--------|----------------|
| **공장별 분리** | equipment, tool_changes, inventory, inventory_transactions, cam_sheets, endmill_disposals | **적용** |
| **공유 마스터** | endmill_types, endmill_categories, suppliers, endmill_supplier_prices | **미적용** |

### Reference Pattern (Dashboard - 수정 후)
```typescript
// lib/utils/factoryFilter.ts
export function applyFactoryFilter(query: any, factoryId?: string, column = 'factory_id') {
  if (!factoryId) return query
  return query.eq(column, factoryId)
}

// Hook에서:
const { currentFactory } = useFactory()
const factoryId = currentFactory?.id
queryKey: ['dashboard', factoryId]
params.append('factoryId', factoryId)
enabled: !!factoryId
```

---

## Work Objectives

### Core Objective
모든 비-대시보드 페이지(설비, 교체이력, 재고, CAM시트, 엔드밀 폐기, 리포트)에서 factory_id 기반 데이터 격리 구현

### Deliverables
1. 새 마이그레이션: 기존 NULL 데이터에 ALT factory_id 일괄 UPDATE
2. `applyFactoryFilter` 공용 유틸리티 추출 및 단순화
3. `supabaseService.ts` 서비스 메서드에 `options?: { factoryId?: string }` 파라미터 추가
4. 23개 API 라우트에 factoryId 필터링 추가 (기존 16개 + 누락 7개)
5. 5개 프론트엔드 훅에 useFactory() 연동
6. 데이터 생성/수정 시 factory_id 자동 포함

### Definition of Done
- ALT 선택 시 ALT 데이터만 표시 (NULL 데이터 없음 - 마이그레이션 완료 후)
- ALV 선택 시 ALV 데이터만 표시
- 새 데이터 생성 시 현재 공장의 factory_id가 저장됨
- 공장 전환 시 모든 페이지 데이터가 즉시 갱신됨
- endmill_types, categories, suppliers는 공장 무관하게 전체 표시

---

## Must Have
- 마이그레이션으로 기존 NULL 데이터를 ALT factory_id로 일괄 UPDATE
- `applyFactoryFilter`는 단순 `.eq()` 사용 (OR+NULL 패턴 제거)
- 모든 조회 API에서 factoryId 쿼리 파라미터 지원
- 모든 생성 API에서 factory_id 저장
- 훅에서 queryKey에 factoryId 포함 (공장 전환 시 캐시 분리)
- endmill_types, endmill_categories, suppliers는 필터 제외 (공유 마스터)
- inventory_transactions에 factory_id 직접 필터 적용

## Must NOT Have
- endmill_types에 factory_id 필터 적용 (공유 마스터)
- UI 변경 (이미 공장 선택 UI 존재)
- 사용자 권한별 공장 접근 제한 변경

---

## Task Flow

```
Task -1 (마이그레이션: NULL -> ALT)
    |
    v
Task 0 (공용 유틸리티 + applyFactoryFilter 단순화)
    |
    v
Task 0.5 (supabaseService.ts 서비스 메서드에 factoryId 옵셔널 파라미터 추가)
    |
    v
Task 1-A ~ 1-W (API 라우트 - 병렬 가능)
    |
    v
Task 2-A ~ 2-E (프론트엔드 훅 - 병렬 가능)
    |
    v
Task 3 (통합 테스트)
```

---

## Detailed Tasks

### Task -1: 마이그레이션 - 기존 NULL 데이터에 ALT factory_id 일괄 UPDATE

**파일**: `supabase/migrations/20260127100000_backfill_alt_factory_id.sql` (신규)

**목적**: 기존에 factory_id가 NULL인 모든 데이터를 ALT(1공장)의 UUID로 일괄 업데이트. 이후 applyFactoryFilter에서 OR+NULL 패턴이 불필요해짐.

**수정 내용**:
```sql
-- Backfill NULL factory_id with ALT factory UUID
-- ALT UUID는 factories 테이블에서 code='ALT'로 조회

DO $$
DECLARE
  alt_factory_id UUID;
BEGIN
  SELECT id INTO alt_factory_id FROM factories WHERE code = 'ALT';

  IF alt_factory_id IS NULL THEN
    RAISE EXCEPTION 'ALT factory not found in factories table';
  END IF;

  -- equipment
  UPDATE equipment SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- tool_changes
  UPDATE tool_changes SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- inventory
  UPDATE inventory SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- inventory_transactions
  UPDATE inventory_transactions SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- cam_sheets
  UPDATE cam_sheets SET factory_id = alt_factory_id WHERE factory_id IS NULL;

  -- endmill_disposals (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'endmill_disposals') THEN
    UPDATE endmill_disposals SET factory_id = alt_factory_id WHERE factory_id IS NULL;
  END IF;

  RAISE NOTICE 'Backfill complete. ALT factory_id: %', alt_factory_id;
END $$;

-- NOT NULL 제약 추가 (향후 NULL 방지) - 선택적
-- ALTER TABLE equipment ALTER COLUMN factory_id SET NOT NULL;
-- ALTER TABLE tool_changes ALTER COLUMN factory_id SET NOT NULL;
-- ALTER TABLE inventory ALTER COLUMN factory_id SET NOT NULL;
-- ALTER TABLE inventory_transactions ALTER COLUMN factory_id SET NOT NULL;
-- ALTER TABLE cam_sheets ALTER COLUMN factory_id SET NOT NULL;
```

**주의**: endmill_types 테이블은 공유 마스터이므로 backfill 대상에서 **제외**.

**Acceptance Criteria**:
- 모든 대상 테이블에서 `SELECT COUNT(*) WHERE factory_id IS NULL`이 0 반환
- endmill_types의 factory_id는 변경되지 않음

---

### Task 0: applyFactoryFilter를 공용 유틸리티로 추출 + 단순화

**파일**: `lib/utils/factoryFilter.ts` (신규)

**수정 내용**:
```typescript
// lib/utils/factoryFilter.ts
export function applyFactoryFilter(query: any, factoryId?: string, column = 'factory_id') {
  if (!factoryId) return query
  return query.eq(column, factoryId)  // 단순 eq만 사용 (NULL 데이터 없음)
}
```

**추가 수정**: `app/api/dashboard/route.ts`에서 로컬 `applyFactoryFilter` 함수를 삭제하고 `lib/utils/factoryFilter.ts`에서 import하도록 변경. 기존 `.or()` 패턴도 `.eq()`로 변경.

**Acceptance Criteria**:
- `lib/utils/factoryFilter.ts` 파일 존재
- dashboard/route.ts가 공용 유틸리티를 import
- OR+NULL 패턴이 코드베이스에서 완전히 제거

---

### Task 0.5: supabaseService.ts 서비스 메서드에 factoryId 옵셔널 파라미터 추가

**파일**: `lib/services/supabaseService.ts`

**목적**: 서비스 레이어에 factoryId를 전달할 수 있도록 옵션 파라미터 추가. API에서 직접 쿼리 전환 대신 기존 서비스 레이어를 활용.

**수정 대상 메서드와 구체적 방법**:

#### EquipmentService
| 메서드 | 변경 내용 |
|--------|-----------|
| `getAll(options?: { factoryId?: string })` | 쿼리에 `.eq('factory_id', factoryId)` 추가 (factoryId 있을 때만) |
| `getById(id, options?)` | 변경 불필요 (ID 기반 단건 조회) |
| `getByStatus(status, options?)` | factoryId 필터 추가 |
| `getStats(options?: { factoryId?: string })` | `.select('status')` 쿼리에 factoryId 필터 추가 |
| `create`, `update`, `delete` | 변경 불필요 (호출 시 body에 factory_id 포함) |

#### ToolChangeService
| 메서드 | 변경 내용 |
|--------|-----------|
| `getAll(limit?, options?)` | factoryId 필터 추가 |
| `getFiltered(filters)` | filters 인터페이스에 `factoryId?: string` 추가, 쿼리에 `.eq()` 적용 |
| `getCount(filters)` | filters 인터페이스에 `factoryId?: string` 추가, 쿼리에 `.eq()` 적용 |
| `getByEquipment(equipmentNumber, limit?, offset?, options?)` | factoryId 필터 추가 |
| `create`, `update`, `delete` | 변경 불필요 |

#### InventoryService
| 메서드 | 변경 내용 |
|--------|-----------|
| `getAll(options?: { factoryId?: string })` | factoryId 필터 추가 |
| `getByStatus(status, options?)` | factoryId 필터 추가 |
| `getStats(options?: { factoryId?: string })` | `.select(...)` 쿼리에 factoryId 필터 추가 |
| `create`, `updateStock`, `update`, `delete` | 변경 불필요 |

#### CAMSheetService
| 메서드 | 변경 내용 |
|--------|-----------|
| `getAll(options?: { factoryId?: string })` | factoryId 필터 추가 |
| `getByModelAndProcess(model, process, options?)` | factoryId 필터 추가 |
| `create`, `update`, `delete` | 변경 불필요 |

#### EndmillTypeService
| 메서드 | 변경 내용 |
|--------|-----------|
| **변경 없음** | **공유 마스터 - factory_id 필터 미적용** |

**구현 패턴**:
```typescript
// 예시: EquipmentService.getAll
async getAll(options?: { factoryId?: string }) {
  let query = this.supabase
    .from('equipment')
    .select('*')
    .order('equipment_number')

  if (options?.factoryId) {
    query = query.eq('factory_id', options.factoryId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// 예시: ToolChangeService.getFiltered - filters에 factoryId 추가
async getFiltered(filters: {
  factoryId?: string    // 추가
  equipmentNumber?: number
  // ... 기존 필터들
}) {
  let query = this.supabase.from('tool_changes').select(...)

  if (filters.factoryId) {
    query = query.eq('factory_id', filters.factoryId)
  }
  // ... 기존 필터 로직
}
```

**Acceptance Criteria**:
- EquipmentService: getAll, getByStatus, getStats에 factoryId 옵션 추가
- ToolChangeService: getAll, getFiltered, getCount, getByEquipment에 factoryId 옵션 추가
- InventoryService: getAll, getByStatus, getStats에 factoryId 옵션 추가
- CAMSheetService: getAll, getByModelAndProcess에 factoryId 옵션 추가
- EndmillTypeService: **변경 없음**
- factoryId가 없으면 기존 동작(전체 조회) 유지

---

### Task 1-A: Equipment API (`app/api/equipment/route.ts`)

**현재 상태**: `serverSupabaseService.equipment.getAll()` 사용

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `const factoryId = url.searchParams.get('factoryId') || undefined`
   - `serverSupabaseService.equipment.getAll({ factoryId })` 호출
   - CAM Sheet 조회: `serverSupabaseService.camSheet.getAll({ factoryId })`
   - stats 계산: `serverSupabaseService.equipment.getStats({ factoryId })`

2. **POST**: 생성 시 factory_id 포함
   - request body에서 `factory_id` 수신
   - `serverSupabaseService.equipment.create({ ...data, factory_id })`

3. **PUT**: 수정 시 factory_id는 변경 불가 (기존 값 유지)

**접근 방식**: Task 0.5에서 추가한 서비스 메서드의 factoryId 옵션 사용. 직접 쿼리 전환 불필요.

---

### Task 1-B: Equipment Detail API (`app/api/equipment/[id]/route.ts`) -- **신규 추가**

**현재 상태**: `serverSupabaseService.equipment.getById(id)` 및 `serverSupabaseService.camSheet.getByModelAndProcess()` 사용

**수정 내용**:

1. **GET**: ID 기반 단건 조회이므로 factory_id 필터 불필요
   - 단, `camSheet.getByModelAndProcess()` 호출 시 factoryId 전달 필요
   - `const factoryId = request.nextUrl.searchParams.get('factoryId') || undefined`
   - `serverSupabaseService.camSheet.getByModelAndProcess(model, process, { factoryId })`

**접근 방식**: 설비 자체는 ID로 조회하므로 필터 불필요. CAM Sheet 조회만 factory_id 필터 적용.

---

### Task 1-C: Equipment Bulk Upload (`app/api/equipment/bulk-upload/route.ts`) -- **신규 추가**

**현재 상태**: `serverSupabaseService.camSheet.getAll()` 사용하여 유효한 모델/공정 검증 후 대량 insert

**수정 내용**:

1. **POST**: body에서 factory_id 수신
   - `const factoryId = body.factory_id || undefined`
   - `serverSupabaseService.camSheet.getAll({ factoryId })` 호출하여 해당 공장 CAM Sheet 기반 검증
   - 각 equipment insert 시 `factory_id` 포함

---

### Task 1-D: Tool Changes API (`app/api/tool-changes/route.ts`)

**현재 상태**: `serverSupabaseService.toolChange.getFiltered()` 및 `getCount()` 사용

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `const factoryId = searchParams.get('factoryId') || undefined`
   - `serverSupabaseService.toolChange.getFiltered({ ...filters, factoryId })` (Task 0.5에서 filters에 factoryId 추가됨)
   - `serverSupabaseService.toolChange.getCount({ ...filters, factoryId })`

2. **POST**: 생성 시 factory_id 포함
   - `toolChangeData`에 `factory_id: body.factory_id` 추가

3. **PUT/DELETE**: ID 기반이므로 factory_id 필터 불필요

---

### Task 1-E: Tool Changes Auto-Fill (`app/api/tool-changes/auto-fill/route.ts`)

**현재 상태**: `serverSupabaseService.equipment.getAll()` 및 `camSheet.getByModelAndProcess()` 사용

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `const factoryId = searchParams.get('factoryId') || undefined`
   - 설비 조회: `serverSupabaseService.equipment.getAll({ factoryId })`
   - CAM Sheet 조회: `serverSupabaseService.camSheet.getByModelAndProcess(model, process, { factoryId })`

---

### Task 1-F: Tool Changes Stats (`app/api/tool-changes/stats/route.ts`)

**현재 상태**: 직접 Supabase 쿼리 (`supabase.from('tool_changes').select(...)`)

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `const factoryId = searchParams.get('factoryId') || undefined`
   - `applyFactoryFilter` import하여 쿼리에 적용:
   ```typescript
   import { applyFactoryFilter } from '@/lib/utils/factoryFilter'
   let query = supabase.from('tool_changes').select('*').gte('created_at', startDateTime).lt('created_at', endDateTime)
   query = applyFactoryFilter(query, factoryId)
   ```

---

### Task 1-G: Tool Changes Bulk Upload (`app/api/tool-changes/bulk-upload/route.ts`)

**현재 상태**: 대량 교체 실적 업로드

**수정 내용**:

1. **POST**: body에서 factory_id 수신
   - 각 insert 레코드에 factory_id 포함

---

### Task 1-H: Inventory API (`app/api/inventory/route.ts`)

**현재 상태**: `serverSupabaseService.inventory.getAll()` 사용

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `serverSupabaseService.inventory.getAll({ factoryId })`
   - **endmill_types JOIN은 필터 불필요** (공유 마스터이므로 inventory 테이블만 필터)

2. **POST**: 생성 시 factory_id 포함

---

### Task 1-I: Inventory Inbound (`app/api/inventory/inbound/route.ts`)

**현재 상태**: `inventory_transactions` 직접 쿼리, `endmill_types` 조회

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `inventory_transactions` 테이블에 factory_id 컬럼이 **존재함** (마이그레이션에서 추가됨)
   - **직접 필터 적용**: `applyFactoryFilter(query, factoryId)` on `inventory_transactions`
   - endmill_types 조회에는 필터 미적용 (공유 마스터)

2. **POST**: 입고 시 factory_id 포함
   - inventory 조회 시 factory_id 필터 (같은 엔드밀이라도 공장별 재고 분리)
   - 새 inventory 생성 시 factory_id 포함
   - inventory_transactions에도 factory_id 포함

---

### Task 1-J: Inventory Outbound (`app/api/inventory/outbound/route.ts`)

**현재 상태**: `supabase`(browser client) 사용하여 직접 쿼리

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - inventory_transactions에 factory_id 직접 필터

2. **POST**: 출고 시 factory_id 기반 재고 조회
   - 해당 공장의 재고에서만 출고
   - equipment 조회 시에도 factory_id 필터

**주의**: `supabase`(browser client) -> `createServerClient()` 변경 권장 (보안)

---

### Task 1-K: Inventory Bulk Upload (`app/api/inventory/bulk-upload/route.ts`) -- **신규 추가**

**현재 상태**: 재고 대량 업로드

**수정 내용**:

1. **POST**: body에서 factory_id 수신
   - 각 inventory insert 시 factory_id 포함
   - inventory_transactions에도 factory_id 포함

---

### Task 1-L: CAM Sheets API (`app/api/cam-sheets/route.ts`)

**현재 상태**: `serverSupabaseService.camSheet.getAll()` 사용

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `serverSupabaseService.camSheet.getAll({ factoryId })`

2. **POST**: 생성 시 factory_id 포함

3. **PUT**: 수정 시 factory_id 유지

---

### Task 1-M: Endmill API (`app/api/endmill/route.ts`)

**현재 상태**: `createServerClient()` 사용하여 `endmill_types` 직접 쿼리

**수정 내용**:

1. **GET**: **endmill_types에는 factory_id 필터 미적용** (공유 마스터)
   - 관련 tool_changes 통계 조회 시에만 factory_id 필터 적용 (있을 경우)

**변경 최소화**: endmill_types 자체 조회는 변경 불필요. tool_changes JOIN/통계에만 factoryId 적용.

---

### Task 1-N: Endmill Create (`app/api/endmill/create/route.ts`)

**현재 상태**: endmill_types insert + inventory 생성 + cam_sheets 연동

**수정 내용**:

1. **POST**:
   - endmill_types insert: **factory_id 미포함** (공유 마스터)
   - inventory 생성 시: factory_id 포함 (공장별 재고 분리)
   - cam_sheets 조회/생성 시: factory_id 포함

---

### Task 1-O: Endmill Bulk Upload (`app/api/endmill/bulk-upload/route.ts`) -- **신규 추가**

**현재 상태**: 엔드밀 대량 업로드

**수정 내용**:

1. **POST**:
   - endmill_types insert: **factory_id 미포함** (공유 마스터)
   - 연관 inventory 생성 시: factory_id 포함

---

### Task 1-P: Endmill Categories (`app/api/endmill/categories/route.ts`) -- **신규 추가**

**현재 상태**: `createServerClient()` 사용하여 `endmill_categories` 직접 쿼리

**수정 내용**: **변경 없음** (공유 마스터 데이터 - factory_id 필터 미적용)

---

### Task 1-Q: Endmill Check Duplicates (`app/api/endmill/check-duplicates/route.ts`) -- **신규 추가**

**현재 상태**: `supabase`(browser client) 사용하여 `endmill_types` 코드 중복 확인

**수정 내용**: **변경 없음** (endmill_types는 공유 마스터 - 공장과 무관하게 코드 중복 체크)

**주의**: `supabase`(browser client) -> `createServerClient()` 변경 권장 (보안)

---

### Task 1-R: Endmill Supplier Price List (`app/api/endmill/supplier-price-list/route.ts`) -- **신규 추가**

**현재 상태**: `createServerClient()` 사용하여 endmill_types + endmill_supplier_prices 조회

**수정 내용**: **변경 없음** (공유 마스터 데이터 - factory_id 필터 미적용)

---

### Task 1-S: Endmill Disposals (`app/api/endmill-disposals/route.ts`)

**현재 상태**: `endmill_disposals` 테이블 직접 쿼리

**수정 내용**:

1. **GET**: factoryId 파라미터 추가
   - `applyFactoryFilter(query, factoryId)` 적용

2. **POST**: 생성 시 factory_id 포함

---

### Task 1-T: Reports - Monthly (`app/api/reports/monthly/route.ts`)

**현재 상태**: `tool_changes`, `endmill_types` 직접 쿼리

**수정 내용**:

1. **POST**: body.filter에서 factoryId 수신
   - tool_changes 쿼리에 `applyFactoryFilter` 적용
   - **endmill_types 쿼리에는 미적용** (공유 마스터)

---

### Task 1-U: Reports - Cost (`app/api/reports/cost/route.ts`)

**수정 내용**: 1-T와 동일 패턴. tool_changes에만 factoryId 필터, endmill_types에는 미적용.

---

### Task 1-V: Reports - Tool Life (`app/api/reports/tool-life/route.ts`)

**수정 내용**: 1-T와 동일 패턴.

---

### Task 1-W: Reports - Performance (`app/api/reports/performance/route.ts`)

**수정 내용**: 1-T와 동일 패턴.

---

### Task 2-A: useEquipment Hook (`lib/hooks/useEquipment.ts`)

**수정 내용**:
```typescript
import { useFactory } from './useFactory'

export const useEquipment = (filter?: EquipmentFilter) => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  const { data: equipments = [], ... } = useQuery({
    queryKey: ['equipment', factoryId, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(factoryId && { factoryId }),
        ...(filter?.status && { status: filter.status }),
        ...(filter?.location && { location: filter.location }),
        ...(filter?.model && { model: filter.model })
      })
      const response = await fetch('/api/equipment?' + params)
      // ...
    },
    enabled: !!factoryId
  })

  // createMutation에서도 factory_id 포함
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        body: JSON.stringify({ ...data, factory_id: factoryId })
      })
      // ...
    }
  })
}
```

---

### Task 2-B: useToolChanges Hook (`lib/hooks/useToolChanges.ts`)

**현재 상태**: useState/useEffect 패턴 (TanStack Query 미사용)

**수정 내용**:
```typescript
import { useFactory } from './useFactory'

export const useToolChanges = (filters, enableRealtime) => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  // fetchToolChanges 내부
  if (factoryId) {
    params.append('factoryId', factoryId)
  }

  // useEffect deps에 factoryId 추가
  useEffect(() => {
    fetchToolChanges(true)
  }, [factoryId, ...기존deps])
}

// useToolChangeStats도 동일
export const useToolChangeStats = (date?, enableRealtime?) => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  if (factoryId) {
    params.append('factoryId', factoryId)
  }
}
```

---

### Task 2-C: useInventory Hook (`lib/hooks/useInventory.ts`)

**수정 내용**:
```typescript
import { useFactory } from './useFactory'

export const useInventory = (filter?) => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory', factoryId, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(factoryId && { factoryId }),
        ...(filter?.status && { status: filter.status }),
      })
      // ...
    },
    enabled: !!factoryId
  })

  // endmill-types 쿼리에는 factoryId 미추가 (공유 마스터)
  const { data: endmillTypes = [] } = useQuery({
    queryKey: ['endmill-types'],  // factoryId 불포함
    // ...
  })

  // mutations에도 factory_id 포함
}
```

---

### Task 2-D: useCAMSheets Hook (`lib/hooks/useCAMSheets.ts`)

**수정 내용**:
```typescript
import { useFactory } from './useFactory'

export const useCAMSheets = (filter?) => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  const { data: camSheets = [] } = useQuery({
    queryKey: ['cam-sheets', factoryId, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(factoryId && { factoryId }),
        ...(filter?.model && { model: filter.model }),
        ...(filter?.process && { process: filter.process })
      })
      // ...
    },
    enabled: !!factoryId
  })

  // mutations에도 factory_id 포함
}
```

---

### Task 2-E: useReports Hook (`lib/hooks/useReports.ts`)

**수정 내용**:
```typescript
import { useFactory } from './useFactory'

export const useReports = () => {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  const generateMonthlyReport = useMutation({
    mutationFn: async (filter: ReportFilter) => {
      const response = await fetch('/api/reports/monthly', {
        method: 'POST',
        body: JSON.stringify({ filter: { ...filter, factoryId } })
      })
      // ...
    }
  })
  // 나머지 3개 report mutation도 동일
}
```

**추가**: `ReportFilter` 타입에 `factoryId?: string` 추가
- 파일: `lib/types/reports.ts`

---

## Commit Strategy

### Commit 1: 마이그레이션 - NULL 데이터 ALT 일괄 UPDATE
- `supabase/migrations/20260127100000_backfill_alt_factory_id.sql` 생성

### Commit 2: 공용 유틸리티 추출 + 단순화
- `lib/utils/factoryFilter.ts` 생성 (단순 .eq 패턴)
- `app/api/dashboard/route.ts` import 변경 + OR 패턴 제거

### Commit 3: supabaseService.ts 서비스 메서드 확장
- EquipmentService, ToolChangeService, InventoryService, CAMSheetService에 factoryId 옵셔널 파라미터 추가
- EndmillTypeService는 변경 없음

### Commit 4: API 라우트 수정 (1/2) - 주요 CRUD
- equipment, equipment/[id], tool-changes, inventory, cam-sheets API

### Commit 5: API 라우트 수정 (2/2) - 부수 라우트
- endmill-disposals, reports (4개), auto-fill, stats, bulk-upload (3개), inbound, outbound

### Commit 6: 프론트엔드 훅 수정
- useEquipment, useToolChanges, useInventory, useCAMSheets, useReports

### Commit 7: 타입 업데이트
- ReportFilter에 factoryId 추가

---

## Summary of Changes from v1

| 항목 | v1 (이전) | v2 (현재) |
|------|-----------|-----------|
| NULL 처리 | OR+NULL 패턴 | 마이그레이션으로 ALT UUID 일괄 UPDATE → 단순 .eq() |
| applyFactoryFilter | `.or(\`eq,is.null\`)` | `.eq('factory_id', factoryId)` |
| endmill_types | factory_id 필터 적용 | **공유 마스터 - 필터 미적용** |
| endmill_categories | 언급 없음 | **공유 마스터 - 필터 미적용** |
| suppliers | 언급 없음 | **공유 마스터 - 필터 미적용** |
| inventory_transactions | "간접 필터링" 언급 | **factory_id 직접 필터 적용** (컬럼 존재 확인) |
| 서비스 레이어 | "직접 쿼리 전환 권장" | **서비스 메서드에 factoryId 옵셔널 파라미터 추가** |
| 누락 API | 16개만 | **23개 (7개 추가, 이 중 4개는 변경 불필요)** |
| getStats() | 언급 없음 | **EquipmentService.getStats, InventoryService.getStats에 factoryId 추가** |

---

## Success Criteria

1. 마이그레이션 실행 후: 모든 대상 테이블에서 factory_id IS NULL이 0건
2. ALT 선택 -> ALT factory_id 데이터만 표시
3. ALV 선택 -> ALV factory_id 데이터만 표시
4. ALV에서 설비 생성 -> factory_id가 ALV UUID로 저장됨
5. 공장 전환 -> 모든 페이지 데이터 자동 갱신 (queryKey에 factoryId 포함)
6. 엔드밀 타입/카테고리/공급업체 목록은 공장과 무관하게 전체 표시
7. 교체이력, 재고, CAM시트, 폐기, 리포트 모두 동일 동작

---

## Risk & Considerations

1. **마이그레이션 순서**: Task -1 (backfill)은 반드시 기존 마이그레이션(`20260127000000`) 이후 실행되어야 함. factories 테이블이 먼저 존재해야 ALT UUID를 조회할 수 있음.

2. **NOT NULL 제약 추가 여부**: backfill 후 `ALTER TABLE ... SET NOT NULL`을 추가하면 향후 factory_id 누락을 방지할 수 있으나, 기존 코드가 아직 factory_id를 전달하지 않는 경우 INSERT 실패 가능. Commit 5까지 모든 API 수정 완료 후 별도 마이그레이션으로 추가 권장.

3. **inventory 공장별 분리**: 같은 엔드밀 코드라도 공장별 재고가 분리되어야 함. inventory 조회 시 `endmill_type_id + factory_id` 조합으로 검색.

4. **outbound API 보안**: `supabase`(browser client) 사용 중 -> `createServerClient()`로 변경 권장.

5. **check-duplicates 보안**: 마찬가지로 browser client 사용 중 -> server client 변경 권장.
