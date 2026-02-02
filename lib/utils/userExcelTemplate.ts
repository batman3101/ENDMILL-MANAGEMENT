import ExcelJS from 'exceljs'

export interface UserExcelData {
  name: string
  employeeId: string
  email: string
  department: string
  position: string
  shift: string
  role: string
  password: string
  phone?: string
}

export interface UserValidationResult {
  isValid: boolean
  errors: string[]
}

export interface BulkUploadResult {
  success: Array<{ name: string; employeeId: string; email: string }>
  failed: Array<{ row: number; name: string; reason: string }>
  duplicates: Array<{ row: number; name: string; field: string; value: string }>
}

/**
 * 사용자 엑셀 템플릿 생성
 */
export const generateUserTemplate = async () => {
  const wb = new ExcelJS.Workbook()

  // 데이터 시트
  const ws = wb.addWorksheet('사용자목록')

  ws.columns = [
    { header: '이름', key: 'name', width: 15 },
    { header: '사번', key: 'employeeId', width: 12 },
    { header: '이메일', key: 'email', width: 25 },
    { header: '부서', key: 'department', width: 15 },
    { header: '직위', key: 'position', width: 12 },
    { header: '교대', key: 'shift', width: 8 },
    { header: '역할', key: 'role', width: 10 },
    { header: '비밀번호', key: 'password', width: 15 },
    { header: '전화번호', key: 'phone', width: 15 },
  ]

  // 예시 데이터
  ws.addRow({
    name: '홍길동',
    employeeId: 'EMP001',
    email: 'hong@example.com',
    department: 'CNC가공',
    position: '사원',
    shift: 'A',
    role: 'user',
    password: 'EMP001@2024',
    phone: '010-1234-5678',
  })
  ws.addRow({
    name: '김영희',
    employeeId: 'EMP002',
    email: 'kim@example.com',
    department: 'CNC가공',
    position: '주임',
    shift: 'B',
    role: 'user',
    password: 'EMP002@2024',
    phone: '',
  })
  ws.addRow({
    name: '박관리',
    employeeId: 'EMP003',
    email: 'park@example.com',
    department: '생산관리',
    position: '과장',
    shift: 'A',
    role: 'admin',
    password: 'EMP003@2024',
    phone: '010-9876-5432',
  })

  // 헤더 스타일
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFCCCCCC' },
  }
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // 드롭다운 유효성 검사 - 교대 (F열, 2~200행)
  for (let row = 2; row <= 200; row++) {
    ws.getCell(`F${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"A,B,C"'],
      showErrorMessage: true,
      errorTitle: '입력 오류',
      error: 'A, B, C 중 하나를 선택하세요.',
    }
  }

  // 드롭다운 유효성 검사 - 역할 (G열, 2~200행)
  for (let row = 2; row <= 200; row++) {
    ws.getCell(`G${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"admin,user"'],
      showErrorMessage: true,
      errorTitle: '입력 오류',
      error: 'admin 또는 user를 선택하세요.',
    }
  }

  // 설명 시트
  const wsInstructions = wb.addWorksheet('작성방법')

  wsInstructions.columns = [
    { header: '필드명', key: 'field', width: 15 },
    { header: '필수', key: 'required', width: 8 },
    { header: '설명', key: 'description', width: 40 },
    { header: '예시', key: 'example', width: 25 },
  ]

  wsInstructions.addRows([
    { field: '이름', required: 'O', description: '사용자 이름', example: '홍길동' },
    { field: '사번', required: 'O', description: '고유 사번 (중복 불가)', example: 'EMP001' },
    { field: '이메일', required: 'O', description: '로그인용 이메일 (중복 불가)', example: 'hong@example.com' },
    { field: '부서', required: 'O', description: '부서명', example: 'CNC가공' },
    { field: '직위', required: 'O', description: '직위', example: '사원, 주임, 과장' },
    { field: '교대', required: 'O', description: 'A, B, C 중 선택', example: 'A' },
    { field: '역할', required: 'O', description: 'admin 또는 user', example: 'user' },
    { field: '비밀번호', required: 'O', description: '최소 6자 이상', example: 'EMP001@2024' },
    { field: '전화번호', required: 'X', description: '선택 입력', example: '010-1234-5678' },
    { field: '', required: '', description: '', example: '' },
    { field: '', required: '', description: '※ 사번과 이메일은 중복 등록 불가', example: '' },
    { field: '', required: '', description: '※ 예시 데이터(2~4행)를 삭제 후 입력하세요', example: '' },
  ])

  wsInstructions.getRow(1).font = { bold: true }
  wsInstructions.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFCCCCCC' },
  }
  wsInstructions.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  return wb
}

