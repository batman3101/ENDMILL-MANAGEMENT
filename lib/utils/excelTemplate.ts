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

// 앤드밀 마스터 데이터 업데이트용 엑셀 템플릿 다운로드
export const downloadEndmillMasterTemplate = () => {
  const templateData = [
    {
      '앤드밀코드': 'AT001',
      'Type': 'FLAT 12mm 4날',
      '카테고리': 'FLAT',
      '앤드밀이름': '직경12mm, 4날, 코팅TiN',
      '직경(mm)': 12,
      '날수': 4,
      '코팅': 'TiN',
      '소재': 'HSS',
      '공차': 'h6',
      '나선각': '30°',
      '표준수명': 2500,
      '최소재고': 50,
      '최대재고': 200,
      '권장재고': 100,
      '품질등급': 'A',
      '공급업체1': 'A-TECH',
      '공급업체1단가': 1200000,
      '공급업체2': 'B-SUPPLIER',
      '공급업체2단가': 1150000,
      '공급업체3': 'C-TOOLS',
      '공급업체3단가': 1180000,
      '설명': '고성능 플랫 앤드밀'
    },
    {
      '앤드밀코드': 'AT002',
      'Type': 'BALL 8mm 2날',
      '카테고리': 'BALL',
      '앤드밀이름': '직경8mm, 2날, 코팅AlCrN',
      '직경(mm)': 8,
      '날수': 2,
      '코팅': 'AlCrN',
      '소재': 'Carbide',
      '공차': 'h5',
      '나선각': '35°',
      '표준수명': 3000,
      '최소재고': 30,
      '최대재고': 150,
      '권장재고': 80,
      '품질등급': 'A+',
      '공급업체1': 'A-TECH',
      '공급업체1단가': 1800000,
      '공급업체2': 'B-SUPPLIER',
      '공급업체2단가': 1750000,
      '공급업체3': '',
      '공급업체3단가': '',
      '설명': '정밀 볼 앤드밀'
    }
  ]

  const ws = XLSX.utils.json_to_sheet(templateData)
  
  // 컬럼 너비 설정
  const colWidths = [
    { wch: 12 }, // 앤드밀코드
    { wch: 20 }, // Type
    { wch: 10 }, // 카테고리
    { wch: 25 }, // 앤드밀이름
    { wch: 12 }, // 직경
    { wch: 8 },  // 날수
    { wch: 12 }, // 코팅
    { wch: 10 }, // 소재
    { wch: 8 },  // 공차
    { wch: 10 }, // 나선각
    { wch: 12 }, // 표준수명
    { wch: 10 }, // 최소재고
    { wch: 10 }, // 최대재고
    { wch: 10 }, // 권장재고
    { wch: 10 }, // 품질등급
    { wch: 15 }, // 공급업체1
    { wch: 15 }, // 공급업체1단가
    { wch: 15 }, // 공급업체2
    { wch: 15 }, // 공급업체2단가
    { wch: 15 }, // 공급업체3
    { wch: 15 }, // 공급업체3단가
    { wch: 20 }  // 설명
  ]
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '앤드밀마스터데이터')
  
  XLSX.writeFile(wb, `앤드밀_마스터데이터_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// 앤드밀 마스터 데이터 검증
export const validateEndmillMasterData = (data: any[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  validData: any[]
} => {
  const errors: string[] = []
  const warnings: string[] = []
  const validData: any[] = []

  // 필수 컬럼 검증
  const requiredColumns = [
    '앤드밀코드', 'Type', '카테고리', '앤드밀이름', '직경(mm)', 
    '날수', '코팅', '소재', '표준수명', '최소재고', '최대재고'
  ]

  if (data.length === 0) {
    errors.push('업로드된 데이터가 없습니다.')
    return { isValid: false, errors, warnings, validData }
  }

  // 헤더 검증
  const firstRow = data[0]
  const missingColumns = requiredColumns.filter(col => !(col in firstRow))
  if (missingColumns.length > 0) {
    errors.push(`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`)
  }

  // 데이터 행별 검증
  data.forEach((row, index) => {
    const rowNumber = index + 2 // 엑셀 행 번호 (헤더 포함)
    
    // 필수 필드 검증
    if (!row['앤드밀코드'] || row['앤드밀코드'].toString().trim() === '') {
      errors.push(`${rowNumber}행: 앤드밀 코드가 필요합니다.`)
      return
    }

    if (!row['Type'] || row['Type'].toString().trim() === '') {
      errors.push(`${rowNumber}행: Type이 필요합니다.`)
      return
    }

    // 카테고리 검증
    const validCategories = ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL']
    if (!validCategories.includes(row['카테고리'])) {
      errors.push(`${rowNumber}행: 카테고리는 ${validCategories.join(', ')} 중 하나여야 합니다.`)
      return
    }

    // 숫자 필드 검증
    const numericFields = ['직경(mm)', '날수', '표준수명', '최소재고', '최대재고']
    for (const field of numericFields) {
      if (row[field] && (isNaN(Number(row[field])) || Number(row[field]) <= 0)) {
        errors.push(`${rowNumber}행: ${field}는 양수여야 합니다.`)
        return
      }
    }

    // 재고량 논리 검증
    const minStock = Number(row['최소재고']) || 0
    const maxStock = Number(row['최대재고']) || 0
    const recommendedStock = Number(row['권장재고']) || 0

    if (minStock >= maxStock) {
      warnings.push(`${rowNumber}행: 최소재고가 최대재고보다 크거나 같습니다.`)
    }

    if (recommendedStock && (recommendedStock < minStock || recommendedStock > maxStock)) {
      warnings.push(`${rowNumber}행: 권장재고는 최소재고와 최대재고 사이에 있어야 합니다.`)
    }

    // 품질등급 검증
    const validGrades = ['A+', 'A', 'B+', 'B', 'C']
    if (row['품질등급'] && !validGrades.includes(row['품질등급'])) {
      warnings.push(`${rowNumber}행: 품질등급은 ${validGrades.join(', ')} 중 하나여야 합니다.`)
    }

    // 공급업체 단가 검증
    for (let i = 1; i <= 3; i++) {
      const supplierField = `공급업체${i}`
      const priceField = `공급업체${i}단가`
      
      if (row[supplierField] && (!row[priceField] || isNaN(Number(row[priceField])) || Number(row[priceField]) <= 0)) {
        warnings.push(`${rowNumber}행: ${supplierField}가 있으면 ${priceField}도 양수로 입력해야 합니다.`)
      }
    }

    validData.push(row)
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validData
  }
} 