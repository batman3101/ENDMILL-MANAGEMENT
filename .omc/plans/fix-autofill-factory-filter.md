# 교체 실적 Auto-Fill 공장별 필터링 버그 수정 계획

## 문제 요약
교체 실적(tool-changes) 입력 시 설비번호를 입력하면 auto-fill API를 호출하여 모델/공정을 자동 입력하는데, 이때 `factoryId` 파라미터를 전달하지 않아 **다른 공장의 설비 데이터가 반환**될 수 있음.

## 근본 원인
`app/dashboard/tool-changes/page.tsx`의 두 auto-fill 함수에서 API 호출 시 `factoryId`를 포함하지 않음:
- `autoFillByEquipmentNumber` (라인 177): `/api/tool-changes/auto-fill?equipmentNumber=...` → factoryId 누락
- `autoFillByTNumber` (라인 203): `/api/tool-changes/auto-fill?model=...&process=...&tNumber=...` → factoryId 누락

API 측(`app/api/tool-changes/auto-fill/route.ts`)은 이미 `factoryId` 파라미터를 수용하고 필터링하도록 구현되어 있으므로, **클라이언트 측만 수정하면 됨**.

## 수정 대상
- **파일**: `app/dashboard/tool-changes/page.tsx`
- **수정 범위**: 2개 함수의 fetch URL에 `factoryId` 쿼리 파라미터 추가

## 구체적 수정 사항

### 1. `autoFillByEquipmentNumber` 함수 (라인 173-196)
- `useCallback` 의존성 배열에 `currentFactory?.id` 추가
- fetch URL에 factoryId 조건부 추가: `${currentFactory?.id ? `&factoryId=${currentFactory.id}` : ''}`
- `currentFactory?.id`가 undefined일 때는 파라미터를 아예 전달하지 않아 기존 동작(전체 검색) 유지

### 2. `autoFillByTNumber` 함수 (라인 199-227)
- `useCallback` 의존성 배열에 `currentFactory?.id` 추가
- fetch URL에 factoryId 조건부 추가: `${currentFactory?.id ? `&factoryId=${currentFactory.id}` : ''}`
- `currentFactory?.id`가 undefined일 때는 파라미터를 아예 전달하지 않아 기존 동작 유지

## 수용 기준
1. 1공장 선택 상태에서 설비번호 입력 → 1공장에 등록된 설비의 모델/공정만 반환
2. 2공장 선택 상태에서 설비번호 입력 → 2공장에 등록된 설비의 모델/공정만 반환
3. T번호 auto-fill도 현재 공장의 CAM Sheet만 참조
4. TypeScript 빌드 오류 없음

## 리스크
- **낮음**: `currentFactory?.id`가 undefined인 경우 조건부 처리로 URL에 `"undefined"` 문자열이 삽입되는 것을 방지
- API 측은 이미 구현 완료, 클라이언트만 파라미터 전달 누락
