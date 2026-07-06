import ExcelJS from 'exceljs'
import {
  ArborExcelRow, Arbor, ARBOR_GRADES, TAPER_CONDITIONS, ARBOR_SERIAL_REGEX,
  ArborGrade, TaperCondition
} from '../types/arbor'

// 템플릿 컬럼 정의 (순서 고정 — 파서와 1:1)
// 순서 = Arbor 목록 테이블 표시 순서(시리얼-BT규격-공구경-Runout-Taper-등급)에 등록 전용 필드(구매일/비고)를 뒤에 append
export const ARBOR_EXCEL_HEADERS = [
  '시리얼번호', 'BT규격', '공구경', 'Runout(um)', 'Taper상태',
  '초기등급(A~D)', '구매일(YYYY-MM-DD)', '비고'
] as const


export async function generateArborTemplate(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Arbor목록')
  ws.addRow([...ARBOR_EXCEL_HEADERS])
  ws.getRow(1).font = { bold: true }
  ws.columns.forEach(col => { col.width = 18 })
  // 예시 행 2개
  ws.addRow(['ALT-00001', 'BT40', 'Ø10', 3.5, 'A', 'A', '2025-01-15', ''])
  ws.addRow(['ALT-00002', 'BT40', 'Ø8', '', 'B', '', '', '신규 라벨 부착'])

  const guide = wb.addWorksheet('작성방법')
  guide.addRow(['컬럼', '필수', '설명'])
  guide.getRow(1).font = { bold: true }
  guide.addRow(['시리얼번호', 'O', '공장 내 유일. 대문자 영숫자/하이픈 3~30자 (예: ALT-00001)'])
  guide.addRow(['BT규격', 'X', 'BT30 / BT40 / HSK63 등'])
  guide.addRow(['공구경', 'X', 'Ø10/Ø8/Ø6/Ø5/Ø4/Ø3 등'])
  guide.addRow(['Runout(um)', 'X', '숫자(0 이상). 초기등급과 함께 기입 권장'])
  guide.addRow(['Taper상태', 'X', 'A/B/C 육안 등급'])
  guide.addRow(['초기등급', 'X', 'A/B/C/D — 기존 조사 결과가 있을 때만 기입'])
  guide.addRow(['구매일', 'X', 'YYYY-MM-DD 형식'])
  guide.addRow(['비고', 'X', '자유 입력'])
  guide.columns.forEach(col => { col.width = 30 })
  return wb
}

export async function downloadArborTemplate(): Promise<void> {
  const wb = await generateArborTemplate()
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, 'arbor_template.xlsx')
}

// 실패/잔여 행 재다운로드용 (업로더에서 재사용)
export async function exportArborRowsToExcel(
  rows: ArborExcelRow[], filename: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Arbor목록')
  ws.addRow([...ARBOR_EXCEL_HEADERS])
  ws.getRow(1).font = { bold: true }
  rows.forEach(r => ws.addRow([
    r.serial_number, r.arbor_model ?? '', r.tool_diameter ?? '', r.runout_um ?? '',
    r.taper_condition ?? '', r.initial_grade ?? '', r.purchase_date ?? '', r.notes ?? ''
  ]))
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, filename)
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function parseArborExcel(file: File): Promise<ArborExcelRow[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet('Arbor목록') ?? wb.worksheets[0]
  if (!ws) return []

  const rows: ArborExcelRow[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // 헤더
    const cell = (i: number): string => {
      const v = row.getCell(i).value
      if (v === null || v === undefined) return ''
      if (v instanceof Date) return v.toISOString().slice(0, 10)
      return String(typeof v === 'object' && 'result' in v ? (v as { result: unknown }).result ?? '' : v).trim()
    }
    const serial = cell(1).toUpperCase()
    if (!serial) return // 빈 행 스킵
    const runoutRaw = cell(4)
    const taperRaw = cell(5)
    rows.push({
      serial_number: serial,
      arbor_model: cell(2) || undefined,
      tool_diameter: cell(3) || undefined,
      runout_um: runoutRaw === '' ? undefined : Number(runoutRaw),
      taper_condition: (['A', 'B', 'C'] as const).includes(taperRaw.toUpperCase() as 'A' | 'B' | 'C')
        ? taperRaw.toUpperCase() as TaperCondition
        : undefined,
      initial_grade: (cell(6).toUpperCase() || undefined) as ArborGrade | undefined,
      purchase_date: cell(7) || undefined,
      notes: cell(8) || undefined
    })
  })
  return rows
}

export function validateArborData(rows: ArborExcelRow[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const seen = new Set<string>()
  rows.forEach((r, i) => {
    const line = i + 2 // 헤더 다음부터
    if (!ARBOR_SERIAL_REGEX.test(r.serial_number)) {
      errors.push(`${line}행: 시리얼번호 형식 오류 (${r.serial_number})`)
    }
    if (seen.has(r.serial_number)) {
      errors.push(`${line}행: 파일 내 시리얼 중복 (${r.serial_number})`)
    }
    seen.add(r.serial_number)
    if (r.purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(r.purchase_date)) {
      errors.push(`${line}행: 구매일 형식 오류 (YYYY-MM-DD)`)
    }
    if (r.initial_grade && !ARBOR_GRADES.includes(r.initial_grade)) {
      errors.push(`${line}행: 초기등급은 A~D만 허용 (${r.initial_grade})`)
    }
    if (r.runout_um !== undefined && (Number.isNaN(r.runout_um) || r.runout_um < 0)) {
      errors.push(`${line}행: Runout은 0 이상의 숫자`)
    }
    if (r.taper_condition && !TAPER_CONDITIONS.includes(r.taper_condition)) {
      errors.push(`${line}행: Taper상태는 A/B/C 중 하나`)
    }
  })
  return { isValid: errors.length === 0, errors }
}

export async function exportArborsToExcel(
  factoryId: string,
  filters: { grade?: string; status?: string; search?: string },
  onProgress?: (pct: number) => void
): Promise<void> {
  const pageSize = 1000
  let page = 1
  let total = Infinity
  const all: Arbor[] = []
  while ((page - 1) * pageSize < total) {
    const sp = new URLSearchParams({ factoryId, page: String(page), pageSize: String(pageSize) })
    if (filters.grade) sp.set('grade', filters.grade)
    if (filters.status) sp.set('status', filters.status)
    if (filters.search) sp.set('search', filters.search)
    const res = await fetch(`/api/arbors?${sp.toString()}`)
    const json = await res.json()
    if (!json.success) throw new Error('내보내기 조회 실패')
    all.push(...json.data)
    total = json.pagination.total
    onProgress?.(Math.min(100, Math.round((all.length / Math.max(1, total)) * 100)))
    page += 1
    if (json.data.length === 0) break
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Arbor목록')
  ws.addRow(['시리얼번호', 'BT규격', '공구경', 'Runout(um)', 'Taper상태', '등급', '최근검사일', '상태', '구매일', '비고'])
  ws.getRow(1).font = { bold: true }
  all.forEach(a => ws.addRow([
    a.serial_number, a.arbor_model ?? '', a.tool_diameter ?? '', a.last_runout_um ?? '',
    a.last_taper_condition ?? '', a.current_grade ?? '미검사', a.last_inspected_at?.slice(0, 10) ?? '',
    a.status, a.purchase_date ?? '', a.notes ?? ''
  ]))
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, `arbors_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
