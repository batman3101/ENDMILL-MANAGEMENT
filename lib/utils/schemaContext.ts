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

## 1. tool_changes (공구 교체 기록)
매우 중요! 공구 교체 이력을 기록하는 핵심 테이블

컬럼:
- id: UUID (기본키)
- equipment_id: UUID (장비 ID, equipment 테이블 참조)
- equipment_number: INTEGER (장비 번호)
- model: TEXT (장비 모델: PA1, PA2, PS, B7, Q7)
- process: TEXT (공정명: 가공1차, 가공2차, 가공3차 등)
- t_number: INTEGER (공구 위치: T1 ~ T24)
- endmill_type_id: UUID (엔드밀 타입 ID, endmill_types 테이블 참조)
- endmill_code: TEXT (엔드밀 코드)
- endmill_name: TEXT (엔드밀 명칭)
- change_date: DATE (교체 날짜)
- change_reason: TEXT (교체 사유: '수명완료', '파손', '마모', '예방교체', '모델변경', '기타')
- tool_life: INTEGER (공구 수명)
- changed_by: UUID (교체 작업자 ID, user_profiles 테이블 참조)
- production_model: TEXT (생산 모델)
- notes: TEXT (비고)
- created_at: TIMESTAMP (생성 시간)

용도: 공구 파손 분석, 교체 패턴 파악, 비용 분석

## 2. equipment (장비 정보)
800대 CNC 장비 정보

컬럼:
- id: UUID (기본키)
- equipment_number: INTEGER (장비 번호: 1 ~ 800, UNIQUE)
- location: TEXT ('A동' 또는 'B동')
- status: TEXT ('가동중', '점검중', '셋업중')
- model_code: TEXT (모델 코드)
- current_model: TEXT (현재 생산 모델)
- process: TEXT (공정)
- tool_position_count: INTEGER (공구 위치 개수, 기본 21)
- last_maintenance: DATE (마지막 유지보수 날짜)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

## 3. endmill_types (엔드밀 타입)
엔드밀 종류 및 사양

컬럼:
- id: UUID (기본키)
- code: TEXT (엔드밀 코드, UNIQUE)
- category_id: UUID (카테고리 ID, endmill_categories 참조)
- name: TEXT (엔드밀 명칭)
- unit_cost: NUMERIC (단가)
- standard_life: INTEGER (표준 수명)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

## 4. endmill_categories (엔드밀 카테고리)
컬럼:
- id: UUID (기본키)
- code: TEXT (카테고리 코드)
- name_ko: TEXT (한국어 명칭)
- name_vi: TEXT (베트남어 명칭)
- description: TEXT (설명)

## 5. inventory (재고)
엔드밀 재고 현황

컬럼:
- id: UUID (기본키)
- endmill_type_id: UUID (엔드밀 타입 ID)
- current_stock: INTEGER (현재 재고)
- min_stock: INTEGER (최소 재고)
- max_stock: INTEGER (최대 재고)
- status: TEXT ('sufficient', 'low', 'critical')
- location: TEXT (보관 위치)
- last_updated: TIMESTAMP (마지막 업데이트)

## 6. inventory_transactions (입출고 이력)
컬럼:
- id: UUID (기본키)
- inventory_id: UUID (재고 ID)
- transaction_type: TEXT ('inbound' 또는 'outbound')
- quantity: INTEGER (수량)
- unit_price: NUMERIC (단가)
- total_amount: NUMERIC (총액)
- equipment_id: UUID (장비 ID, outbound인 경우)
- t_number: INTEGER (공구 위치, outbound인 경우)
- purpose: TEXT (용도)
- processed_by: UUID (처리자 ID)
- processed_at: TIMESTAMP (처리 시간)
- notes: TEXT (비고)

