'use client'

/**
 * ExportMenu Component
 * PDF/Excel 내보내기 메뉴
 */

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, FileText, Table2, AlertCircle, Loader2 } from 'lucide-react'
import { exportInsightToPDF, InsightData } from '@/lib/utils/exportToPDF'
import { exportInsightToExcel } from '@/lib/utils/exportInsightToExcel'

interface ExportMenuProps {
  insight: InsightData
  data?: any[]
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ExportMenu({
  insight,
  data,
  variant = 'outline',
  size = 'default',
  className,
}: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // PDF 내보내기
  const handleExportPDF = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      await exportInsightToPDF(insight)
    } catch (error: any) {
      console.error('PDF 내보내기 오류:', error)
      setExportError(error.message || 'PDF 생성 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  // Excel 내보내기
  const handleExportExcel = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      await exportInsightToExcel(insight, data)
    } catch (error: any) {
      console.error('Excel 내보내기 오류:', error)
      setExportError(error.message || 'Excel 생성 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                내보내는 중...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                내보내기
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>파일 형식 선택</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
            <FileText className="h-4 w-4 mr-2" />
            PDF로 내보내기
            <span className="ml-auto text-xs text-muted-foreground">.pdf</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
            <Table2 className="h-4 w-4 mr-2" />
            Excel로 내보내기
            <span className="ml-auto text-xs text-muted-foreground">
              .xlsx
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 에러 메시지 */}
      {exportError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
