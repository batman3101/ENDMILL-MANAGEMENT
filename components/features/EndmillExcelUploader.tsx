'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import ExcelJS from 'exceljs'
import { validateEndmillExcelData, convertToEndmillDBFormat } from '../../lib/utils/endmillExcelTemplate'
import { useToast } from '../shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

interface EndmillExcelUploaderProps {
  onUploadSuccess?: (data: any[]) => void
  onClose: () => void
}

export default function EndmillExcelUploader({ onUploadSuccess, onClose }: EndmillExcelUploaderProps) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccess, showError, showWarning } = useToast()

  // DB에서 동적으로 가져올 매핑 데이터
  const [, setCategoryMap] = useState<Record<string, string>>({})
  const [, setSupplierMap] = useState<Record<string, string>>({})

  // 컴포넌트 마운트 시 매핑 데이터 로드
  useEffect(() => {
    loadMappingData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMappingData = async () => {
    try {
      // 카테고리 매핑 로드
      const categoryResponse = await fetch('/api/endmill/categories')
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json()
        if (categoryData.success) {
          const catMap: Record<string, string> = {}
          categoryData.data.forEach((cat: any) => {
            catMap[cat.code] = cat.id
          })
          setCategoryMap(catMap)
        }
      }

      // 공급업체 매핑 로드
      const supplierResponse = await fetch('/api/suppliers')
      if (supplierResponse.ok) {
        const supplierData = await supplierResponse.json()
        if (supplierData.success) {
          const supMap: Record<string, string> = {}
          supplierData.data.forEach((sup: any) => {
            supMap[sup.code] = sup.id
          })
          setSupplierMap(supMap)
        }
      }
    } catch (error) {
      clientLogger.error('매핑 데이터 로드 실패:', error)
      showError(t('endmill.dataLoadFailed'), t('endmill.mappingDataLoadError'))
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setValidationResult(null)
      setParsedData([])
    }
  }

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer
          const workbook = new ExcelJS.Workbook()
          await workbook.xlsx.load(data)

          const worksheet = workbook.worksheets[0]
          if (!worksheet) {
            throw new Error('워크시트를 찾을 수 없습니다.')
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

          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error(t('endmill.fileReadError')))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleValidate = async () => {
    if (!file) {
      showError(t('endmill.fileSelectError'), t('endmill.selectFileFirst'))
      return
    }

    setLoading(true)
    try {
      const rawData = await parseExcelFile(file)
      const validation = await validateEndmillExcelData(rawData)
      setValidationResult(validation)

      if (validation.isValid) {
        const dbFormatData = convertToEndmillDBFormat(validation.validData)
        setParsedData(dbFormatData)
        showSuccess(t('endmill.validationComplete'), `${validation.validData.length}${t('endmill.validDataConfirmed')}`)
      } else {
        showError(t('endmill.validationFailed'), `${validation.errors.length}${t('endmill.errorsFound')}`)
      }

      if (validation.warnings.length > 0) {
        showWarning(t('endmill.warningsTitle'), `${validation.warnings.length}${t('endmill.warningsFound')}`)
      }
    } catch (error) {
      clientLogger.error('파일 처리 오류:', error)
      showError(t('endmill.fileProcessError'), t('endmill.excelProcessError'))
      setValidationResult(null)
    } finally {
      setLoading(false)
    }
  }

  // 중복 검사 함수 제거 - 같은 엔드밀이 여러 모델/공정에서 사용되는 것은 정상

  const handleUpload = async () => {
    if (!validationResult?.isValid || parsedData.length === 0) {
      showError(t('endmill.uploadFailed'), t('endmill.validationRequiredError'))
      return
    }

    setLoading(true)
    try {
      // 엔드밀 등록 API 호출 - 모든 데이터 업로드 (중복 검사 제거)
      const response = await fetch('/api/endmill/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endmills: parsedData
        }),
      })

      if (!response.ok) {
        throw new Error(t('endmill.uploadFailed'))
      }

      const result = await response.json()

      if (result.success) {
        showSuccess(t('endmill.uploadComplete'), `${result.count}${t('endmill.uploadSuccessMessage')}`)
        onUploadSuccess?.(result.data)
        onClose()
      } else {
        throw new Error(result.error || t('common.unknownError'))
      }
    } catch (error) {
      clientLogger.error('업로드 오류:', error)
      showError(t('endmill.uploadFailed'), t('endmill.uploadError'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setValidationResult(null)
    setParsedData([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="mobile-modal-container" onClick={onClose}>
      <div className="mobile-modal-content md:max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-modal-header">
          <h3 className="text-title font-medium text-ink">{t('endmill.bulkUploadTitle')}</h3>
          <button
            onClick={onClose}
            className="p-2 text-ink-mute hover:text-ink-soft hover:bg-paper-warm rounded-full"
            aria-label="닫기"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-modal-body space-y-6">
          {/* 파일 선택 */}
          <div>
            <label className="block text-label font-medium text-ink mb-2">
              {t('endmill.excelFileSelect')}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-label text-ink-mute file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-label file:font-medium file:bg-gauge-cobalt-soft file:text-gauge-cobalt-strong hover:file:opacity-90"
            />
            {file && (
              <p className="mt-2 text-label text-ink-soft">
                {t('endmill.selectedFile')}: {file.name}
              </p>
            )}
          </div>

          {/* 버튼들 */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleValidate}
              disabled={!file || loading}
              className="px-4 py-2 bg-gauge-cobalt text-paper rounded-md hover:bg-gauge-cobalt-strong disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
            >
              {loading ? t('endmill.validating') : t('endmill.validateButton')}
            </button>

            {validationResult?.isValid && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="px-4 py-2 bg-signal-go-strong text-paper rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
              >
                {loading ? t('endmill.uploading') : t('endmill.uploadButton')}
              </button>
            )}

            <button
              onClick={resetForm}
              disabled={loading}
              className="px-4 py-2 bg-paper-warm text-ink border border-divider rounded-md hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
            >
              {t('endmill.resetButton')}
            </button>
          </div>

          {/* 유효성 검사 결과 */}
          {validationResult && (
            <div className="mt-6">
              <h4 className="text-label font-medium text-ink mb-3">{t('endmill.validationResults')}</h4>

              {/* 성공 메시지 */}
              {validationResult.isValid && (
                <div className="bg-signal-go-soft border border-divider rounded-md p-4 mb-4">
                  <p className="text-signal-go-strong inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    {validationResult.validData.length}{t('endmill.validDataCount')}
                  </p>
                </div>
              )}

              {/* 오류 메시지 */}
              {validationResult.errors.length > 0 && (
                <div className="bg-signal-stop-soft border border-divider rounded-md p-4 mb-4">
                  <h5 className="text-signal-stop-strong font-medium mb-2 inline-flex items-center gap-2">
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    {t('endmill.errorsCount')} ({validationResult.errors.length}{t('endmill.count')})
                  </h5>
                  <ul className="text-signal-stop-strong text-label space-y-1 max-h-40 overflow-y-auto">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 경고 메시지 */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-signal-watch-soft border border-divider rounded-md p-4 mb-4">
                  <h5 className="text-signal-watch-strong font-medium mb-2 inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    {t('endmill.warningsCount')} ({validationResult.warnings.length}{t('endmill.count')})
                  </h5>
                  <ul className="text-signal-watch-strong text-label space-y-1 max-h-40 overflow-y-auto">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 유효한 데이터 미리보기 */}
              {validationResult.validData.length > 0 && (
                <div className="bg-paper-warm border border-divider rounded-md p-4">
                  <h5 className="text-ink font-medium mb-2">
                    {t('endmill.validDataPreview')}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-label">
                      <thead>
                        <tr className="border-b border-divider">
                          <th className="text-left py-2 text-ink-soft">{t('endmill.codeColumn')}</th>
                          <th className="text-left py-2 text-ink-soft">{t('endmill.categoryColumn')}</th>
                          <th className="text-left py-2 text-ink-soft">{t('endmill.nameColumn')}</th>
                          <th className="text-left py-2 text-ink-soft">{t('endmill.modelColumn')}</th>
                          <th className="text-left py-2 text-ink-soft">{t('endmill.processColumn')}</th>
                          <th className="text-left py-2 text-ink-soft">{t('endmill.unitCostColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.validData.slice(0, 5).map((item: any, index: number) => (
                          <tr key={index} className="border-b border-divider">
                            <td className="py-2 text-ink">{item.code}</td>
                            <td className="py-2 text-ink">{item.category}</td>
                            <td className="py-2 text-ink">{item.name}</td>
                            <td className="py-2 text-ink">{item.model}</td>
                            <td className="py-2 text-ink">{item.process}</td>
                            <td className="py-2 text-ink">{item.unit_cost.toLocaleString()} VND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationResult.validData.length > 5 && (
                      <p className="text-ink-mute text-caption mt-2">
                        {t('endmill.moreItems')} {validationResult.validData.length - 5}{t('endmill.moreItemsSuffix')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-paper-warm text-ink border border-divider rounded-md hover:bg-paper min-h-touch"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
