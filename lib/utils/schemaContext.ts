/**
 * Schema Context Utility
 * 데이터베이스 스키마 정보를 Gemini가 이해할 수 있는 형식으로 제공
 */

/**
 * AI가 SQL 생성 시 참고할 데이터베이스 스키마 컨텍스트
 *
 * 주의: 이 정보는 실제 DB 스키마와 동기화되어야 합니다.
 * 변경 사항이 있을 때마다 업데이트 필요
 */
export function getSchemaContext(): string {
  return `
# CNC Endmill Management Database Schema

## 핵심 용어 정의
- **생산모델(production_model)**: 생산 중인 제품 모델 (M1, M3, B5S6 등)
- **공정(process)**: CNC 가공 단계 (CNC1, CNC2)
- **공구위치/T번호(t_number)**: 장비에서 공구가 장착된 위치 (T1~T21, 숫자만 저장)
- **설비번호(equipment_number)**: CNC 장비 고유 번호 (C2~C800)
- **앤드밀코드(endmill_code)**: 공구 고유 코드 (AL001, AL002 등)

---

## 1. tool_changes (공구 교체 기록) ★가장 중요한 테이블
공구 교체 이력을 기록하는 핵심 테이블 (총 10,993건)

컬럼:
- id: UUID (기본키)
- equipment_id: UUID (장비 ID, equipment 테이블 참조)
- equipment_number: INTEGER (설비번호: 2 ~ 800)
- t_number: INTEGER (공구위치/T번호: 1 ~ 21)
- endmill_type_id: UUID (엔드밀 타입 ID)
- endmill_code: TEXT (엔드밀 코드: AL001, AL002, AL003 등)
- endmill_name: TEXT (엔드밀 명칭)
- change_date: DATE (교체 날짜)
- change_reason: ENUM (교체 사유) ★아래 값만 사용
  - '파손' - 공구 파손
  - '마모' - 공구 마모
  - '수명완료' - 정상적인 수명 종료
  - '모델변경' - 생산 모델 변경
- production_model: TEXT (생산 모델) ★모델 분석시 이 컬럼 사용
  - 실제 값: M1, M3, M1R, B5M, B5S6, B6S, B6S6, B7M, B7S, B7S6, B7RS, B7RS6, PA1, PA2, PA3, R3, R13, E1, CAV2
- process: TEXT (공정: CNC1, CNC2)
- tool_life: INTEGER (공구 수명)
- changed_by: UUID (교체 작업자 ID)
- notes: TEXT (비고)
- created_at: TIMESTAMP

★★★ 중요: 모델별 분석시 반드시 production_model 컬럼 사용 (model 컬럼은 NULL임)

---

## 2. equipment (장비/설비 정보)
800대 CNC 장비 정보

컬럼:
- id: UUID (기본키)
- equipment_number: INTEGER (설비번호: 1 ~ 800, UNIQUE)
- location: ENUM (위치)
  - 'A동'
  - 'B동'
- status: ENUM (상태)
  - '가동중'
  - '점검중'
  - '셋업중'
- model_code: TEXT (모델 코드)
- current_model: TEXT (현재 생산 모델)
- process: TEXT (공정)
- tool_position_count: INTEGER (공구 위치 개수, 기본 21)
- last_maintenance: DATE (마지막 유지보수 날짜)

---

## 3. endmill_types (엔드밀 타입)
엔드밀 종류 및 사양 (총 302종)

컬럼:
- id: UUID (기본키)
- code: TEXT (엔드밀 코드, UNIQUE) - 예: AL001, AL002, AL003...
- category_id: UUID (카테고리 ID)
- name: TEXT (엔드밀 명칭)
- unit_cost: NUMERIC (단가, 원)
- standard_life: INTEGER (표준 수명)

---

## 4. endmill_categories (엔드밀 카테고리)
13개 카테고리

컬럼:
- id: UUID (기본키)
- code: TEXT (카테고리 코드)
- name_ko: TEXT (한국어 명칭)
- name_vi: TEXT (베트남어 명칭)

실제 카테고리 값:
- FLAT (플랫 엔드밀)
- BALL (볼 엔드밀)
- BULL NOSE (불노즈)
- DRILL (드릴)
- REAMER (리머)
- TAP (탭)
- FORM (폼커터)
- FACE MILL (페이스밀)
- T-CUT (T커터)
- C-CUT (C커터)
- DOVETAIL (도브테일)
- BRUSH (브러시)
- SPECIAL (특수공구)

---

## 5. inventory (재고)
엔드밀 재고 현황 (총 302건)

컬럼:
- id: UUID (기본키)
- endmill_type_id: UUID (엔드밀 타입 ID)
- current_stock: INTEGER (현재 재고)
- min_stock: INTEGER (최소 재고/안전재고)
- max_stock: INTEGER (최대 재고)
- status: ENUM (재고 상태)
  - 'sufficient' - 충분
  - 'low' - 부족 (재고 < 최소재고)
  - 'critical' - 긴급 (재고 매우 부족)
- location: TEXT (보관 위치)
- last_updated: TIMESTAMP

---

## 6. inventory_transactions (입출고 이력)
재고 입출고 기록 (총 3,628건)

컬럼:
- id: UUID (기본키)
- inventory_id: UUID (재고 ID)
- transaction_type: TEXT
  - 'inbound' - 입고
  - 'outbound' - 출고
- quantity: INTEGER (수량)
- unit_price: NUMERIC (단가)
- total_amount: NUMERIC (총액)
- equipment_id: UUID (장비 ID, 출고시)
- t_number: INTEGER (공구 위치, 출고시)
- purpose: TEXT (용도)
- processed_by: UUID (처리자 ID)
- processed_at: TIMESTAMP (처리 시간)
- notes: TEXT (비고)

---

## 7. user_profiles (사용자 프로필)
작업자 정보 (총 48명)

컬럼:
- id: UUID (기본키)
- user_id: UUID (auth.users 참조)
- employee_id: TEXT (사원번호)
- name: TEXT (이름)
- department: TEXT (부서)
- position: TEXT (직위)
- shift: ENUM (교대조)
  - 'A' - A조
  - 'B' - B조
- is_active: BOOLEAN (활성 여부)

---

## 8. tool_positions (장비별 현재 공구 위치)
각 장비의 T1~T21 위치에 현재 장착된 공구 정보 (총 15,556건)

컬럼:
- id: UUID (기본키)
- equipment_id: UUID (장비 ID)
- position_number: INTEGER (공구 위치: 1 ~ 21) ★t_number 아님 주의
- endmill_type_id: UUID (엔드밀 타입 ID)
- current_life: INTEGER (현재 사용 수명)
- total_life: INTEGER (총 수명)
- install_date: DATE (장착 날짜)
- status: TEXT (상태)

---

## 9. cam_sheets (CAM 시트)
모델별 공구 사양서 (총 43건)

컬럼:
- id: UUID (기본키)
- model: TEXT (모델명)
- process: TEXT (공정: CNC1, CNC2, CNC2-1)
- cam_version: TEXT (CAM 버전)
- version_date: DATE (버전 날짜)
- created_by: UUID (작성자)

CAM 시트에 등록된 모델:
B5M, B5S, B5S6, B6M, B6S, B6S6, B7M, B7S, B7S6, B7RS, B7RS6,
CAV2, E1, M1, M1R, M3, PA1, PA2, PA3, R3, R13

---

## 10. cam_sheet_endmills (CAM 시트 공구 정보)
모델/공정별 공구 사양 (총 820건)

컬럼:
- id: UUID (기본키)
- cam_sheet_id: UUID (CAM 시트 ID)
- t_number: INTEGER (공구 위치: 1~21)
- endmill_type_id: UUID (엔드밀 타입 ID)
- endmill_code: TEXT (엔드밀 코드)
- endmill_name: TEXT (엔드밀 명칭)
- tool_life: INTEGER (공구 수명)
- specifications: TEXT (사양)

---

## 11. suppliers (공급업체)
공구 공급업체 (총 7개, 활성 6개)

컬럼:
- id: UUID (기본키)
- code: TEXT (업체 코드)
- name: TEXT (업체명)
- is_active: BOOLEAN (활성 여부)
- quality_rating: NUMERIC (품질 평점)

실제 공급업체:
- ATH
- B&M SOLUTION
- FULLANDI
- KEOSANG
- SEVT
- TOOLEX

---

## 12. endmill_supplier_prices (업체별 엔드밀 가격)
공급업체별 가격 정보 (총 701건)

컬럼:
- id: UUID (기본키)
- endmill_type_id: UUID (엔드밀 타입 ID)
- supplier_id: UUID (공급업체 ID)
- unit_price: NUMERIC (단가)
- min_order_quantity: INTEGER (최소 주문 수량)
- lead_time_days: INTEGER (리드타임, 일)
- is_preferred: BOOLEAN (우선 공급업체 여부)
- quality_rating: INTEGER (품질 평점 1-10)

---

# 테이블 관계 (JOIN)

- tool_changes.equipment_id → equipment.id
- tool_changes.endmill_type_id → endmill_types.id
- tool_changes.changed_by → user_profiles.id
- tool_positions.equipment_id → equipment.id
- tool_positions.endmill_type_id → endmill_types.id
- endmill_types.category_id → endmill_categories.id
- inventory.endmill_type_id → endmill_types.id
- inventory_transactions.inventory_id → inventory.id
- inventory_transactions.equipment_id → equipment.id
- cam_sheets → cam_sheet_endmills (cam_sheet_id)
- endmill_supplier_prices.supplier_id → suppliers.id

---

# 예시 쿼리

## 예시 1: 최근 한달간 파손이 가장 많았던 모델
질문: "최근 한달간 파손이 가장 많았던 모델은?"

SQL:
SELECT
  production_model,
  COUNT(*) as damage_count
FROM tool_changes
WHERE
  change_date >= CURRENT_DATE - INTERVAL '1 month'
  AND change_reason = '파손'
  AND production_model IS NOT NULL
GROUP BY production_model
ORDER BY damage_count DESC
LIMIT 10;

## 예시 2: 재고 부족 엔드밀 목록
질문: "재고가 부족한 엔드밀 목록을 보여줘"

SQL:
SELECT
  et.code as endmill_code,
  et.name as endmill_name,
  i.current_stock,
  i.min_stock,
  i.status
FROM inventory i
JOIN endmill_types et ON i.endmill_type_id = et.id
WHERE i.status IN ('low', 'critical')
ORDER BY
  CASE i.status
    WHEN 'critical' THEN 1
    WHEN 'low' THEN 2
  END,
  i.current_stock ASC;

## 예시 3: A조와 B조의 공구 교체 비교
질문: "A조와 B조 중 어느 조에서 공구 교체가 더 많아?"

SQL:
SELECT
  up.shift as 교대조,
  COUNT(*) as 교체횟수
FROM tool_changes tc
JOIN user_profiles up ON tc.changed_by = up.id
WHERE tc.change_date >= CURRENT_DATE - INTERVAL '1 month'
  AND up.shift IS NOT NULL
GROUP BY up.shift
ORDER BY 교체횟수 DESC;

## 예시 4: 특정 모델의 T위치별 파손 현황
질문: "M3 모델의 T위치별 파손 현황은?"

SQL:
SELECT
  t_number as T위치,
  COUNT(*) as 파손횟수,
  ROUND(AVG(tool_life), 0) as 평균수명
FROM tool_changes
WHERE
  production_model = 'M3'
  AND change_reason = '파손'
  AND change_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY t_number
ORDER BY 파손횟수 DESC;

## 예시 5: 월별 교체 비용
질문: "지난 3개월간 월별 공구 교체 비용은?"

SQL:
SELECT
  TO_CHAR(tc.change_date, 'YYYY-MM') as 월,
  COUNT(*) as 교체횟수,
  SUM(et.unit_cost) as 총비용,
  ROUND(AVG(et.unit_cost), 0) as 평균단가
FROM tool_changes tc
JOIN endmill_types et ON tc.endmill_type_id = et.id
WHERE tc.change_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY TO_CHAR(tc.change_date, 'YYYY-MM')
ORDER BY 월 DESC;

## 예시 6: 특정 설비의 교체 이력
질문: "C241 설비의 최근 교체 이력은?"

SQL:
SELECT
  change_date as 교체일,
  t_number as T위치,
  endmill_code as 엔드밀코드,
  endmill_name as 엔드밀명,
  change_reason as 교체사유,
  tool_life as 수명
FROM tool_changes
WHERE equipment_number = 241
ORDER BY change_date DESC, created_at DESC
LIMIT 20;

## 예시 7: 공정별 파손 통계
질문: "CNC1과 CNC2 중 어느 공정에서 파손이 많아?"

SQL:
SELECT
  process as 공정,
  COUNT(*) as 파손횟수
FROM tool_changes
WHERE
  change_reason = '파손'
  AND change_date >= CURRENT_DATE - INTERVAL '1 month'
  AND process IS NOT NULL
GROUP BY process
ORDER BY 파손횟수 DESC;

## 예시 8: 특정 엔드밀의 파손 현황
질문: "AL008 엔드밀의 파손이 많은 설비는?"

SQL:
SELECT
  equipment_number as 설비번호,
  COUNT(*) as 파손횟수
FROM tool_changes
WHERE
  endmill_code = 'AL008'
  AND change_reason = '파손'
  AND change_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY equipment_number
ORDER BY 파손횟수 DESC
LIMIT 10;

## 예시 9: 카테고리별 사용 통계
질문: "어떤 종류의 엔드밀이 가장 많이 교체되었어?"

SQL:
SELECT
  ec.name_ko as 카테고리,
  COUNT(*) as 교체횟수
FROM tool_changes tc
JOIN endmill_types et ON tc.endmill_type_id = et.id
JOIN endmill_categories ec ON et.category_id = ec.id
WHERE tc.change_date >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY ec.name_ko
ORDER BY 교체횟수 DESC;

## 예시 10: 공급업체별 구매 현황
질문: "어느 공급업체에서 가장 많이 구매했어?"

SQL:
SELECT
  s.name as 공급업체,
  COUNT(*) as 품목수,
  SUM(esp.unit_price) as 총금액
FROM endmill_supplier_prices esp
JOIN suppliers s ON esp.supplier_id = s.id
WHERE s.is_active = true
GROUP BY s.name
ORDER BY 품목수 DESC;

---

# 주의사항

1. ★★★ 모델 분석시 production_model 컬럼 사용 (model 컬럼은 모두 NULL)

2. 날짜 필터링:
   - 최근 데이터: change_date >= CURRENT_DATE - INTERVAL '1 month'
   - 특정 날짜: change_date = '2025-12-01'
   - 기간: change_date BETWEEN '2025-01-01' AND '2025-12-31'

3. 한국어 값 정확히 사용:
   - change_reason = '파손' (O)
   - change_reason = 'damage' (X)

4. T번호는 숫자로 저장됨:
   - t_number = 10 (O)
   - t_number = 'T10' (X)

5. 설비번호도 숫자:
   - equipment_number = 241 (O) - C241 설비
   - equipment_number = 'C241' (X)

6. NULL 체크 필수:
   - production_model IS NOT NULL (모델 분석시)
   - process IS NOT NULL (공정 분석시)

7. 집계 함수:
   - COUNT(*) - 개수
   - SUM() - 합계
   - AVG() - 평균
   - ROUND(값, 소수점) - 반올림

8. tool_positions 테이블은 position_number 사용 (t_number 아님)
`.trim()
}

/**
 * 스키마 컨텍스트 캐싱
 * 동일한 컨텍스트를 여러 번 생성하지 않도록 메모이제이션
 */
let cachedSchemaContext: string | null = null

export function getCachedSchemaContext(): string {
  if (!cachedSchemaContext) {
    cachedSchemaContext = getSchemaContext()
  }
  return cachedSchemaContext
}

/**
 * 캐시 초기화 (스키마 변경 시 호출)
 */
export function clearSchemaContextCache(): void {
  cachedSchemaContext = null
}

/**
 * 특정 테이블만 포함하는 간소화된 스키마
 */
export function getSimplifiedSchemaContext(_tables: string[]): string {
  const fullContext = getSchemaContext()

  // 필요한 테이블 섹션만 추출 (간단한 구현)
  // 실제로는 더 정교한 파싱이 필요할 수 있음
  return fullContext
}

export default getCachedSchemaContext
