import * as XLSX from 'xlsx'

// 엔드밀 엑셀 템플릿 타입 정의
export interface EndmillExcelRow {
  'Endmill Code': string
  'Category': string
  'Name': string
  'Supplier': string
  'Unit Cost': number
  'Standard Life': number
  'Model': string
  'Process': string
  'Tool Life': number
  'T Number': number
}

// 엔드밀 템플릿 데이터
export const endmillTemplateData: EndmillExcelRow[] = [
  {
    'Endmill Code': 'EM-F-6',
    'Category': 'FLAT',
    'Name': 'FLAT 6mm 2날',
    'Supplier': 'TAEGUTEC',
    'Unit Cost': 25000,
    'Standard Life': 800,
    'Model': 'PA1',
    'Process': '거친가공',
    'Tool Life': 750,
    'T Number': 1
  },
  {
    'Endmill Code': 'EM-B-8',
    'Category': 'BALL',
    'Name': 'BALL 8mm 2날',
    'Supplier': 'KORLOY',
    'Unit Cost': 32000,
    'Standard Life': 600,
    'Model': 'PA2',
    'Process': '정밀가공',
    'Tool Life': 580,
    'T Number': 2
  },
  {
    'Endmill Code': 'EM-T-10',
    'Category': 'T-CUT',
    'Name': 'T-CUT 10mm',
    'Supplier': 'YG1',
    'Unit Cost': 45000,
    'Standard Life': 400,
    'Model': 'PS',
    'Process': '마감가공',
    'Tool Life': 420,
    'T Number': 3
  }
]

// 필수 컬럼 정의
export const endmillRequiredColumns = [
  'Endmill Code',
  'Category',
  'Name',
  'Supplier',
  'Unit Cost',
  'Standard Life',
  'Model',
  'Process',
  'Tool Life',
  'T Number'
]

// 유효한 카테고리 목록
export const validCategories = [
  'FLAT',
  'BALL',
  'T-CUT',
  'C-CUT',
  'REAMER',
  'DRILL'
]

// 유효한 공급업체 목록
export const validSuppliers = [
  'TAEGUTEC',
  'KORLOY',
  'YG1',
  'ISCAR',
  'YAMAWA'
]

// 유효한 모델 목록
export const validModels = [
  'PA1',
  'PA2',
  'PS',
  'B7',
  'Q7'
]

// 유효한 프로세스 목록
export const validProcesses = [
  '거친가공',
  '중간가공',
  '정밀가공',
  '마감가공',
  '드릴링',
  '탭핑'
]

