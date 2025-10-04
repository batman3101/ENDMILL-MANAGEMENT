'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { validateEndmillExcelData, convertToEndmillDBFormat } from '../../lib/utils/endmillExcelTemplate'
import { useToast } from '../shared/Toast'

interface EndmillExcelUploaderProps {
  onUploadSuccess?: (data: any[]) => void
  onClose: () => void
}

export default function EndmillExcelUploader({ onUploadSuccess, onClose }: EndmillExcelUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccess, showError, showWarning } = useToast()

  // DB에서 동적으로 가져올 매핑 데이터
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [supplierMap, setSupplierMap] = useState<Record<string, string>>({})

  // 컴포넌트 마운트 시 매핑 데이터 로드
  useEffect(() => {
    loadMappingData()
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
      console.error('매핑 데이터 로드 실패:', error)
      showError('데이터 로드 실패', '카테고리 및 공급업체 정보를 불러오는데 실패했습니다.')
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
      reader.onerror = () => reject(new Error('파일 읽기 실패'))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleValidate = async () => {
    if (!file) {
      showError('파일 선택', '먼저 엑셀 파일을 선택해주세요.')
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
        showSuccess('유효성 검사 완료', `${validation.validData.length}개의 유효한 엔드밀 데이터를 확인했습니다.`)
      } else {
        showError('유효성 검사 실패', `${validation.errors.length}개의 오류가 발견되었습니다.`)
      }

      if (validation.warnings.length > 0) {
        showWarning('주의사항', `${validation.warnings.length}개의 경고가 있습니다.`)
      }
    } catch (error) {
      console.error('파일 처리 오류:', error)
      showError('파일 처리 실패', '엑셀 파일을 처리하는 중 오류가 발생했습니다.')
      setValidationResult(null)
    } finally {
      setLoading(false)
    }
  }

  // 중복 검사 함수 제거 - 같은 엔드밀이 여러 모델/공정에서 사용되는 것은 정상

  const handleUpload = async () => {
    if (!validationResult?.isValid || parsedData.length === 0) {
      showError('업로드 실패', '먼저 유효성 검사를 통과해야 합니다.')
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
        throw new Error('엔드밀 등록 실패')
      }

      const result = await response.json()

      if (result.success) {
        showSuccess('업로드 완료', `${result.count}개의 엔드밀이 성공적으로 등록되었습니다.`)
        onUploadSuccess?.(result.data)
        onClose()
      } else {
        throw new Error(result.error || '알 수 없는 오류')
      }
    } catch (error) {
      console.error('업로드 오류:', error)
      showError('업로드 실패', '엔드밀 등록 중 오류가 발생했습니다.')
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
          <h3 className="text-lg font-medium">엔드밀 일괄 등록</h3>
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
              엑셀 파일 선택
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
                선택된 파일: {file.name}
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
              {loading ? '검사 중...' : '유효성 검사'}
            </button>

            {validationResult?.isValid && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '업로드 중...' : '엔드밀 등록'}
              </button>
            )}

            <button
              onClick={resetForm}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              초기화
            </button>
          </div>

          {/* 유효성 검사 결과 */}
          {validationResult && (
            <div className="mt-6">
              <h4 className="text-md font-medium mb-3">유효성 검사 결과</h4>

              {/* 성공 메시지 */}
              {validationResult.isValid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800">
                    ✅ {validationResult.validData.length}개의 엔드밀 데이터가 유효합니다.
                  </p>
                </div>
              )}

              {/* 오류 메시지 */}
              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h5 className="text-red-800 font-medium mb-2">오류 ({validationResult.errors.length}개)</h5>
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
                  <h5 className="text-yellow-800 font-medium mb-2">경고 ({validationResult.warnings.length}개)</h5>
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
                    유효한 데이터 미리보기 (최대 5개)
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">코드</th>
                          <th className="text-left py-2">카테고리</th>
                          <th className="text-left py-2">이름</th>
                          <th className="text-left py-2">모델</th>
                          <th className="text-left py-2">프로세스</th>
                          <th className="text-left py-2">단가</th>
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
                        ... 외 {validationResult.validData.length - 5}개 더
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