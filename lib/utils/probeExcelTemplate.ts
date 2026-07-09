import ExcelJS from 'exceljs'
import {
  ProbeExcelRow, PROBE_RESULTS, PROBE_STATUSES, ASSET_NUMBER_MAX_LENGTH,
  ProbeResult, ProbeStatus, Probe, ProbeRepair, ProbeInspection, InspectionTrigger
} from '../types/probe'

// 템플릿 다국어 지원 — 컬럼 순서는 고정(파서는 위치 기반이라 헤더 언어와 무관하게 파싱됨)
export type TemplateLang = 'ko' | 'vi'

const HEADERS: Record<TemplateLang, string[]> = {
  ko: ['자산번호', '레니쇼시리얼', '모델', '장착장비코드', '상태', '초기판정(OK/NG)', '반복도(um)', '구매일(YYYY-MM-DD)', '비고'],
  vi: ['Số tài sản', 'Serial Renishaw', 'Model', 'Mã thiết bị lắp đặt', 'Trạng thái', 'Kết quả ban đầu (OK/NG)', 'Độ lặp lại (um)', 'Ngày mua (YYYY-MM-DD)', 'Ghi chú']
}
// 기존 참조 호환 (한국어 헤더)
export const PROBE_EXCEL_HEADERS = HEADERS.ko

const DATA_SHEET: Record<TemplateLang, string> = { ko: 'Probe목록', vi: 'Danh sách Probe' }
const GUIDE_SHEET: Record<TemplateLang, string> = { ko: '작성방법', vi: 'Hướng dẫn' }
const EXAMPLE_NOTE: Record<TemplateLang, string> = { ko: '신규 라벨 부착', vi: 'Dán nhãn mới' }

const GUIDE_ROWS: Record<TemplateLang, string[][]> = {
  ko: [
    ['컬럼', '필수', '설명'],
    ['자산번호', 'O', '공장 내 유일. 자유 형식(최대 50자) — 대소문자·기호 원문 그대로 입력'],
    ['레니쇼시리얼', 'X', '프로브 제조 시리얼(레니쇼 발급)'],
    ['모델', 'X', 'OMP40-2 / OMP400 등'],
    ['장착장비코드', 'X', '설비번호(예: C001). 비우면 미장착(예비) 상태로 등록'],
    ['상태', 'X', 'in_use/spare/in_repair/disposed/lost — 비우면 in_use(장비 있음)/spare(없음) 자동 결정'],
    ['초기판정', 'X', 'OK/NG — 기존 조사 결과가 있을 때만 기입'],
    ['반복도(um)', 'X', '숫자(0 이상). 초기판정과 함께 기입 권장'],
    ['구매일', 'X', 'YYYY-MM-DD 형식'],
    ['비고', 'X', '자유 입력']
  ],
  vi: [
    ['Cột', 'Bắt buộc', 'Mô tả'],
    ['Số tài sản', 'O', 'Duy nhất trong nhà máy. Định dạng tự do (tối đa 50 ký tự) — nhập nguyên văn'],
    ['Serial Renishaw', 'X', 'Serial sản xuất probe (do Renishaw cấp)'],
    ['Model', 'X', 'OMP40-2 / OMP400 v.v.'],
    ['Mã thiết bị lắp đặt', 'X', 'Số thiết bị (vd: C001). Để trống = chưa lắp (dự phòng)'],
    ['Trạng thái', 'X', 'in_use/spare/in_repair/disposed/lost — để trống sẽ tự xác định in_use(có thiết bị)/spare(không)'],
    ['Kết quả ban đầu', 'X', 'OK/NG — chỉ nhập khi đã có kết quả kiểm tra trước'],
    ['Độ lặp lại (um)', 'X', 'Số (≥ 0). Nên nhập cùng kết quả ban đầu'],
    ['Ngày mua', 'X', 'Định dạng YYYY-MM-DD'],
    ['Ghi chú', 'X', 'Nhập tự do']
  ]
}

