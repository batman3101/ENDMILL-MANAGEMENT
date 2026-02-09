# Work Plan: User Factory Filter

## Context

### Original Request
사용자 관리 페이지에서 공장별(1공장 ALT / 2공장 ALV) 사용자 목록 필터링 및 신규 등록 시 해당 공장 자동 배정

### Existing Infrastructure
- `factories` table with ALT/ALV entries
- `user_factory_access` table (user_id + factory_id, ON DELETE CASCADE from auth.users)
- `user_profiles.default_factory_id` column (already in migration)
- `get_user_accessible_factories()` RPC function
- `useFactory()` hook returning `currentFactory`, `accessibleFactories`
- `applyFactoryFilter()` utility in `lib/utils/factoryFilter.ts`

---

## Work Objectives

### Core Objective
현재 선택된 공장(currentFactory)에 소속된 사용자만 사용자 관리 페이지에 표시하고, 신규 사용자 등록 시 현재 공장에 자동 배정

### Deliverables
1. GET /api/users에 factoryId 필터 추가
2. POST /api/users에 factory 배정 로직 추가
3. useUsers 훅에 factoryId 연동
4. 사용자 관리 페이지에 useFactory 연동
5. 백필 마이그레이션 (기존 사용자 -> user_factory_access 레코드 생성)
6. useFactory 훅 캐시 무효화에 'users' 키 추가

### Definition of Done
- 공장 전환 시 사용자 목록이 해당 공장 소속 사용자만 표시
- 신규 사용자 등록 시 default_factory_id + user_factory_access 자동 생성
- 기존 사용자 전원에 대해 user_factory_access 레코드 존재
- 사용자 삭제 시 user_factory_access CASCADE 삭제 (이미 구현됨)
- 공장 전환 시 사용자 목록 캐시도 무효화

---

## Must Have
- factoryId 기반 사용자 목록 필터링
- 신규 사용자 등록 시 현재 공장 자동 배정
- 기존 사용자 백필 마이그레이션
- 통계 카드(getUserStats)가 필터된 사용자 기준으로 계산
- user_factory_access INSERT 시 adminClient (service role) 사용

## Must NOT Have
- 사용자의 다중 공장 접근 관리 UI (향후 별도 태스크)
- 공장 간 사용자 이동 기능
- 공장별 역할 차별화

---

## Task Flow

```
Task 1 (Migration) --> Task 2 (API GET) --> Task 5 (useUsers hook)
                   --> Task 3 (API POST) --> Task 5
                                             Task 5 --> Task 6 (Page UI)
                                             Task 4 (useFactory cache) -- independent, can parallel
Task 7 (RLS 검증) -- independent, can run anytime
```

---

## Tasks

### Task 1: Backfill Migration
**File:** `supabase/migrations/20260127200000_backfill_user_factory_access.sql` (NEW)
**Action:** Create new migration file

**Details:**
- 기존 모든 user_profiles의 user_id에 대해 **ALT(1공장)와 ALV(2공장) 모두** user_factory_access 레코드 삽입
- default_factory_id가 NULL인 user_profiles에 ALT factory id 설정
- **근거:** 현재 ALV(2공장)에서 근무하는 사용자도 존재하므로, 백필 시 양쪽 공장 모두 접근 권한을 부여하는 것이 안전함. 관리자가 추후 불필요한 공장 접근을 수동으로 제거할 수 있음.

```sql
-- Insert user_factory_access for all existing users - BOTH factories
-- 근거: 기존 사용자 중 어떤 공장에서 근무하는지 데이터가 없으므로,
-- 양쪽 모두 접근 권한을 부여하고 관리자가 추후 조정하도록 함.

-- ALT (1공장) - is_default = true
INSERT INTO user_factory_access (user_id, factory_id, is_default)
SELECT up.user_id, f.id, true
FROM user_profiles up
CROSS JOIN factories f
WHERE f.code = 'ALT'
  AND up.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_factory_access ufa
    WHERE ufa.user_id = up.user_id AND ufa.factory_id = f.id
  );

-- ALV (2공장) - is_default = false
INSERT INTO user_factory_access (user_id, factory_id, is_default)
SELECT up.user_id, f.id, false
FROM user_profiles up
CROSS JOIN factories f
WHERE f.code = 'ALV'
  AND up.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_factory_access ufa
    WHERE ufa.user_id = up.user_id AND ufa.factory_id = f.id
  );

-- Set default_factory_id for users without one
UPDATE user_profiles
SET default_factory_id = (SELECT id FROM factories WHERE code = 'ALT')
WHERE default_factory_id IS NULL AND user_id IS NOT NULL;
```

