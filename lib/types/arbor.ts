// Arbor 등급 관리 도메인 타입/상수
export const ARBOR_GRADES = ['A', 'B', 'C', 'D'] as const
export type ArborGrade = (typeof ARBOR_GRADES)[number]

export const TAPER_CONDITIONS = ['A', 'B', 'C'] as const
export type TaperCondition = (typeof TAPER_CONDITIONS)[number]

export const ARBOR_STATUSES = ['active', 'repair', 'disposed', 'lost'] as const
export type ArborStatus = (typeof ARBOR_STATUSES)[number]

// 시리얼: 대문자 영숫자+하이픈, 3~30자 (예: ALT-00001)
export const ARBOR_SERIAL_REGEX = /^[A-Z0-9][A-Z0-9-]{2,29}$/

export interface Arbor {
  id: string
  factory_id: string
  serial_number: string
  arbor_model: string | null
  tool_diameter: string | null
  status: ArborStatus
  current_grade: ArborGrade | null
  last_inspected_at: string | null
  last_runout_um: number | null
  last_taper_condition: TaperCondition | null
  purchase_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ArborInspection {
  id: string
  arbor_id: string
  factory_id: string
  runout_um: number
  taper_condition: TaperCondition | null
  judged_grade: ArborGrade
  previous_grade: ArborGrade | null
  rule_snapshot: Record<string, unknown>
  inspected_by: string | null
  inspected_at: string
  notes: string | null
}

// Excel 한 행 (템플릿 컬럼과 1:1)
export interface ArborExcelRow {
  serial_number: string
  arbor_model?: string
  tool_diameter?: string
  purchase_date?: string        // YYYY-MM-DD
  initial_grade?: ArborGrade    // 기존 조사 데이터 이관용 (선택)
  runout_um?: number            // 선택
  taper_condition?: TaperCondition // 선택
  notes?: string
}

export interface ArborListParams {
  page: number
  pageSize: number
  grade?: ArborGrade
  status?: ArborStatus
  search?: string   // 시리얼 전방일치
  sortBy?: 'serial_number' | 'current_grade' | 'status' | 'last_inspected_at' | 'arbor_model' | 'created_at'
  sortDir?: 'asc' | 'desc'
}
