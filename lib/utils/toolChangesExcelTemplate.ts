import ExcelJS from 'exceljs'

export interface ToolChangeExcelData {
  equipment_number: string
  production_model: string
  process: string
  t_number: number
  endmill_code: string
  endmill_name: string
  tool_life: number
  change_reason: string
  changed_by: string
}

/**
 * 교체 실적 엑셀 템플릿 생성
 */
export const generateToolChangesTemplate = async (
  availableModels?: string[],
  availableProcesses?: string[],
  changeReasons?: string[]
) => {
  const validModels = availableModels && availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  const validProcesses = availableProcesses && availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']
  const validReasons = changeReasons && changeReasons.length > 0 ? changeReasons : ['수명완료', '파손', '마모', '예방교체', '모델변경', '기타']

  const wb = new ExcelJS.Workbook()

  // 데이터 시트
  const ws = wb.addWorksheet('교체실적목록')

  // 컬럼 정의
  ws.columns = [
    { header: '설비번호', key: 'equipment_number', width: 12 },
    { header: '생산모델', key: 'production_model', width: 12 },
    { header: '공정', key: 'process', width: 10 },
    { header: 'T번호', key: 't_number', width: 8 },
    { header: '앤드밀코드', key: 'endmill_code', width: 15 },
    { header: '앤드밀이름', key: 'endmill_name', width: 30 },
    { header: '실제Tool life', key: 'tool_life', width: 12 },
    { header: '교체사유', key: 'change_reason', width: 12 },
    { header: '교체자', key: 'changed_by', width: 15 }
  ]

  // 예시 데이터 추가
  ws.addRow({
    equipment_number: 'C001',
    production_model: validModels[0] || 'PA1',
    process: validProcesses[0] || 'CNC1',
    t_number: 1,
    endmill_code: 'EM-001',
    endmill_name: 'Φ10 4날 평엔드밀',
    tool_life: 2500,
    change_reason: validReasons[0] || '수명완료',
    changed_by: '홍길동'
  })
  ws.addRow({
    equipment_number: 'C002',
    production_model: validModels[0] || 'PA1',
    process: validProcesses[0] || 'CNC1',
    t_number: 2,
    endmill_code: 'EM-002',
    endmill_name: 'Φ8 2날 볼엔드밀',
    tool_life: 1800,
    change_reason: validReasons[1] || '파손',
    changed_by: '김철수'
  })
  ws.addRow({
    equipment_number: 'C003',
    production_model: validModels[1] || validModels[0] || 'PA2',
    process: validProcesses[1] || validProcesses[0] || 'CNC2',
    t_number: 1,
    endmill_code: 'EM-003',
    endmill_name: 'Φ12 4날 평엔드밀',
    tool_life: 3000,
    change_reason: validReasons[4] || '모델변경',
    changed_by: '이영희'
  })

  // 헤더 스타일 적용
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // 설명 시트
  const wsInstructions = wb.addWorksheet('작성방법')

  wsInstructions.columns = [
    { header: '필드명', key: 'field', width: 15 },
    { header: '설명', key: 'description', width: 50 },
    { header: '예시', key: 'example', width: 30 }
  ]

  wsInstructions.addRows([
    { field: '', description: '=== 교체 실적 일괄 입력 안내 ===', example: '' },
    { field: '설비번호', description: 'C로 시작하는 3자리 숫자 (예: C001, C025)', example: 'C001, C025, C100' },
    { field: '생산모델', description: 'CAM Sheet에 등록된 모델명', example: validModels.join(', ') },
    { field: '공정', description: 'CAM Sheet에 등록된 공정명', example: validProcesses.join(', ') },
    { field: 'T번호', description: 'CAM Sheet에 등록된 T번호 (1~24)', example: '1, 2, 3, ..., 24' },
    { field: '앤드밀코드', description: 'CAM Sheet에 등록된 앤드밀 코드', example: 'EM-001, EM-002' },
    { field: '앤드밀이름', description: 'CAM Sheet에 등록된 앤드밀 사양', example: 'Φ10 4날 평엔드밀' },
    { field: '실제Tool life', description: '실제 사용한 Tool life (0 이상 숫자)', example: '2500, 1800, 3000' },
    { field: '교체사유', description: '교체 사유 (아래 값 중 선택)', example: validReasons.join(', ') },
    { field: '교체자', description: '교체 작업자 이름 또는 사번', example: '홍길동, EMP001' },
    { field: '', description: '', example: '' },
    { field: '', description: '=== 중요 사항 ===', example: '' },
    { field: '정합성 검증', description: '모델+공정+T번호 조합이 CAM Sheet에 등록되어 있어야 함', example: '' },
    { field: '앤드밀 정보', description: '입력한 앤드밀코드/이름이 CAM Sheet의 해당 T번호 정보와 일치해야 함', example: '' },
    { field: '중복 방지', description: '같은 설비의 같은 T번호는 한 번만 입력 가능', example: '' },
    { field: '전체 처리', description: '검증 통과시 전체 일괄 입력, 오류 발생시 전체 취소', example: '' }
  ])

  // 설명 시트 헤더 스타일
  wsInstructions.getRow(1).font = { bold: true }
  wsInstructions.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFCCCCCC' }
  }
  wsInstructions.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  return wb
}

/**
 * 엑셀 파일 다운로드
 */
