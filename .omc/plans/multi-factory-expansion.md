# Multi-Factory Expansion Plan

## 1. Overview and Goals

### Project Background
ALMUS TECH(1공장/ALT)의 CNC Endmill Management 시스템을 ALMUS VINA(2공장/ALV)로 확장하는 다공장 지원 시스템 구축

### Key Requirements
1. **Supabase DB 공유**: 기존 DB를 그대로 사용하되 공장 구분 필드(factory_id) 추가
2. **공장 선택 UI**: APP 상단에 ALT(1공장)/ALV(2공장) 토글 선택 기능
3. **계정별 공장 저장**: 사용자별 기본 공장 및 접근 가능한 공장 목록 저장
4. **브랜치 전략**: `feature/multi-factory` 브랜치에서 개발하여 기존 ALT 서비스 영향 없음
5. **병합 용이성**: 추후 main 브랜치로 병합이 쉽도록 구성

### Success Criteria
- [ ] 기존 ALT 데이터가 정상 유지됨
- [ ] 공장 전환 시 데이터가 정확히 필터링됨
- [ ] 사용자별 접근 가능한 공장이 정확히 제어됨
- [ ] 모든 API가 factory_id를 기준으로 필터링됨
- [ ] UI에서 공장 전환이 즉시 반영됨

---

## 2. Implementation Phases

### Phase 1: Git Branch and Development Environment Setup

**Goal**: 안전한 개발 환경 구성

**Tasks**:
1. `feature/multi-factory` 브랜치 생성
2. 개발 환경 설정 확인
3. Supabase 개발 환경 연결 확인

**Commands**:
```bash
git checkout -b feature/multi-factory
git push -u origin feature/multi-factory
```

**Acceptance Criteria**:
- [ ] 브랜치가 성공적으로 생성됨
- [ ] 기존 main 브랜치에 영향 없음

---

### Phase 2: Database Schema Changes (Supabase Migration)

**Goal**: 다공장 지원을 위한 데이터베이스 스키마 확장

#### 2.1 New Table: `factories`
```sql
CREATE TABLE factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,  -- 'ALT', 'ALV'
  name VARCHAR(100) NOT NULL,         -- 'ALMUS TECH', 'ALMUS VINA'
  name_ko VARCHAR(100),               -- '1공장', '2공장'
  name_vi VARCHAR(100),               -- 'Nha may 1', 'Nha may 2'
  country VARCHAR(50),                -- 'Korea', 'Vietnam'
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial data
INSERT INTO factories (code, name, name_ko, name_vi, country, timezone) VALUES
  ('ALT', 'ALMUS TECH', '1공장 (ALT)', 'Nha may 1 (ALT)', 'Korea', 'Asia/Seoul'),
  ('ALV', 'ALMUS VINA', '2공장 (ALV)', 'Nha may 2 (ALV)', 'Vietnam', 'Asia/Ho_Chi_Minh');
```

#### 2.2 Add `factory_id` Column to Existing Tables

**Tables to modify**:
| Table | Column | Default | Notes |
|-------|--------|---------|-------|
| `equipment` | `factory_id` | ALT factory UUID | FK to factories |
| `tool_positions` | - | - | Via equipment.factory_id |
| `endmill_types` | `factory_id` | NULL (shared) | NULL = shared across factories |
| `tool_changes` | `factory_id` | ALT factory UUID | FK to factories |
| `inventory` | `factory_id` | ALT factory UUID | FK to factories |
| `inventory_transactions` | `factory_id` | ALT factory UUID | FK to factories |
| `cam_sheets` | `factory_id` | ALT factory UUID | FK to factories |
| `cam_sheet_endmills` | - | - | Via cam_sheets.factory_id |
| `endmill_disposals` | `factory_id` | ALT factory UUID | FK to factories |
| `notifications` | `factory_id` | NULL | NULL = system-wide |
| `activity_logs` | `factory_id` | NULL | For audit trail |

**Migration SQL**:
```sql
-- Add factory_id to equipment
ALTER TABLE equipment
ADD COLUMN factory_id UUID REFERENCES factories(id);

-- Set default value for existing data (ALT)
UPDATE equipment SET factory_id = (SELECT id FROM factories WHERE code = 'ALT');

-- Make NOT NULL after data migration
ALTER TABLE equipment ALTER COLUMN factory_id SET NOT NULL;

-- Create index for performance
CREATE INDEX idx_equipment_factory_id ON equipment(factory_id);

-- Repeat for other tables...
```

#### 2.3 User-Factory Access Management (중간 테이블 방식)

**[CRITICAL FIX] accessible_factory_ids 배열 대신 중간 테이블 사용**

Supabase에서 UUID 배열을 통한 다대다 관계 조회가 기본 join으로 불가능하므로, `user_factory_access` 중간 테이블을 사용합니다.

```sql
-- User-Factory access junction table
CREATE TABLE user_factory_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,  -- 기본 공장 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, factory_id)
);

-- Index for performance
CREATE INDEX idx_user_factory_access_user_id ON user_factory_access(user_id);
CREATE INDEX idx_user_factory_access_factory_id ON user_factory_access(factory_id);

-- RLS for user_factory_access
ALTER TABLE user_factory_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own factory access"
ON user_factory_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only system_admin can modify factory access
CREATE POLICY "Only admins can manage factory access"
ON user_factory_access FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'system_admin'
  )
);

-- Migrate existing user_profiles data to junction table
INSERT INTO user_factory_access (user_id, factory_id, is_default)
SELECT
  user_id,
  (SELECT id FROM factories WHERE code = 'ALT'),
  true
FROM user_profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_factory_access
  WHERE user_factory_access.user_id = user_profiles.user_id
);
```

