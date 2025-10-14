'use client'

import { useState, useRef } from 'react'
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
      showError('파일 형식 오류', '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
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

      // 데이터 검증
      const validation = await validateEndmillMasterData(jsonData)
      setValidationResult(validation)
      setShowValidation(true)

      if (validation.isValid) {
        showSuccess('데이터 검증 성공', `${validation.validData.length}개의 유효한 데이터를 발견했습니다.`)
      } else {
        showError('데이터 검증 실패', `${validation.errors.length}개의 오류가 발견되었습니다.`)
      }
    } catch (error) {
      clientLogger.error('Excel parsing error:', error)
      showError('파일 처리 오류', '엑셀 파일을 읽는 중 오류가 발생했습니다.')
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">앤드밀 마스터 데이터 일괄 업데이트</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* 템플릿 다운로드 섹션 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">📋 1단계: 템플릿 다운로드</h4>
            <p className="text-sm text-blue-700 mb-3">
              먼저 앤드밀 마스터 데이터 템플릿을 다운로드하여 데이터를 입력하세요.
            </p>
            <button
              onClick={downloadEndmillMasterTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              📁 템플릿 다운로드
            </button>
          </div>

          {/* 파일 업로드 섹션 */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">📤 2단계: 작성된 엑셀 파일 업로드</h4>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {processing ? (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">파일을 처리하고 있습니다...</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                    📊
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    엑셀 파일을 여기로 드래그하거나 클릭하여 선택하세요
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    .xlsx, .xls 파일만 지원됩니다
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    파일 선택
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
              <h4 className="font-medium text-gray-900 mb-3">🔍 3단계: 데이터 검증 결과</h4>
              
              {/* 오류 표시 */}
              {validationResult.errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h5 className="font-medium text-red-900 mb-2">❌ 오류 ({validationResult.errors.length}개)</h5>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 경고 표시 */}
              {validationResult.warnings.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h5 className="font-medium text-yellow-900 mb-2">⚠️ 경고 ({validationResult.warnings.length}개)</h5>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 성공 표시 */}
              {validationResult.isValid && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h5 className="font-medium text-green-900 mb-2">✅ 검증 성공</h5>
                  <p className="text-sm text-green-700">
                    {validationResult.validData.length}개의 앤드밀 마스터 데이터를 업데이트할 준비가 되었습니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
            
            {validationResult && validationResult.isValid && (
              <button 
                onClick={processValidData}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                ✅ 데이터 업데이트 진행
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 