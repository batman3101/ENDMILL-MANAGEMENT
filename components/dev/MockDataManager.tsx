'use client'

import { useState, useEffect } from 'react'
import { useInventory } from '../../lib/hooks/useInventory'
import { useEquipment } from '../../lib/hooks/useEquipment'
import { useCAMSheets } from '../../lib/hooks/useCAMSheets'
import { useToast } from '../shared/Toast'

export default function DevMockDataManager() {
  const { showSuccess, showError } = useToast()
  const [stats, setStats] = useState({
    inventory: 0,
    equipment: 0,
    camSheets: 0,
    toolChanges: 0
  })

  // Hook에서 데이터 가져오기
  const { inventory, loading: inventoryLoading } = useInventory()
  const { equipments, loading: equipmentLoading } = useEquipment()
  const { camSheets, loading: camSheetsLoading } = useCAMSheets()

  // 통계 업데이트
  const updateStats = () => {
    setStats({
      inventory: inventory?.length || 0,
      equipment: equipments?.length || 0,
      camSheets: camSheets?.length || 0,
      toolChanges: 0 // TODO: Tool Changes Hook 추가 후 업데이트
    })
  }

  useEffect(() => {
    updateStats()
  }, [inventory, equipments, camSheets])

  const handleReset = () => {
    if (confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      showError('기능 제한', '실제 데이터베이스 연동 후에는 리셋 기능을 사용할 수 없습니다.')
    }
  }

  const handleExport = () => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        stats: stats,
        note: 'Supabase 연동 후에는 실제 데이터베이스에서 내보내기를 수행합니다.'
      }
      
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cnc-endmill-stats-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)

      showSuccess('내보내기 완료', '데이터 통계가 성공적으로 내보내졌습니다.')
    } catch (error) {
      showError('내보내기 실패', '데이터 내보내기 중 오류가 발생했습니다.')
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // 데이터 검증
        if (!data.timestamp || !data.stats) {
          throw new Error('잘못된 파일 형식입니다.')
        }

        showSuccess('가져오기 완료', 'Supabase 연동 후에는 실제 데이터 가져오기가 구현됩니다.')
      } catch (error) {
        showError('가져오기 실패', '파일을 읽는 중 오류가 발생했습니다.')
      }
    }
    input.click()
  }

  const handleGenerateEquipments = () => {
    showError('기능 제한', 'Supabase 연동 후에는 실제 데이터베이스에 설비를 생성합니다.')
  }

  if (inventoryLoading || equipmentLoading || camSheetsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-600">데이터 로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">🛠️ 개발자 도구 - 데이터 관리</h3>
        <p className="text-sm text-gray-600 mt-1">Supabase 연동 후 실시간 데이터 통계</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* 데이터 통계 */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">📊 현재 데이터 현황</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.inventory}</div>
              <div className="text-sm text-blue-800">재고 항목</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.equipment}</div>
              <div className="text-sm text-green-800">설비</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.camSheets}</div>
              <div className="text-sm text-purple-800">CAM Sheet</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.toolChanges}</div>
              <div className="text-sm text-orange-800">교체 이력</div>
            </div>
          </div>
        </div>

        {/* 데이터 관리 도구 */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">🔧 데이터 관리 도구</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={updateStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              🔄 통계 새로고침
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              📤 통계 내보내기
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            >
              📥 데이터 가져오기
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              🗑️ 데이터 리셋
            </button>
          </div>
        </div>

        {/* 개발자 정보 */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">ℹ️ 개발 정보</h4>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">데이터베이스:</span>
              <span className="font-mono text-gray-900">Supabase PostgreSQL</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">상태 관리:</span>
              <span className="font-mono text-gray-900">React Query + Real-time</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">마지막 업데이트:</span>
              <span className="font-mono text-gray-900">{new Date().toLocaleString('ko-KR')}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">개발 모드:</span>
              <span className="font-mono text-gray-900">
                {process.env.NODE_ENV === 'development' ? '🟢 Development' : '🔴 Production'}
              </span>
            </div>
          </div>
        </div>

        {/* 실시간 연결 상태 */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">🔗 실시간 연결 상태</h4>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-700">Inventory 실시간 구독 활성</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-700">Equipment 실시간 구독 활성</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-700">CAM Sheets 실시간 구독 활성</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-700">Tool Changes 구독 대기 중</span>
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <h5 className="text-sm font-medium text-yellow-800">개발자 도구 안내</h5>
              <p className="text-xs text-yellow-700 mt-1">
                이 도구는 개발 환경에서만 사용하세요. 운영 환경에서는 실제 데이터베이스와 연동됩니다.
                데이터 리셋 및 대량 생성 기능은 실제 환경에서는 비활성화됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 