export const downloadToolChangesTemplate = async (
  availableModels?: string[],
  availableProcesses?: string[],
  changeReasons?: string[]
) => {
  const wb = await generateToolChangesTemplate(availableModels, availableProcesses, changeReasons)
  const fileName = `교체실적_일괄등록_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * 엑셀 데이터 파싱
 */
export const parseToolChangesExcel = (file: File): Promise<ToolChangeExcelData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          throw new Error('파일을 읽을 수 없습니다.')
        }

        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(data as ArrayBuffer)

        // 첫 번째 시트 가져오기
        const worksheet = workbook.worksheets[0]
        if (!worksheet) {
          throw new Error('워크시트를 찾을 수 없습니다.')
        }

        // 헤더 확인
        const headerRow = worksheet.getRow(1)
        const headers: string[] = []
        headerRow.eachCell((cell) => {
          headers.push(cell.value?.toString() || '')
        })

        const expectedHeaders = ['설비번호', '생산모델', '공정', 'T번호', '앤드밀코드', '앤드밀이름', '실제Tool life', '교체사유', '교체자']

        if (!expectedHeaders.every(h => headers.includes(h))) {
          throw new Error('엑셀 파일 형식이 올바르지 않습니다. 템플릿을 다운로드하여 사용해주세요.')
        }

        // 데이터 파싱 (헤더 제외)
        const toolChanges: ToolChangeExcelData[] = []

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // 헤더 스킵

          const rowData: Record<string, unknown> = {}
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1]
            rowData[header] = cell.value
          })

          // 빈 행 스킵
          if (!rowData['설비번호'] && !rowData['생산모델'] && !rowData['공정']) return

          const toolChange: ToolChangeExcelData = {
            equipment_number: String(rowData['설비번호'] || '').trim(),
            production_model: String(rowData['생산모델'] || '').trim(),
            process: String(rowData['공정'] || '').trim(),
            t_number: parseInt(String(rowData['T번호'] || '0')),
            endmill_code: String(rowData['앤드밀코드'] || '').trim(),
            endmill_name: String(rowData['앤드밀이름'] || '').trim(),
            tool_life: parseInt(String(rowData['실제Tool life'] || '0')),
            change_reason: String(rowData['교체사유'] || '').trim(),
            changed_by: String(rowData['교체자'] || '').trim()
          }

          toolChanges.push(toolChange)
        })

        resolve(toolChanges)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * 데이터 기본 유효성 검사 (형식만 체크, CAM Sheet 정합성은 서버에서 체크)
 */
export const validateToolChangesData = (
  data: ToolChangeExcelData[],
  changeReasons?: string[]
) => {
  const errors: string[] = []
  const validReasons = changeReasons && changeReasons.length > 0 ? changeReasons : ['수명완료', '파손', '마모', '예방교체', '모델변경', '기타']

  data.forEach((item, index) => {
    const rowNum = index + 2 // 엑셀 행 번호 (헤더 제외)

    // 필수 필드 체크
    if (!item.equipment_number) {
      errors.push(`행 ${rowNum}: 설비번호가 입력되지 않았습니다.`)
    } else if (!/^C\d{3}$/.test(item.equipment_number)) {
      errors.push(`행 ${rowNum}: 설비번호 형식이 올바르지 않습니다. (예: C001)`)
    }

    if (!item.production_model) {
      errors.push(`행 ${rowNum}: 생산모델이 입력되지 않았습니다.`)
    }

    if (!item.process) {
      errors.push(`행 ${rowNum}: 공정이 입력되지 않았습니다.`)
    }

    if (!item.t_number || item.t_number < 1 || item.t_number > 24) {
      errors.push(`행 ${rowNum}: T번호는 1~24 사이의 숫자여야 합니다.`)
    }

    if (!item.endmill_code) {
      errors.push(`행 ${rowNum}: 앤드밀코드가 입력되지 않았습니다.`)
    }

    if (!item.endmill_name) {
      errors.push(`행 ${rowNum}: 앤드밀이름이 입력되지 않았습니다.`)
    }

    if (item.tool_life === undefined || item.tool_life === null || isNaN(item.tool_life) || item.tool_life < 0) {
      errors.push(`행 ${rowNum}: 실제Tool life는 0 이상의 숫자여야 합니다.`)
    }

    if (!item.change_reason) {
      errors.push(`행 ${rowNum}: 교체사유가 입력되지 않았습니다.`)
    } else if (!validReasons.includes(item.change_reason)) {
      errors.push(`행 ${rowNum}: 교체사유는 ${validReasons.join(', ')} 중 하나여야 합니다.`)
    }

    if (!item.changed_by) {
      errors.push(`행 ${rowNum}: 교체자가 입력되지 않았습니다.`)
    }
  })

  // 중복 체크 (같은 설비의 같은 T번호)
  const duplicateKeys = new Set<string>()
  const seenKeys = new Map<string, number>()

  data.forEach((item, index) => {
    const key = `${item.equipment_number}-T${item.t_number}`
    if (seenKeys.has(key)) {
      duplicateKeys.add(`${key} (행 ${seenKeys.get(key)}, ${index + 2})`)
    } else {
      seenKeys.set(key, index + 2)
    }
  })

  if (duplicateKeys.size > 0) {
    errors.push(`중복된 설비-T번호 조합: ${Array.from(duplicateKeys).join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