// 엔드밀 엑셀 템플릿 다운로드 함수
export const downloadEndmillTemplate = () => {
  try {
    // 워크북 생성
    const workbook = XLSX.utils.book_new()

    // 템플릿 데이터 시트 생성
    const templateSheet = XLSX.utils.json_to_sheet(endmillTemplateData)

    // 컬럼 너비 설정
    const columnWidths = [
      { wch: 15 }, // Endmill Code
      { wch: 10 }, // Category
      { wch: 20 }, // Name
      { wch: 15 }, // Supplier
      { wch: 12 }, // Unit Cost
      { wch: 15 }, // Standard Life
      { wch: 10 }, // Model
      { wch: 12 }, // Process
      { wch: 12 }, // Tool Life
      { wch: 10 }  // T Number
    ]
    templateSheet['!cols'] = columnWidths

    // 시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Endmill Template')

    // 가이드 시트 생성
    const guideData = [
      { 'Column': 'Endmill Code', 'Description': '엔드밀 코드 (예: EM-F-12)', 'Required': 'Yes', 'Example': 'EM-F-6' },
      { 'Column': 'Category', 'Description': '카테고리', 'Required': 'Yes', 'Example': 'FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL' },
      { 'Column': 'Name', 'Description': '엔드밀 이름', 'Required': 'Yes', 'Example': 'FLAT 6mm 2날' },
      { 'Column': 'Supplier', 'Description': '공급업체 코드', 'Required': 'Yes', 'Example': 'TAEGUTEC, KORLOY, YG1, ISCAR, YAMAWA' },
      { 'Column': 'Unit Cost', 'Description': '단가 (원)', 'Required': 'Yes', 'Example': '25000' },
      { 'Column': 'Standard Life', 'Description': '표준 수명 (회)', 'Required': 'Yes', 'Example': '800' },
      { 'Column': 'Model', 'Description': '장비 모델', 'Required': 'Yes', 'Example': 'PA1, PA2, PS, B7, Q7' },
      { 'Column': 'Process', 'Description': '가공 프로세스', 'Required': 'Yes', 'Example': '거친가공, 정밀가공, 마감가공' },
      { 'Column': 'Tool Life', 'Description': '모델/프로세스별 수명 (회)', 'Required': 'Yes', 'Example': '750' },
      { 'Column': 'T Number', 'Description': '툴 포지션 번호', 'Required': 'Yes', 'Example': '1' }
    ]

    const guideSheet = XLSX.utils.json_to_sheet(guideData)
    guideSheet['!cols'] = [
      { wch: 15 }, // Column
      { wch: 30 }, // Description
      { wch: 10 }, // Required
      { wch: 35 }  // Example
    ]

    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guide')

    // 파일 다운로드
    const fileName = `endmill_template_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)

    return { success: true, fileName }
  } catch (error) {
    console.error('엔드밀 템플릿 다운로드 오류:', error)
    return { success: false, error: '템플릿 다운로드 중 오류가 발생했습니다.' }
  }
}

// 엔드밀 엑셀 데이터 유효성 검사 함수
export const validateEndmillExcelData = (data: any[]) => {
  const errors: string[] = []
  const warnings: string[] = []
  const validData: any[] = []

  if (!data || data.length === 0) {
    return {
      isValid: false,
      errors: ['엑셀 파일에 데이터가 없습니다.'],
      warnings: [],
      validData: []
    }
  }

  // 첫 번째 행의 컬럼 확인
  const firstRow = data[0]
  const actualColumns = Object.keys(firstRow)

  // 필수 컬럼 확인
  const missingColumns = endmillRequiredColumns.filter(col => !actualColumns.includes(col))
  if (missingColumns.length > 0) {
    errors.push(`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`)
  }

  // 데이터 행별 유효성 검사
  data.forEach((row, index) => {
    const rowNumber = index + 2 // 엑셀에서 헤더는 1행, 데이터는 2행부터
    const rowErrors: string[] = []

    // 필수 필드 확인
    if (!row['Endmill Code'] || typeof row['Endmill Code'] !== 'string') {
      rowErrors.push(`${rowNumber}행: Endmill Code가 누락되었거나 잘못되었습니다.`)
    }

    if (!row['Category'] || !validCategories.includes(row['Category'])) {
      rowErrors.push(`${rowNumber}행: Category는 다음 중 하나여야 합니다: ${validCategories.join(', ')}`)
    }

    if (!row['Supplier'] || !validSuppliers.includes(row['Supplier'])) {
      rowErrors.push(`${rowNumber}행: Supplier는 다음 중 하나여야 합니다: ${validSuppliers.join(', ')}`)
    }

    if (!row['Model'] || !validModels.includes(row['Model'])) {
      rowErrors.push(`${rowNumber}행: Model은 다음 중 하나여야 합니다: ${validModels.join(', ')}`)
    }

    if (!row['Process'] || !validProcesses.includes(row['Process'])) {
      rowErrors.push(`${rowNumber}행: Process는 다음 중 하나여야 합니다: ${validProcesses.join(', ')}`)
    }

    if (!row['Name'] || typeof row['Name'] !== 'string') {
      rowErrors.push(`${rowNumber}행: Name이 누락되었거나 잘못되었습니다.`)
    }

    if (!row['Supplier'] || typeof row['Supplier'] !== 'string') {
      rowErrors.push(`${rowNumber}행: Supplier가 누락되었거나 잘못되었습니다.`)
    }

    // 숫자 필드 확인
    const numberFields = ['Unit Cost', 'Standard Life', 'Tool Life', 'T Number']
    numberFields.forEach(field => {
      const value = row[field]
      if (value === undefined || value === null || isNaN(Number(value)) || Number(value) <= 0) {
        rowErrors.push(`${rowNumber}행: ${field}는 0보다 큰 숫자여야 합니다.`)
      }
    })

    // 코드 중복 확인 (현재 배치 내에서)
    const duplicateInBatch = data.filter((otherRow, otherIndex) =>
      otherIndex !== index && otherRow['Endmill Code'] === row['Endmill Code']
    )
    if (duplicateInBatch.length > 0) {
      rowErrors.push(`${rowNumber}행: Endmill Code '${row['Endmill Code']}'가 배치 내에서 중복됩니다.`)
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      // 유효한 데이터 변환
      const validRow = {
        code: row['Endmill Code'].trim(),
        category: row['Category'].trim(),
        name: row['Name'].trim(),
        supplier: row['Supplier'].trim(),
        unit_cost: Number(row['Unit Cost']),
        standard_life: Number(row['Standard Life']),
        model: row['Model'].trim(),
        process: row['Process'].trim(),
        tool_life: Number(row['Tool Life']),
        t_number: Number(row['T Number'])
      }
      validData.push(validRow)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validData
  }
}

// 엔드밀 DB 형태로 변환 함수
export const convertToEndmillDBFormat = (validData: any[], categoryMap: Record<string, string>, supplierMap: Record<string, string>) => {
  return validData.map(item => ({
    code: item.code,
    category_id: categoryMap[item.category],
    name: item.name,
    supplier_id: supplierMap[item.supplier],
    unit_cost: item.unit_cost,
    standard_life: item.standard_life,
    cam_sheet_data: {
      model: item.model,
      process: item.process,
      tool_life: item.tool_life,
      t_number: item.t_number
    }
  }))
}