/**
 * 엑셀 파일 다운로드
 */
export const downloadUserTemplate = async () => {
  const wb = await generateUserTemplate()
  const fileName = `사용자_일괄등록_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
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
export const parseUserExcel = (file: File): Promise<UserExcelData[]> => {
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

        const expectedHeaders = ['이름', '사번', '이메일', '부서', '직위', '교대', '역할', '비밀번호']
        if (!expectedHeaders.every((h) => headers.includes(h))) {
          throw new Error('엑셀 파일 형식이 올바르지 않습니다. 템플릿을 다운로드하여 사용해주세요.')
        }

        const users: UserExcelData[] = []

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return

          const rowData: Record<string, string> = {}
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1]
            rowData[header] = cell.value?.toString()?.trim() || ''
          })

          // 빈 행 스킵
          if (!rowData['이름'] && !rowData['사번'] && !rowData['이메일']) return

          users.push({
            name: rowData['이름'] || '',
            employeeId: rowData['사번'] || '',
            email: rowData['이메일'] || '',
            department: rowData['부서'] || '',
            position: rowData['직위'] || '',
            shift: rowData['교대'] || '',
            role: rowData['역할'] || '',
            password: rowData['비밀번호'] || '',
            phone: rowData['전화번호'] || undefined,
          })
        })

        resolve(users)
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
export const validateUserData = (data: UserExcelData[]): UserValidationResult => {
  const errors: string[] = []
  const validShifts = ['A', 'B', 'C']
  const validRoles = ['admin', 'user']

  data.forEach((item, index) => {
    const rowNum = index + 2

    if (!item.name) errors.push(`행 ${rowNum}: 이름이 입력되지 않았습니다.`)
    if (!item.employeeId) errors.push(`행 ${rowNum}: 사번이 입력되지 않았습니다.`)

    if (!item.email) {
      errors.push(`행 ${rowNum}: 이메일이 입력되지 않았습니다.`)
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
      errors.push(`행 ${rowNum}: 이메일 형식이 올바르지 않습니다. (${item.email})`)
    }

    if (!item.department) errors.push(`행 ${rowNum}: 부서가 입력되지 않았습니다.`)
    if (!item.position) errors.push(`행 ${rowNum}: 직위가 입력되지 않았습니다.`)

    if (!item.shift) {
      errors.push(`행 ${rowNum}: 교대가 입력되지 않았습니다.`)
    } else if (!validShifts.includes(item.shift)) {
      errors.push(`행 ${rowNum}: 교대는 A, B, C 중 하나여야 합니다.`)
    }

    if (!item.role) {
      errors.push(`행 ${rowNum}: 역할이 입력되지 않았습니다.`)
    } else if (!validRoles.includes(item.role)) {
      errors.push(`행 ${rowNum}: 역할은 admin 또는 user여야 합니다.`)
    }

    if (!item.password) {
      errors.push(`행 ${rowNum}: 비밀번호가 입력되지 않았습니다.`)
    } else if (item.password.length < 6) {
      errors.push(`행 ${rowNum}: 비밀번호는 최소 6자 이상이어야 합니다.`)
    }
  })

  // 파일 내 중복 검사
  const employeeIds = data.map((d) => d.employeeId).filter(Boolean)
  const dupEmpIds = employeeIds.filter((id, i) => employeeIds.indexOf(id) !== i)
  if (dupEmpIds.length > 0) {
    errors.push(`파일 내 중복 사번: ${Array.from(new Set(dupEmpIds)).join(', ')}`)
  }

  const emails = data.map((d) => d.email).filter(Boolean)
  const dupEmails = emails.filter((e, i) => emails.indexOf(e) !== i)
  if (dupEmails.length > 0) {
    errors.push(`파일 내 중복 이메일: ${Array.from(new Set(dupEmails)).join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
