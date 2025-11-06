import ExcelJS from 'exceljs'

interface OutboundItem {
  id: string
  endmillCode: string
  endmillName: string
  equipmentNumber: string
  tNumber: number
  quantity: number
  unitPrice: number
  totalValue: number
  processedAt: string
  processedBy: string
  purpose: string
}

/**
 * 출고 내역을 Excel 파일로 다운로드
 */
export const downloadOutboundHistoryExcel = async (
  data: OutboundItem[],
  periodLabel: string = '전체'
) => {
  if (!data || data.length === 0) {
    throw new Error('다운로드할 데이터가 없습니다')
  }

  // 워크북 생성
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('출고 내역')

  // 헤더 정의
  const columns = [
    { header: '처리시간', key: 'processedAt', width: 20 },
    { header: '앤드밀 코드', key: 'endmillCode', width: 20 },
    { header: '앤드밀 이름', key: 'endmillName', width: 40 },
    { header: '설비번호', key: 'equipmentNumber', width: 12 },
    { header: 'T번호', key: 'tNumber', width: 10 },
    { header: '수량', key: 'quantity', width: 10 },
    { header: '교체 사유', key: 'purpose', width: 15 },
    { header: '단가 (VND)', key: 'unitPrice', width: 15 },
    { header: '총 가치 (VND)', key: 'totalValue', width: 18 },
    { header: '처리자', key: 'processedBy', width: 15 }
  ]

  worksheet.columns = columns

  // 헤더 스타일 적용
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' } // 녹색
  }
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(1).height = 25

  // 데이터 추가
  data.forEach((item) => {
    worksheet.addRow({
      processedAt: item.processedAt,
      endmillCode: item.endmillCode,
      endmillName: item.endmillName,
      equipmentNumber: item.equipmentNumber,
      tNumber: item.tNumber ? `T${item.tNumber.toString().padStart(2, '0')}` : '',
      quantity: item.quantity,
      purpose: item.purpose,
      unitPrice: item.unitPrice,
      totalValue: item.totalValue,
      processedBy: item.processedBy
    })
  })

  // 데이터 행 스타일
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      // 헤더가 아닌 행들
      row.alignment = { vertical: 'middle' }
      row.eachCell((cell, colNumber) => {
        // 테두리 추가
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        }

        // 숫자 필드 포맷
        if (colNumber === 6) {
          // 수량
          cell.numFmt = '#,##0'
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
        } else if (colNumber === 8 || colNumber === 9) {
          // 단가, 총 가치
          cell.numFmt = '#,##0'
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
        }
      })

      // 교대로 행 배경색 적용 (줄무늬 효과)
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        }
      }
    }
  })

  // 합계 행 추가
  const totalRow = worksheet.addRow({
    processedAt: '',
    endmillCode: '',
    endmillName: '',
    equipmentNumber: '',
    tNumber: '합계',
    quantity: data.reduce((sum, item) => sum + item.quantity, 0),
    purpose: '',
    unitPrice: '',
    totalValue: data.reduce((sum, item) => sum + item.totalValue, 0),
    processedBy: ''
  })

  // 합계 행 스타일
  totalRow.font = { bold: true }
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' } // 주황색
  }
  totalRow.alignment = { horizontal: 'right', vertical: 'middle' }
  totalRow.getCell(6).numFmt = '#,##0'
  totalRow.getCell(9).numFmt = '#,##0'

  // 헤더에도 테두리 추가
  worksheet.getRow(1).eachCell((cell) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    }
  })

  // 파일명 생성 (현재 날짜 및 기간 포함)
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const filename = `출고내역_${periodLabel}_${dateStr}.xlsx`

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)

  return filename
}