## 7. user_profiles (사용자 프로필)
컬럼:
- id: UUID (기본키)
- user_id: UUID (auth.users 참조)
- employee_id: TEXT (사원번호)
- name: TEXT (이름)
- department: TEXT (부서)
- position: TEXT (직위)
- shift: TEXT (교대조: 'A', 'B', 'C')
- role_id: UUID (역할 ID, user_roles 참조)
- is_active: BOOLEAN (활성 여부)

## 8. cam_sheets (CAM 시트)
모델별 공구 사양서

컬럼:
- id: UUID (기본키)
- model: TEXT (모델명)
- process: TEXT (공정)
- cam_version: TEXT (CAM 버전)
- version_date: DATE (버전 날짜)
- created_by: UUID (작성자)

## 9. cam_sheet_endmills (CAM 시트 공구 정보)
컬럼:
- id: UUID (기본키)
- cam_sheet_id: UUID (CAM 시트 ID)
- t_number: INTEGER (공구 위치)
- endmill_type_id: UUID (엔드밀 타입 ID)
- endmill_code: TEXT (엔드밀 코드)
- endmill_name: TEXT (엔드밀 명칭)
- tool_life: INTEGER (공구 수명)
- specifications: TEXT (사양)

## 10. suppliers (공급업체)
컬럼:
- id: UUID (기본키)
- code: TEXT (업체 코드)
- name: TEXT (업체명)
- contact_info: JSONB (연락처 정보)
- is_active: BOOLEAN (활성 여부)
- quality_rating: NUMERIC (품질 평점)

## 11. endmill_supplier_prices (업체별 엔드밀 가격)
컬럼:
- id: UUID (기본키)
- endmill_type_id: UUID (엔드밀 타입 ID)
- supplier_id: UUID (공급업체 ID)
- unit_price: NUMERIC (단가)
- min_order_quantity: INTEGER (최소 주문 수량)
- lead_time_days: INTEGER (리드타임, 일)
- is_preferred: BOOLEAN (우선 공급업체 여부)
- quality_rating: INTEGER (품질 평점 1-10)

## 12. tool_positions (장비별 현재 공구 위치 정보)
각 장비의 T1~T24 위치에 현재 장착된 공구 정보

컬럼:
- id: UUID (기본키)
- equipment_id: UUID (장비 ID, equipment 테이블 참조)
- equipment_number: INTEGER (장비 번호)
- model: TEXT (장비 모델)
- t_number: INTEGER (공구 위치: 1 ~ 24)
- endmill_type_id: UUID (엔드밀 타입 ID, endmill_types 테이블 참조)
- endmill_code: TEXT (엔드밀 코드)
- endmill_name: TEXT (엔드밀 명칭)
- tool_life: INTEGER (공구 수명)
- install_date: DATE (장착 날짜)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

용도: 현재 장비에 장착된 공구 조회

---

# 관계 (Relationships)

- tool_changes.equipment_id → equipment.id
- tool_changes.endmill_type_id → endmill_types.id
- tool_changes.changed_by → user_profiles.id
- tool_positions.equipment_id → equipment.id
- tool_positions.endmill_type_id → endmill_types.id
- endmill_types.category_id → endmill_categories.id
- inventory.endmill_type_id → endmill_types.id
- inventory_transactions.inventory_id → inventory.id
- inventory_transactions.equipment_id → equipment.id
- inventory_transactions.processed_by → user_profiles.id

---

# 중요한 값들 (Enums)

## change_reason (교체 사유)
- '수명완료' - 정상적인 수명 종료
- '파손' - 공구 파손
- '마모' - 공구 마모
- '예방교체' - 예방 차원 교체
- '모델변경' - 생산 모델 변경
- '기타' - 기타 사유

## equipment.location
- 'A동'
- 'B동'

## equipment.status
- '가동중'
- '점검중'
- '셋업중'

## inventory.status
- 'sufficient' - 충분
- 'low' - 부족
- 'critical' - 긴급

## user_profiles.shift
- 'A' - A조
- 'B' - B조
- 'C' - C조

