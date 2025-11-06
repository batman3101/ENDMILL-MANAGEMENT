/**
 * Export Insight to Excel Utility
 * ExcelJS를 사용한 인사이트 엑셀 내보내기
 */

import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { InsightData } from './exportToPDF'

/**
 * HTML을 텍스트로 변환
 */
function htmlToText(html: string): string {
  let text = html.replace(/<[^>]*>/g, '')
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  return text.trim()
}

/**
 * 워크북을 브라우저에서 다운로드
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * 인사이트를 Excel로 내보내기
 */
export async function exportInsightToExcel(
  insight: InsightData,
  data?: any[]
): Promise<void> {
  try {
    // 워크북 생성
    const workbook = new ExcelJS.Workbook()

    // 워크북 메타데이터 설정
    workbook.creator = 'CNC Endmill Management System'
    workbook.created = new Date()
    workbook.modified = new Date()

    // Sheet 1: 요약 정보
    const summarySheet = workbook.addWorksheet('요약')

    // 열 너비 설정
    summarySheet.columns = [
      { width: 15 },
      { width: 60 }
    ]

    // 데이터 추가
    summarySheet.addRow(['인사이트 제목', insight.title])
    summarySheet.addRow(['작성일', format(new Date(insight.createdAt), 'PPP', { locale: ko })])
    summarySheet.addRow(['태그', insight.tags?.join(', ') || '없음'])
    summarySheet.addRow([])
    summarySheet.addRow(['내용'])
    summarySheet.addRow([htmlToText(insight.content)])

    // 제목 셀 스타일 (첫 번째 열)
    summarySheet.getColumn(1).font = { bold: true }
    summarySheet.getColumn(1).alignment = { vertical: 'top' }

    // 내용 셀 래핑 설정
    summarySheet.getRow(6).alignment = { wrapText: true, vertical: 'top' }

    // Sheet 2: 데이터 테이블 (있는 경우)
    if (data && data.length > 0) {
      const dataSheet = workbook.addWorksheet('데이터')

      // 헤더 추출
      const headers = Object.keys(data[0])

      // 열 정의
      dataSheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 15
      }))

      // 데이터 추가
      dataSheet.addRows(data)

      // 헤더 스타일
      dataSheet.getRow(1).font = { bold: true }
      dataSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' }
      }
      dataSheet.getRow(1).alignment = {
        horizontal: 'center',
        vertical: 'middle'
      }
    }

    // 파일명 생성
    const fileName = `insight_${insight.id.slice(0, 8)}_${format(new Date(), 'yyyyMMdd')}.xlsx`

    // Excel 파일 다운로드
    await downloadWorkbook(workbook, fileName)
  } catch (error) {
    console.error('Excel 생성 오류:', error)
    throw new Error('Excel 생성 중 오류가 발생했습니다.')
  }
}

/**
 * 여러 인사이트를 Excel로 내보내기
 */
export async function exportMultipleInsightsToExcel(
  insights: InsightData[]
): Promise<void> {
  try {
    // 워크북 생성
    const workbook = new ExcelJS.Workbook()

    // 워크북 메타데이터 설정
    workbook.creator = 'CNC Endmill Management System'
    workbook.created = new Date()
    workbook.modified = new Date()

    // 전체 인사이트 목록 시트
    const listSheet = workbook.addWorksheet('인사이트 목록')

    // 열 정의
    listSheet.columns = [
      { header: '번호', key: 'number', width: 5 },
      { header: '제목', key: 'title', width: 30 },
      { header: '작성일', key: 'createdAt', width: 12 },
      { header: '태그', key: 'tags', width: 20 },
      { header: '내용미리보기', key: 'preview', width: 50 }
    ]

    // 데이터 추가
    const listData = insights.map((insight, index) => ({
      number: index + 1,
      title: insight.title,
      createdAt: format(new Date(insight.createdAt), 'yyyy-MM-dd'),
      tags: insight.tags?.join(', ') || '없음',
      preview: htmlToText(insight.content).slice(0, 100) + '...'
    }))

    listSheet.addRows(listData)

    // 헤더 스타일
    listSheet.getRow(1).font = { bold: true }
    listSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    listSheet.getRow(1).alignment = {
      horizontal: 'center',
      vertical: 'middle'
    }

    // 각 인사이트별 상세 시트 (최대 10개까지)
    insights.slice(0, 10).forEach((insight, index) => {
      const sheetName = `인사이트 ${index + 1}`.slice(0, 31) // 시트명 길이 제한
      const detailSheet = workbook.addWorksheet(sheetName)

      // 열 너비 설정
      detailSheet.columns = [
        { width: 15 },
        { width: 60 }
      ]

      // 데이터 추가
      detailSheet.addRow(['제목', insight.title])
      detailSheet.addRow(['작성일', format(new Date(insight.createdAt), 'PPP', { locale: ko })])
      detailSheet.addRow(['태그', insight.tags?.join(', ') || '없음'])
      detailSheet.addRow([])
      detailSheet.addRow(['내용'])
      detailSheet.addRow([htmlToText(insight.content)])

      // 제목 셀 스타일
      detailSheet.getColumn(1).font = { bold: true }
      detailSheet.getColumn(1).alignment = { vertical: 'top' }

      // 내용 셀 래핑
      detailSheet.getRow(6).alignment = { wrapText: true, vertical: 'top' }
    })

    // 파일명 생성
    const fileName = `insights_collection_${format(new Date(), 'yyyyMMdd')}.xlsx`

    // Excel 파일 다운로드
    await downloadWorkbook(workbook, fileName)
  } catch (error) {
    console.error('Excel 생성 오류:', error)
    throw new Error('Excel 생성 중 오류가 발생했습니다.')
  }
}

/**
 * 데이터만 Excel로 내보내기 (간단한 테이블 데이터)
 */
export async function exportDataToExcel(
  data: any[],
  fileName: string = 'data'
): Promise<void> {
  try {
    if (!data || data.length === 0) {
      throw new Error('내보낼 데이터가 없습니다.')
    }

    // 워크북 생성
    const workbook = new ExcelJS.Workbook()

    // 워크북 메타데이터 설정
    workbook.creator = 'CNC Endmill Management System'
    workbook.created = new Date()
    workbook.modified = new Date()

    // 워크시트 생성
    const worksheet = workbook.addWorksheet('Data')

    // 헤더 추출
    const headers = Object.keys(data[0])

    // 열 정의 (자동 너비 조정)
    const maxWidth = 50
    worksheet.columns = headers.map(header => {
      // 헤더와 데이터를 기반으로 최대 길이 계산
      let maxLen = header.length

      data.forEach(row => {
        const value = String(row[header] || '')
        if (value.length > maxLen) {
          maxLen = value.length
        }
      })

      return {
        header,
        key: header,
        width: Math.min(maxLen + 2, maxWidth)
      }
    })

    // 데이터 추가
    worksheet.addRows(data)

    // 헤더 스타일
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    worksheet.getRow(1).alignment = {
      horizontal: 'center',
      vertical: 'middle'
    }

    // 파일명 생성
    const fullFileName = `${fileName}_${format(new Date(), 'yyyyMMdd')}.xlsx`

    // Excel 파일 다운로드
    await downloadWorkbook(workbook, fullFileName)
  } catch (error) {
    console.error('Excel 생성 오류:', error)
    throw new Error('Excel 생성 중 오류가 발생했습니다.')
  }
}
