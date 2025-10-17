import ExcelJS from 'exceljs'

// 엑셀 템플릿 데이터
export const EXCEL_TEMPLATE_DATA = [
  {
    'Model': 'PA1',
    'Process': 'CNC2',
    'CAM Version': 'VE30',
    'T Number': 1,
    'Endmill Code': 'AT002',
    'Category': 'DRILL',
    'Endmill Name': 'D2 DR',
    'Tool Life': 2000
  },
  {
    'Model': 'PA1',
    'Process': 'CNC2',
    'CAM Version': 'VE30',
    'T Number': 2,
    'Endmill Code': 'AT003',
    'Category': 'FLAT',
    'Endmill Name': 'D8x18FL FLAT EM',
    'Tool Life': 1000
  },
  {
    'Model': 'PA1',
    'Process': 'CNC2',
    'CAM Version': 'VE30',
    'T Number': 3,
    'Endmill Code': 'AT004',
    'Category': 'FLAT',
    'Endmill Name': 'D6x13FL FLAT EM',
    'Tool Life': 2000
  }
]

// 엑셀 템플릿 다운로드 함수
export const downloadExcelTemplate = async () => {
  // 워크북 생성
  const workbook = new ExcelJS.Workbook()

  // 워크시트 생성
  const worksheet = workbook.addWorksheet('CAM_Sheet_Template')

  // 헤더 정의
  const columns = [
    { header: 'Model', key: 'Model', width: 12 },
    { header: 'Process', key: 'Process', width: 12 },
    { header: 'CAM Version', key: 'CAM Version', width: 15 },
    { header: 'T Number', key: 'T Number', width: 10 },
    { header: 'Endmill Code', key: 'Endmill Code', width: 15 },
    { header: 'Category', key: 'Category', width: 15 },
    { header: 'Endmill Name', key: 'Endmill Name', width: 25 },
    { header: 'Tool Life', key: 'Tool Life', width: 12 }
  ]

  worksheet.columns = columns

  // 데이터 추가
  worksheet.addRows(EXCEL_TEMPLATE_DATA)

  // 헤더 스타일 적용
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // 파일명 생성 (현재 날짜 포함)
  const today = new Date().toISOString().split('T')[0]
  const filename = `CAM_Sheet_Template_${today}.xlsx`

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

// 엑셀 데이터 검증 함수
export const validateExcelData = async (data: any[], validationOptions?: {
  validProcesses?: string[]
  validModels?: string[]
}): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data || data.length === 0) {
    errors.push('데이터가 없습니다.')
    return { isValid: false, errors, warnings }
  }

  // 동적 검증 옵션이 없으면 기본값 사용
  const validProcesses = validationOptions?.validProcesses || ['CNC1', 'CNC2', 'CNC2-1']
  const validModels = validationOptions?.validModels || ['PA1', 'PA2', 'PS', 'B7', 'Q7']

  // 필수 컬럼 확인
  const requiredColumns = ['Model', 'Process', 'CAM Version', 'T Number', 'Endmill Code', 'Category', 'Endmill Name']
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
    if (!row['CAM Version']) errors.push(`${rowNum}행: CAM Version이 비어있습니다.`)
    if (!row['T Number']) errors.push(`${rowNum}행: T Number가 비어있습니다.`)
    if (!row['Endmill Code']) errors.push(`${rowNum}행: Endmill Code가 비어있습니다.`)
    if (!row['Category']) errors.push(`${rowNum}행: Category가 비어있습니다.`)
    if (!row['Endmill Name']) errors.push(`${rowNum}행: Endmill Name이 비어있습니다.`)

    // T Number 범위 체크
    if (row['T Number'] && (row['T Number'] < 1 || row['T Number'] > 21)) {
      errors.push(`${rowNum}행: T Number는 1-21 범위여야 합니다. (현재: ${row['T Number']})`)
    }

    // Tool Life 체크
    if (row['Tool Life'] && row['Tool Life'] < 0) {
      warnings.push(`${rowNum}행: Tool Life가 음수입니다. (${row['Tool Life']})`)
    }

    // Process 값 체크 (동적)
    if (row.Process && !validProcesses.includes(row.Process)) {
      warnings.push(`${rowNum}행: Process 값을 확인해주세요. (${row.Process}) - 유효한 값: ${validProcesses.join(', ')}`)
    }

    // Model 값 체크 (동적)
    if (row.Model && !validModels.includes(row.Model)) {
      warnings.push(`${rowNum}행: Model 값을 확인해주세요. (${row.Model}) - 유효한 값: ${validModels.join(', ')}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// 앤드밀 마스터 데이터 업데이트용 엑셀 템플릿 다운로드
export const downloadEndmillMasterTemplate = async () => {
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
      '공급업체1단가(VND)': 1200000,
      '공급업체2': 'B-SUPPLIER',
      '공급업체2단가(VND)': 1150000,
      '공급업체3': 'C-TOOLS',
      '공급업체3단가(VND)': 1180000,
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
      '공급업체1단가(VND)': 1800000,
      '공급업체2': 'B-SUPPLIER',
      '공급업체2단가(VND)': 1750000,
      '공급업체3': '',
      '공급업체3단가(VND)': '',
      '설명': '정밀 볼 앤드밀'
    }
  ]

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('앤드밀마스터데이터')

  // 컬럼 정의
  const columns = [
    { header: '앤드밀코드', key: '앤드밀코드', width: 12 },
    { header: 'Type', key: 'Type', width: 20 },
    { header: '카테고리', key: '카테고리', width: 10 },
    { header: '앤드밀이름', key: '앤드밀이름', width: 25 },
    { header: '직경(mm)', key: '직경(mm)', width: 12 },
    { header: '날수', key: '날수', width: 8 },
    { header: '코팅', key: '코팅', width: 12 },
    { header: '소재', key: '소재', width: 10 },
    { header: '공차', key: '공차', width: 8 },
    { header: '나선각', key: '나선각', width: 10 },
    { header: '표준수명', key: '표준수명', width: 12 },
    { header: '최소재고', key: '최소재고', width: 10 },
    { header: '최대재고', key: '최대재고', width: 10 },
    { header: '권장재고', key: '권장재고', width: 10 },
    { header: '품질등급', key: '품질등급', width: 10 },
    { header: '공급업체1', key: '공급업체1', width: 15 },
    { header: '공급업체1단가(VND)', key: '공급업체1단가(VND)', width: 18 },
    { header: '공급업체2', key: '공급업체2', width: 15 },
    { header: '공급업체2단가(VND)', key: '공급업체2단가(VND)', width: 18 },
    { header: '공급업체3', key: '공급업체3', width: 15 },
    { header: '공급업체3단가(VND)', key: '공급업체3단가(VND)', width: 18 },
    { header: '설명', key: '설명', width: 20 }
  ]

  worksheet.columns = columns
  worksheet.addRows(templateData)

  // 헤더 스타일 적용
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  const filename = `앤드밀_마스터데이터_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

// 앤드밀 마스터 데이터 검증
export const validateEndmillMasterData = async (data: any[], validationOptions?: {
  validCategories?: string[]
  validSuppliers?: string[]
}): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
  validData: any[]
}> => {
  const errors: string[] = []
  const warnings: string[] = []
  const validData: any[] = []

  // 동적 검증 옵션이 없으면 기본값 사용
  const validCategories = validationOptions?.validCategories || ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL', 'BULL_NOSE', 'SPECIAL']
  const validSuppliers = validationOptions?.validSuppliers || ['TOOLEX', 'FULLANDI', 'ATH', 'KEOSANG']

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

    // 카테고리 검증 (동적)
    if (!validCategories.includes(row['카테고리'])) {
      errors.push(`${rowNumber}행: 카테고리는 ${validCategories.join(', ')} 중 하나여야 합니다. (현재: ${row['카테고리']})`)
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

    // 공급업체 검증 (동적)
    for (let i = 1; i <= 3; i++) {
      const supplierField = `공급업체${i}`
      const priceField = `공급업체${i}단가(VND)`

      if (row[supplierField]) {
        // 공급업체명 검증
        if (!validSuppliers.includes(row[supplierField])) {
          warnings.push(`${rowNumber}행: ${supplierField} 값을 확인해주세요. (${row[supplierField]}) - 유효한 값: ${validSuppliers.join(', ')}`)
        }

        // 단가 검증
        if (!row[priceField] || isNaN(Number(row[priceField])) || Number(row[priceField]) <= 0) {
          warnings.push(`${rowNumber}행: ${supplierField}가 있으면 ${priceField}도 양수로 입력해야 합니다.`)
        }
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