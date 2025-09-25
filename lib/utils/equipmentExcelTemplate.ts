import * as XLSX from 'xlsx'

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
export const generateEquipmentTemplate = (availableModels?: string[], availableProcesses?: string[]) => {
  // CAM Sheet에서 가져온 모델과 공정 사용, 없으면 기본값 사용
  const validModels = availableModels && availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  const validProcesses = availableProcesses && availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']
  // 헤더 - 툴 포지션수 제거
  const headers = [
    '설비번호',
    '위치',
    '상태',
    '생산모델',
    '공정'
  ]

  // 예시 데이터 - 툴 포지션수 제거
  const exampleData = [
    ['C021', 'A동', '가동중', validModels[0] || 'PA1', validProcesses[0] || 'CNC1'],
    ['C022', 'B동', '점검중', validModels[1] || validModels[0] || 'R13', validProcesses[1] || validProcesses[0] || 'CNC2'],
    ['C023', 'A동', '셋업중', validModels[0] || 'PA1', validProcesses[0] || 'CNC1']
  ]

  // 워크북 생성
  const wb = XLSX.utils.book_new()

  // 데이터 시트
  const wsData = [headers, ...exampleData]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 12 }, // 설비번호
    { wch: 10 }, // 위치
    { wch: 10 }, // 상태
    { wch: 12 }, // 생산모델
    { wch: 10 }, // 공정
    // { wch: 12 }  // 툴포지션수 제거됨
  ]

  // 스타일 적용 (헤더 강조)
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:E1')
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'FFCCCCCC' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '설비목록')

  // 설명 시트
  const instructions = [
    ['필드명', '설명', '예시'],
    ['설비번호', 'C로 시작하는 3자리 숫자', 'C001, C002, C100'],
    ['위치', '설비가 위치한 동', 'A동, B동'],
    ['상태', '현재 설비 상태', '가동중, 점검중, 셋업중'],
    ['생산모델', 'CAM Sheet에 등록된 모델', validModels.join(', ')],
    ['공정', 'CAM Sheet에 등록된 공정', validProcesses.join(', ')],
    ['', '※ 툴 포지션 수는 CAM Sheet에서', '자동으로 계산됩니다']
  ]

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions)
  wsInstructions['!cols'] = [
    { wch: 15 },
    { wch: 40 },
    { wch: 25 }
  ]

  XLSX.utils.book_append_sheet(wb, wsInstructions, '작성방법')

  return wb
}

/**
 * 엑셀 파일 다운로드
 */
export const downloadEquipmentTemplate = (availableModels?: string[], availableProcesses?: string[]) => {
  const wb = generateEquipmentTemplate(availableModels, availableProcesses)
  const fileName = `설비_일괄등록_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

/**
 * 엑셀 데이터 파싱
 */
export const parseEquipmentExcel = (file: File): Promise<EquipmentExcelData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // 첫 번째 시트 가져오기
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        }) as any[][]

        // 헤더 확인
        const headers = jsonData[0]
        const expectedHeaders = ['설비번호', '위치', '상태', '생산모델', '공정']

        if (!headers || !expectedHeaders.every(h => headers.includes(h))) {
          throw new Error('엑셀 파일 형식이 올바르지 않습니다. 템플릿을 다운로드하여 사용해주세요.')
        }

        // 데이터 파싱 (헤더 제외)
        const equipments: EquipmentExcelData[] = []

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]

          // 빈 행 스킵
          if (!row || row.every(cell => !cell)) continue

          const equipment: EquipmentExcelData = {
            equipment_number: String(row[headers.indexOf('설비번호')] || '').trim(),
            location: row[headers.indexOf('위치')] as any || '',
            status: String(row[headers.indexOf('상태')] || '').trim(),
            current_model: String(row[headers.indexOf('생산모델')] || '').trim(),
            process: String(row[headers.indexOf('공정')] || '').trim()
            // tool_position_count는 CAM Sheet에서 자동 계산
          }

          equipments.push(equipment)
        }

        resolve(equipments)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'))
    }

    reader.readAsBinaryString(file)
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
    errors.push(`중복된 설비번호: ${[...new Set(duplicates)].join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}