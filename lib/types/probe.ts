// Probe(Renishaw 터치 프로브) 관리 도메인 타입/상수
export const PROBE_MODELS = ['OMP40-2', 'OMP400'] as const
export type ProbeModel = (typeof PROBE_MODELS)[number]

// 판정: 반복 정밀도 5µm 단일 임계값으로 OK/NG 구분 (등급제 A/B/C 폐지). NG는 교정·수리 필요.
export const PROBE_RESULTS = ['OK', 'NG'] as const
export type ProbeResult = (typeof PROBE_RESULTS)[number]

export const PROBE_STATUSES = ['in_use', 'spare', 'in_repair', 'disposed', 'lost'] as const
export type ProbeStatus = (typeof PROBE_STATUSES)[number]

export const REPAIR_TYPES = ['internal', 'external', 'rbe'] as const
export type RepairType = (typeof REPAIR_TYPES)[number]

// 수리 상태: reported(요청·user) → approved(승인·admin) → sent(발송·admin) → completed(입고·admin).
// internal(사내수리)은 등록 즉시 completed 고정.
export const REPAIR_STATUSES = ['reported', 'approved', 'sent', 'completed'] as const
export type RepairStatus = (typeof REPAIR_STATUSES)[number]

// 고장 유형: 방수불량 / 충돌 / FPCB(신호 불량) / 정밀도 미달 / 스타일러스 교체
export const FAILURE_TYPES = ['waterproof', 'crash', 'fpcb', 'precision', 'stylus'] as const
export type FailureType = (typeof FAILURE_TYPES)[number]

export const INSPECTION_TRIGGERS = ['periodic', 'after_crash', 'stylus_change', 'after_maintenance'] as const
export type InspectionTrigger = (typeof INSPECTION_TRIGGERS)[number]

// 자산(사내 메인) 시리얼은 자유형식이다: 대문자 변환·정규식 강제 없음. trim + 최대 길이만 검증한다.
export const ASSET_NUMBER_MAX_LENGTH = 50

// 정밀도(교정) 검사 주기 기본값(일) = 3개월. app_settings(category='probe', key='inspectionIntervalDays')에서 로드.
export const DEFAULT_INSPECTION_INTERVAL_DAYS = 90

// 반복 정밀도 판정 임계값 기본값(µm): 이하 OK, 초과 NG. app_settings(key='repeatabilityThreshold')에서 조정.
export const DEFAULT_REPEATABILITY_THRESHOLD_UM = 5.0

export interface Probe {
  id: string
  factory_id: string
  asset_number: string           // 사내 메인 시리얼 (본체 각인, ATP-/AVP- 형식)
  renishaw_serial: string | null // 레니쇼 하부 시리얼 (수리/RBE 시 변경 가능성 있어 부가 관리)
  model: string | null           // 사전 등록 시리얼은 모델 미지정(null) 가능
  equipment_id: string | null
  status: ProbeStatus
  current_result: ProbeResult | null
  last_repeatability_um: number | null
  last_inspected_at: string | null
  purchase_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProbeInspection {
  id: string
  probe_id: string
  factory_id: string
  repeatability_um: number
  trigger_reason: InspectionTrigger
  judged_result: ProbeResult
  previous_result: ProbeResult | null
  rule_snapshot: Record<string, unknown>
  inspected_by: string | null
  inspected_at: string
  notes: string | null
}

export interface ProbeRepair {
  id: string
  probe_id: string
  factory_id: string
  repair_type: RepairType
  status: RepairStatus
  failure_type: FailureType | null
  occurred_at: string // date (YYYY-MM-DD)
  approved_at: string | null   // 승인일 (external/rbe, admin)
  sent_at: string | null
  returned_at: string | null
  completed_at: string | null
  warranty_until: string | null // GENERATED: returned_at + 6개월 (external/rbe)
  replaced_parts: string | null
  serial_before: string | null // RBE 등록 시점의 renishaw_serial 스냅샷
  serial_after: string | null  // RBE 완료 시 신규 시리얼
  original_repair_id: string | null // 보증 내 재수리 시 원 수리 건 연결
  vendor_id: string | null
  description: string | null
  requested_by: string | null  // 요청자 (user)
  approved_by: string | null   // 승인자 (admin)
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProbeVendor {
  id: string
  factory_id: string
  name: string
  is_repair_vendor: boolean
  is_parts_vendor: boolean
  contact_name: string | null
  phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// 장비간 프로브 이동 이력 (from → to)
export interface ProbeMovement {
  id: string
  probe_id: string
  factory_id: string
  from_equipment_id: string | null
  to_equipment_id: string | null
  moved_at: string // date
  moved_by: string | null
  notes: string | null
  created_at: string
}

// Excel 한 행 (템플릿 컬럼과 1:1)
export interface ProbeExcelRow {
  asset_number: string
  renishaw_serial?: string
  model?: string
  equipment_code?: string // 장착장비코드 (equipment_number 매핑용, 선택)
  status?: ProbeStatus
  initial_result?: ProbeResult // 기존 조사 데이터 이관용 (선택)
  repeatability_um?: number // 선택
  purchase_date?: string // YYYY-MM-DD
  notes?: string
}

export interface ProbeListParams {
  page: number
  pageSize: number
  result?: ProbeResult
  status?: ProbeStatus
  model?: string
  equipmentId?: string
  search?: string // 사내 시리얼 전방일치
  sortBy?: 'asset_number' | 'current_result' | 'status' | 'last_inspected_at' | 'model' | 'created_at'
  sortDir?: 'asc' | 'desc'
}
