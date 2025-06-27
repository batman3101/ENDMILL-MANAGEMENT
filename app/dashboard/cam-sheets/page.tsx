'use client'

import { useState } from 'react'
import { useCAMSheets, CAMSheet, EndmillInfo } from '../../../lib/hooks/useCAMSheets'
import CAMSheetForm from '../../../components/features/CAMSheetForm'

export default function CAMSheetsPage() {
  const { 
    camSheets, 
    loading, 
    error, 
    createCAMSheet, 
    updateCAMSheet, 
    deleteCAMSheet 
  } = useCAMSheets()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<CAMSheet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [processFilter, setProcessFilter] = useState('')

  // 필터링된 CAM Sheet 목록
  const filteredSheets = camSheets.filter(sheet => {
    const matchesSearch = searchTerm === '' || 
      sheet.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.camVersion.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesModel = modelFilter === '' || sheet.model === modelFilter
    const matchesProcess = processFilter === '' || sheet.process === processFilter
    
    return matchesSearch && matchesModel && matchesProcess
  })

  // CAM Sheet 생성 처리
  const handleCreateCAMSheet = (data: any) => {
    createCAMSheet(data)
    setShowAddForm(false)
  }

  // CAM Sheet 삭제
  const handleDelete = (id: string) => {
    if (confirm('정말로 삭제하시겠습니까?')) {
      deleteCAMSheet(id)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CAM SHEET 관리</h1>
        <p className="text-gray-600">모델별 CAM Sheet 및 앤드밀 정보 관리</p>
      </div>

      {/* 통계 카드 */}
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
                {camSheets.reduce((total, sheet) => total + sheet.endmills.length, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              📅
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">최신 버전</p>
              <p className="text-2xl font-bold text-orange-600">
                {Math.max(...camSheets.map(s => parseFloat(s.camVersion.replace('v', ''))))}
              </p>
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
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 모델</option>
              {Array.from(new Set(camSheets.map(s => s.model))).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <select 
              value={processFilter}
              onChange={(e) => setProcessFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 공정</option>
              <option value="1공정">1공정</option>
              <option value="2공정">2공정</option>
              <option value="2-1공정">2-1공정</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + CAM Sheet 등록
          </button>
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
                  모델/공정
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
                    <div>
                      <div className="text-sm font-medium text-gray-900">{sheet.model}</div>
                      <div className="text-sm text-gray-500">{sheet.process}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{sheet.camVersion}</div>
                      <div className="text-sm text-gray-500">{sheet.versionDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sheet.endmills.length}개</div>
                    <div className="text-sm text-gray-500">
                      T{Math.min(...sheet.endmills.map(e => e.tNumber))}-T{Math.max(...sheet.endmills.map(e => e.tNumber))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sheet.updatedAt).toLocaleDateString('ko-KR')}
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
                  <p className="text-lg font-semibold">{selectedSheet.camVersion}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">버전 변경일자</label>
                  <p className="text-lg font-semibold">{selectedSheet.versionDate}</p>
                </div>
              </div>

              <h4 className="text-lg font-semibold mb-4">등록된 앤드밀</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">T번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 코드</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">사양</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tool Life</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedSheet.endmills.map((endmill) => (
                      <tr key={endmill.tNumber}>
                        <td className="px-4 py-2 text-sm font-medium">T{endmill.tNumber.toString().padStart(2, '0')}</td>
                        <td className="px-4 py-2 text-sm">{endmill.endmillCode}</td>
                        <td className="px-4 py-2 text-sm">{endmill.endmillName}</td>
                        <td className="px-4 py-2 text-sm">{endmill.specifications}</td>
                        <td className="px-4 py-2 text-sm">{endmill.toolLife.toLocaleString()}회</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAM Sheet 등록 폼 */}
      {showAddForm && (
        <CAMSheetForm
          onSubmit={handleCreateCAMSheet}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
} 