**후속 조치:** 마이그레이션 실행 후, 관리자에게 안내:
> "모든 기존 사용자에게 양쪽 공장(ALT/ALV) 접근 권한이 부여되었습니다. 사용자 관리 페이지에서 불필요한 공장 접근을 제거해 주세요."

**Acceptance Criteria:**
- [ ] 모든 기존 사용자가 user_factory_access에 ALT + ALV 2개 레코드 보유
- [ ] 모든 기존 사용자의 default_factory_id가 설정됨 (ALT)
- [ ] 마이그레이션 idempotent (중복 실행 안전)

---

### Task 2: API GET /api/users - factoryId Filter
**File:** `app/api/users/route.ts` (lines 48-72)
**Action:** Modify GET handler

**Details:**
1. Line 53 부근에 `factoryId` 파라미터 추출 추가:
   ```typescript
   const factoryId = searchParams.get('factoryId')
   ```

2. Line 57-64의 쿼리에 user_factory_access JOIN 추가. factoryId가 있을 때:
   - user_factory_access 테이블과 user_profiles.user_id로 JOIN
   - factory_id 조건으로 필터링

   구현 방식: factoryId가 있으면 먼저 user_factory_access에서 해당 factory의 user_id 목록을 조회한 후, user_profiles 쿼리에 `.in('user_id', userIds)` 필터 적용

   ```typescript
   if (factoryId) {
     const { data: factoryUsers } = await supabase
       .from('user_factory_access')
       .select('user_id')
       .eq('factory_id', factoryId)

     if (factoryUsers && factoryUsers.length > 0) {
       const userIds = factoryUsers.map((fu: any) => fu.user_id)
       query = query.in('user_id', userIds)
     } else {
       // No users in this factory
       return NextResponse.json({ success: true, data: [], count: 0 })
     }
   }
   ```

**Acceptance Criteria:**
- [ ] `GET /api/users?factoryId=<uuid>` 시 해당 공장 소속 사용자만 반환
- [ ] factoryId 미전달 시 기존 동작 유지 (전체 사용자 반환)
- [ ] 해당 공장에 사용자가 없으면 빈 배열 반환

---

### Task 3: API POST /api/users - Factory Assignment
**File:** `app/api/users/route.ts` (lines 128-288)
**Action:** Modify POST handler

**Details:**
1. Line 171-182의 body destructuring에 `factoryId` 추가:
   ```typescript
   const { ..., factoryId } = body
   ```

2. Line 244-258의 user_profiles insert에 `default_factory_id` 추가:
   ```typescript
   default_factory_id: factoryId || null
   ```

