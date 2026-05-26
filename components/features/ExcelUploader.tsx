'use client'

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FolderOpen, Upload, Download, FileText, AlertTriangle, CheckCircle2, XCircle, RotateCcw, Sparkles, Info } from 'lucide-react'
import ExcelJS from 'exceljs'
import { CAMSheet, EndmillInfo, useCAMSheets } from '../../lib/hooks/useCAMSheets'
import { downloadExcelTemplate, validateExcelData } from '../../lib/utils/excelTemplate'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import { clientLogger } from '@/lib/utils/logger'

interface ExcelUploaderProps {
  onDataParsed: (camSheets: Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>[]) => void
  onClose: () => void
}

interface ExcelRow {
  Model?: string
  Process?: string
  'CAM Version'?: string
  'T Number'?: number
  'Endmill Code'?: string
  'Category'?: string
  'Endmill Name'?: string
  'Tool Life'?: number
}

export default function ExcelUploader({ onDataParsed, onClose }: ExcelUploaderProps) {
  const { t } = useTranslation()
  const { camSheets } = useCAMSheets() // 기존 CAM Sheet 데이터 가져오기
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [parsedCAMSheets, setParsedCAMSheets] = useState<Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>[]>([])
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null)
  const [duplicateInfo, setDuplicateInfo] = useState<{ duplicates: string[]; newSheets: any[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useDraggableModal()

  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert(t('camSheets.excelFileOnly'))
      return
    }

    setIsProcessing(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        throw new Error('워크시트를 찾을 수 없습니다.')
      }

      // JSON 데이터로 변환
      const jsonData: ExcelRow[] = []
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

      setPreviewData(jsonData.slice(0, 10)) // 처음 10개 행만 미리보기

      // 검증 옵션 가져오기
      const validationOptionsResponse = await fetch('/api/settings/validation')
      let validationOptions: { validProcesses?: string[], validModels?: string[] } = {}
      let currentModels: string[] = []

      if (validationOptionsResponse.ok) {
        const validationData = await validationOptionsResponse.json()
        if (validationData.success) {
          validationOptions = {
            validProcesses: validationData.data.processes,
            validModels: validationData.data.models
          }
          currentModels = validationData.data.models || []
        }
      }

      // 엑셀 파일에서 모든 모델 추출
      const excelModels = new Set<string>()
      jsonData.forEach(row => {
        if (row.Model && typeof row.Model === 'string' && row.Model.trim()) {
          excelModels.add(row.Model.trim())
        }
      })

      // 새로운 모델 찾기
      const newModels = Array.from(excelModels).filter(model => !currentModels.includes(model))

      // 새로운 모델이 있으면 자동으로 설정에 추가
      if (newModels.length > 0) {
        clientLogger.log('신규 모델 발견:', newModels)

        try {
          const updatedModels = [...currentModels, ...newModels]
          const updateResponse = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              category: 'equipment',
              updates: {
                models: updatedModels
              },
              reason: `CAM Sheet 일괄 등록 시 신규 모델 자동 추가: ${newModels.join(', ')}`
            })
          })

          if (updateResponse.ok) {
            clientLogger.log('신규 모델이 설정에 추가되었습니다:', newModels)

            // 업데이트된 모델 목록으로 검증 옵션 갱신
            validationOptions.validModels = updatedModels

            // 사용자에게 알림
            alert(`✨ 신규 모델이 자동으로 등록되었습니다:\n${newModels.join(', ')}\n\n이제 이 모델들을 사용할 수 있습니다.`)
          } else {
            clientLogger.error('신규 모델 추가 실패:', await updateResponse.text())
          }
        } catch (error) {
          clientLogger.error('신규 모델 추가 중 오류:', error)
        }
      }

      // 데이터 검증 (동적)
      const validation = await validateExcelData(jsonData, validationOptions)
      setValidationResult(validation)

      // 검증이 통과한 경우에만 데이터 변환 및 중복 체크
      if (validation.isValid) {
        const convertedData = convertExcelToCAMSheets(jsonData)

        // 중복 체크 수행
        const duplicateCheck = checkForDuplicates(convertedData)
        setDuplicateInfo(duplicateCheck)

        // 중복되지 않은 새로운 CAM Sheet만 설정
        setParsedCAMSheets(duplicateCheck.newSheets)
      } else {
        setParsedCAMSheets([])
        setDuplicateInfo(null)
      }

    } catch (error) {
      clientLogger.error('파일 처리 중 오류:', error)
      alert(t('camSheets.fileProcessError'))
    }

    setIsProcessing(false)
  }

  // 중복 CAM Sheet 체크 함수
  const checkForDuplicates = (newData: any[]) => {
    const duplicates: string[] = []
    const newSheets: any[] = []

    newData.forEach(sheet => {
      const key = `${sheet.model}-${sheet.process}-${sheet.cam_version}`
      const isDuplicate = camSheets.some(existing =>
        existing.model === sheet.model &&
        existing.process === sheet.process &&
        existing.cam_version === sheet.cam_version
      )

      if (isDuplicate) {
        duplicates.push(key)
      } else {
        newSheets.push(sheet)
      }
    })

    return { duplicates, newSheets }
  }

  const convertExcelToCAMSheets = (data: ExcelRow[]): Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>[] => {
    const camSheetMap = new Map<string, {
      model: string
      process: string
      camVersion: string
      endmills: EndmillInfo[]
    }>()

    data.forEach(row => {
      if (!row.Model || !row.Process || !row['CAM Version']) return

      const key = `${row.Model}-${row.Process}-${row['CAM Version']}`

      if (!camSheetMap.has(key)) {
        camSheetMap.set(key, {
          model: row.Model,
          process: row.Process,
          camVersion: row['CAM Version'],
          endmills: []
        })
      }

      if (row['T Number'] && row['Endmill Code'] && row['Category'] && row['Endmill Name']) {
        const endmill: EndmillInfo = {
          t_number: Number(row['T Number']),
          endmill_code: row['Endmill Code'],
          endmill_name: row['Endmill Name'],
          specifications: row['Category'] || '',
          tool_life: Number(row['Tool Life']) || 2000
        }

        camSheetMap.get(key)!.endmills.push(endmill)
      }
    })

    return Array.from(camSheetMap.values()).map(sheet => ({
      model: sheet.model,
      process: sheet.process,
      cam_version: sheet.camVersion,
      version_date: new Date().toISOString().split('T')[0],
      created_by: null,
      cam_sheet_endmills: sheet.endmills.map((endmill: EndmillInfo) => ({
        id: Date.now().toString() + Math.random(),
        cam_sheet_id: '', // 나중에 서버에서 설정
        t_number: endmill.t_number,
        endmill_code: endmill.endmill_code,
        endmill_name: endmill.endmill_name,
        endmill_type_id: null,
        specifications: endmill.specifications,
        tool_life: endmill.tool_life,
        created_at: new Date().toISOString()
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleImport = () => {
    if (parsedCAMSheets.length > 0) {
      onDataParsed(parsedCAMSheets)
      onClose()
    }
  }

  return (
    <div className="mobile-modal-container" onClick={onClose}>
      <div ref={dragRef} className="mobile-modal-content md:max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-modal-header">
          <h3 className="text-title font-medium text-ink inline-flex items-center gap-2">
            <FolderOpen className="w-5 h-5" aria-hidden="true" />
            {t('camSheets.excelBulkUploadTitle')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-ink-mute hover:text-ink-soft hover:bg-paper-warm rounded-full"
            aria-label="닫기"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-modal-body">
          {/* 파일 업로드 영역 */}
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
              isDragOver
                ? 'border-gauge-cobalt bg-gauge-cobalt-soft'
                : 'border-divider hover:border-ink-mute'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            <div className="mb-4">
              <Upload className="mx-auto h-12 w-12 text-ink-mute" aria-hidden="true" />
            </div>

            <div className="mb-4">
              <p className="text-title font-medium text-ink">
                {t('camSheets.dragDropUpload')}
              </p>
              <p className="text-label text-ink-mute mt-2">
                {t('camSheets.fileSupport')}
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gauge-cobalt text-paper rounded-md hover:bg-gauge-cobalt-strong min-h-touch"
              disabled={isProcessing}
            >
              {isProcessing ? t('camSheets.processing') : t('camSheets.selectFile')}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* 예상 데이터 형식 가이드 */}
          <div className="mt-6 p-4 bg-gauge-cobalt-soft rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gauge-cobalt-strong inline-flex items-center gap-2">
                <FileText className="w-4 h-4" aria-hidden="true" />
                {t('camSheets.expectedDataFormat')}
              </h4>
              <button
                onClick={downloadExcelTemplate}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gauge-cobalt text-paper text-label rounded-md hover:bg-gauge-cobalt-strong"
              >
                <Download className="w-3 h-3" aria-hidden="true" />
                {t('camSheets.downloadTemplate')}
              </button>
            </div>
            <div className="text-label text-gauge-cobalt-strong">
              <p className="mb-2">{t('camSheets.excelColumnsInfo')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">Model</code> - {t('camSheets.modelName')}</div>
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">Process</code> - {t('camSheets.processName')}</div>
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">CAM Version</code> - {t('camSheets.camVersionName')}</div>
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">T Number</code> - {t('camSheets.tNumberName')}</div>
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">Endmill Code</code> - {t('camSheets.endmillCodeName')}</div>
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">Category</code> - {t('camSheets.endmillTypeName')}</div>
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">Endmill Name</code> - {t('camSheets.specificationsName')}</div>
                <div><code className="bg-gauge-cobalt/20 px-1 rounded-sm">Tool Life</code> - {t('camSheets.toolLifeName')}</div>
              </div>
            </div>
          </div>

          {/* 검증 결과 */}
          {validationResult && (
            <div className="mt-6">
              {validationResult.errors.length > 0 && (
                <div className="p-4 bg-signal-stop-soft border border-divider rounded-md mb-4">
                  <h4 className="font-medium text-signal-stop-strong mb-2 inline-flex items-center gap-2">
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    {t('camSheets.errors')} ({validationResult.errors.length}{t('camSheets.items')})
                  </h4>
                  <ul className="text-label text-signal-stop-strong space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-4 bg-signal-watch-soft border border-divider rounded-md mb-4">
                  <h4 className="font-medium text-signal-watch-strong mb-2 inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    {t('camSheets.warnings')} ({validationResult.warnings.length}{t('camSheets.items')})
                  </h4>
                  <ul className="text-label text-signal-watch-strong space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.isValid && (
                <div className="p-4 bg-signal-go-soft border border-divider rounded-md mb-4">
                  <h4 className="font-medium text-signal-go-strong inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    {t('camSheets.validationPassed')}
                  </h4>
                  <p className="text-label text-signal-go-strong">{t('camSheets.validationPassedMessage')}</p>
                </div>
              )}
            </div>
          )}

          {/* 중복 확인 결과 */}
          {duplicateInfo && (
            <div className="mt-6">
              {duplicateInfo.duplicates.length > 0 && (
                <div className="p-4 bg-signal-watch-soft border border-divider rounded-md mb-4">
                  <h4 className="font-medium text-signal-watch-strong mb-2 inline-flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    {t('camSheets.duplicateFound')} ({duplicateInfo.duplicates.length}{t('camSheets.items')})
                  </h4>
                  <p className="text-label text-signal-watch-strong mb-2">
                    {t('camSheets.duplicateExcluded')}
                  </p>
                  <ul className="text-label text-signal-watch-strong space-y-1">
                    {duplicateInfo.duplicates.map((duplicate, index) => (
                      <li key={index}>• {duplicate}</li>
                    ))}
                  </ul>
                </div>
              )}

              {duplicateInfo.newSheets.length > 0 && (
                <div className="p-4 bg-gauge-cobalt-soft border border-divider rounded-md mb-4">
                  <h4 className="font-medium text-gauge-cobalt-strong inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    {t('camSheets.newSheetsToRegister')} ({duplicateInfo.newSheets.length}{t('camSheets.items')})
                  </h4>
                  <p className="text-label text-gauge-cobalt-strong">
                    {t('camSheets.existingDataKept')}
                  </p>
                </div>
              )}

              {duplicateInfo.newSheets.length === 0 && duplicateInfo.duplicates.length > 0 && (
                <div className="p-4 bg-paper-warm border border-divider rounded-md mb-4">
                  <h4 className="font-medium text-ink inline-flex items-center gap-2">
                    <Info className="w-4 h-4" aria-hidden="true" />
                    {t('camSheets.noNewSheets')}
                  </h4>
                  <p className="text-label text-ink-soft">
                    {t('camSheets.allDuplicates')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 미리보기 데이터 */}
          {previewData.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-ink mb-3">{t('camSheets.dataPreview')}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-divider border border-divider rounded-md">
                  <thead className="bg-paper-warm">
                    <tr>
                      {Object.keys(previewData[0] || {}).map(key => (
                        <th key={key} className="px-4 py-2 text-left text-caption font-medium text-ink-soft uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-paper divide-y divide-divider">
                    {previewData.map((row, index) => (
                      <tr key={index} className="hover:bg-paper-warm">
                        {Object.values(row).map((value: any, colIndex) => (
                          <td key={colIndex} className="px-4 py-2 text-label text-ink whitespace-nowrap">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 변환된 CAM Sheet 미리보기 */}
          {parsedCAMSheets.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-ink mb-3">
                {t('camSheets.convertedSheets')} ({parsedCAMSheets.length}{t('camSheets.items')})
              </h4>
              <div className="space-y-4">
                {parsedCAMSheets.map((sheet, index) => (
                  <div key={index} className="border border-divider rounded-md p-4 bg-paper">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-medium text-ink">
                          {sheet.model} - {sheet.process} ({sheet.cam_version})
                        </h5>
                        <p className="text-label text-ink-mute">
                          {sheet.cam_sheet_endmills?.length || 0}{t('camSheets.endmillsRegistered')}
                        </p>
                      </div>
                    </div>
                    <div className="text-label text-ink-soft">
                      {t('camSheets.tNumberName')}: {sheet.cam_sheet_endmills?.map((e: any) => `T${e.t_number.toString().padStart(2, '0')}`).join(', ') || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* 액션 버튼 */}
        <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-paper-warm text-ink border border-divider rounded-md hover:bg-paper min-h-touch"
          >
            {t('camSheets.cancel')}
          </button>
          {parsedCAMSheets.length > 0 && (
            <button
              onClick={handleImport}
              className="w-full sm:w-auto px-4 py-2 bg-signal-go-strong text-paper rounded-md hover:opacity-90 min-h-touch"
            >
              {parsedCAMSheets.length}{t('camSheets.registerNewSheets')}
              {duplicateInfo?.duplicates && duplicateInfo.duplicates.length > 0 &&
                ` (${duplicateInfo.duplicates.length}${t('camSheets.duplicatesExcluded')})`
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 