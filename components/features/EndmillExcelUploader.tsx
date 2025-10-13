'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
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
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium">{t('endmill.bulkUploadTitle')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 파일 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('endmill.excelFileSelect')}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                {t('endmill.selectedFile')}: {file.name}
              </p>
            )}
          </div>

          {/* 버튼들 */}
          <div className="flex gap-3">
            <button
              onClick={handleValidate}
              disabled={!file || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('endmill.validating') : t('endmill.validateButton')}
            </button>

            {validationResult?.isValid && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('endmill.uploading') : t('endmill.uploadButton')}
              </button>
            )}

            <button
              onClick={resetForm}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('endmill.resetButton')}
            </button>
          </div>

          {/* 유효성 검사 결과 */}
          {validationResult && (
            <div className="mt-6">
              <h4 className="text-md font-medium mb-3">{t('endmill.validationResults')}</h4>

              {/* 성공 메시지 */}
              {validationResult.isValid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800">
                    ✅ {validationResult.validData.length}{t('endmill.validDataCount')}
                  </p>
                </div>
              )}

              {/* 오류 메시지 */}
              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h5 className="text-red-800 font-medium mb-2">{t('endmill.errorsCount')} ({validationResult.errors.length}{t('endmill.count')})</h5>
                  <ul className="text-red-700 text-sm space-y-1 max-h-40 overflow-y-auto">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 경고 메시지 */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h5 className="text-yellow-800 font-medium mb-2">{t('endmill.warningsCount')} ({validationResult.warnings.length}{t('endmill.count')})</h5>
                  <ul className="text-yellow-700 text-sm space-y-1 max-h-40 overflow-y-auto">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 유효한 데이터 미리보기 */}
              {validationResult.validData.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="text-gray-800 font-medium mb-2">
                    {t('endmill.validDataPreview')}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">{t('endmill.codeColumn')}</th>
                          <th className="text-left py-2">{t('endmill.categoryColumn')}</th>
                          <th className="text-left py-2">{t('endmill.nameColumn')}</th>
                          <th className="text-left py-2">{t('endmill.modelColumn')}</th>
                          <th className="text-left py-2">{t('endmill.processColumn')}</th>
                          <th className="text-left py-2">{t('endmill.unitCostColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.validData.slice(0, 5).map((item: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{item.code}</td>
                            <td className="py-2">{item.category}</td>
                            <td className="py-2">{item.name}</td>
                            <td className="py-2">{item.model}</td>
                            <td className="py-2">{item.process}</td>
                            <td className="py-2">{item.unit_cost.toLocaleString()} VND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationResult.validData.length > 5 && (
                      <p className="text-gray-500 text-xs mt-2">
                        {t('endmill.moreItems')} {validationResult.validData.length - 5}{t('endmill.moreItemsSuffix')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}