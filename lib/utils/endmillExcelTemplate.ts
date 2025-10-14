import ExcelJS from 'exceljs'

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

// 엔드밀 템플릿 데이터 (실제 DB 값 사용)
// 예시: 같은 엔드밀이 여러 공급업체 및 여러 모델/공정에서 사용되는 경우
export const endmillTemplateData: EndmillExcelRow[] = [
  {
    'Endmill Code': 'EM-F-6',
    'Category': 'FLAT',
    'Name': 'FLAT 6mm 2날',
    'Supplier': 'KORLOY',
    'Unit Cost': 25000,
    'Standard Life': 800,
    'Model': 'PA1',
    'Process': 'CNC1',
    'Tool Life': 750,
    'T Number': 1
  },
  {
    'Endmill Code': 'EM-F-6',  // 같은 엔드밀, 다른 공급업체
    'Category': 'FLAT',
    'Name': 'FLAT 6mm 2날',
    'Supplier': 'TAEGUTEC',
    'Unit Cost': 27000,
    'Standard Life': 800,
    'Model': 'PA1',
    'Process': 'CNC2',  // 다른 공정에도 사용
    'Tool Life': 720,
    'T Number': 5
  },
  {
    'Endmill Code': 'EM-B-8',
    'Category': 'BALL',
    'Name': 'BALL 8mm 2날',
    'Supplier': 'ISCAR',
    'Unit Cost': 32000,
    'Standard Life': 600,
    'Model': 'R13',
    'Process': 'CNC2',
    'Tool Life': 580,
    'T Number': 2
  },
  {
    'Endmill Code': 'EM-T-10',
    'Category': 'T-CUT',
    'Name': 'T-CUT 10mm',
    'Supplier': 'KORLOY',
    'Unit Cost': 45000,
    'Standard Life': 400,
    'Model': 'PA1',
    'Process': 'CNC2-1',
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

// 기본값 (validation API 실패 시 폴백용) - 실제 DB에서 가져온 값들
export const validCategories = [
  'BALL',
  'BULL_NOSE',
  'C-CUT',
  'DRILL',
  'FLAT',
  'FORM',
  'REAMER',
  'SPECIAL',
  'T-CUT'
]

export const validSuppliers = [
  'ISCAR',
  'KORLOY',
  'SUP001',
  'SUP002',
  'SUP003',
  'SUP004',
  'SUP005',
  'TAEGUTEC',
  'YAMAWA',
  'YGT'
]

export const validModels = [
  'PA1',
  'R13'
]

export const validProcesses = [
  'CNC1',
  'CNC2',
  'CNC2-1'
]

// 엔드밀 엑셀 템플릿 다운로드 함수
export const downloadEndmillTemplate = async () => {
  try {
    // 워크북 생성
    const workbook = new ExcelJS.Workbook()

    // 템플릿 데이터 시트 생성
    const templateSheet = workbook.addWorksheet('Endmill Template')

    // 컬럼 정의
    templateSheet.columns = [
      { header: 'Endmill Code', key: 'Endmill Code', width: 15 },
      { header: 'Category', key: 'Category', width: 10 },
      { header: 'Name', key: 'Name', width: 20 },
      { header: 'Supplier', key: 'Supplier', width: 15 },
      { header: 'Unit Cost', key: 'Unit Cost', width: 12 },
      { header: 'Standard Life', key: 'Standard Life', width: 15 },
      { header: 'Model', key: 'Model', width: 10 },
      { header: 'Process', key: 'Process', width: 12 },
      { header: 'Tool Life', key: 'Tool Life', width: 12 },
      { header: 'T Number', key: 'T Number', width: 10 }
    ]

    // 템플릿 데이터 추가
    templateSheet.addRows(endmillTemplateData)

    // 헤더 스타일 적용
    templateSheet.getRow(1).font = { bold: true }
    templateSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    templateSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

    // 가이드 시트 생성
    const guideSheet = workbook.addWorksheet('Guide')

    guideSheet.columns = [
      { header: 'Column', key: 'Column', width: 15 },
      { header: 'Description', key: 'Description', width: 30 },
      { header: 'Required', key: 'Required', width: 10 },
      { header: 'Example', key: 'Example', width: 35 }
    ]

    guideSheet.addRows([
      { 'Column': '', 'Description': '=== 엔드밀 기본 정보 (endmill_types) ===', 'Required': '', 'Example': '' },
      { 'Column': 'Endmill Code', 'Description': '엔드밀 코드 (고유값)', 'Required': 'Yes', 'Example': 'EM-F-6' },
      { 'Column': 'Category', 'Description': '카테고리 (자동 생성됨)', 'Required': 'Yes', 'Example': 'FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL' },
      { 'Column': 'Name', 'Description': '엔드밀 이름', 'Required': 'Yes', 'Example': 'FLAT 6mm 2날' },
      { 'Column': 'Standard Life', 'Description': '표준 수명 (회)', 'Required': 'Yes', 'Example': '800' },
      { 'Column': '', 'Description': '', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '=== 공급업체 가격 정보 (endmill_supplier_prices) ===', 'Required': '', 'Example': '' },
      { 'Column': 'Supplier', 'Description': '공급업체 코드 (자동 생성됨)', 'Required': 'Yes', 'Example': 'SUP001, SUP002, KORLOY, TAEGUTEC' },
      { 'Column': 'Unit Cost', 'Description': '공급업체별 단가 (원)', 'Required': 'Yes', 'Example': '25000' },
      { 'Column': '', 'Description': '', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '=== CAM Sheet 매핑 정보 (cam_sheet_endmills) ===', 'Required': '', 'Example': '' },
      { 'Column': 'Model', 'Description': '장비 모델 (CAM Sheet 자동 생성)', 'Required': 'Yes', 'Example': 'PA1, R13' },
      { 'Column': 'Process', 'Description': '가공 프로세스 (CAM Sheet 자동 생성)', 'Required': 'Yes', 'Example': 'CNC1, CNC2, CNC2-1' },
      { 'Column': 'Tool Life', 'Description': '모델/프로세스별 수명 (회)', 'Required': 'Yes', 'Example': '750' },
      { 'Column': 'T Number', 'Description': '툴 포지션 번호 (1-21)', 'Required': 'Yes', 'Example': '1' },
      { 'Column': '', 'Description': '', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '※ 같은 엔드밀 코드를 여러 공급업체/모델에서 사용하려면 행을 추가하세요', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '※ 인벤토리(inventory)는 자동으로 생성됩니다', 'Required': '', 'Example': '' }
    ])

    // 가이드 시트 헤더 스타일 적용
    guideSheet.getRow(1).font = { bold: true }
    guideSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    guideSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

    // 파일 다운로드
    const fileName = `endmill_template_${new Date().toISOString().split('T')[0]}.xlsx`
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    window.URL.revokeObjectURL(url)

    return { success: true, fileName }
  } catch (error) {
    console.error('엔드밀 템플릿 다운로드 오류:', error)
    return { success: false, error: '템플릿 다운로드 중 오류가 발생했습니다.' }
  }
}

// 엔드밀 엑셀 데이터 유효성 검사 함수
export const validateEndmillExcelData = async (data: any[]) => {
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

  // validation API에서 유효한 값들 가져오기
  let validationOptions = {
    categories: validCategories,
    suppliers: validSuppliers,
    models: validModels,
    processes: validProcesses
  }

  try {
    const response = await fetch('/api/settings/validation')
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        validationOptions = {
          categories: result.data.categories || validCategories,
          suppliers: result.data.suppliers || validSuppliers,
          models: result.data.models || validModels,
          processes: result.data.processes || validProcesses
        }
      }
    }
  } catch (error) {
    console.warn('validation API 호출 실패, 기본값 사용:', error)
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

    if (!row['Category'] || !validationOptions.categories.includes(row['Category'])) {
      rowErrors.push(`${rowNumber}행: Category는 다음 중 하나여야 합니다: ${validationOptions.categories.join(', ')}`)
    }

    if (!row['Supplier'] || !validationOptions.suppliers.includes(row['Supplier'])) {
      rowErrors.push(`${rowNumber}행: Supplier는 다음 중 하나여야 합니다: ${validationOptions.suppliers.join(', ')}`)
    }

    if (!row['Model'] || !validationOptions.models.includes(row['Model'])) {
      rowErrors.push(`${rowNumber}행: Model은 다음 중 하나여야 합니다: ${validationOptions.models.join(', ')}`)
    }

    if (!row['Process'] || !validationOptions.processes.includes(row['Process'])) {
      rowErrors.push(`${rowNumber}행: Process는 다음 중 하나여야 합니다: ${validationOptions.processes.join(', ')}`)
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

    // 코드 중복 허용 (모델별, 공정별로 다른 Tool Life 및 공급업체별 다른 단가 지원)

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

// 엔드밀 DB 형태로 변환 함수 (새로운 API 형식에 맞게)
export const convertToEndmillDBFormat = (validData: any[]) => {
  return validData.map(item => ({
    code: item.code,
    category: item.category,
    name: item.name,
    supplier: item.supplier,
    unit_cost: item.unit_cost,
    standard_life: item.standard_life,
    model: item.model,
    process: item.process,
    tool_life: item.tool_life,
    t_number: item.t_number
  }))
}
