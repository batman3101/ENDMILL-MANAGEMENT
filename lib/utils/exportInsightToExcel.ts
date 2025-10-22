/**
 * Export Insight to Excel Utility
 * XLSX를 사용한 인사이트 엑셀 내보내기
 */

import * as XLSX from 'xlsx'
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
 * 인사이트를 Excel로 내보내기
 */
export async function exportInsightToExcel(
  insight: InsightData,
  data?: any[]
): Promise<void> {
  try {
    // 워크북 생성
    const workbook = XLSX.utils.book_new()

    // Sheet 1: 요약 정보
    const summaryData = [
      ['인사이트 제목', insight.title],
      ['작성일', format(new Date(insight.createdAt), 'PPP', { locale: ko })],
      ['태그', insight.tags?.join(', ') || '없음'],
      [''],
      ['내용'],
      [htmlToText(insight.content)],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

    // 열 너비 설정
    summarySheet['!cols'] = [
      { wch: 15 }, // 첫 번째 열
      { wch: 60 }, // 두 번째 열
    ]

    // 제목 셀 스타일 (굵게)
    const titleCell = summarySheet['A1']
    if (titleCell) {
      titleCell.s = {
        font: { bold: true },
      }
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, '요약')

    // Sheet 2: 데이터 테이블 (있는 경우)
    if (data && data.length > 0) {
      const dataSheet = XLSX.utils.json_to_sheet(data)

      // 헤더 스타일
      const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1')
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1'
        if (!dataSheet[address]) continue
        dataSheet[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'CCCCCC' } },
        }
      }

      XLSX.utils.book_append_sheet(workbook, dataSheet, '데이터')
    }

    // 파일명 생성
    const fileName = `insight_${insight.id.slice(0, 8)}_${format(new Date(), 'yyyyMMdd')}.xlsx`

    // Excel 파일 다운로드
    XLSX.writeFile(workbook, fileName)
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
    const workbook = XLSX.utils.book_new()

    // 전체 인사이트 목록 시트
    const listData = insights.map((insight, index) => ({
      번호: index + 1,
      제목: insight.title,
      작성일: format(new Date(insight.createdAt), 'yyyy-MM-dd'),
      태그: insight.tags?.join(', ') || '없음',
      내용미리보기: htmlToText(insight.content).slice(0, 100) + '...',
    }))

    const listSheet = XLSX.utils.json_to_sheet(listData)

    // 열 너비 설정
    listSheet['!cols'] = [
      { wch: 5 },  // 번호
      { wch: 30 }, // 제목
      { wch: 12 }, // 작성일
      { wch: 20 }, // 태그
      { wch: 50 }, // 내용미리보기
    ]

    XLSX.utils.book_append_sheet(workbook, listSheet, '인사이트 목록')

    // 각 인사이트별 상세 시트 (최대 10개까지)
    insights.slice(0, 10).forEach((insight, index) => {
      const detailData = [
        ['제목', insight.title],
        ['작성일', format(new Date(insight.createdAt), 'PPP', { locale: ko })],
        ['태그', insight.tags?.join(', ') || '없음'],
        [''],
        ['내용'],
        [htmlToText(insight.content)],
      ]

      const detailSheet = XLSX.utils.aoa_to_sheet(detailData)

      detailSheet['!cols'] = [
        { wch: 15 },
        { wch: 60 },
      ]

      const sheetName = `인사이트 ${index + 1}`.slice(0, 31) // 시트명 길이 제한
      XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName)
    })

    // 파일명 생성
    const fileName = `insights_collection_${format(new Date(), 'yyyyMMdd')}.xlsx`

    // Excel 파일 다운로드
    XLSX.writeFile(workbook, fileName)
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

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)

    // 자동 열 너비 조정
    const maxWidth = 50
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    const cols: any[] = []

    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })]
        if (cell && cell.v) {
          const len = String(cell.v).length
          if (len > maxLen) maxLen = len
        }
      }
      cols.push({ wch: Math.min(maxLen + 2, maxWidth) })
    }

    worksheet['!cols'] = cols

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

    const fullFileName = `${fileName}_${format(new Date(), 'yyyyMMdd')}.xlsx`
    XLSX.writeFile(workbook, fullFileName)
  } catch (error) {
    console.error('Excel 생성 오류:', error)
    throw new Error('Excel 생성 중 오류가 발생했습니다.')
  }
}
