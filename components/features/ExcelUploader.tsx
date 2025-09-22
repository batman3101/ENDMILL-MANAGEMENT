'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { CAMSheet, EndmillInfo, useCAMSheets } from '../../lib/hooks/useCAMSheets'
import { downloadExcelTemplate, validateExcelData } from '../../lib/utils/excelTemplate'

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
  'Endmill Name'?: string
  'Specifications'?: string
  'Tool Life'?: number
}

export default function ExcelUploader({ onDataParsed, onClose }: ExcelUploaderProps) {
  const { camSheets } = useCAMSheets() // 기존 CAM Sheet 데이터 가져오기
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [parsedCAMSheets, setParsedCAMSheets] = useState<Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>[]>([])
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null)
  const [duplicateInfo, setDuplicateInfo] = useState<{ duplicates: string[]; newSheets: any[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    setIsProcessing(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet)

      setPreviewData(jsonData.slice(0, 10)) // 처음 10개 행만 미리보기

      // 검증 옵션 가져오기
      const validationOptionsResponse = await fetch('/api/settings/validation')
      let validationOptions = {}

      if (validationOptionsResponse.ok) {
        const validationData = await validationOptionsResponse.json()
        if (validationData.success) {
          validationOptions = {
            validProcesses: validationData.data.processes,
            validModels: validationData.data.models
          }
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
      console.error('파일 처리 중 오류:', error)
      alert('파일 처리 중 오류가 발생했습니다.')
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

      if (row['T Number'] && row['Endmill Code'] && row['Endmill Name']) {
        const endmill: EndmillInfo = {
          t_number: Number(row['T Number']),
          endmill_code: row['Endmill Code'],
          endmill_name: row['Endmill Name'],
          specifications: row['Specifications'] || '',
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
      cam_sheet_endmills: sheet.endmills.map((endmill: EndmillInfo) => ({
        id: Date.now().toString() + Math.random(),
        cam_sheet_id: '', // 나중에 서버에서 설정
        t_number: endmill.t_number,
        endmill_code: endmill.endmill_code,
        endmill_name: endmill.endmill_name,
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">📁 엑셀 파일로 CAM Sheet 일괄 등록</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* 파일 업로드 영역 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            
            <div className="mb-4">
              <p className="text-lg font-medium text-gray-900">
                엑셀 파일을 드래그 앤 드롭하거나 클릭하여 업로드
              </p>
              <p className="text-sm text-gray-500 mt-2">
                .xlsx, .xls 파일 지원
              </p>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isProcessing}
            >
              {isProcessing ? '처리 중...' : '파일 선택'}
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
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-blue-900">📋 예상 엑셀 데이터 형식</h4>
              <button
                onClick={downloadExcelTemplate}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                📥 템플릿 다운로드
              </button>
            </div>
            <div className="text-sm text-blue-800">
              <p className="mb-2">엑셀 파일의 첫 번째 시트에서 다음 컬럼들을 찾습니다:</p>
              <div className="grid grid-cols-2 gap-2">
                <div><code className="bg-blue-200 px-1 rounded">Model</code> - 모델명</div>
                <div><code className="bg-blue-200 px-1 rounded">Process</code> - 공정</div>
                <div><code className="bg-blue-200 px-1 rounded">CAM Version</code> - CAM 버전</div>
                <div><code className="bg-blue-200 px-1 rounded">T Number</code> - T번호</div>
                <div><code className="bg-blue-200 px-1 rounded">Endmill Code</code> - 앤드밀 코드</div>
                <div><code className="bg-blue-200 px-1 rounded">Endmill Name</code> - 앤드밀 타입</div>
                <div><code className="bg-blue-200 px-1 rounded">Specifications</code> - 앤드밀 상세사양</div>
                <div><code className="bg-blue-200 px-1 rounded">Tool Life</code> - Tool Life</div>
              </div>
            </div>
          </div>

          {/* 검증 결과 */}
          {validationResult && (
            <div className="mt-6">
              {validationResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <h4 className="font-medium text-red-900 mb-2">❌ 오류 ({validationResult.errors.length}개)</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <h4 className="font-medium text-yellow-900 mb-2">⚠️ 경고 ({validationResult.warnings.length}개)</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.isValid && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <h4 className="font-medium text-green-900">✅ 검증 통과</h4>
                  <p className="text-sm text-green-800">데이터가 올바른 형식입니다. 중복 확인을 진행합니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 중복 확인 결과 */}
          {duplicateInfo && (
            <div className="mt-6">
              {duplicateInfo.duplicates.length > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                  <h4 className="font-medium text-orange-900 mb-2">
                    🔄 중복 CAM Sheet 발견 ({duplicateInfo.duplicates.length}개)
                  </h4>
                  <p className="text-sm text-orange-800 mb-2">
                    다음 CAM Sheet들은 이미 등록되어 있어 제외됩니다:
                  </p>
                  <ul className="text-sm text-orange-800 space-y-1">
                    {duplicateInfo.duplicates.map((duplicate, index) => (
                      <li key={index}>• {duplicate}</li>
                    ))}
                  </ul>
                </div>
              )}

              {duplicateInfo.newSheets.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-900">
                    ✨ 새로 등록될 CAM Sheet ({duplicateInfo.newSheets.length}개)
                  </h4>
                  <p className="text-sm text-blue-800">
                    기존 데이터는 유지되고 새로운 CAM Sheet만 추가됩니다.
                  </p>
                </div>
              )}

              {duplicateInfo.newSheets.length === 0 && duplicateInfo.duplicates.length > 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900">
                    ℹ️ 새로 등록될 CAM Sheet가 없습니다
                  </h4>
                  <p className="text-sm text-gray-700">
                    업로드된 모든 CAM Sheet가 이미 등록되어 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 미리보기 데이터 */}
          {previewData.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">📊 업로드된 데이터 미리보기 (처음 10개 행)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0] || {}).map(key => (
                        <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.values(row).map((value: any, colIndex) => (
                          <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
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
              <h4 className="font-medium text-gray-900 mb-3">
                🔄 변환된 CAM Sheet ({parsedCAMSheets.length}개)
              </h4>
              <div className="space-y-4">
                {parsedCAMSheets.map((sheet, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {sheet.model} - {sheet.process} ({sheet.cam_version})
                        </h5>
                        <p className="text-sm text-gray-500">
                          {sheet.cam_sheet_endmills?.length || 0}개 앤드밀 등록
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      T번호: {sheet.cam_sheet_endmills?.map((e: any) => `T${e.t_number.toString().padStart(2, '0')}`).join(', ') || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              취소
            </button>
            {parsedCAMSheets.length > 0 && (
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {parsedCAMSheets.length}개 새로운 CAM Sheet 등록
                {duplicateInfo?.duplicates && duplicateInfo.duplicates.length > 0 &&
                  ` (${duplicateInfo.duplicates.length}개 중복 제외)`
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 