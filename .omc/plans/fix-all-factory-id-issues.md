# 전체 시스템 factory_id 누락 종합 수정 계획

## 근본 원인

다공장 시스템 배포 시 API 레이어와 훅 레이어에서 factory_id 지원이 구현되었으나, 일부 페이지의 직접 fetch() 호출에서 factory_id를 전달하지 않음.

## 이미 수정 완료된 항목 (이전 작업)
- ✅ inventory/outbound/page.tsx - factory_id 전달 완료
- ✅ inventory/inbound/page.tsx - factory_id 전달 완료
- ✅ api/inventory/route.ts - getStats에 factoryId 전달 완료

## 이미 정상인 항목 (수정 불필요)
- ✅ dashboard/page.tsx - 훅 통해 데이터 가져옴 (useDashboard에 factoryId 있음)
- ✅ equipment/page.tsx - useEquipment 훅 사용 (factoryId 있음)
- ✅ endmill/page.tsx - factoryId 직접 전달됨
- ✅ endmill-disposal/page.tsx - useFactory 사용, factoryId 전달됨
- ✅ users/page.tsx - useUsers 훅 사용 (factoryId 있음)
- ✅ profile/page.tsx - 개인 데이터, factory 불필요
- ✅ settings/ - 시스템 전역 설정, factory 불필요
- ✅ inventory/page.tsx - useInventory 훅 사용 (factoryId 있음), 나머지는 전역 데이터
- ✅ auto-fill API - 이미 factoryId 지원 (searchParams에서 factoryId 읽음, 라인 14)

## 수정 필요 항목

### 버그 1: tool-changes/page.tsx - POST에 factory_id 누락 (Critical)
- **handleSubmit** (라인 463): `toolChangeData`에 `factory_id` 없음
- **handleBulkUpload** (라인 752): body에 `factory_id` 없음
- **수정**: useFactory import 추가, currentFactory 추출, POST body에 factory_id 추가

### 버그 2: useCAMSheets.ts - GET에 factoryId 누락 (High)
- CAM Sheet 조회 시 factoryId를 전달하지 않음
- cam_sheets 테이블에 factory_id 컬럼이 있음 (마이그레이션 확인)
- **수정**: useFactory import 추가, fetch URL에 factoryId 파라미터 추가

### 버그 3: cam-sheets/page.tsx - 직접 fetch에 factoryId 누락 (Medium)
- cam-sheets 페이지에서 직접 호출하는 tool-changes, inventory API에 factoryId 미포함
- **수정**: useFactory import 추가, API 호출에 factoryId 파라미터 추가

### 버그 4: useAI.ts / ai/insights API - factory_id 완전 누락 (High)
- `lib/hooks/useAI.ts`: factory_id/factoryId/useFactory 참조 전무
- `app/api/ai/insights/route.ts`: tool_changes, inventory 쿼리에 factory_id 필터 없음
- **영향**: AI 인사이트가 전체 공장 데이터를 혼합 분석하여 부정확한 결과 표시
- **수정**: useAI.ts에 useFactory 추가 및 API 호출에 factoryId 전달, ai/insights API에 factoryId 필터링 추가

## 구현 단계

### Step 1: tool-changes/page.tsx 수정
1. `import { useFactory } from '@/lib/hooks/useFactory'` 추가
2. 컴포넌트 내부에서 `const { currentFactory } = useFactory()` 추가
3. handleSubmit(라인 463)의 toolChangeData에 `factory_id: currentFactory?.id` 추가
4. handleBulkUpload(라인 752)의 body에 `factory_id: currentFactory?.id` 추가

### Step 2: useCAMSheets.ts 수정
1. `import { useFactory } from '@/lib/hooks/useFactory'` 추가
2. 훅 내부에서 `const { currentFactory } = useFactory()` 추가
3. fetch URL에 factoryId 파라미터 추가
4. queryKey에 factoryId 포함
5. enabled 조건에 factoryId 추가

### Step 3: cam-sheets/page.tsx 수정
1. `import { useFactory } from '@/lib/hooks/useFactory'` 추가
2. `const { currentFactory } = useFactory()` 추가
3. 직접 fetch 호출에 factoryId 파라미터 추가

### Step 4: useAI.ts 수정
1. `import { useFactory } from '@/lib/hooks/useFactory'` 추가
2. 훅 내부에서 `const { currentFactory } = useFactory()` 추가
3. AI insights API 호출 URL에 `factoryId` 파라미터 추가
4. queryKey에 factoryId 포함

### Step 5: app/api/ai/insights/route.ts 수정
1. searchParams에서 `factoryId` 추출
2. tool_changes 쿼리에 factory_id 필터 추가
3. inventory 쿼리에 factory_id 필터 추가

## 검증 기준
1. 교체 실적 저장 후 목록에 즉시 표시됨
2. 교체 실적 통계 카드가 정확한 오늘 건수 표시
3. CAM Sheet가 공장별로 필터링됨
4. Excel 일괄 업로드 시 factory_id가 적용됨
5. AI 인사이트가 현재 공장 데이터만 분석
6. TypeScript 빌드 오류 없음