3. Profile 생성 성공 후 (line 258 이후), user_factory_access 레코드 생성.
   **CRITICAL: `createAdminClient()` (service role) 사용 필수** - 일반 클라이언트로는 RLS에 의해 INSERT가 차단됨:
   ```typescript
   if (factoryId) {
     // RLS 우회를 위해 adminClient 사용 필수
     const adminClient = createAdminClient()
     const { error: factoryAccessError } = await adminClient
       .from('user_factory_access')
       .insert({
         user_id: authData.user.id,
         factory_id: factoryId,
         is_default: true
       })

     if (factoryAccessError) {
       logger.warn('Failed to create factory access:', factoryAccessError)
       // Non-blocking: user is created but factory access failed
     }
   }
   ```

   **참고:** `createAdminClient()`는 이미 `lib/supabase/client.ts`에 정의되어 있는지 확인. 없으면 service role key로 생성하는 유틸 추가 필요. 기존 POST handler에서 이미 `createClient()`을 사용 중이라면, `SUPABASE_SERVICE_ROLE_KEY`로 별도 클라이언트 생성:
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   const adminClient = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   )
   ```

**Acceptance Criteria:**
- [ ] 신규 사용자 생성 시 factoryId 전달하면 default_factory_id 설정됨
- [ ] 신규 사용자 생성 시 user_factory_access 레코드 생성됨 (adminClient 사용)
- [ ] factoryId 미전달 시 기존 동작 유지 (factory 없이 생성)
- [ ] factory_access 실패 시 사용자 생성은 롤백하지 않음 (warn 로그만)

---

### Task 4: useFactory Hook - Cache Invalidation for Users
**File:** `lib/hooks/useFactory.ts` (lines 77-86)
**Action:** Modify setCurrentFactory mutation

**Details:**
`setCurrentFactory` 내 `onSuccess`의 `invalidateQueries` 목록에 `'users'` 키 추가:

```typescript
// 기존 무효화 키 목록에 'users' 추가
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['equipment'] })
  queryClient.invalidateQueries({ queryKey: ['inventory'] })
  queryClient.invalidateQueries({ queryKey: ['tool-changes'] })
  queryClient.invalidateQueries({ queryKey: ['users'] })  // <-- 추가
  // ... 기타 기존 키들
}
```

**Acceptance Criteria:**
- [ ] 공장 전환 시 `['users']` 쿼리 캐시가 무효화됨
- [ ] 공장 전환 후 사용자 목록이 자동으로 refetch됨

---

### Task 5: useUsers Hook - Factory Integration
**File:** `lib/hooks/useUsers.ts` (lines 1-329)
**Action:** Modify hook

**Details:**
1. Import `useFactory` 추가 (line 7):
   ```typescript
   import { useFactory } from './useFactory'
   ```

2. Hook 시작부에 currentFactory 가져오기 (line 10 이후):
   ```typescript
   const { currentFactory } = useFactory()
   ```

3. queryKey에 factoryId 포함 (line 19):
   ```typescript
   queryKey: ['users', currentFactory?.id],
   ```

4. queryFn에서 API 호출로 변경 (line 20-25). 현재 `clientSupabaseService.userProfile.getAll()` 직접 호출을 API 호출로 변경.

   **중요 - 데이터 변환 호환성:** 기존 코드(line 82-96)는 `rawUsers.map()`으로 데이터를 변환하며, `email` 필드를 `raw_user_meta_data`에서 추출하는 등의 로직이 있음. API 응답은 `{ success, data, count }` 구조이며 이미 변환된 데이터를 반환하므로, **기존 map 변환 로직을 제거하고 API 응답의 data를 직접 사용**해야 함:

   ```typescript
   queryFn: async () => {
     const params = new URLSearchParams()
     if (currentFactory?.id) params.set('factoryId', currentFactory.id)
     const response = await fetch(`/api/users?${params.toString()}`)
     if (!response.ok) throw new Error('Failed to fetch users')
     const result = await response.json()
     // API가 이미 변환된 데이터를 반환하므로 추가 변환 불필요
     // 기존 rawUsers.map() 변환 로직 (line 82-96) 제거
     return result.data || []
   },
   ```

   **확인사항:** API GET /api/users의 응답 data 구조가 기존 `rawUsers.map()` 변환 결과와 동일한 필드를 포함하는지 확인 필요. 특히:
   - `email` 필드가 API 응답에 포함되는지 (auth.users에서 가져오는 로직이 API에 있는지)
   - `role` vs `role_id` + `user_roles.type` 매핑이 API에서 처리되는지
   - 불일치 시 API 응답 또는 프론트엔드 변환 로직 조정 필요

5. createUser mutation의 body에 factoryId 추가 (line 196-208):
   ```typescript
   body: JSON.stringify({
     ...existingFields,
     factoryId: currentFactory?.id
   })
   ```

6. cache invalidation에서 factoryId 포함되도록 queryKey 갱신 (line 220, 249, 268):
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['users'] })
   // 이미 prefix match이므로 ['users', factoryId]도 무효화됨 - 변경 불필요
   ```

**Acceptance Criteria:**
- [ ] 공장 전환 시 사용자 목록 자동 refetch
- [ ] 신규 사용자 생성 시 현재 공장 자동 배정
- [ ] queryKey에 factoryId 포함되어 공장별 캐시 분리
- [ ] API 응답 데이터와 기존 UI가 기대하는 필드 구조가 호환됨

---

### Task 6: Users Page - Factory Context
**File:** `app/dashboard/users/page.tsx` (lines 22-77)
**Action:** Modify page component

**Details:**
1. Import useFactory (line 12 이후):
   ```typescript
   import { useFactory } from '../../../lib/hooks/useFactory'
   ```

2. UsersPageContent에서 useFactory 호출 (line 37 이후):
   ```typescript
   const { currentFactory } = useFactory()
   ```

3. addFormData 초기값에는 변경 없음 (factoryId는 useUsers hook에서 자동 처리)

4. 페이지 헤더나 통계 영역에 현재 공장명 표시 (선택적 - 다른 페이지 패턴 따르기)

