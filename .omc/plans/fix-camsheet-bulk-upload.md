# CAM Sheet 생성 시 factory_id 누락 수정 계획

## 문제 요약
CAM Sheet 생성(단일/벌크 모두) 시 `factory_id`가 전달되지 않아 `null`로 저장됨. 목록 조회 시 공장별 필터링이 적용되므로 `factory_id=null`인 레코드는 표시되지 않음.

## 근본 원인
`lib/hooks/useCAMSheets.ts`의 두 mutation에서 API 요청 body에 `factory_id`를 포함하지 않음:
- `createMutation` (라인 104-132): 단일 생성 시 factory_id 미포함
- `createBatchMutation` (라인 134-166): 벌크 생성 시 factory_id 미포함

API 측(`app/api/cam-sheets/route.ts:106`)은 `body.factory_id`를 읽어 저장하므로, **훅 내부에서 자동 주입하면 됨**.

## 설계 결정
**factory_id 주입 위치: 훅 내부 자동 주입** (권장)
- `useCAMSheets.ts`에서 이미 `useFactory()`를 사용 중 (라인 48)
- 훅 내부에서 `currentFactory?.id`를 body에 자동 포함
- 호출측(`page.tsx`, `ExcelUploader.tsx`)은 수정 불필요

## 수정 대상

### 파일: `lib/hooks/useCAMSheets.ts`

#### 1. `createMutation` (라인 112-116)
- `body: JSON.stringify(data)` → `body: JSON.stringify({ ...data, factory_id: factoryId })`

#### 2. `createBatchMutation` (라인 146-150)
- `body: JSON.stringify(data)` → `body: JSON.stringify({ ...data, factory_id: factoryId })`

`factoryId`는 이미 라인 49에서 `const factoryId = currentFactory?.id`로 선언되어 있음.

### 파일: DB 마이그레이션 (필수)
- 기존 `factory_id=null`인 CAM Sheet를 ALT 공장으로 backfill

## 수용 기준
1. 단일 CAM Sheet 생성 후 목록에 즉시 표시
2. Excel 벌크 업로드 후 목록에 즉시 표시
3. 저장된 CAM Sheet의 `factory_id`가 현재 선택된 공장 ID와 일치
4. 기존 `factory_id=null` 데이터가 ALT 공장으로 보정 (마이그레이션)
5. TypeScript 빌드 오류 없음

## 리스크
- **낮음**: `factoryId`가 undefined인 경우 `factory_id: undefined`가 되어 JSON.stringify 시 해당 키가 제거됨 → API에서 `body.factory_id || null`로 처리되어 기존 동작과 동일
