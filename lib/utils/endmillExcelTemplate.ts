import ExcelJS from 'exceljs'

// 엔드밀 엑셀 템플릿 타입 정의 (엔드밀 타입 마스터 데이터)
// MODEL, PROCESS, TOOL LIFE, T NUMBER는 CAM Sheet에서 관리
export interface EndmillExcelRow {
  'Endmill Code': string
  'Category': string
  'Name': string
  'Supplier': string
  'Unit Cost': number
  'Standard Life': number
}

// 엔드밀 템플릿 데이터 - 엔드밀 타입 마스터 데이터만 포함
// 같은 엔드밀 코드에 여러 공급업체 가격이 있을 수 있음
export const endmillTemplateData: EndmillExcelRow[] = [
  {
    'Endmill Code': 'AL002',
    'Category': 'BULL_NOSE',
    'Name': 'D0.8xR0.2x1FLxD0.75x4.5x30xD6 BULL NOSE EM',
    'Supplier': 'TOOLEX',
    'Unit Cost': 28000,
    'Standard Life': 800
  },
  {
    'Endmill Code': 'AL003',
    'Category': 'FORM',
    'Name': 'D1.5xA135xR0.3xR0.3xA31xD0.8x2xD6 FORM',
    'Supplier': 'ATH',
    'Unit Cost': 27000,
    'Standard Life': 800
  },
  {
    'Endmill Code': 'AL004',
    'Category': 'C-CUT',
    'Name': 'D0.4xA45xD1.2x8xD6 C CUT',
    'Supplier': 'FULLANDI',
    'Unit Cost': 32000,
    'Standard Life': 600
  },
  {
    'Endmill Code': 'AL005',
    'Category': 'DRILL',
    'Name': 'D0.8x8FLx9xD3 DR',
    'Supplier': 'KEOSANG',
    'Unit Cost': 45000,
    'Standard Life': 400
  }
]

// 필수 컬럼 정의 - 엔드밀 타입 마스터 데이터만
export const endmillRequiredColumns = [
  'Endmill Code',
  'Category',
  'Name',
  'Supplier',
  'Unit Cost',
  'Standard Life'
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
  'ATH',
  'FULLANDI',
  'ISCAR',
  'KEOSANG',
  'KORLOY',
  'SUP001',
  'SUP002',
  'SUP003',
  'SUP004',
  'SUP005',
  'TAEGUTEC',
  'TOOLEX',
  'YAMAWA',
  'YGT'
]

// 엔드밀 엑셀 템플릿 다운로드 함수
export const downloadEndmillTemplate = async () => {
  try {
    // 워크북 생성
    const workbook = new ExcelJS.Workbook()

    // 템플릿 데이터 시트 생성
    const templateSheet = workbook.addWorksheet('Endmill Template')

    // 컬럼 정의 - 엔드밀 타입 마스터 데이터만
    templateSheet.columns = [
      { header: 'Endmill Code', key: 'Endmill Code', width: 15 },
      { header: 'Category', key: 'Category', width: 12 },
      { header: 'Name', key: 'Name', width: 40 },
      { header: 'Supplier', key: 'Supplier', width: 15 },
      { header: 'Unit Cost', key: 'Unit Cost', width: 12 },
      { header: 'Standard Life', key: 'Standard Life', width: 15 }
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
      { 'Column': '', 'Description': '=== 엔드밀 타입 마스터 데이터 등록 ===', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '', 'Required': '', 'Example': '' },
      { 'Column': 'Endmill Code', 'Description': '엔드밀 코드 (고유값)', 'Required': 'Yes', 'Example': 'AL002, AL003, AL004' },
      { 'Column': 'Category', 'Description': '카테고리', 'Required': 'Yes', 'Example': 'FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL, BULL_NOSE, FORM, SPECIAL' },
      { 'Column': 'Name', 'Description': '엔드밀 이름 (사양)', 'Required': 'Yes', 'Example': 'D0.8xR0.2x1FLxD0.75x4.5x30xD6 BULL NOSE EM' },
      { 'Column': 'Supplier', 'Description': '공급업체', 'Required': 'Yes', 'Example': 'TOOLEX, ATH, FULLANDI, KEOSANG 등' },
      { 'Column': 'Unit Cost', 'Description': '공급업체별 단가 (VND)', 'Required': 'Yes', 'Example': '28000' },
      { 'Column': 'Standard Life', 'Description': '표준 수명 (회)', 'Required': 'Yes', 'Example': '800' },
      { 'Column': '', 'Description': '', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '=== 중요 안내 ===', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '1. 같은 엔드밀 코드에 여러 공급업체가 있으면 행을 추가하세요', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '2. Model, Process, Tool Life, T Number는 CAM Sheet에서 관리합니다', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '3. 인벤토리(inventory)는 자동으로 생성됩니다', 'Required': '', 'Example': '' },
      { 'Column': '', 'Description': '4. 엔드밀 코드는 여러 모델/공정에서 재사용될 수 있습니다', 'Required': '', 'Example': '' }
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
    suppliers: validSuppliers
  }

  try {
    const response = await fetch('/api/settings/validation')
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        validationOptions = {
          categories: result.data.categories || validCategories,
          suppliers: result.data.suppliers || validSuppliers
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

    // 필수 필드 확인 - 엔드밀 타입 마스터 데이터만
    if (!row['Endmill Code'] || typeof row['Endmill Code'] !== 'string') {
      rowErrors.push(`${rowNumber}행: Endmill Code가 누락되었거나 잘못되었습니다.`)
    }

    if (!row['Category'] || !validationOptions.categories.includes(row['Category'])) {
      rowErrors.push(`${rowNumber}행: Category는 다음 중 하나여야 합니다: ${validationOptions.categories.join(', ')}`)
    }

    if (!row['Name'] || typeof row['Name'] !== 'string') {
      rowErrors.push(`${rowNumber}행: Name이 누락되었거나 잘못되었습니다.`)
    }

    if (!row['Supplier'] || !validationOptions.suppliers.includes(row['Supplier'])) {
      rowErrors.push(`${rowNumber}행: Supplier는 다음 중 하나여야 합니다: ${validationOptions.suppliers.join(', ')}`)
    }

    // 숫자 필드 확인
    const numberFields = ['Unit Cost', 'Standard Life']
    numberFields.forEach(field => {
      const value = row[field]
      if (value === undefined || value === null || isNaN(Number(value)) || Number(value) <= 0) {
        rowErrors.push(`${rowNumber}행: ${field}는 0보다 큰 숫자여야 합니다.`)
      }
    })

    // 같은 엔드밀 코드에 여러 공급업체가 있을 수 있음 (중복 허용)

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      // 유효한 데이터 변환 - 엔드밀 타입 마스터 데이터만
      const validRow = {
        code: row['Endmill Code'].trim(),
        category: row['Category'].trim(),
        name: row['Name'].trim(),
        supplier: row['Supplier'].trim(),
        unit_cost: Number(row['Unit Cost']),
        standard_life: Number(row['Standard Life'])
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

// 엔드밀 DB 형태로 변환 함수 - 엔드밀 타입 마스터 데이터만
export const convertToEndmillDBFormat = (validData: any[]) => {
  return validData.map(item => ({
    code: item.code,
    category: item.category,
    name: item.name,
    supplier: item.supplier,
    unit_cost: item.unit_cost,
    standard_life: item.standard_life
  }))
}
