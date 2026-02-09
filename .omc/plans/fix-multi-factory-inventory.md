# 다공장 인벤토리 입출고 시스템 수정 계획

## 문제 요약

다공장(ALT/ALV) 시스템 배포 후 1공장(ALT)에서 앤드밀 출고가 작동하지 않는 문제. 근본 원인은 **출고/입고 페이지(프론트엔드)가 API 호출 시 `factory_id`를 전달하지 않는 것**임.

## 발견된 버그 목록

### 버그 1: 출고 페이지 - factory_id 미전달 (Critical)
- **파일**: `app/dashboard/inventory/outbound/page.tsx`
- **문제**: `handleProcessOutbound()` (라인 376-391)에서 POST 요청 body에 `factory_id`가 누락됨
- **영향**: 출고 API가 `factory_id` 없이 호출 → 재고 조회 시 `factory_id IS NULL` 조건으로 조회 → 재고를 찾지 못함 → "재고 정보를 찾을 수 없습니다" 에러 발생
- **수정**: body에 `factory_id` 추가 필요 (useFactory 훅에서 가져오기)

### 버그 2: 출고 페이지 - 출고 내역 조회에 factory_id 미전달 (High)
- **파일**: `app/dashboard/inventory/outbound/page.tsx`
- **문제**: `loadOutboundHistory()` (라인 185-216)에서 GET 요청 URL에 `factoryId` 파라미터 미포함
- **영향**: 모든 공장의 출고 내역이 혼합되어 표시됨
- **수정**: URL에 `factoryId` 파라미터 추가

### 버그 3: 출고 페이지 - 재고 조회에 factory_id 미전달 (High)
- **파일**: `app/dashboard/inventory/outbound/page.tsx`
- **문제**: `handleQRScan()` (라인 265)에서 `/api/inventory` 호출 시 `factoryId` 파라미터 미포함
- **영향**: 스캔 시 공장별 재고 수량이 아닌 전체 또는 factory_id=null인 재고를 표시
- **수정**: URL에 `factoryId` 파라미터 추가

### 버그 4: 입고 페이지 - factory_id 미전달 (High)
- **파일**: `app/dashboard/inventory/inbound/page.tsx`
- **문제**: `loadInboundItems()` (라인 73-91)에서 GET 요청에 `factoryId` 미포함, POST 요청에서도 `factory_id` 미전달 가능성
- **영향**: 입고 내역 조회 시 공장 필터링 안 됨
- **수정**: useFactory 훅 추가 및 API 호출에 factoryId 포함

### 버그 5: inventory 메인 API - getStats에 factoryId 미전달 (Medium)
- **파일**: `app/api/inventory/route.ts` (라인 97)
- **문제**: `getStats()` 호출 시 `factoryId` 옵션을 전달하지 않음
- **영향**: 재고 통계가 전체 공장 합산으로 표시됨
- **수정**: `getStats({ factoryId })` 형태로 수정

## 구현 단계

### Step 1: 출고 페이지에 useFactory 훅 추가 및 factory_id 전달
- `app/dashboard/inventory/outbound/page.tsx`
  - `useFactory` import 및 `currentFactory` 추출
  - `handleProcessOutbound()`: POST body에 `factory_id: currentFactory?.id` 추가
  - `loadOutboundHistory()`: URL에 `&factoryId=${currentFactory?.id}` 추가
  - `handleQRScan()`: `/api/inventory` 호출에 `?factoryId=${currentFactory?.id}` 추가

### Step 2: 입고 페이지에 useFactory 훅 추가 및 factory_id 전달
- `app/dashboard/inventory/inbound/page.tsx`
  - `useFactory` import 및 `currentFactory` 추출
  - `loadInboundItems()`: URL에 `&factoryId=${currentFactory?.id}` 추가
  - 입고 POST 요청에 `factory_id: currentFactory?.id` 추가

### Step 3: inventory 메인 API getStats에 factoryId 전달
- `app/api/inventory/route.ts` (라인 97)
  - `getStats()` → `getStats({ factoryId: factoryId || undefined })`

### Step 4: factory 변경 시 출고/입고 페이지 데이터 리프레시
- 출고/입고 페이지에서 `currentFactory` 변경 감지 시 내역 재로드
- `useEffect` 의존성 배열에 `currentFactory?.id` 추가

## 검증 기준

1. 1공장(ALT) 선택 시 해당 공장의 재고에서만 출고 가능
2. 출고 시 `factory_id`가 DB에 정상 저장됨
3. 출고/입고 내역 조회 시 현재 공장 것만 표시
4. 재고 통계가 공장별로 분리되어 표시
5. 공장 전환 시 데이터가 즉시 갱신
