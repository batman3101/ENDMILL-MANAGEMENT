'use client'

import { useState, useEffect } from 'react'
import { MockDataManager } from '../../lib/data/mockData'

export default function DevMockDataManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState({ camSheets: 0, toolChanges: 0, equipment: 0, inventory: 0 })
  const [exportData, setExportData] = useState('')
  const [importData, setImportData] = useState('')
  const [showImport, setShowImport] = useState(false)

  // 통계 업데이트
  const updateStats = () => {
    setStats(MockDataManager.getDataStats())
  }

  // 컴포넌트 마운트 시 통계 로드
  useEffect(() => {
    updateStats()
  }, [])

  // 데이터 초기화
  const handleReset = () => {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) {
      MockDataManager.resetAllData()
      updateStats()
      alert('데이터가 초기화되었습니다.')
      window.location.reload() // 페이지 새로고침
    }
  }

  // 데이터 내보내기
  const handleExport = () => {
    const data = MockDataManager.exportData()
    setExportData(data)
    
    // 클립보드에 복사
    navigator.clipboard.writeText(data).then(() => {
      alert('데이터가 클립보드에 복사되었습니다.')
    })
  }

  // 데이터 가져오기
  const handleImport = () => {
    if (!importData.trim()) {
      alert('가져올 데이터를 입력해주세요.')
      return
    }

    if (MockDataManager.importData(importData)) {
      updateStats()
      setImportData('')
      setShowImport(false)
      alert('데이터 가져오기가 완료되었습니다.')
      window.location.reload() // 페이지 새로고침
    } else {
      alert('데이터 형식이 올바르지 않습니다.')
    }
  }

  // 샘플 데이터 추가
  const handleAddSample = () => {
    MockDataManager.addSampleCAMSheet()
    updateStats()
    alert('샘플 CAM Sheet가 추가되었습니다.')
  }

  // 개발 모드에서만 표시 (process.env.NODE_ENV === 'development')
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
          title="목업 데이터 관리자"
        >
          🔧
        </button>
      </div>

      {/* 관리자 패널 */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b bg-purple-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-purple-900">🔧 목업 데이터 관리자</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-purple-700 mt-1">개발 모드에서만 표시됩니다</p>
            </div>
            
            <div className="p-6">
              {/* 현재 상태 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">📊 현재 데이터 상태</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.camSheets}</div>
                    <div className="text-sm text-blue-800">CAM Sheets</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.toolChanges}</div>
                    <div className="text-sm text-green-800">교체 실적</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.equipment}</div>
                    <div className="text-sm text-yellow-800">설비</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.inventory}</div>
                    <div className="text-sm text-purple-800">재고</div>
                  </div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">⚡ 빠른 액션</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={updateStats}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    📊 통계 새로고침
                  </button>
                  <button
                    onClick={handleAddSample}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    ➕ 샘플 추가
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    📤 데이터 내보내기
                  </button>
                  <button
                    onClick={() => setShowImport(!showImport)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                  >
                    📥 데이터 가져오기
                  </button>
                </div>
              </div>

              {/* 데이터 가져오기 */}
              {showImport && (
                <div className="mb-6 p-4 bg-teal-50 rounded-lg">
                  <h5 className="font-medium mb-2">📥 데이터 가져오기</h5>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="JSON 데이터를 여기에 붙여넣기..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleImport}
                      className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm"
                    >
                      가져오기
                    </button>
                    <button
                      onClick={() => setShowImport(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {/* 내보낸 데이터 */}
              {exportData && (
                <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                  <h5 className="font-medium mb-2">📤 내보낸 데이터 (클립보드에 복사됨)</h5>
                  <textarea
                    value={exportData}
                    readOnly
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => setExportData('')}
                    className="mt-2 px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    닫기
                  </button>
                </div>
              )}

              {/* 위험 액션 */}
              <div className="border-t pt-4">
                <h4 className="text-lg font-semibold mb-3 text-red-600">⚠️ 위험한 액션</h4>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  🔄 모든 데이터 초기화
                </button>
                <p className="text-sm text-red-600 mt-2">
                  ※ 모든 로컬 스토리지 데이터가 삭제되고 기본 목업 데이터로 초기화됩니다.
                </p>
              </div>

              {/* 도움말 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">💡 브라우저 콘솔 명령어</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><code className="bg-gray-200 px-1 rounded">mockData.help()</code> - 도움말 보기</div>
                  <div><code className="bg-gray-200 px-1 rounded">mockData.stats()</code> - 통계 확인</div>
                  <div><code className="bg-gray-200 px-1 rounded">mockData.addSample()</code> - 샘플 추가</div>
                  <div><code className="bg-gray-200 px-1 rounded">mockData.reset()</code> - 데이터 초기화</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 