**User Profile Extension (simplified)**:
```sql
-- user_profiles에는 default_factory_id만 유지 (편의성)
ALTER TABLE user_profiles
ADD COLUMN default_factory_id UUID REFERENCES factories(id);

-- Set default for existing users (ALT)
UPDATE user_profiles
SET default_factory_id = (SELECT id FROM factories WHERE code = 'ALT')
WHERE default_factory_id IS NULL;
```

**RPC Function for fetching accessible factories**:
```sql
-- RPC: Get user's accessible factories with details
CREATE OR REPLACE FUNCTION get_user_accessible_factories(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  factory_id UUID,
  code VARCHAR,
  name VARCHAR,
  name_ko VARCHAR,
  name_vi VARCHAR,
  country VARCHAR,
  timezone VARCHAR,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as factory_id,
    f.code,
    f.name,
    f.name_ko,
    f.name_vi,
    f.country,
    f.timezone,
    ufa.is_default
  FROM factories f
  INNER JOIN user_factory_access ufa ON f.id = ufa.factory_id
  WHERE ufa.user_id = p_user_id
  AND f.is_active = true
  ORDER BY ufa.is_default DESC, f.code ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Check if user has access to a specific factory
CREATE OR REPLACE FUNCTION user_has_factory_access(p_factory_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_factory_access
    WHERE user_id = p_user_id
    AND factory_id = p_factory_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get user's default factory ID
CREATE OR REPLACE FUNCTION get_user_default_factory(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
  v_factory_id UUID;
BEGIN
  -- First try user_factory_access with is_default = true
  SELECT factory_id INTO v_factory_id
  FROM user_factory_access
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;

  -- If no default set, get first accessible factory
  IF v_factory_id IS NULL THEN
    SELECT factory_id INTO v_factory_id
    FROM user_factory_access
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Ultimate fallback: ALT factory
  IF v_factory_id IS NULL THEN
    SELECT id INTO v_factory_id
    FROM factories
    WHERE code = 'ALT';
  END IF;

  RETURN v_factory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.4 Row Level Security (RLS) Policies

```sql
-- Enable RLS on equipment
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (using junction table)
CREATE POLICY "Users can view equipment in accessible factories"
ON equipment FOR SELECT
TO authenticated
USING (
  factory_id IN (
    SELECT ufa.factory_id
    FROM user_factory_access ufa
    WHERE ufa.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert equipment in accessible factories"
ON equipment FOR INSERT
TO authenticated
WITH CHECK (
  factory_id IN (
    SELECT ufa.factory_id
    FROM user_factory_access ufa
    WHERE ufa.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update equipment in accessible factories"
ON equipment FOR UPDATE
TO authenticated
USING (
  factory_id IN (
    SELECT ufa.factory_id
    FROM user_factory_access ufa
    WHERE ufa.user_id = auth.uid()
  )
);

-- [CRITICAL FIX] user_profiles UPDATE RLS Policy
-- Prevent users from modifying their own factory access
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile (limited fields)"
ON user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  -- Only allow updating non-sensitive fields
  -- default_factory_id can be changed only to an accessible factory
  (
    default_factory_id IS NULL
    OR default_factory_id IN (
      SELECT factory_id FROM user_factory_access WHERE user_id = auth.uid()
    )
  )
);

-- System admin can update any profile
CREATE POLICY "System admin can manage all profiles"
ON user_profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.role = 'system_admin'
  )
);

-- Similar policies for other tables...
-- (tool_changes, inventory, inventory_transactions, cam_sheets, endmill_disposals)
```

**Acceptance Criteria**:
- [ ] `factories` 테이블 생성 완료
- [ ] `user_factory_access` 중간 테이블 생성 완료
- [ ] RPC 함수 3개 생성 완료 (get_user_accessible_factories, user_has_factory_access, get_user_default_factory)
- [ ] 모든 관련 테이블에 `factory_id` 컬럼 추가
- [ ] 기존 데이터가 ALT 공장으로 마이그레이션됨
- [ ] RLS 정책 적용 완료 (user_profiles UPDATE 정책 포함)
- [ ] 인덱스 생성 완료

---

### Phase 3: Factory Management Implementation

**Goal**: 공장 데이터 관리 기능 구현

#### 3.1 New Types: `lib/types/factory.ts`
```typescript
export interface Factory {
  id: string
  code: string           // 'ALT', 'ALV'
  name: string           // 'ALMUS TECH', 'ALMUS VINA'
  name_ko: string        // '1공장', '2공장'
  name_vi: string        // 'Nha may 1', 'Nha may 2'
  country: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserFactoryAccess {
  factory_id: string
  code: string
  name: string
  name_ko: string
  name_vi: string
  country: string
  timezone: string
  is_default: boolean
}

export interface FactoryContext {
  currentFactory: Factory | null
  accessibleFactories: Factory[]
  setCurrentFactory: (factory: Factory) => void
  isLoading: boolean
}
```

#### 3.2 Update Database Types: `lib/types/database.ts`
- Add `factories` table definition
- Add `user_factory_access` table definition
- Update existing table definitions with `factory_id`

#### 3.3 New API Routes

**`app/api/factories/route.ts`** - GET (list factories)
```typescript
// GET: List accessible factories for current user (using RPC)
export async function GET(request: NextRequest) {
  // 1. Authenticate user
  // 2. Call RPC: get_user_accessible_factories
  // 3. Return filtered factories

  const { data, error } = await supabase
    .rpc('get_user_accessible_factories')

  return NextResponse.json({ success: true, data })
}
```

**`app/api/factories/[id]/route.ts`** - GET, PUT (single factory)

#### 3.4 New Hook: `lib/hooks/useFactory.ts`
```typescript
export function useFactory() {
  // State: currentFactory, accessibleFactories
  // Actions: setCurrentFactory, loadFactories
  // Persist: localStorage for current selection
  // Sync: with user profile default_factory_id

  // Use RPC to fetch accessible factories
  const { data: factories } = useQuery({
    queryKey: ['accessible-factories'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_accessible_factories')
      return data
    }
  })
}
```

#### 3.5 New Context: `lib/providers/FactoryProvider.tsx`

**[CRITICAL FIX] Provider 위치 및 TanStack Query 캐시 무효화**

```typescript
// lib/providers/FactoryProvider.tsx
import { useQueryClient } from '@tanstack/react-query'

export function FactoryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [currentFactory, setCurrentFactoryState] = useState<Factory | null>(null)

  // [CRITICAL] 공장 전환 시 캐시 무효화 전략
  const setCurrentFactory = useCallback(async (factory: Factory) => {
    // 1. 상태 업데이트
    setCurrentFactoryState(factory)

    // 2. localStorage 저장
    localStorage.setItem('currentFactoryId', factory.id)

    // 3. [CRITICAL] TanStack Query 캐시 무효화
    // 모든 factory 관련 쿼리 즉시 무효화
    await queryClient.invalidateQueries({
      predicate: (query) => {
        // factory_id를 포함하거나 공장별 데이터인 쿼리 무효화
        const queryKey = query.queryKey
        return [
          'dashboard',
          'equipment',
          'tool-changes',
          'inventory',
          'cam-sheets',
          'reports',
          'endmill-disposals',
          'endmill-types'
        ].some(key => queryKey.includes(key))
      }
    })

    // 4. (선택) 특정 쿼리만 즉시 refetch
    await queryClient.refetchQueries({
      queryKey: ['dashboard'],
      type: 'active'
    })
  }, [queryClient])

  // Provider wrapping
  return (
    <FactoryContext.Provider value={{ currentFactory, setCurrentFactory, ... }}>
      {children}
    </FactoryContext.Provider>
  )
}
```

**[CRITICAL FIX] FactoryProvider 위치: `app/layout.tsx`**

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* FactoryProvider는 AuthProvider 다음, 다른 Provider 이전에 위치 */}
            <FactoryProvider>
              <I18nProvider>
                {children}
              </I18nProvider>
            </FactoryProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

**Acceptance Criteria**:
- [ ] Factory 타입 정의 완료
- [ ] Factory API 엔드포인트 구현 (RPC 사용)
- [ ] useFactory 훅 구현
- [ ] FactoryProvider 컨텍스트 구현 (캐시 무효화 포함)
- [ ] FactoryProvider가 app/layout.tsx에 AuthProvider 다음에 위치
- [ ] localStorage에 현재 공장 선택 저장
- [ ] 공장 전환 시 TanStack Query 캐시 즉시 무효화

---

### Phase 4: Factory Selection UI Implementation

**Goal**: 상단 네비게이션에 공장 선택 UI 추가

#### 4.1 New Component: `components/shared/FactorySelector.tsx`
```typescript
interface FactorySelectorProps {
  compact?: boolean      // For mobile view
  showLabel?: boolean    // Show factory name
}

export function FactorySelector({ compact, showLabel }: FactorySelectorProps) {
  const { currentFactory, accessibleFactories, setCurrentFactory } = useFactory()

  return (
    // Toggle button or dropdown
    // ALT (blue) | ALV (green)
    // With animation on switch
  )
}
```

**Design Specifications**:
- Desktop: Toggle 버튼 형태, 현재 선택된 공장 강조
- Mobile: 컴팩트 버튼, 터치 친화적
- 색상: ALT = 파란색(#1e3a8a), ALV = 초록색(#059669)
- 전환 애니메이션: 부드러운 slide/fade 효과

#### 4.2 Update Dashboard Layout: `app/dashboard/layout.tsx`
- Insert `FactorySelector` in header (desktop: between language selector and clock)
- Insert `FactorySelector` in mobile header (compact mode)
- **Note**: FactoryProvider는 app/layout.tsx에 있으므로 여기서는 context만 사용

**File Changes**:
```typescript
// app/dashboard/layout.tsx
import { FactorySelector } from '@/components/shared/FactorySelector'

// In header section (desktop):
<div className="flex items-center space-x-6">
  {/* Language selector */}
  <FactorySelector />  {/* NEW */}
  {/* Clock */}
  {/* User info */}
</div>

// In mobile header:
<FactorySelector compact />
```

#### 4.3 New i18n Keys: `lib/i18n.ts`
```typescript
factory: {
  selector: '공장 선택',
  currentFactory: '현재 공장',
  switchFactory: '공장 전환',
  alt: '1공장 (ALT)',
  alv: '2공장 (ALV)',
  allFactories: '전체 공장',
}
```

**Acceptance Criteria**:
- [ ] FactorySelector 컴포넌트 구현
- [ ] Desktop 헤더에 공장 선택기 표시
- [ ] Mobile 헤더에 컴팩트 공장 선택기 표시
- [ ] 공장 전환 시 시각적 피드백 제공
- [ ] i18n 다국어 지원 (한국어/베트남어)

---

### Phase 5: Permission System Extension

**Goal**: 공장별 권한 제어 시스템 구현

#### 5.1 Update Permission Types: `lib/auth/permissions.ts`
```typescript
// Add factory permission check (using RPC)
export async function hasFactoryAccess(
  supabase: SupabaseClient,
  factoryId: string
): Promise<boolean> {
  const { data } = await supabase.rpc('user_has_factory_access', {
    p_factory_id: factoryId
  })
  return data === true
}

// Sync version using cached data
export function hasFactoryAccessSync(
  factoryId: string,
  accessibleFactoryIds: string[]
): boolean {
  return accessibleFactoryIds.includes(factoryId)
}

// Update hasPermission to include factory check
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action'],
  customPermissions?: Permission[],
  factoryId?: string,
  accessibleFactoryIds?: string[]
): boolean {
  // Existing permission check
  // + Factory access check
}
```

#### 5.2 Update User Profile Types: `lib/types/users.ts`
```typescript
export interface User {
  // ... existing fields
  default_factory_id?: string
  accessible_factories?: UserFactoryAccess[]  // From RPC
}
```

#### 5.3 Update useAuth Hook: `lib/hooks/useAuth.ts`
```typescript
// Include factory info in user profile fetch using RPC
const { data: factoryAccess } = await supabase
  .rpc('get_user_accessible_factories')