---

# 예시 쿼리

## 예시 1: 최근 한달간 파손이 가장 많았던 모델
질문: "최근 한달간 공구파손이 가장 많았던 모델은?"

SQL:
SELECT
  model,
  COUNT(*) as damage_count
FROM tool_changes
WHERE
  change_date >= NOW() - INTERVAL '1 month'
  AND change_reason = '파손'
GROUP BY model
ORDER BY damage_count DESC
LIMIT 1;

## 예시 2: 재고 부족 엔드밀 목록
질문: "재고가 부족한 엔드밀 목록을 보여줘"

SQL:
SELECT
  et.code as endmill_code,
  et.name,
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
  up.shift,
  COUNT(*) as change_count
FROM tool_changes tc
JOIN user_profiles up ON tc.changed_by = up.id
WHERE tc.change_date >= NOW() - INTERVAL '1 month'
GROUP BY up.shift
ORDER BY change_count DESC;

## 예시 4: 특정 모델의 T 위치별 파손 현황
질문: "PA2 모델의 T 위치별 파손 현황은?"

SQL:
SELECT
  t_number,
  COUNT(*) as damage_count,
  ROUND(AVG(tool_life), 2) as avg_tool_life
FROM tool_changes
WHERE
  model = 'PA2'
  AND change_reason = '파손'
  AND change_date >= NOW() - INTERVAL '3 months'
GROUP BY t_number
ORDER BY damage_count DESC;

## 예시 5: 월별 교체 비용
질문: "지난 3개월간 월별 공구 교체 비용은?"

SQL:
SELECT
  TO_CHAR(tc.change_date, 'YYYY-MM') as month,
  COUNT(*) as change_count,
  SUM(et.unit_cost) as total_cost,
  ROUND(AVG(et.unit_cost), 2) as avg_cost
FROM tool_changes tc
JOIN endmill_types et ON tc.endmill_type_id = et.id
WHERE tc.change_date >= NOW() - INTERVAL '3 months'
GROUP BY TO_CHAR(tc.change_date, 'YYYY-MM')
ORDER BY month DESC;

## 예시 6: 특정 장비의 현재 장착 공구 정보
질문: "현재 등록된 설비중 PA1, CNC2, T10 의 공구 코드는?"

SQL:
SELECT
  tp.equipment_number,
  tp.model,
  tp.t_number,
  tp.endmill_code,
  tp.endmill_name,
  tp.tool_life,
  tp.install_date
FROM tool_positions tp
WHERE
  (tp.model = 'PA1' OR tp.equipment_number = 2 OR tp.t_number = 10)
ORDER BY tp.equipment_number, tp.t_number;

---

# 주의사항

1. 날짜 필터링:
   - 최근 데이터: change_date >= NOW() - INTERVAL '1 month'
   - 특정 날짜: change_date = '2025-10-21'
   - 기간: change_date BETWEEN '2025-01-01' AND '2025-12-31'

2. 한국어 값 정확히 사용:
   - change_reason = '파손' (O)
   - change_reason = 'damage' (X)

3. 집계 함수 활용:
   - COUNT(*) - 개수
   - SUM() - 합계
   - AVG() - 평균
   - MAX(), MIN() - 최대/최소

4. JOIN 시 적절한 테이블 별칭 사용

5. 성능 고려:
   - 큰 테이블(tool_changes)은 날짜 필터 필수
   - 인덱스가 있는 컬럼 활용 (equipment_number, endmill_code 등)
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
 * 특정 테이블만 포함하는 간소화된 스키마
 */
export function getSimplifiedSchemaContext(_tables: string[]): string {
  const fullContext = getSchemaContext()

  // 필요한 테이블 섹션만 추출 (간단한 구현)
  // 실제로는 더 정교한 파싱이 필요할 수 있음
  return fullContext
}

export default getCachedSchemaContext