export async function generateProbeTemplate(lang: TemplateLang = 'ko'): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(DATA_SHEET[lang])
  ws.addRow(HEADERS[lang])
  ws.getRow(1).font = { bold: true }
  ws.columns.forEach(col => { col.width = 18 })
  // 예시 행 2개 (상태·모델·판정은 언어 무관 코드값)
  ws.addRow(['PRB-00001', '12345678', 'OMP40-2', 'C001', 'in_use', 'OK', 0.5, '2025-01-15', ''])
  ws.addRow(['PRB-00002', '', 'OMP400', '', 'spare', '', '', '', EXAMPLE_NOTE[lang]])

  const guide = wb.addWorksheet(GUIDE_SHEET[lang])
  GUIDE_ROWS[lang].forEach(r => guide.addRow(r))
  guide.getRow(1).font = { bold: true }
  guide.columns.forEach(col => { col.width = 32 })
  return wb
}

export async function downloadProbeTemplate(lang: TemplateLang = 'ko'): Promise<void> {
  const wb = await generateProbeTemplate(lang)
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, 'probe_template.xlsx')
}

// 실패/잔여 행 재다운로드용 (업로더에서 재사용) — 업로드한 템플릿 언어와 헤더를 맞춘다
export async function exportProbeRowsToExcel(
  rows: ProbeExcelRow[], filename: string, lang: TemplateLang = 'ko'
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(DATA_SHEET[lang])
  ws.addRow(HEADERS[lang])
  ws.getRow(1).font = { bold: true }
  rows.forEach(r => ws.addRow([
    r.asset_number, r.renishaw_serial ?? '', r.model ?? '', r.equipment_code ?? '', r.status ?? '',
    r.initial_result ?? '', r.repeatability_um ?? '', r.purchase_date ?? '', r.notes ?? ''
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

export async function parseProbeExcel(file: File): Promise<ProbeExcelRow[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  // 데이터 시트는 언어별 이름이 다를 수 있어 알려진 이름을 우선 시도, 없으면 첫 시트로 폴백(위치 기반 파싱)
  const ws = wb.getWorksheet(DATA_SHEET.ko) ?? wb.getWorksheet(DATA_SHEET.vi) ?? wb.worksheets[0]
  if (!ws) return []

  const rows: ProbeExcelRow[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // 헤더
    const cell = (i: number): string => {
      const v = row.getCell(i).value
      if (v === null || v === undefined) return ''
      if (v instanceof Date) return v.toISOString().slice(0, 10)
      return String(typeof v === 'object' && 'result' in v ? (v as { result: unknown }).result ?? '' : v).trim()
    }
    // 자산번호는 자유형식 — 대문자 변환 없이 원문 그대로 trim만 적용
    const assetNumber = cell(1)
    if (!assetNumber) return // 빈 행 스킵
    const statusRaw = cell(5)
    const resultRaw = cell(6)
    const repeatRaw = cell(7)
    rows.push({
      asset_number: assetNumber,
      renishaw_serial: cell(2) || undefined,
      model: cell(3) || undefined,
      equipment_code: cell(4) || undefined,
      status: (PROBE_STATUSES as readonly string[]).includes(statusRaw)
        ? statusRaw as ProbeStatus
        : undefined,
      initial_result: (PROBE_RESULTS as readonly string[]).includes(resultRaw.toUpperCase())
        ? resultRaw.toUpperCase() as ProbeResult
        : undefined,
      repeatability_um: repeatRaw === '' ? undefined : Number(repeatRaw),
      purchase_date: cell(8) || undefined,
      notes: cell(9) || undefined
    })
  })
  return rows
}

export function validateProbeData(rows: ProbeExcelRow[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const seen = new Set<string>()
  rows.forEach((r, i) => {
    const line = i + 2 // 헤더 다음부터
    if (!r.asset_number) {
      errors.push(`${line}행: 자산번호는 필수입니다`)
    } else if (r.asset_number.length > ASSET_NUMBER_MAX_LENGTH) {
      errors.push(`${line}행: 자산번호는 최대 ${ASSET_NUMBER_MAX_LENGTH}자입니다 (${r.asset_number})`)
    }
    if (seen.has(r.asset_number)) {
      errors.push(`${line}행: 파일 내 자산번호 중복 (${r.asset_number})`)
    }
    seen.add(r.asset_number)
    if (r.purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(r.purchase_date)) {
      errors.push(`${line}행: 구매일 형식 오류 (YYYY-MM-DD)`)
    }
    if (r.initial_result && !PROBE_RESULTS.includes(r.initial_result)) {
      errors.push(`${line}행: 초기판정은 OK/NG만 허용 (${r.initial_result})`)
    }
    if (r.repeatability_um !== undefined && (Number.isNaN(r.repeatability_um) || r.repeatability_um < 0)) {
      errors.push(`${line}행: 반복도는 0 이상의 숫자`)
    }
    if (r.status && !PROBE_STATUSES.includes(r.status)) {
      errors.push(`${line}행: 상태값이 올바르지 않습니다 (${r.status})`)
    }
  })
  return { isValid: errors.length === 0, errors }
}

// 목록 전체 내보내기 (T13, Phase 2) — 1000행씩 페이지네이션 순회 후 한 파일로 합침 (Arbor exportArborsToExcel 패턴)
// equipmentMap은 호출측(useEquipment)이 이미 들고 있는 맵을 재사용 — 신규 쿼리 없음
export async function exportProbesToExcel(
  factoryId: string,
  filters: { result?: string; status?: string; model?: string; equipmentId?: string; search?: string },
  equipmentMap?: Map<string, { equipment_number: number }>,
  onProgress?: (pct: number) => void
): Promise<void> {
  const pageSize = 1000
  let page = 1
  let total = Infinity
  const all: Probe[] = []
  while ((page - 1) * pageSize < total) {
    const sp = new URLSearchParams({ factoryId, page: String(page), pageSize: String(pageSize) })
    if (filters.result) sp.set('result', filters.result)
    if (filters.status) sp.set('status', filters.status)
    if (filters.model) sp.set('model', filters.model)
    if (filters.equipmentId) sp.set('equipmentId', filters.equipmentId)
    if (filters.search) sp.set('search', filters.search)
    const res = await fetch(`/api/probes?${sp.toString()}`)
    const json = await res.json()
    if (!json.success) throw new Error('내보내기 조회 실패')
    all.push(...json.data)
    total = json.pagination.total
    onProgress?.(Math.min(100, Math.round((all.length / Math.max(1, total)) * 100)))
    page += 1
    if (json.data.length === 0) break
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Probe목록')
  ws.addRow(['자산번호', '레니쇼시리얼', '모델', '장착장비', '판정', '반복도(um)', '최근검사일', '상태', '구매일', '비고'])
  ws.getRow(1).font = { bold: true }
  all.forEach(p => {
    const eq = p.equipment_id ? equipmentMap?.get(p.equipment_id) : undefined
    ws.addRow([
      p.asset_number, p.renishaw_serial ?? '', p.model,
      eq ? `C${String(eq.equipment_number).padStart(3, '0')}` : '',
      p.current_result ?? '미검사', p.last_repeatability_um ?? '',
      p.last_inspected_at?.slice(0, 10) ?? '', p.status, p.purchase_date ?? '', p.notes ?? ''
    ])
  })
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, `probes_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// 검사 이력 내보내기 (관리 이력 확장) — 공장 전체 검사 이력.
// GET /api/probes/inspections(공장 전체, probes join)를 사용 — 조인 필드는 probe:{asset_number, model} 중첩으로 반환된다고 가정.
// 해당 API가 아직 없어도(팀원 추가 예정) 함수 자체는 exportProbeRepairsToExcel과 동일한 페이지네이션 패턴으로 작성해 둔다.
export async function exportProbeInspectionsToExcel(
  factoryId: string,
  filters: { result?: ProbeResult; triggerReason?: InspectionTrigger } = {},
  onProgress?: (pct: number) => void
): Promise<void> {
  const pageSize = 1000
  let page = 1
  let total = Infinity
  const all: (ProbeInspection & { probe?: { asset_number?: string; model?: string } | null })[] = []
  while ((page - 1) * pageSize < total) {
    const sp = new URLSearchParams({ factoryId, page: String(page), pageSize: String(pageSize) })
    if (filters.result) sp.set('result', filters.result)
    if (filters.triggerReason) sp.set('triggerReason', filters.triggerReason)
    const res = await fetch(`/api/probes/inspections?${sp.toString()}`)
    const json = await res.json()
    if (!json.success) throw new Error('검사 이력 내보내기 조회 실패')
    all.push(...json.data)
    total = json.pagination.total
    onProgress?.(Math.min(100, Math.round((all.length / Math.max(1, total)) * 100)))
    page += 1
    if (json.data.length === 0) break
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('검사이력')
  ws.addRow(['시리얼번호', '모델', '반복도(µm)', '판정', '검사사유', '검사일시', '검사자', '비고'])
  ws.getRow(1).font = { bold: true }
  all.forEach(r => ws.addRow([
    r.probe?.asset_number ?? '', r.probe?.model ?? '', r.repeatability_um, r.judged_result,
    r.trigger_reason, r.inspected_at, r.inspected_by ?? '', r.notes ?? ''
  ]))
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, `probe_inspections_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// 수리 이력 내보내기 (T13, Phase 2) — 공장 전체 수리 이력. T11의 GET /api/probes/repairs(공장 전체, probes join)를 사용.
// 조인 필드는 probe:{asset_number, model} 중첩으로 반환된다
export async function exportProbeRepairsToExcel(
  factoryId: string,
  filters: { status?: string; overdueOnly?: boolean; warrantyRerepair?: boolean },
  onProgress?: (pct: number) => void
): Promise<void> {
  const pageSize = 1000
  let page = 1
  let total = Infinity
  const all: (ProbeRepair & { probe?: { asset_number?: string; model?: string } | null })[] = []
  while ((page - 1) * pageSize < total) {
    const sp = new URLSearchParams({ factoryId, page: String(page), pageSize: String(pageSize) })
    if (filters.status) sp.set('status', filters.status)
    if (filters.overdueOnly) sp.set('overdueOnly', 'true')
    if (filters.warrantyRerepair) sp.set('warrantyRerepair', 'true')
    const res = await fetch(`/api/probes/repairs?${sp.toString()}`)
    const json = await res.json()
    if (!json.success) throw new Error('수리 이력 내보내기 조회 실패')
    all.push(...json.data)
    total = json.pagination.total
    onProgress?.(Math.min(100, Math.round((all.length / Math.max(1, total)) * 100)))
    page += 1
    if (json.data.length === 0) break
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('수리이력')
  ws.addRow([
    '자산번호', '모델', '수리유형', '상태', '고장유형', '발생일', '발송일', '입고일', '완료일',
    '보증만료일', '교체부품', '교체전시리얼', '교체후시리얼', '비고'
  ])
  ws.getRow(1).font = { bold: true }
  all.forEach(r => ws.addRow([
    r.probe?.asset_number ?? '', r.probe?.model ?? '', r.repair_type, r.status, r.failure_type ?? '',
    r.occurred_at, r.sent_at ?? '', r.returned_at ?? '', r.completed_at ?? '', r.warranty_until ?? '',
    r.replaced_parts ?? '', r.serial_before ?? '', r.serial_after ?? '', r.notes ?? ''
  ]))
  const buffer = await wb.xlsx.writeBuffer()
  triggerDownload(buffer as ArrayBuffer, `probe_repairs_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
