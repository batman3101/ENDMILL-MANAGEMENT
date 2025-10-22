/**
 * Export to PDF Utility
 * jsPDF를 사용한 PDF 내보내기
 */

import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export interface InsightData {
  id: string
  title: string
  content: string
  contentType: 'markdown' | 'html'
  createdAt: string
  tags?: string[]
}

/**
 * HTML을 텍스트로 변환 (간단한 변환)
 */
function htmlToText(html: string): string {
  // HTML 태그 제거
  let text = html.replace(/<[^>]*>/g, '')

  // HTML 엔티티 디코딩
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
 * 인사이트를 PDF로 내보내기
 */
export async function exportInsightToPDF(insight: InsightData): Promise<void> {
  try {
    // PDF 생성
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    let yPosition = margin

    // 제목
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    const titleLines = doc.splitTextToSize(insight.title, maxWidth)
    doc.text(titleLines, margin, yPosition)
    yPosition += titleLines.length * 10 + 10

    // 날짜
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const dateText = format(new Date(insight.createdAt), 'PPP', { locale: ko })
    doc.text(dateText, margin, yPosition)
    yPosition += 10

    // 구분선
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    // 내용 (HTML을 텍스트로 변환)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const contentText = htmlToText(insight.content)
    const contentLines = doc.splitTextToSize(contentText, maxWidth)

    // 페이지 넘김 처리
    contentLines.forEach((line: string) => {
      if (yPosition + 10 > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
      doc.text(line, margin, yPosition)
      yPosition += 7
    })

    // 태그 추가
    if (insight.tags && insight.tags.length > 0) {
      yPosition += 10
      if (yPosition + 20 > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.text(`Tags: ${insight.tags.join(', ')}`, margin, yPosition)
    }

    // 페이지 번호 추가
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    // 파일명 생성
    const fileName = `insight_${insight.id.slice(0, 8)}_${format(new Date(), 'yyyyMMdd')}.pdf`

    // PDF 다운로드
    doc.save(fileName)
  } catch (error) {
    console.error('PDF 생성 오류:', error)
    throw new Error('PDF 생성 중 오류가 발생했습니다.')
  }
}

/**
 * 여러 인사이트를 하나의 PDF로 내보내기
 */
export async function exportMultipleInsightsToPDF(
  insights: InsightData[]
): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin

    insights.forEach((insight, index) => {
      if (index > 0) {
        doc.addPage()
      }

      let yPosition = margin

      // 제목
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const titleLines = doc.splitTextToSize(insight.title, maxWidth)
      doc.text(titleLines, margin, yPosition)
      yPosition += titleLines.length * 8 + 8

      // 날짜
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const dateText = format(new Date(insight.createdAt), 'PPP', { locale: ko })
      doc.text(dateText, margin, yPosition)
      yPosition += 8

      // 구분선
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 8

      // 내용
      doc.setFontSize(10)
      const contentText = htmlToText(insight.content)
      const contentLines = doc.splitTextToSize(contentText, maxWidth)

      contentLines.forEach((line: string) => {
        if (yPosition + 8 > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        doc.text(line, margin, yPosition)
        yPosition += 6
      })
    })

    // 페이지 번호 추가
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.text(
        `${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    // 파일명 생성
    const fileName = `insights_collection_${format(new Date(), 'yyyyMMdd')}.pdf`

    // PDF 다운로드
    doc.save(fileName)
  } catch (error) {
    console.error('PDF 생성 오류:', error)
    throw new Error('PDF 생성 중 오류가 발생했습니다.')
  }
}