**Acceptance Criteria:**
- [ ] 공장 전환 시 사용자 목록 자동 갱신
- [ ] 통계 카드가 현재 공장 기준으로 표시
- [ ] 신규 사용자 추가 시 현재 공장에 자동 배정

---

### Task 7: RLS Policy Schema Verification
**File:** 해당 없음 (검증 태스크)
**Action:** RLS 정책과 실제 스키마 일치 여부 확인

**Details:**
코드베이스에서는 `role_id` + `user_roles.type` 패턴을 사용하는 반면, RLS 정책이 `user_profiles.role`을 직접 참조하고 있을 수 있음. 실제 스키마와 불일치 시 런타임 에러 발생.

**검증 절차:**
1. `user_factory_access` 테이블의 RLS 정책 확인:
   ```sql
   SELECT policyname, qual, with_check
   FROM pg_policies
   WHERE tablename = 'user_factory_access';
   ```

2. 정책에서 `user_profiles.role` 참조 시, 실제 컬럼이 `role` 인지 `role_id` 인지 확인
3. `role_id` + `user_roles` JOIN 패턴이라면 RLS 정책을 수정:
   ```sql
   -- 예: role 직접 참조 -> role_id + user_roles JOIN으로 변경
   -- 기존 (잘못된 경우):
   --   (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
   -- 수정 (올바른 경우):
   --   (SELECT ur.type FROM user_profiles up
   --    JOIN user_roles ur ON up.role_id = ur.id
   --    WHERE up.user_id = auth.uid()) IN ('admin', 'system_admin')
   ```

4. 기존 마이그레이션 파일 `20260127000000_add_multi_factory.sql`의 RLS 정책도 동일하게 검증

**Acceptance Criteria:**
- [ ] user_factory_access의 모든 RLS 정책이 실제 스키마와 일치
- [ ] role 참조가 `role_id` + `user_roles.type` 패턴과 호환
- [ ] 불일치 발견 시 수정 SQL 작성 완료

---

## Commit Strategy

1. **Commit 1:** Task 1 + Task 7 - Backfill migration + RLS 검증/수정
2. **Commit 2:** Tasks 2+3 - API changes (GET filter + POST factory assignment with adminClient)
3. **Commit 3:** Tasks 4+5+6 - Frontend changes (useFactory cache + useUsers hook + page)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 백필 마이그레이션 실패 | 기존 사용자 필터링 안됨 | idempotent SQL, NOT EXISTS 조건 |
| user_factory_access RLS 차단 | POST에서 insert 실패 | **Task 3에서 adminClient (service role) 사용** |
| RLS 정책의 role 참조 불일치 | 런타임 에러 | **Task 7에서 스키마 검증 후 수정** |
| useFactory context 미제공 | hook 에러 | FactoryProvider가 이미 layout에 존재하는지 확인 필요 |
| 공장 전환 시 캐시 미갱신 | 이전 공장 데이터 표시 | **Task 4에서 'users' 키 무효화 추가** |
| API 응답과 기존 변환 로직 불일치 | UI 데이터 누락/에러 | **Task 5에서 호환성 확인 후 변환 로직 조정** |
| 백필 시 ALV 사용자 누락 | 2공장 사용자 접근 불가 | **양쪽 공장 모두 접근 부여, 관리자 수동 조정 안내** |

## Verification Steps

1. ALT 공장 선택 -> 사용자 목록에 ALT 소속 사용자만 표시되는지 확인
2. ALV 공장 전환 -> 목록이 ALV 소속 사용자로 변경되는지 확인
3. ALV 공장에서 신규 사용자 등록 -> user_factory_access에 ALV 레코드 생성 확인
4. 등록된 사용자가 ALT 전환 시 목록에서 사라지는지 확인
5. Supabase에서 user_factory_access 테이블에 모든 기존 사용자가 **ALT+ALV 양쪽** 레코드 보유 확인
6. **RLS 정책 검증:** `user_factory_access` INSERT가 adminClient로 정상 동작 확인
7. **캐시 무효화 검증:** 공장 전환 시 사용자 목록이 즉시 refetch되는지 확인
8. **데이터 호환성:** API 응답 데이터로 사용자 목록 테이블이 정상 렌더링되는지 확인

## Success Criteria
- 공장별 사용자 필터링이 정상 동작
- 신규 사용자가 현재 공장에 자동 배정
- 기존 사용자 전원이 양쪽 공장(ALT+ALV)에 매핑 (관리자 수동 조정 가능)
- 공장 전환 시 1초 이내 목록 갱신
- RLS 정책이 실제 스키마와 일치
