import ExcelJS from 'exceljs'

// 재고 등록용 엑셀 템플릿 데이터
export const INVENTORY_TEMPLATE_DATA = [
  {
    '앤드밀코드': 'AT001',
    '앤드밀이름': 'D0.8xR0.2×1FLxD0.75×4.5xSA30xD6 BULL NOSE EM',
    '카테고리': 'BULL NOSE',
    '현재고': 50,
    '최소재고': 20,
    '최대재고': 100,
    '공급업체1': 'TOOLEX',
    '공급업체1_단가(VND)': 1200000,
    '공급업체2': 'FULLANDI',
    '공급업체2_단가(VND)': 1150000,
    '공급업체3': 'ATH',
    '공급업체3_단가(VND)': 1180000
  },
  {
    '앤드밀코드': 'AT002',
    '앤드밀이름': 'D2 DR',
    '카테고리': 'DRILL',
    '현재고': 30,
    '최소재고': 15,
    '최대재고': 80,
    '공급업체1': 'TOOLEX',
    '공급업체1_단가(VND)': 800000,
    '공급업체2': '',
    '공급업체2_단가(VND)': 0,
    '공급업체3': '',
    '공급업체3_단가(VND)': 0
  }
]

// 재고 등록용 엑셀 템플릿 다운로드 함수
export const downloadInventoryTemplate = async () => {
  // 워크북 생성
  const workbook = new ExcelJS.Workbook()

  // 워크시트 생성
  const worksheet = workbook.addWorksheet('재고_템플릿')

  // 헤더 정의
  const columns = [
    { header: '앤드밀코드', key: '앤드밀코드', width: 15 },
    { header: '앤드밀이름', key: '앤드밀이름', width: 40 },
    { header: '카테고리', key: '카테고리', width: 15 },
    { header: '현재고', key: '현재고', width: 12 },
    { header: '최소재고', key: '최소재고', width: 12 },
    { header: '최대재고', key: '최대재고', width: 12 },
    { header: '공급업체1', key: '공급업체1', width: 15 },
    { header: '공급업체1_단가(VND)', key: '공급업체1_단가(VND)', width: 18 },
    { header: '공급업체2', key: '공급업체2', width: 15 },
    { header: '공급업체2_단가(VND)', key: '공급업체2_단가(VND)', width: 18 },
    { header: '공급업체3', key: '공급업체3', width: 15 },
    { header: '공급업체3_단가(VND)', key: '공급업체3_단가(VND)', width: 18 }
  ]

  worksheet.columns = columns

  // 샘플 데이터 추가
  worksheet.addRows(INVENTORY_TEMPLATE_DATA)

  // 헤더 스타일 적용
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // 필수 컬럼 강조 (노란색)
  const requiredColumns = ['앤드밀코드', '앤드밀이름', '카테고리', '현재고', '최소재고', '최대재고']
  columns.forEach((col, index) => {
    if (requiredColumns.includes(col.header)) {
      const cell = worksheet.getRow(1).getCell(index + 1)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC000' } // 주황색
      }
      cell.font = { bold: true, color: { argb: 'FF000000' } }
    }
  })

  // 데이터 검증 추가 (숫자 필드)
  const numberColumns = ['현재고', '최소재고', '최대재고', '공급업체1_단가(VND)', '공급업체2_단가(VND)', '공급업체3_단가(VND)']
  numberColumns.forEach(colName => {
    const colIndex = columns.findIndex(c => c.header === colName) + 1
    for (let row = 2; row <= 1000; row++) {
      worksheet.getCell(row, colIndex).dataValidation = {
        type: 'whole',
        operator: 'greaterThanOrEqual',
        showErrorMessage: true,
        formulae: [0],
        errorStyle: 'error',
        errorTitle: '입력 오류',
        error: '0 이상의 정수만 입력 가능합니다.'
      }
    }
  })

  // 안내 시트 추가
  const guideSheet = workbook.addWorksheet('작성가이드')
  guideSheet.columns = [
    { header: '컬럼명', key: 'column', width: 25 },
    { header: '필수여부', key: 'required', width: 12 },
    { header: '설명', key: 'description', width: 60 }
  ]

  const guideData = [
    { column: '앤드밀코드', required: '필수', description: '앤드밀 고유 코드 (예: AT001, AT002)' },
    { column: '앤드밀이름', required: '필수', description: '앤드밀 상세 이름/스펙' },
    { column: '카테고리', required: '필수', description: '앤드밀 카테고리 (예: DRILL, FLAT, BALL, BULL NOSE, T-CUT, C-CUT, REAMER, SPECIAL)' },
    { column: '현재고', required: '필수', description: '현재 보유 재고 수량 (개)' },
    { column: '최소재고', required: '필수', description: '최소 유지 재고 수량 (개) - 이 수량 이하시 재주문 필요' },
    { column: '최대재고', required: '필수', description: '최대 보관 가능 재고 수량 (개)' },
    { column: '공급업체1', required: '선택', description: '주 거래 공급업체명 (예: TOOLEX, FULLANDI, ATH, KEOSANG)' },
    { column: '공급업체1_단가(VND)', required: '선택', description: '공급업체1의 단가 (VND)' },
    { column: '공급업체2', required: '선택', description: '2차 거래 공급업체명' },
    { column: '공급업체2_단가(VND)', required: '선택', description: '공급업체2의 단가 (VND)' },
    { column: '공급업체3', required: '선택', description: '3차 거래 공급업체명' },
    { column: '공급업체3_단가(VND)', required: '선택', description: '공급업체3의 단가 (VND)' }
  ]

  guideSheet.addRows(guideData)

  // 가이드 시트 스타일
  guideSheet.getRow(1).font = { bold: true }
  guideSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  }
  guideSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  guideSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // 필수 항목 강조
  guideData.forEach((row, index) => {
    if (row.required === '필수') {
      guideSheet.getCell(index + 2, 2).font = { bold: true, color: { argb: 'FFFF0000' } }
    }
  })

  // 주의사항 추가
  guideSheet.addRow([])
  guideSheet.addRow(['주의사항'])
  guideSheet.getCell(`A${guideSheet.lastRow?.number}`).font = { bold: true, size: 14 }
  guideSheet.addRow(['• 앤드밀코드는 중복될 수 없습니다. 시스템에 이미 등록된 코드는 자동으로 업데이트됩니다.'])
  guideSheet.addRow(['• 최소재고는 최대재고보다 작아야 합니다.'])
  guideSheet.addRow(['• 공급업체명을 입력하면 단가도 함께 입력해야 합니다.'])
  guideSheet.addRow(['• 하나의 앤드밀에 최대 3개 공급업체까지 등록 가능합니다.'])
  guideSheet.addRow(['• 엑셀 파일은 .xlsx 형식만 지원됩니다.'])

  // 파일명 생성 (현재 날짜 포함)
  const today = new Date().toISOString().split('T')[0]
  const filename = `재고_기초등록_템플릿_${today}.xlsx`

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

