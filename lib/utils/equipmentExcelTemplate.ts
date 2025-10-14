import ExcelJS from 'exceljs'

export interface EquipmentExcelData {
  equipment_number: string
  location: string
  status: string
  current_model: string
  process: string
}

/**
 * 설비 엑셀 템플릿 생성
 */
export const generateEquipmentTemplate = async (availableModels?: string[], availableProcesses?: string[]) => {
  // CAM Sheet에서 가져온 모델과 공정 사용, 없으면 기본값 사용
  const validModels = availableModels && availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  const validProcesses = availableProcesses && availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']

  // 워크북 생성
  const wb = new ExcelJS.Workbook()

  // 데이터 시트
  const ws = wb.addWorksheet('설비목록')

  // 컬럼 정의
  ws.columns = [
    { header: '설비번호', key: 'equipment_number', width: 12 },
    { header: '위치', key: 'location', width: 10 },
    { header: '상태', key: 'status', width: 10 },
    { header: '생산모델', key: 'current_model', width: 12 },
    { header: '공정', key: 'process', width: 10 }
  ]

  // 예시 데이터 추가
  ws.addRow({
    equipment_number: 'C021',
    location: 'A동',
    status: '가동중',
    current_model: validModels[0] || 'PA1',
    process: validProcesses[0] || 'CNC1'
  })
  ws.addRow({
    equipment_number: 'C022',
    location: 'B동',
    status: '점검중',
    current_model: validModels[1] || validModels[0] || 'R13',
    process: validProcesses[1] || validProcesses[0] || 'CNC2'
  })
  ws.addRow({
    equipment_number: 'C023',
    location: 'A동',
    status: '셋업중',
    current_model: validModels[0] || 'PA1',
    process: validProcesses[0] || 'CNC1'
  })

  // 헤더 스타일 적용
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFCCCCCC' }
  }
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // 설명 시트
  const wsInstructions = wb.addWorksheet('작성방법')

  wsInstructions.columns = [
    { header: '필드명', key: 'field', width: 15 },
    { header: '설명', key: 'description', width: 40 },
    { header: '예시', key: 'example', width: 25 }
  ]

  wsInstructions.addRows([
    { field: '', description: '=== Equipment 테이블에 저장되는 정보 ===', example: '' },
    { field: '설비번호', description: 'C로 시작하는 3자리 숫자 (DB에는 숫자만 저장)', example: 'C001, C002, C100' },
    { field: '위치', description: '설비가 위치한 동 (A동 또는 B동)', example: 'A동, B동' },
    { field: '상태', description: '현재 설비 상태', example: '가동중, 점검중, 셋업중' },
    { field: '생산모델', description: 'CAM Sheet에 등록된 모델 (current_model)', example: validModels.join(', ') },
    { field: '공정', description: 'CAM Sheet에 등록된 공정 (process)', example: validProcesses.join(', ') },
    { field: '', description: '', example: '' },
    { field: '', description: '=== 자동으로 처리되는 정보 ===', example: '' },
    { field: 'model_code', description: '생산모델에서 자동 추출 (예: PA1-A → PA1)', example: '자동 생성' },
    { field: 'tool_position_count', description: 'CAM Sheet의 최대 T번호로 자동 계산', example: '자동 계산 (기본값: 21)' },
    { field: '', description: '※ 설비번호가 이미 존재하면 중복으로 처리됩니다', example: '' }
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
export const downloadEquipmentTemplate = async (availableModels?: string[], availableProcesses?: string[]) => {
  const wb = await generateEquipmentTemplate(availableModels, availableProcesses)
  const fileName = `설비_일괄등록_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`

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
export const parseEquipmentExcel = (file: File): Promise<EquipmentExcelData[]> => {
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

        const expectedHeaders = ['설비번호', '위치', '상태', '생산모델', '공정']

        if (!expectedHeaders.every(h => headers.includes(h))) {
          throw new Error('엑셀 파일 형식이 올바르지 않습니다. 템플릿을 다운로드하여 사용해주세요.')
        }

        // 데이터 파싱 (헤더 제외)
        const equipments: EquipmentExcelData[] = []

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // 헤더 스킵

          const rowData: any = {}
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1]
            rowData[header] = cell.value
          })

          // 빈 행 스킵
          if (!rowData['설비번호'] && !rowData['위치'] && !rowData['상태']) return

          const equipment: EquipmentExcelData = {
            equipment_number: String(rowData['설비번호'] || '').trim(),
            location: rowData['위치'] || '',
            status: String(rowData['상태'] || '').trim(),
            current_model: String(rowData['생산모델'] || '').trim(),
            process: String(rowData['공정'] || '').trim()
          }

          equipments.push(equipment)
        })

        resolve(equipments)
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
 * 데이터 유효성 검사
 */
export const validateEquipmentData = (data: EquipmentExcelData[], availableModels?: string[], availableProcesses?: string[]) => {
  const errors: string[] = []
  const validLocations = ['A동', 'B동']
  const validStatuses = ['가동중', '점검중', '셋업중']
  const validModels = availableModels && availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  const validProcesses = availableProcesses && availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']

  data.forEach((item, index) => {
    const rowNum = index + 2 // 엑셀 행 번호 (헤더 제외)

    // 필수 필드 체크
    if (!item.equipment_number) {
      errors.push(`행 ${rowNum}: 설비번호가 입력되지 않았습니다.`)
    } else if (!/^C\d{3}$/.test(item.equipment_number)) {
      errors.push(`행 ${rowNum}: 설비번호 형식이 올바르지 않습니다. (예: C001)`)
    }

    if (!item.location) {
      errors.push(`행 ${rowNum}: 위치가 입력되지 않았습니다.`)
    } else if (!validLocations.includes(item.location as any)) {
      errors.push(`행 ${rowNum}: 위치는 'A동' 또는 'B동'이어야 합니다.`)
    }

    if (!item.status) {
      errors.push(`행 ${rowNum}: 상태가 입력되지 않았습니다.`)
    } else if (!validStatuses.includes(item.status)) {
      errors.push(`행 ${rowNum}: 상태는 '가동중', '점검중', '셋업중' 중 하나여야 합니다.`)
    }

    if (!item.current_model) {
      errors.push(`행 ${rowNum}: 생산모델이 입력되지 않았습니다.`)
    } else if (!validModels.includes(item.current_model)) {
      errors.push(`행 ${rowNum}: 생산모델은 ${validModels.join(', ')} 중 하나여야 합니다.`)
    }

    if (!item.process) {
      errors.push(`행 ${rowNum}: 공정이 입력되지 않았습니다.`)
    } else if (!validProcesses.includes(item.process)) {
      errors.push(`행 ${rowNum}: 공정은 ${validProcesses.join(', ')} 중 하나여야 합니다.`)
    }

    // 툴포지션수는 CAM Sheet에서 자동 계산되므로 검증에서 제외
  })

  // 중복 체크
  const equipmentNumbers = data.map(d => d.equipment_number).filter(Boolean)
  const duplicates = equipmentNumbers.filter((num, index) =>
    equipmentNumbers.indexOf(num) !== index
  )

  if (duplicates.length > 0) {
    errors.push(`중복된 설비번호: ${Array.from(new Set(duplicates)).join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