// Merge into user data
const userData = {
  ...profile,
  accessible_factories: factoryAccess
}
```

#### 5.4 New Hook: `lib/hooks/useFactoryPermission.ts`
```typescript
export function useFactoryPermission() {
  const { user } = useAuth()
  const { currentFactory } = useFactory()

  const accessibleFactoryIds = useMemo(() => {
    return user?.accessible_factories?.map(f => f.factory_id) ?? []
  }, [user])

  const hasFactoryAccess = useCallback((factoryId: string) => {
    return accessibleFactoryIds.includes(factoryId)
  }, [accessibleFactoryIds])

  const canAccessCurrentFactory = useMemo(() => {
    return currentFactory ? hasFactoryAccess(currentFactory.id) : false
  }, [currentFactory, hasFactoryAccess])

  return { hasFactoryAccess, canAccessCurrentFactory, accessibleFactoryIds }
}
```

**Acceptance Criteria**:
- [ ] hasFactoryAccess 함수 구현 (RPC 및 동기 버전)
- [ ] User 타입에 공장 관련 필드 추가
- [ ] useAuth에서 RPC로 공장 정보 로드
- [ ] useFactoryPermission 훅 구현
- [ ] 공장 접근 권한 없을 시 적절한 에러 표시

---

### Phase 6: API and Hook Modifications

**Goal**: 모든 API와 훅에 factory_id 필터링 적용

#### 6.1 API Routes to Modify

| API Route | Method | Changes Required |
|-----------|--------|------------------|
| `/api/dashboard` | GET | Add factory_id filter to all queries |
| `/api/equipment` | GET, POST, PUT | Filter by factory_id, include in create |
| `/api/equipment/[id]` | GET, PUT, DELETE | Verify factory access |
| `/api/endmill` | GET, POST, PUT, DELETE | Filter/include factory_id (with shared handling) |
| `/api/tool-changes` | GET, POST | Filter by factory_id |
| `/api/inventory` | GET, POST, PUT | Filter by factory_id |
| `/api/inventory/inbound` | GET, POST | Filter by factory_id |
| `/api/inventory/outbound` | GET, POST | Filter by factory_id |
| `/api/cam-sheets` | GET, POST, PUT | Filter by factory_id |
| `/api/reports/*` | GET | Filter by factory_id |
| `/api/endmill-disposals` | GET, POST | Filter by factory_id |

#### 6.2 API Modification Pattern

```typescript
// Example: app/api/equipment/route.ts
export async function GET(request: NextRequest) {
  // 1. Authenticate user
  const user = await authenticateUser(supabase)

  // 2. Get factory_id from query params or header
  const url = new URL(request.url)
  const factoryId = url.searchParams.get('factory_id')
    || request.headers.get('X-Factory-ID')

  // 3. [CRITICAL FIX] Default factory fallback
  let effectiveFactoryId = factoryId
  if (!effectiveFactoryId) {
    // RPC로 사용자 기본 공장 조회
    const { data: defaultFactory } = await supabase.rpc('get_user_default_factory')
    effectiveFactoryId = defaultFactory
  }

  // 4. Verify factory access using RPC
  const { data: hasAccess } = await supabase.rpc('user_has_factory_access', {
    p_factory_id: effectiveFactoryId
  })

  if (!hasAccess) {
    return NextResponse.json({ error: 'Factory access denied' }, { status: 403 })
  }

  // 5. Filter data by factory_id
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('factory_id', effectiveFactoryId)

  return NextResponse.json({ success: true, data: equipment })
}
```

#### 6.3 [CRITICAL FIX] Endmill Types Exception Handling

```typescript
// app/api/endmill/route.ts
export async function GET(request: NextRequest) {
  const factoryId = getFactoryId(request)

  // [CRITICAL] endmill_types는 공유 가능 (factory_id = NULL)
  // 현재 공장 앤드밀 + 공유 앤드밀(NULL) 모두 조회
  const { data: endmills } = await supabase
    .from('endmill_types')
    .select('*')
    .or(`factory_id.eq.${factoryId},factory_id.is.null`)
    .order('name')

  return NextResponse.json({ success: true, data: endmills })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const factoryId = getFactoryId(request)

  // POST 시 is_shared 플래그에 따라 factory_id 설정
  const { data: endmill } = await supabase
    .from('endmill_types')
    .insert({
      ...body,
      factory_id: body.is_shared ? null : factoryId  // 공유 앤드밀은 NULL
    })
    .select()
    .single()

  return NextResponse.json({ success: true, data: endmill })
}
```

#### 6.4 Hooks to Modify

| Hook | File | Changes Required |
|------|------|------------------|
| `useDashboard` | `lib/hooks/useDashboard.ts` | Pass factory_id to API |
| `useEquipment` | `lib/hooks/useEquipment.ts` | Include factory_id in queries |
| `useInventory` | `lib/hooks/useInventory.ts` | Include factory_id in queries |
| `useToolChanges` | `lib/hooks/useToolChanges.ts` | Include factory_id in queries |
| `useCAMSheets` | `lib/hooks/useCAMSheets.ts` | Include factory_id in queries |
| `useReports` | `lib/hooks/useReports.ts` | Include factory_id in queries |

#### 6.5 Hook Modification Pattern
```typescript
// Example: lib/hooks/useDashboard.ts
export const useDashboard = (refreshInterval: number = 30000) => {
  const { currentFactory } = useFactory()  // NEW

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', currentFactory?.id],  // Include factory in key
    queryFn: () => fetchDashboardData(currentFactory?.id),
    enabled: !!currentFactory,  // Only fetch when factory is selected
    // ...
  })
}

const fetchDashboardData = async (factoryId?: string): Promise<DashboardData> => {
  const url = factoryId
    ? `/api/dashboard?factory_id=${factoryId}`
    : '/api/dashboard'
  // ...
}
```

#### 6.6 [CRITICAL FIX] Realtime Subscription with Factory Filter

```typescript
// lib/hooks/useRealtime.ts
export function useRealtimeSubscription<T>(
  table: string,
  onInsert?: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: { old: T }) => void
) {
  const { currentFactory } = useFactory()
  const supabase = createBrowserClient()

  useEffect(() => {
    if (!currentFactory) return

    // [CRITICAL] 공장 전환 시 기존 구독 해제 후 새 구독
    const channel = supabase
      .channel(`${table}-${currentFactory.id}`)  // 공장별 고유 채널
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `factory_id=eq.${currentFactory.id}`  // 공장 필터
        },
        (payload) => {
          if (payload.eventType === 'INSERT') onInsert?.(payload.new as T)
          if (payload.eventType === 'UPDATE') onUpdate?.(payload.new as T)
          if (payload.eventType === 'DELETE') onDelete?.(payload as { old: T })
        }
      )
      .subscribe()

    // Cleanup: 공장 전환 시 기존 구독 해제
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentFactory?.id, table])  // [CRITICAL] currentFactory.id를 dependency에 추가
}
```

#### 6.7 Request Header Strategy
```typescript
// lib/utils/apiHelper.ts
export function getApiHeaders(factoryId?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(factoryId && { 'X-Factory-ID': factoryId }),
  }
}
```

**Acceptance Criteria**:
- [ ] 모든 API에 factory_id 필터 적용
- [ ] API에 기본 공장 fallback 로직 구현
- [ ] endmill_types API에 공유 앤드밀(NULL) 처리 로직 추가
- [ ] 모든 훅에서 currentFactory 사용
- [ ] 공장 전환 시 데이터 자동 새로고침
- [ ] Query key에 factory_id 포함하여 캐시 분리
- [ ] Realtime 구독에 factory_id 필터 적용
- [ ] 공장 접근 권한 검증 추가

---

### Phase 7: Testing and Migration

**Goal**: 전체 시스템 테스트 및 데이터 마이그레이션

#### 7.1 [CRITICAL FIX] Migration Script with Batch Processing

```sql
-- Migration script for existing data (배치 처리)
BEGIN;

-- 1. Insert factories
INSERT INTO factories (code, name, name_ko, name_vi, country, timezone) VALUES
  ('ALT', 'ALMUS TECH', '1공장 (ALT)', 'Nha may 1 (ALT)', 'Korea', 'Asia/Seoul'),
  ('ALV', 'ALMUS VINA', '2공장 (ALV)', 'Nha may 2 (ALV)', 'Vietnam', 'Asia/Ho_Chi_Minh')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- 2. Batch update existing data to ALT factory (1000개씩 배치 처리)
-- 대용량 데이터의 경우 Edge Function 또는 별도 스크립트 사용 권장

-- Equipment batch update
DO $$
DECLARE
  batch_size INT := 1000;
  affected INT := 1;
  alt_id UUID;
BEGIN
  SELECT id INTO alt_id FROM factories WHERE code = 'ALT';

  WHILE affected > 0 LOOP
    WITH batch AS (
      SELECT id FROM equipment
      WHERE factory_id IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE equipment SET factory_id = alt_id
    WHERE id IN (SELECT id FROM batch);

    GET DIAGNOSTICS affected = ROW_COUNT;
    COMMIT;

    -- 서버 부하 방지를 위한 짧은 대기
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- tool_changes batch update
DO $$
DECLARE
  batch_size INT := 1000;
  affected INT := 1;
  alt_id UUID;
BEGIN
  SELECT id INTO alt_id FROM factories WHERE code = 'ALT';

  WHILE affected > 0 LOOP
    WITH batch AS (
      SELECT id FROM tool_changes
      WHERE factory_id IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE tool_changes SET factory_id = alt_id
    WHERE id IN (SELECT id FROM batch);

    GET DIAGNOSTICS affected = ROW_COUNT;
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- inventory batch update
DO $$
DECLARE
  batch_size INT := 1000;
  affected INT := 1;
  alt_id UUID;
BEGIN
  SELECT id INTO alt_id FROM factories WHERE code = 'ALT';

  WHILE affected > 0 LOOP
    WITH batch AS (
      SELECT id FROM inventory
      WHERE factory_id IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE inventory SET factory_id = alt_id
    WHERE id IN (SELECT id FROM batch);

    GET DIAGNOSTICS affected = ROW_COUNT;
    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Repeat for other tables: inventory_transactions, cam_sheets, endmill_disposals

-- 3. Create user_factory_access entries for existing users
INSERT INTO user_factory_access (user_id, factory_id, is_default)
SELECT
  user_id,
  (SELECT id FROM factories WHERE code = 'ALT'),
  true
FROM user_profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_factory_access
  WHERE user_factory_access.user_id = user_profiles.user_id
);

-- 4. Update user profiles default factory
UPDATE user_profiles
SET default_factory_id = (SELECT id FROM factories WHERE code = 'ALT')
WHERE default_factory_id IS NULL;
```

**Edge Function for Large Data Migration (Optional)**:
```typescript
// supabase/functions/migrate-factory-data/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { table, batchSize = 1000 } = await req.json()

  const { data: altFactory } = await supabase
    .from('factories')
    .select('id')
    .eq('code', 'ALT')
    .single()

  let processed = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .update({ factory_id: altFactory.id })
      .is('factory_id', null)
      .limit(batchSize)
      .select('id')

    if (error) throw error

    processed += data?.length || 0
    hasMore = (data?.length || 0) === batchSize

    // Rate limiting
    await new Promise(r => setTimeout(r, 100))
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

#### 7.2 Test Scenarios

| Test Case | Description | Expected Result | Verification Method |
|-----------|-------------|-----------------|---------------------|
| TC-01 | 로그인 후 기본 공장 로드 | 사용자의 default_factory가 선택됨 | UI 확인 + API 응답 검증 |
| TC-02 | 공장 전환 | UI 즉시 갱신, 데이터 새로고침, 캐시 무효화 | Network 탭에서 API 재호출 확인 |
| TC-03 | 권한 없는 공장 접근 | 403 에러 반환 | API 직접 호출 테스트 |
| TC-04 | 설비 조회 (ALT) | ALT 공장 설비만 표시 | DB 직접 쿼리로 카운트 비교 |
| TC-05 | 설비 조회 (ALV) | ALV 공장 설비만 표시 | DB 직접 쿼리로 카운트 비교 |
| TC-06 | 교체 실적 입력 | 현재 공장 factory_id 자동 설정 | **API 응답에서 factory_id 필드 확인 + DB 직접 확인** |
| TC-07 | 재고 조회 | 현재 공장 재고만 표시 | DB 직접 쿼리로 카운트 비교 |
| TC-08 | 대시보드 통계 | 현재 공장 데이터만 집계 | DB 수동 집계와 비교 |
| TC-09 | 리포트 생성 | 현재 공장 데이터만 포함 | 리포트 내 데이터 검증 |
| TC-10 | 다중 공장 권한 사용자 | 양쪽 공장 전환 가능 | 전환 후 데이터 변경 확인 |
| TC-11 | 공유 앤드밀 조회 | 현재 공장 + NULL factory_id 앤드밀 표시 | API 응답 확인 |
| TC-12 | Realtime 구독 | 공장 전환 시 구독 재설정 | 다른 공장 이벤트 미수신 확인 |

#### 7.3 Rollback Plan
```sql
-- Rollback script (if needed)
BEGIN;

-- Remove factory_id columns (dangerous - only if migration fails)
ALTER TABLE equipment DROP COLUMN factory_id;
ALTER TABLE tool_changes DROP COLUMN factory_id;
-- ... other tables

-- Remove user profile factory fields
ALTER TABLE user_profiles DROP COLUMN default_factory_id;

-- Drop junction table
DROP TABLE user_factory_access;

-- Drop RPC functions
DROP FUNCTION IF EXISTS get_user_accessible_factories;
DROP FUNCTION IF EXISTS user_has_factory_access;
DROP FUNCTION IF EXISTS get_user_default_factory;

-- Drop factories table
DROP TABLE factories;

COMMIT;
```

**Acceptance Criteria**:
- [ ] 마이그레이션 스크립트 실행 성공 (배치 처리)
- [ ] 기존 데이터 무결성 유지
- [ ] 모든 테스트 케이스 통과 (TC-06 검증 방법 포함)
- [ ] 롤백 계획 준비

---

## 3. File-by-File Changes

### New Files to Create
| File | Purpose |
|------|---------|
| `lib/types/factory.ts` | Factory 타입 정의 |
| `lib/hooks/useFactory.ts` | Factory 상태 관리 훅 |
| `lib/hooks/useFactoryPermission.ts` | Factory 권한 확인 훅 |
| `lib/providers/FactoryProvider.tsx` | Factory 컨텍스트 프로바이더 (캐시 무효화 포함) |
| `components/shared/FactorySelector.tsx` | 공장 선택 UI 컴포넌트 |
| `app/api/factories/route.ts` | 공장 목록 API (RPC 사용) |
| `app/api/factories/[id]/route.ts` | 공장 상세 API |
| `supabase/migrations/xxx_add_multi_factory.sql` | DB 마이그레이션 |
| `supabase/functions/migrate-factory-data/index.ts` | 대용량 마이그레이션 Edge Function (선택) |

### Files to Modify
| File | Changes |
|------|---------|
| `lib/types/database.ts` | Add factories, user_factory_access tables, factory_id to tables |
| `lib/types/users.ts` | Add factory fields to User interface |
| `lib/auth/permissions.ts` | Add hasFactoryAccess function |
| `lib/hooks/useAuth.ts` | Load factory info via RPC |
| `lib/hooks/useDashboard.ts` | Add factory_id to queries |
| `lib/hooks/useEquipment.ts` | Add factory_id to queries |
| `lib/hooks/useInventory.ts` | Add factory_id to queries |
| `lib/hooks/useToolChanges.ts` | Add factory_id to queries |
| `lib/hooks/useCAMSheets.ts` | Add factory_id to queries |
| `lib/hooks/useReports.ts` | Add factory_id to queries |
| `lib/hooks/useRealtime.ts` | Add factory_id filter to subscriptions |
| `lib/i18n.ts` | Add factory-related translations |
| `app/layout.tsx` | Add FactoryProvider (after AuthProvider) |
| `app/dashboard/layout.tsx` | Add FactorySelector |
| `app/api/dashboard/route.ts` | Filter by factory_id + fallback |
| `app/api/equipment/route.ts` | Filter by factory_id + fallback |
| `app/api/endmill/route.ts` | Filter by factory_id with NULL handling |
| `app/api/tool-changes/route.ts` | Filter by factory_id + fallback |
| `app/api/inventory/route.ts` | Filter by factory_id + fallback |
| `app/api/inventory/inbound/route.ts` | Filter by factory_id + fallback |
| `app/api/inventory/outbound/route.ts` | Filter by factory_id + fallback |
| `app/api/cam-sheets/route.ts` | Filter by factory_id + fallback |
| `app/api/reports/*/route.ts` | Filter by factory_id + fallback |
| `app/api/endmill-disposals/route.ts` | Filter by factory_id + fallback |

---

## 4. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 기존 데이터 손실 | Low | High | 마이그레이션 전 백업, 롤백 스크립트 준비, 배치 처리 |
| 권한 시스템 오류 | Medium | High | 단계별 테스트, RLS 정책 신중한 적용, user_profiles UPDATE RLS |
| 성능 저하 | Medium | Medium | 인덱스 추가, 쿼리 최적화, RPC 사용 |
| UI 깨짐 | Low | Low | 컴포넌트 단위 테스트 |
| API 호환성 문제 | Medium | Medium | 기본 공장 fallback 로직으로 하위 호환성 유지 |
| 캐시 불일치 | Medium | Medium | 공장 전환 시 즉시 캐시 무효화 |
| Realtime 이벤트 누락 | Low | Medium | 공장 전환 시 구독 재설정 |

---

## 5. Commit Strategy

| Commit | Description | Files |
|--------|-------------|-------|
| 1 | chore: create feature branch for multi-factory | - |
| 2 | feat(db): add factories table and user_factory_access | migrations/, types/database.ts |
| 3 | feat(db): add RPC functions for factory access | migrations/ |
| 4 | feat(db): add RLS policies including user_profiles UPDATE | migrations/ |
| 5 | feat(types): add Factory types and interfaces | types/factory.ts, types/users.ts |
| 6 | feat(hooks): add useFactory with cache invalidation | hooks/useFactory.ts |
| 7 | feat(providers): add FactoryProvider with cache strategy | providers/FactoryProvider.tsx |
| 8 | feat(ui): add FactorySelector component | components/shared/FactorySelector.tsx |
| 9 | feat(layout): integrate FactoryProvider in app layout | app/layout.tsx |
| 10 | feat(layout): add FactorySelector in dashboard | app/dashboard/layout.tsx |
| 11 | feat(auth): add factory permission functions | auth/permissions.ts, hooks/useAuth.ts |
| 12 | feat(api): add factory_id filter with fallback to dashboard | api/dashboard/route.ts |
| 13 | feat(api): add factory_id filter with fallback to equipment | api/equipment/route.ts |
| 14 | feat(api): add factory_id filter with NULL handling to endmill | api/endmill/route.ts |
| 15 | feat(api): add factory_id filter to tool-changes | api/tool-changes/route.ts |
| 16 | feat(api): add factory_id filter to inventory | api/inventory/*.ts |
| 17 | feat(api): add factory_id filter to other APIs | api/cam-sheets, reports, disposals |
| 18 | feat(hooks): update hooks with factory_id support | hooks/*.ts |
| 19 | feat(realtime): add factory_id filter to subscriptions | hooks/useRealtime.ts |
| 20 | feat(i18n): add factory translations | lib/i18n.ts |
| 21 | feat(migration): add batch migration script | migrations/ |
| 22 | test: add multi-factory test cases | - |
| 23 | docs: update README for multi-factory | README.md |

---

## 6. Verification Steps

1. **Database Verification**
   - [ ] `factories` 테이블에 2개 레코드 존재 (ALT, ALV)
   - [ ] `user_factory_access` 테이블 생성 및 데이터 마이그레이션 완료
   - [ ] RPC 함수 3개 정상 동작 확인
   - [ ] 기존 데이터가 ALT factory_id를 갖고 있음
   - [ ] 모든 사용자가 user_factory_access에 최소 1개 레코드 존재

2. **UI Verification**
   - [ ] 로그인 후 FactorySelector 표시됨
   - [ ] 공장 전환 시 화면 갱신됨
   - [ ] 모바일에서 컴팩트 모드 정상 동작

3. **API Verification**
   - [ ] factory_id 없이 요청 시 사용자 기본 공장 사용 (fallback 동작)
   - [ ] 권한 없는 공장 요청 시 403 반환
   - [ ] 모든 API가 factory_id로 필터링됨
   - [ ] endmill API에서 공유 앤드밀(NULL) 정상 조회

4. **Cache Verification**
   - [ ] 공장 전환 시 TanStack Query 캐시 즉시 무효화
   - [ ] 공장별로 별도 캐시 키 사용 확인

5. **Realtime Verification**
   - [ ] 공장 전환 시 기존 구독 해제 + 새 구독 설정
   - [ ] 다른 공장 이벤트 미수신 확인

6. **Permission Verification**
   - [ ] system_admin: 모든 공장 접근 가능
   - [ ] 일반 사용자: user_factory_access에 있는 공장만 접근 가능
   - [ ] 공장 전환 시 권한 재검증
   - [ ] user_profiles UPDATE 시 accessible factory만 default로 설정 가능

---

## 7. Definition of Done

- [ ] 모든 Phase 완료
- [ ] 모든 테스트 케이스 통과
- [ ] Critical Issues 4개 모두 해결됨:
  - [ ] TanStack Query 캐시 무효화 전략 구현
  - [ ] user_factory_access 중간 테이블 + RPC 함수 구현
  - [ ] user_profiles UPDATE RLS 정책 추가
  - [ ] endmill_types NULL factory_id 처리 구현
  - [ ] API 하위 호환성 (기본 공장 fallback) 구현
- [ ] Minor Issues 4개 개선됨:
  - [ ] FactoryProvider 위치 명확화 (app/layout.tsx, AuthProvider 다음)
  - [ ] TC-06 검증 방법 명확화
  - [ ] Realtime 구독 factory_id 필터링 구현
  - [ ] 마이그레이션 스크립트 배치 처리 구현
- [ ] 코드 리뷰 완료
- [ ] main 브랜치 병합 준비 완료
- [ ] 문서 업데이트 완료

---

## Appendix: Database Schema Diagram

```
factories
+------------+----------+
| id (PK)    | uuid     |
| code       | varchar  |  <- 'ALT', 'ALV'
| name       | varchar  |
| name_ko    | varchar  |
| name_vi    | varchar  |
| timezone   | varchar  |
| is_active  | boolean  |
+------------+----------+
      |
      | 1:N (via user_factory_access)
      v
