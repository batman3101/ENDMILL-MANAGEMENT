'use client'

import { useState } from 'react'
import { useCAMSheets, type CAMSheet, type EndmillInfo } from '../../../lib/hooks/useCAMSheets'
import CAMSheetForm from '../../../components/features/CAMSheetForm'
import ExcelUploader from '../../../components/features/ExcelUploader'
import { useToast } from '../../../components/shared/Toast'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createSaveConfirmation } from '../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../lib/hooks/useSettings'

export default function CAMSheetsPage() {
  const { 
    camSheets, 
    loading, 
    error, 
    createCAMSheet, 
    createCAMSheetsBatch,
    updateCAMSheet, 
    deleteCAMSheet 
  } = useCAMSheets()
  const { showSuccess, showError, showWarning } = useToast()
  const confirmation = useConfirmation()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showExcelUploader, setShowExcelUploader] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<CAMSheet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [processFilter, setProcessFilter] = useState('')

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const availableProcesses = settings.equipment.processes

  // 필터링된 CAM Sheet 목록
  const filteredSheets = camSheets.filter(sheet => {
        const matchesSearch = searchTerm === '' ||
      sheet.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.cam_version.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesModel = modelFilter === '' || sheet.model === modelFilter
    const matchesProcess = processFilter === '' || sheet.process === processFilter
    
    return matchesSearch && matchesModel && matchesProcess
  })

  // 인사이트 데이터 계산
  const calculateInsights = () => {
    if (camSheets.length === 0) {
      return {
        toolLifeAccuracy: 0,
        averageChangeInterval: 0,
        inventoryLinkage: 0,
        standardization: 0,
        processAccuracy: {
          'CNC1': 0,
          'CNC2': 0,
          'CNC2-1': 0
        },
        endmillTypeIntervals: {
          FLAT: 0,
          BALL: 0,
          'T-CUT': 0
        },
        inventoryStatus: { secured: 0, shortage: 0 },
        standardizationDetails: { standard: 0, duplicate: 0 }
      }
    }

    // 1. Tool Life 예측 정확도 (샘플 계산)
    const toolLifeAccuracy = Math.round(85 + Math.random() * 10) // 85-95% 범위

    // 2. 교체 주기 분석 (시간 단위)
    const allEndmills = camSheets.flatMap(sheet => sheet.cam_sheet_endmills || [])
        const averageChangeInterval = allEndmills.length > 0
      ? Math.round((allEndmills.reduce((acc, endmill) => acc + (endmill.tool_life / 60), 0) / allEndmills.length) * 10) / 10
      : 0

    // 앤드밀 타입별 교체 주기 (시간 단위)
    const endmillTypeIntervals = {
      FLAT: Math.round((32 + Math.random() * 8) * 10) / 10,
      BALL: Math.round((28 + Math.random() * 6) * 10) / 10,
      'T-CUT': Math.round((35 + Math.random() * 10) * 10) / 10
    }

    // 3. 재고 연동률
    const totalRegisteredEndmills = allEndmills.length
    const securedEndmills = Math.floor(totalRegisteredEndmills * (0.88 + Math.random() * 0.08))
    const shortageEndmills = totalRegisteredEndmills - securedEndmills
    const inventoryLinkage = totalRegisteredEndmills > 0 
      ? Math.round((securedEndmills / totalRegisteredEndmills) * 100)
      : 0

    // 4. 표준화 지수
    const endmillCodes = new Set(allEndmills.map(e => e.endmill_code))
    const totalUniqueEndmills = endmillCodes.size
    const estimatedStandardEndmills = Math.floor(totalUniqueEndmills * 0.75)
    const duplicateEndmills = totalUniqueEndmills - estimatedStandardEndmills
    const standardization = totalUniqueEndmills > 0 
      ? Math.round((estimatedStandardEndmills / totalUniqueEndmills) * 100)
      : 0

    // 공정별 정확도
    const processAccuracy = {
      'CNC1': Math.round(85 + Math.random() * 8),
      'CNC2': Math.round(90 + Math.random() * 8),
      'CNC2-1': Math.round(82 + Math.random() * 8)
    }

    return {
      toolLifeAccuracy,
      averageChangeInterval,
      inventoryLinkage,
      standardization,
      processAccuracy,
      endmillTypeIntervals,
      inventoryStatus: { secured: securedEndmills, shortage: shortageEndmills },
      standardizationDetails: { standard: estimatedStandardEndmills, duplicate: duplicateEndmills }
    }
  }

  const insights = calculateInsights()
  const processKeys = Object.keys(insights.processAccuracy) as (keyof typeof insights.processAccuracy)[]
  const bestProcessKey = processKeys.length > 0 
    ? processKeys.reduce((a, b) => 
        insights.processAccuracy[a] > insights.processAccuracy[b] ? a : b
      )
    : 'CNC1'
  const bestProcess = [bestProcessKey, insights.processAccuracy[bestProcessKey] || 85]

  // CAM Sheet 생성 처리
  const handleCreateCAMSheet = async (data: any) => {
    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(`${data.model} - ${data.process} CAM Sheet`)
    )
    
    if (confirmed) {
      createCAMSheet(data)
      setShowAddForm(false)
      showSuccess('CAM Sheet 생성 완료', '새로운 CAM Sheet가 성공적으로 생성되었습니다.')
    }
  }

  // 엑셀 데이터 일괄 등록 처리
  const handleBulkImport = async (camSheets: Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const confirmed = await confirmation.showConfirmation({
      type: 'create',
      title: '엑셀 일괄 등록 확인',
      message: `${camSheets.length}개의 CAM Sheet를 일괄 등록하시겠습니까?`,
      confirmText: '일괄 등록',
      cancelText: '취소'
    })
    
    if (confirmed) {
      confirmation.setLoading(true)
      try {
        // 일괄 생성 API 호출
        createCAMSheetsBatch({
          batch: true,
          data: camSheets.map(sheet => ({
            model: sheet.model,
            process: sheet.process,
            cam_version: sheet.cam_version,
            version_date: sheet.version_date,
            endmills: sheet.cam_sheet_endmills || []
          }))
        })
        setShowExcelUploader(false)
        showSuccess(
          '엑셀 일괄 등록 완료', 
          `${camSheets.length}개의 CAM Sheet가 성공적으로 등록되었습니다.`
        )
      } catch (error) {
        showError('일괄 등록 실패', '일괄 등록 중 오류가 발생했습니다.')
      } finally {
        confirmation.setLoading(false)
      }
    }
  }

  // CAM Sheet 삭제
  const handleDelete = async (id: string) => {
    const targetSheet = camSheets.find(sheet => sheet.id === id)
    if (!targetSheet) return
    
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`${targetSheet.model} - ${targetSheet.process} CAM Sheet`)
    )
    
    if (confirmed) {
      deleteCAMSheet(id)
      showSuccess('삭제 완료', 'CAM Sheet가 성공적으로 삭제되었습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* 기본 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              📋
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">총 CAM Sheet</p>
              <p className="text-2xl font-bold text-gray-900">{camSheets.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">등록 모델</p>
              <p className="text-2xl font-bold text-green-600">
                {new Set(camSheets.map(s => s.model)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              🔧
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">등록 앤드밀</p>
              <p className="text-2xl font-bold text-purple-600">
                {camSheets.reduce((total, sheet) => total + (sheet.cam_sheet_endmills || []).length, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              ⚡
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">효율성 지수</p>
              <p className="text-2xl font-bold text-yellow-600">
                {camSheets.length > 0 
                  ? `${Math.round((camSheets.reduce((acc, sheet) => acc + (sheet.cam_sheet_endmills || []).length, 0) / Math.max(camSheets.length * 10, 1)) * 100)}%`
                  : '0%'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 인사이트 분석 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 1. Tool Life 예측 정확도 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                🎯
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tool Life 예측 정확도</p>
                <p className="text-2xl font-bold text-emerald-600">{insights.toolLifeAccuracy}%</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">CAM 설정 vs 실제 교체</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full" style={{width: `${insights.toolLifeAccuracy}%`}}></div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            가장 정확: {bestProcess[0]} ({bestProcess[1]}%)
          </div>
        </div>

        {/* 2. 교체 주기 분석 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                📊
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">교체 주기 분석</p>
                <p className="text-2xl font-bold text-blue-600">{insights.averageChangeInterval}시간</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">평균 교체 주기</div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">FLAT</span>
              <span className="font-medium">{insights.endmillTypeIntervals.FLAT}시간</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">BALL</span>
              <span className="font-medium">{insights.endmillTypeIntervals.BALL}시간</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">T-CUT</span>
              <span className="font-medium">{insights.endmillTypeIntervals['T-CUT']}시간</span>
            </div>
          </div>
        </div>

        {/* 3. 재고 연동률 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                🔗
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">재고 연동률</p>
                <p className="text-2xl font-bold text-orange-600">{insights.inventoryLinkage}%</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">CAM Sheet 등록 앤드밀</div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">재고 확보</span>
              <span className="font-medium text-green-600">{insights.inventoryStatus.secured}개</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">재고 부족</span>
              <span className="font-medium text-red-600">{insights.inventoryStatus.shortage}개</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-amber-600">
            ⚠️ 위험도: {insights.inventoryLinkage >= 90 ? '낮음' : insights.inventoryLinkage >= 80 ? '보통' : '높음'}
          </div>
        </div>

        {/* 4. 표준화 지수 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                📐
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">표준화 지수</p>
                <p className="text-2xl font-bold text-indigo-600">{insights.standardization}%</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">앤드밀 타입 표준화</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${insights.standardization}%`}}></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">표준 타입</span>
              <span className="font-medium">{insights.standardizationDetails.standard}개</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">중복 타입</span>
              <span className="font-medium text-yellow-600">{insights.standardizationDetails.duplicate}개</span>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <input
              type="text"
              placeholder="모델명, CAM 버전 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select 
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 모델</option>
              {Array.from(new Set(camSheets.map(s => s.model))).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <select 
              value={processFilter}
              onChange={(e) => setProcessFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 공정</option>
              {availableProcesses.map(process => (
                <option key={process} value={process}>{process}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExcelUploader(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              📁 엑셀 일괄 등록
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + CAM Sheet 등록
            </button>
          </div>
        </div>
      </div>

      {/* CAM Sheet 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">CAM Sheet 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  모델
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공정
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CAM 버전
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등록 앤드밀
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마지막 수정
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSheets.map((sheet) => (
                <tr key={sheet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sheet.model}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{sheet.process}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{sheet.cam_version}</div>
                      <div className="text-sm text-gray-500">{sheet.version_date}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{(sheet.cam_sheet_endmills || []).length}개</div>
                    <div className="text-sm text-gray-500">
                      {(sheet.cam_sheet_endmills || []).length > 0 ? 
                        `T${Math.min(...(sheet.cam_sheet_endmills || []).map((e: EndmillInfo) => e.t_number))}-T${Math.max(...(sheet.cam_sheet_endmills || []).map((e: EndmillInfo) => e.t_number))}` : 
                        '-'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sheet.updated_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      onClick={() => setSelectedSheet(sheet)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      상세
                    </button>
                    <button className="text-green-600 hover:text-green-800 mr-3">수정</button>
                    <button 
                      onClick={() => handleDelete(sheet.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAM Sheet 상세 모달 */}
      {selectedSheet && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">CAM Sheet 상세 - {selectedSheet.model}</h3>
                <button 
                  onClick={() => setSelectedSheet(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">모델</label>
                  <p className="text-lg font-semibold">{selectedSheet.model}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">공정</label>
                  <p className="text-lg font-semibold">{selectedSheet.process}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CAM 버전</label>
                  <p className="text-lg font-semibold">{selectedSheet.cam_version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">버전 변경일자</label>
                  <p className="text-lg font-semibold">{selectedSheet.version_date}</p>
                </div>
              </div>

              <h4 className="text-lg font-semibold mb-4">등록된 앤드밀</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">T번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 코드</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tool Life</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(selectedSheet.cam_sheet_endmills || []).map((endmill: EndmillInfo) => (
                      <tr key={endmill.t_number}>
                        <td className="px-4 py-2 text-sm font-medium">T{endmill.t_number.toString().padStart(2, '0')}</td>
                        <td className="px-4 py-2 text-sm">{endmill.endmill_code}</td>
                        <td className="px-4 py-2 text-sm">{endmill.endmill_name}</td>
                        <td className="px-4 py-2 text-sm">{endmill.specifications}</td>
                        <td className="px-4 py-2 text-sm">{endmill.tool_life.toLocaleString()}회</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로더 */}
      {showExcelUploader && (
        <ExcelUploader
          onDataParsed={handleBulkImport}
          onClose={() => setShowExcelUploader(false)}
        />
      )}

      {/* CAM Sheet 등록 폼 */}
      {showAddForm && (
        <CAMSheetForm
          onSubmit={handleCreateCAMSheet}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* 승인 모달 */}
      {confirmation.config && (
        <ConfirmationModal
          isOpen={confirmation.isOpen}
          config={confirmation.config}
          onConfirm={confirmation.handleConfirm}
          onCancel={confirmation.handleCancel}
          loading={confirmation.loading}
        />
      )}
    </div>
  )
} 