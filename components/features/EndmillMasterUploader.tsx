'use client'

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FileText, Download, Upload, FolderOpen, BarChart3, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import ExcelJS from 'exceljs'
import { downloadEndmillMasterTemplate, validateEndmillMasterData } from '../../lib/utils/excelTemplate'
import { useToast } from '../shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

interface EndmillMasterData {
  code: string
  name: string
  category: string
  specifications: string
  diameter: number
  flutes: number
  coating: string
  material: string
  tolerance: string
  helix: string
  standardLife: number
  minStock: number
  maxStock: number
  recommendedStock?: number
  qualityGrade?: string
  suppliers: {
    name: string
    unitPrice: number // VND
  }[]
  description?: string
}

interface EndmillMasterUploaderProps {
  onDataParsed: (data: EndmillMasterData[]) => void
  onClose: () => void
}

export default function EndmillMasterUploader({ onDataParsed, onClose }: EndmillMasterUploaderProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const [dragActive, setDragActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showValidation, setShowValidation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showError(t('equipment.fileFormatError'), t('equipment.fileFormatErrorMessage'))
      return
    }

    setProcessing(true)
    setValidationResult(null)
    setShowValidation(false)

    try {
      const data = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(data)

      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        throw new Error(t('endmill.worksheetNotFound'))
      }

      // JSON 데이터로 변환
      const jsonData: any[] = []
      const headers: string[] = []

      // 헤더 읽기
      const headerRow = worksheet.getRow(1)
      headerRow.eachCell((cell) => {
        headers.push(cell.value?.toString() || '')
      })

      // 데이터 읽기
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // 헤더 스킵

        const rowData: any = {}
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1]
          rowData[header] = cell.value
        })

        // 빈 행이 아니면 추가
        if (Object.values(rowData).some(v => v !== null && v !== undefined && v !== '')) {
          jsonData.push(rowData)
        }
      })

      // 데이터 검증
      const validation = await validateEndmillMasterData(jsonData)
      setValidationResult(validation)
      setShowValidation(true)

      if (validation.isValid) {
        showSuccess(t('endmill.dataValidationSuccess'), `${validation.validData.length}${t('endmill.validDataFound')}`)
      } else {
        showError(t('endmill.dataValidationFailed'), `${validation.errors.length}${t('endmill.errorsFound')}`)
      }
    } catch (error) {
      clientLogger.error('Excel parsing error:', error)
      showError(t('endmill.fileProcessingError'), t('endmill.excelReadingError'))
    } finally {
      setProcessing(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const processValidData = () => {
    if (!validationResult || !validationResult.isValid) return

    const processedData: EndmillMasterData[] = validationResult.validData.map((row: any) => {
      // 공급업체 정보 처리
      const suppliers = []
      for (let i = 1; i <= 3; i++) {
        const supplierName = row[`공급업체${i}`]
        const supplierPrice = row[`공급업체${i}단가(VND)`]
        if (supplierName && supplierName.trim() !== '' && supplierPrice && Number(supplierPrice) > 0) {
          suppliers.push({
            name: supplierName.trim(),
            unitPrice: Number(supplierPrice)
          })
        }
      }

      return {
        code: row['앤드밀코드'].toString().trim().toUpperCase(),
        name: row['Type'].toString().trim(),
        category: row['카테고리'].toString().trim(),
        specifications: row['앤드밀이름'].toString().trim(),
        diameter: Number(row['직경(mm)']),
        flutes: Number(row['날수']),
        coating: row['코팅']?.toString().trim() || '',
        material: row['소재']?.toString().trim() || '',
        tolerance: row['공차']?.toString().trim() || '',
        helix: row['나선각']?.toString().trim() || '',
        standardLife: Number(row['표준수명']),
        minStock: Number(row['최소재고']),
        maxStock: Number(row['최대재고']),
        recommendedStock: row['권장재고'] ? Number(row['권장재고']) : undefined,
        qualityGrade: row['품질등급']?.toString().trim() || undefined,
        suppliers,
        description: row['설명']?.toString().trim() || undefined
      }
    })

    onDataParsed(processedData)
  }

  return (
    <div className="mobile-modal-container" onClick={onClose}>
      <div className="mobile-modal-content md:max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-modal-header">
          <h3 className="text-title font-medium text-ink">{t('endmill.bulkUpdateTitle')}</h3>
          <button
            onClick={onClose}
            className="p-2 text-ink-mute hover:text-ink-soft hover:bg-paper-warm rounded-full"
            aria-label="닫기"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-modal-body">
          {/* 템플릿 다운로드 섹션 */}
          <div className="mb-6 p-4 bg-gauge-cobalt-soft rounded-md border border-divider">
            <h4 className="font-medium text-gauge-cobalt-strong mb-2 inline-flex items-center gap-2">
              <FileText className="w-4 h-4" aria-hidden="true" />
              {t('endmill.step1Title')}
            </h4>
            <p className="text-label text-gauge-cobalt-strong mb-3">
              {t('endmill.step1Description')}
            </p>
            <button
              onClick={downloadEndmillMasterTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gauge-cobalt text-paper rounded-md hover:bg-gauge-cobalt-strong min-h-touch"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {t('endmill.templateDownload')}
            </button>
          </div>

          {/* 파일 업로드 섹션 */}
          <div className="mb-6">
            <h4 className="font-medium text-ink mb-3 inline-flex items-center gap-2">
              <Upload className="w-4 h-4" aria-hidden="true" />
              {t('endmill.step2Title')}
            </h4>
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                dragActive
                  ? 'border-gauge-cobalt bg-gauge-cobalt-soft'
                  : 'border-divider hover:border-ink-mute'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {processing ? (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-gauge-cobalt border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-ink-soft">{t('endmill.processingFile')}</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-paper-warm rounded-md flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-ink-mute" aria-hidden="true" />
                  </div>
                  <p className="text-title font-medium text-ink mb-2">
                    {t('endmill.dragDropText')}
                  </p>
                  <p className="text-label text-ink-soft mb-4">
                    {t('endmill.supportedFormats')}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-paper-warm text-ink border border-divider rounded-md hover:bg-paper min-h-touch"
                  >
                    <FolderOpen className="w-4 h-4" aria-hidden="true" />
                    {t('endmill.fileSelect')}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 검증 결과 섹션 */}
          {showValidation && validationResult && (
            <div className="mb-6">
              <h4 className="font-medium text-ink mb-3">{t('endmill.step3Title')}</h4>

              {/* 오류 표시 */}
              {validationResult.errors.length > 0 && (
                <div className="mb-4 p-4 bg-signal-stop-soft rounded-md border border-divider">
                  <h5 className="font-medium text-signal-stop-strong mb-2 inline-flex items-center gap-2">
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    {t('endmill.errorLabel')} ({validationResult.errors.length}개)
                  </h5>
                  <ul className="list-disc list-inside text-label text-signal-stop-strong space-y-1">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 경고 표시 */}
              {validationResult.warnings.length > 0 && (
                <div className="mb-4 p-4 bg-signal-watch-soft rounded-md border border-divider">
                  <h5 className="font-medium text-signal-watch-strong mb-2 inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    {t('endmill.warningLabel')} ({validationResult.warnings.length}개)
                  </h5>
                  <ul className="list-disc list-inside text-label text-signal-watch-strong space-y-1">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 성공 표시 */}
              {validationResult.isValid && (
                <div className="mb-4 p-4 bg-signal-go-soft rounded-md border border-divider">
                  <h5 className="font-medium text-signal-go-strong mb-2 inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    {t('endmill.validationSuccessTitle')}
                  </h5>
                  <p className="text-label text-signal-go-strong">
                    {validationResult.validData.length}{t('endmill.validationSuccessMessage')}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 액션 버튼 */}
        <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-paper-warm text-ink border border-divider rounded-md hover:bg-paper min-h-touch"
          >
            {t('common.cancel')}
          </button>

          {validationResult && validationResult.isValid && (
            <button
              onClick={processValidData}
              className="w-full sm:w-auto px-4 py-2 bg-signal-go-strong text-paper rounded-md hover:opacity-90 inline-flex items-center justify-center gap-2 min-h-touch"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              {t('endmill.proceedWithUpdate')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
