import * as XLSX from 'xlsx'

// 엑셀 템플릿 데이터
export const EXCEL_TEMPLATE_DATA = [
  {
    'Model': 'NPA1',
    'Process': 'CNC2',
    'Cam version': 'VE30',
    'T/N': 1,
    'Type': 'DRILL',
    'Tool name': 'D2 DR',
    'Tool life': 2000,
    'Tool code': 'AT002'
  },
  {
    'Model': 'NPA1',
    'Process': 'CNC2', 
    'Cam version': 'VE30',
    'T/N': 2,
    'Type': 'FLAT',
    'Tool name': 'D8x18FL FLAT EM',
    'Tool life': 1000,
    'Tool code': 'AT003'
  },
  {
    'Model': 'NPA1',
    'Process': 'CNC2',
    'Cam version': 'VE30', 
    'T/N': 3,
    'Type': 'FLAT',
    'Tool name': 'D6x13FL FLAT EM',
    'Tool life': 2000,
    'Tool code': 'AT004'
  }
]

// 엑셀 템플릿 다운로드 함수
export const downloadExcelTemplate = () => {
  // 워크북 생성
  const workbook = XLSX.utils.book_new()
  
  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(EXCEL_TEMPLATE_DATA)
  
  // 컬럼 너비 설정
  const colWidths = [
    { wch: 12 }, // Model
    { wch: 12 }, // Process
    { wch:15 }, // Cam version
    { wch: 8 },  // T/N
    { wch: 12 }, // Type
    { wch: 25 }, // Tool name
    { wch: 12 }, // Tool life
    { wch: 12 }  // Tool code
  ]
  worksheet['!cols'] = colWidths
  
  // 워크시트를 워크북에 추가
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CAM_Sheet_Template')
  
  // 파일명 생성 (현재 날짜 포함)
  const today = new Date().toISOString().split('T')[0]
  const filename = `CAM_Sheet_Template_${today}.xlsx`
  
  // 파일 다운로드
  XLSX.writeFile(workbook, filename)
}

// 엑셀 데이터 검증 함수
export const validateExcelData = (data: any[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} => {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!data || data.length === 0) {
    errors.push('데이터가 없습니다.')
    return { isValid: false, errors, warnings }
  }
  
  // 필수 컬럼 확인
  const requiredColumns = ['Model', 'Process', 'Cam version', 'T/N', 'Type', 'Tool name', 'Tool code']
  const firstRow = data[0]
  const missingColumns = requiredColumns.filter(col => !(col in firstRow))
  
  if (missingColumns.length > 0) {
    errors.push(`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`)
  }
  
  // 데이터 유효성 검사
  data.forEach((row, index) => {
    const rowNum = index + 2 // 엑셀의 행 번호 (헤더 포함)
    
    // 필수 필드 체크
    if (!row.Model) errors.push(`${rowNum}행: Model이 비어있습니다.`)
    if (!row.Process) errors.push(`${rowNum}행: Process가 비어있습니다.`)
    if (!row['Cam version']) errors.push(`${rowNum}행: Cam version이 비어있습니다.`)
    if (!row['T/N']) errors.push(`${rowNum}행: T/N이 비어있습니다.`)
    if (!row.Type) errors.push(`${rowNum}행: Type이 비어있습니다.`)
    if (!row['Tool name']) errors.push(`${rowNum}행: Tool name이 비어있습니다.`)
    if (!row['Tool code']) errors.push(`${rowNum}행: Tool code가 비어있습니다.`)
    
    // T/N 범위 체크
    if (row['T/N'] && (row['T/N'] < 1 || row['T/N'] > 21)) {
      errors.push(`${rowNum}행: T/N은 1-21 범위여야 합니다. (현재: ${row['T/N']})`)
    }
    
    // Tool Life 체크
    if (row['Tool life'] && row['Tool life'] < 0) {
      warnings.push(`${rowNum}행: Tool Life가 음수입니다. (${row['Tool life']})`)
    }
    
    // Process 값 체크
    const validProcesses = ['CNC1', 'CNC2', 'CNC2-1', 'CNC1', 'CNC2']
    if (row.Process && !validProcesses.includes(row.Process)) {
      warnings.push(`${rowNum}행: Process 값을 확인해주세요. (${row.Process})`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
} 