# 교체 실적 페이지 다공장 factory_id 누락 수정 계획

## 문제 요약

교체 실적(tool-changes) 페이지에서 새 교체 실적을 저장한 후 목록에 표시되지 않는 문제.
통계 카드도 모두 0으로 표시됨 (스크린샷 확인).

**근본 원인**: `tool-changes/page.tsx`에서 POST 요청 시 `factory_id`를 전달하지 않음.
- API(`route.ts` 라인 188)는 `body.factory_id`를 저장함
- 훅(`useToolChanges.ts`)은 GET 조회 시 `factoryId`로 필터링함
- 결과: 새 레코드는 `factory_id=NULL`로 저장되고, 조회는 `factory_id=ALT의UUID`로 필터링하므로 방금 저장한 레코드가 보이지 않음

## 발견된 버그

### 버그 1: handleSubmit POST에 factory_id 누락 (Critical)
- **파일**: `app/dashboard/tool-changes/page.tsx` 라인 473-491
- **문제**: `toolChangeData` 객체에 `factory_id` 없음
- **수정**: `useFactory` 훅에서 `currentFactory?.id`를 가져와 body에 포함

### 버그 2: handleBulkUpload POST에 factory_id 누락 (High)
- **파일**: `app/dashboard/tool-changes/page.tsx` 라인 771-776
- **문제**: `JSON.stringify({ data: excelData })`에 `factory_id` 미포함
- **수정**: `{ data: excelData, factory_id: currentFactory?.id }` 형태로 수정

### 버그 3: useFactory 훅 미사용 (Root Cause)
- **파일**: `app/dashboard/tool-changes/page.tsx`
- **문제**: 페이지 컴포넌트에서 `useFactory`를 import/사용하지 않음
- **수정**: import 추가 및 `currentFactory` 추출

## 구현 단계

### Step 1: tool-changes/page.tsx 수정
1. `useFactory` import 추가
2. 컴포넌트에서 `const { currentFactory } = useFactory()` 추가
3. `handleSubmit`의 `toolChangeData`에 `factory_id: currentFactory?.id` 추가
4. `handleBulkUpload`의 POST body에 `factory_id: currentFactory?.id` 추가

## 검증 기준
1. 새 교체 실적 저장 시 `factory_id`가 DB에 정상 저장됨
2. 저장 후 목록에 즉시 표시됨
3. 통계 카드에 오늘 교체 건수가 정확히 표시됨
4. Excel 일괄 업로드 시에도 factory_id가 적용됨