// 재고 데이터 검증 함수
export const validateInventoryData = async (
  data: any[],
  validationOptions?: {
    validCategories?: string[]
    validSuppliers?: string[]
  }
): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
  validData: any[]
}> => {
  const errors: string[] = []
  const warnings: string[] = []
  const validData: any[] = []

  // 기본 검증 옵션
  const validCategories = validationOptions?.validCategories || [
    'FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL', 'BULL NOSE', 'SPECIAL'
  ]
  const validSuppliers = validationOptions?.validSuppliers || [
    'TOOLEX', 'FULLANDI', 'ATH', 'KEOSANG'
  ]

  // 필수 컬럼 검증
  const requiredColumns = [
    '앤드밀코드', '앤드밀이름', '카테고리', '현재고', '최소재고', '최대재고'
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
    return { isValid: false, errors, warnings, validData }
  }

  // 앤드밀 코드 중복 체크
  const codeSet = new Set<string>()
  const duplicateCodes: string[] = []

  // 데이터 행별 검증
  data.forEach((row, index) => {
    const rowNumber = index + 2 // 엑셀 행 번호 (헤더 포함)
    let hasError = false

    // 필수 필드 검증
    if (!row['앤드밀코드'] || row['앤드밀코드'].toString().trim() === '') {
      errors.push(`${rowNumber}행: 앤드밀코드가 필요합니다.`)
      hasError = true
    } else {
      const code = row['앤드밀코드'].toString().trim()
      if (codeSet.has(code)) {
        duplicateCodes.push(code)
      } else {
        codeSet.add(code)
      }
    }

    if (!row['앤드밀이름'] || row['앤드밀이름'].toString().trim() === '') {
      errors.push(`${rowNumber}행: 앤드밀이름이 필요합니다.`)
      hasError = true
    }

    // 카테고리 검증
    if (!row['카테고리'] || row['카테고리'].toString().trim() === '') {
      errors.push(`${rowNumber}행: 카테고리가 필요합니다.`)
      hasError = true
    } else if (!validCategories.includes(row['카테고리'])) {
      warnings.push(`${rowNumber}행: 카테고리를 확인해주세요. (${row['카테고리']}) - 유효한 값: ${validCategories.join(', ')}`)
    }

    // 숫자 필드 검증
    const numericFields = ['현재고', '최소재고', '최대재고']
    for (const field of numericFields) {
      if (!row[field] && row[field] !== 0) {
        errors.push(`${rowNumber}행: ${field}가 필요합니다.`)
        hasError = true
      } else if (isNaN(Number(row[field])) || Number(row[field]) < 0) {
        errors.push(`${rowNumber}행: ${field}는 0 이상의 숫자여야 합니다.`)
        hasError = true
      }
    }

    // 재고량 논리 검증
    if (!hasError) {
      const currentStock = Number(row['현재고']) || 0
      const minStock = Number(row['최소재고']) || 0
      const maxStock = Number(row['최대재고']) || 0

      if (minStock >= maxStock) {
        warnings.push(`${rowNumber}행: 최소재고(${minStock})가 최대재고(${maxStock})보다 크거나 같습니다.`)
      }

      if (currentStock > maxStock) {
        warnings.push(`${rowNumber}행: 현재고(${currentStock})가 최대재고(${maxStock})를 초과합니다.`)
      }

      if (currentStock <= minStock) {
        warnings.push(`${rowNumber}행: 현재고(${currentStock})가 최소재고(${minStock}) 이하입니다. 재주문이 필요할 수 있습니다.`)
      }
    }

    // 공급업체 정보 검증
    for (let i = 1; i <= 3; i++) {
      const supplierField = `공급업체${i}`
      const priceField = `공급업체${i}_단가(VND)`

      const supplierName = row[supplierField]?.toString().trim()
      const supplierPrice = row[priceField]

      if (supplierName) {
        // 공급업체명 검증
        if (!validSuppliers.includes(supplierName)) {
          warnings.push(`${rowNumber}행: ${supplierField} 값을 확인해주세요. (${supplierName}) - 유효한 값: ${validSuppliers.join(', ')}`)
        }

        // 단가 검증
        if (!supplierPrice || isNaN(Number(supplierPrice)) || Number(supplierPrice) <= 0) {
          warnings.push(`${rowNumber}행: ${supplierField}를 입력했으면 ${priceField}도 입력해야 합니다.`)
        }
      } else if (supplierPrice && Number(supplierPrice) > 0) {
        warnings.push(`${rowNumber}행: ${priceField}를 입력했으면 ${supplierField}도 입력해야 합니다.`)
      }
    }

    if (!hasError) {
      validData.push(row)
    }
  })

  // 중복 코드 경고
  if (duplicateCodes.length > 0) {
    warnings.push(`엑셀 파일 내 중복된 앤드밀코드가 있습니다: ${duplicateCodes.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validData
  }
}

// 엑셀 데이터를 API 형식으로 변환
export const convertExcelToInventoryData = (data: any[]): any[] => {
  return data.map(row => {
    const inventoryItem: any = {
      code: row['앤드밀코드']?.toString().trim(),
      name: row['앤드밀이름']?.toString().trim(),
      category: row['카테고리']?.toString().trim(),
      currentStock: Number(row['현재고']) || 0,
      minStock: Number(row['최소재고']) || 0,
      maxStock: Number(row['최대재고']) || 0,
      suppliers: []
    }

    // 공급업체 정보 추가
    for (let i = 1; i <= 3; i++) {
      const supplierName = row[`공급업체${i}`]?.toString().trim()
      const supplierPrice = Number(row[`공급업체${i}_단가(VND)`])

      if (supplierName && supplierPrice > 0) {
        inventoryItem.suppliers.push({
          name: supplierName,
          unitPrice: supplierPrice
        })
      }
    }

    return inventoryItem
  })
}

// 재고 조사용 엑셀 다운로드 함수
export const downloadInventorySurveyTemplate = async (inventoryData: any[]) => {
  // 워크북 생성
  const workbook = new ExcelJS.Workbook()

  // 워크시트 생성
  const worksheet = workbook.addWorksheet('재고조사')

  // 헤더 정의
  const columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: '앤드밀코드', key: 'code', width: 15 },
    { header: '앤드밀이름', key: 'name', width: 40 },
    { header: '카테고리', key: 'category', width: 15 },
    { header: '규격', key: 'specifications', width: 30 },
    { header: '시스템재고', key: 'systemStock', width: 12 },
    { header: '실물수량', key: 'actualStock', width: 12 },
    { header: '차이', key: 'difference', width: 10 },
    { header: '비고', key: 'remarks', width: 30 }
  ]

  worksheet.columns = columns

  // 데이터 추가
  inventoryData.forEach((item, index) => {
    const row = worksheet.addRow({
      no: index + 1,
      code: item.code || '',
      name: item.name || '',
      category: item.category || '',
      specifications: item.specifications || '',
      systemStock: item.totalCurrentStock || 0,
      actualStock: '', // 빈 칸 (현장에서 입력)
      difference: '', // 수식으로 계산
      remarks: '' // 빈 칸
    })

    // 차이 컬럼에 수식 추가 (실물수량 - 시스템재고)
    const rowNumber = row.number
    worksheet.getCell(`H${rowNumber}`).value = {
      formula: `G${rowNumber}-F${rowNumber}`,
      result: 0
    }
  })

  // 헤더 스타일 적용
  worksheet.getRow(1).font = { bold: true, size: 11 }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(1).height = 25

  // 입력 컬럼 강조 (연한 노란색)
  inventoryData.forEach((_, index) => {
    const rowNumber = index + 2
    // 실물수량 컬럼
    worksheet.getCell(`G${rowNumber}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9CC' }
    }
    // 비고 컬럼
    worksheet.getCell(`I${rowNumber}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    }
  })

  // 차이 컬럼 조건부 서식 (차이가 있는 경우 빨간색)
  inventoryData.forEach((_, index) => {
    const rowNumber = index + 2
    const diffCell = worksheet.getCell(`H${rowNumber}`)
    diffCell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // 데이터 검증 추가 (실물수량은 숫자만)
  for (let row = 2; row <= inventoryData.length + 1; row++) {
    worksheet.getCell(`G${row}`).dataValidation = {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      showErrorMessage: true,
      formulae: [0],
      errorStyle: 'warning',
      errorTitle: '입력 오류',
      error: '0 이상의 정수만 입력 가능합니다.'
    }
  }

  // 전체 셀 테두리 추가
  const borderStyle: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: 'FF000000' }
  }

  for (let row = 1; row <= inventoryData.length + 1; row++) {
    for (let col = 1; col <= columns.length; col++) {
      const cell = worksheet.getCell(row, col)
      cell.border = {
        top: borderStyle,
        left: borderStyle,
        bottom: borderStyle,
        right: borderStyle
      }
      cell.alignment = { vertical: 'middle' }
    }
  }

  // 안내 시트 추가
  const guideSheet = workbook.addWorksheet('작성가이드')
  guideSheet.columns = [
    { header: '항목', key: 'item', width: 20 },
    { header: '설명', key: 'description', width: 80 }
  ]

  const guideData = [
    { item: '📋 작성 방법', description: '' },
    { item: '1. 실물수량 입력', description: '실제 창고에서 세어본 재고 수량을 "실물수량" 컬럼에 입력하세요.' },
    { item: '2. 차이 확인', description: '"차이" 컬럼은 자동으로 계산됩니다. (실물수량 - 시스템재고)' },
    { item: '3. 비고 작성', description: '차이가 있거나 특이사항이 있는 경우 "비고" 컬럼에 사유를 기입하세요.' },
    { item: '', description: '' },
    { item: '📌 주의사항', description: '' },
    { item: '• 시스템재고', description: '현재 시스템에 등록된 재고입니다. 수정하지 마세요.' },
    { item: '• 실물수량', description: '실제로 센 재고를 입력하세요. 0 이상의 정수만 입력 가능합니다.' },
    { item: '• 차이', description: '자동 계산되므로 직접 입력하지 마세요.' },
    { item: '• 양수 차이', description: '실물이 시스템보다 많음 (재고 추가 필요)' },
    { item: '• 음수 차이', description: '실물이 시스템보다 적음 (재고 차감 또는 분실 확인 필요)' },
    { item: '', description: '' },
    { item: '💡 작업 팁', description: '' },
    { item: '인쇄하기', description: '엑셀에서 "파일 > 인쇄"를 선택하여 용지로 출력 후 현장에서 작성 가능합니다.' },
    { item: '정렬하기', description: '카테고리별로 정렬하여 작업하면 편리합니다.' },
    { item: '필터 사용', description: '차이가 있는 항목만 필터링하여 확인할 수 있습니다.' }
  ]

  guideSheet.addRows(guideData)

  // 가이드 시트 스타일
  guideSheet.getRow(1).font = { bold: true, size: 12 }
  guideSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  }
  guideSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  guideSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // 제목 행 강조
  const titleRows = [2, 7, 14]
  titleRows.forEach(rowNum => {
    const row = guideSheet.getRow(rowNum)
    row.font = { bold: true, size: 12, color: { argb: 'FF0066CC' } }
  })

  // 파일명 생성 (현재 날짜 포함)
  const today = new Date().toISOString().split('T')[0]
  const filename = `재고조사_${today}.xlsx`

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
