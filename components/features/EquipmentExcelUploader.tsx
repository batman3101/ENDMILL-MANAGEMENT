'use client'

import React, { useState, useRef } from 'react'
import {
  parseEquipmentExcel,
  validateEquipmentData,
  downloadEquipmentTemplate,
  EquipmentExcelData
} from '../../lib/utils/equipmentExcelTemplate'
import { useToast } from '../shared/Toast'
import { useCAMSheets } from '../../lib/hooks/useCAMSheets'

interface EquipmentExcelUploaderProps {
  onUploadSuccess: () => void
  onCancel: () => void
}

export default function EquipmentExcelUploader({
  onUploadSuccess,
  onCancel
}: EquipmentExcelUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [parsedData, setParsedData] = useState<EquipmentExcelData[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [uploadResults, setUploadResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccess, showError } = useToast()

  // CAM Sheet 데이터 가져오기
  const { getAvailableModels, getAvailableProcesses } = useCAMSheets()

  // 템플릿 다운로드 - 서버에서 동적으로 생성된 템플릿 정보 사용
  const handleDownloadTemplate = async () => {
    try {
      // 서버에서 템플릿 정보 가져오기
      const response = await fetch('/api/equipment/bulk-upload')
      const result = await response.json()

      if (result.success && result.template) {
        // 동적 템플릿 다운로드
        downloadEquipmentTemplate(result.template.availableModels, result.template.availableProcesses)
      } else {
        // 기본 템플릿 다운로드
        downloadEquipmentTemplate()
      }

      showSuccess('템플릿 다운로드', '엑셀 템플릿이 다운로드되었습니다.')
    } catch (error) {
      showError('다운로드 실패', '템플릿 다운로드에 실패했습니다.')
    }
  }

  // 파일 선택 처리
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 타입 체크
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showError('파일 형식 오류', '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    try {
      // 엑셀 파싱
      const data = await parseEquipmentExcel(file)

      if (data.length === 0) {
        showError('데이터 없음', '엑셀 파일에 데이터가 없습니다.')
        return
      }

      if (data.length > 100) {
        showError('데이터 초과', '한 번에 최대 100개까지만 등록 가능합니다.')
        return
      }

      // 유효성 검사 - CAM Sheet에서 등록된 모델과 공정 사용
      const availableModels = getAvailableModels()
      const availableProcesses = getAvailableProcesses()
      const validation = validateEquipmentData(data, availableModels, availableProcesses)

      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        setParsedData([])
        return
      }

      // 유효성 검사 통과
      setValidationErrors([])
      setParsedData(data)
      showSuccess('파일 검증 완료', `${data.length}개의 설비 데이터가 확인되었습니다.`)

    } catch (error) {
      showError('파일 읽기 실패', error instanceof Error ? error.message : '파일을 읽을 수 없습니다.')
      setParsedData([])
      setValidationErrors([])
    }
  }

  // 데이터 업로드
  const handleUpload = async () => {
    if (parsedData.length === 0) {
      showError('데이터 없음', '업로드할 데이터가 없습니다.')
      return
    }

    setIsUploading(true)
    setUploadResults(null)

    try {
      const response = await fetch('/api/equipment/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipments: parsedData })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '업로드에 실패했습니다.')
      }

      setUploadResults(result.results)

      if (result.success) {
        showSuccess('업로드 완료', result.message)

        // 성공한 항목이 있으면 3초 후 모달 닫기
        if (result.results.success.length > 0) {
          setTimeout(() => {
            onUploadSuccess()
          }, 3000)
        }
      }

    } catch (error) {
      showError('업로드 실패', error instanceof Error ? error.message : '업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // 초기화
  const handleReset = () => {
    setParsedData([])
    setValidationErrors([])
    setUploadResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              설비 일괄 등록
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={isUploading}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 단계 표시 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <span className="ml-2 text-sm font-medium">템플릿 다운로드</span>
              </div>
              <div className="flex items-center">
                <div className={`w-8 h-8 ${parsedData.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} rounded-full flex items-center justify-center font-semibold`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">파일 업로드</span>
              </div>
              <div className="flex items-center">
                <div className={`w-8 h-8 ${uploadResults ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} rounded-full flex items-center justify-center font-semibold`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">등록 완료</span>
              </div>
            </div>
          </div>

          {/* 1. 템플릿 다운로드 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">1. 엑셀 템플릿 다운로드</h4>
            <p className="text-sm text-gray-600 mb-3">
              먼저 템플릿을 다운로드하여 양식에 맞게 데이터를 작성해주세요.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              📥 템플릿 다운로드
            </button>
          </div>

          {/* 2. 파일 업로드 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">2. 작성한 엑셀 파일 업로드</h4>
            <p className="text-sm text-gray-600 mb-3">
              템플릿에 데이터를 입력한 후 파일을 선택해주세요.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isUploading}
            />
          </div>

          {/* 유효성 검사 오류 */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">❌ 데이터 검증 실패</h4>
              <div className="max-h-40 overflow-y-auto">
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 파싱된 데이터 미리보기 */}
          {parsedData.length > 0 && validationErrors.length === 0 && !uploadResults && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">
                데이터 미리보기 ({parsedData.length}개)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">설비번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">위치</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">생산모델</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">공정</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.slice(0, 10).map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.equipment_number}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.location}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.status}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.current_model}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.process}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ... 외 {parsedData.length - 10}개
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 업로드 결과 */}
          {uploadResults && (
            <div className="mb-6 space-y-4">
              {/* 성공 */}
              {uploadResults.success?.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    ✅ 성공적으로 등록됨 ({uploadResults.success.length}개)
                  </h4>
                  <div className="text-sm text-green-700">
                    {uploadResults.success.map((item: any, index: number) => (
                      <div key={index}>{item.equipment_number}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* 중복 */}
              {uploadResults.duplicates?.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    ⚠️ 중복된 설비번호 ({uploadResults.duplicates.length}개)
                  </h4>
                  <div className="text-sm text-yellow-700">
                    {uploadResults.duplicates.map((item: any, index: number) => (
                      <div key={index}>
                        {item.equipment_number}: {item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 실패 */}
              {uploadResults.failed?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">
                    ❌ 등록 실패 ({uploadResults.failed.length}개)
                  </h4>
                  <div className="text-sm text-red-700">
                    {uploadResults.failed.map((item: any, index: number) => (
                      <div key={index}>
                        {item.equipment_number}: {item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end space-x-3">
            {!uploadResults && (
              <>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  disabled={isUploading}
                >
                  초기화
                </button>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  disabled={isUploading}
                >
                  취소
                </button>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={parsedData.length === 0 || isUploading}
                >
                  {isUploading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isUploading ? '업로드 중...' : '등록하기'}
                </button>
              </>
            )}
            {uploadResults && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}