+----------------------+
| user_factory_access  |
| id (PK)              |
| user_id (FK)         |------> auth.users
| factory_id (FK)      |------> factories
| is_default           |
+----------------------+

+------------------+
| equipment        |
| factory_id (FK)  |-----+
+------------------+     |
                         |
+------------------+     |
| tool_changes     |     |
| factory_id (FK)  |-----+
+------------------+     |
                         |
+------------------+     |
| inventory        |     |
| factory_id (FK)  |-----+
+------------------+     |
                         |
+------------------+     |
| endmill_types    |     |
| factory_id (FK)  |-----+-- (NULL = shared)
+------------------+     |
                         |
+------------------+     |
| cam_sheets       |     |
| factory_id (FK)  |-----+
+------------------+     |
                         |
+------------------+     |
| user_profiles    |     |
| default_factory  |-----+
+------------------+
```

---

**Plan Created**: 2026-01-27
**Plan Revised**: 2026-01-27 (Iteration 2)
**Author**: Prometheus (Planning Agent)
**Status**: Ready for Review
**Revision Notes**:
- Critical Issue 1: TanStack Query 캐시 무효화 전략 추가 (Phase 3.5)
- Critical Issue 2: user_factory_access 중간 테이블 + RPC 함수 방식으로 변경 (Phase 2.3)
- Critical Issue 3: user_profiles UPDATE RLS 정책 추가 (Phase 2.4)
- Critical Issue 4: endmill_types NULL factory_id 처리 추가 (Phase 6.3)
- Critical Issue 5: API 기본 공장 fallback 로직 추가 (Phase 6.2)
- Minor Issue 1: FactoryProvider 위치 명확화 (Phase 3.5)
- Minor Issue 2: TC-06 검증 방법 상세화 (Phase 7.2)
- Minor Issue 3: Realtime 구독 factory_id 필터링 추가 (Phase 6.6)
- Minor Issue 4: 마이그레이션 배치 처리 추가 (Phase 7.1)
