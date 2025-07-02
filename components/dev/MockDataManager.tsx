'use client'

import { useState, useEffect } from 'react'
import { FileDataManager } from '../../lib/data/fileDataManager'

export default function DevMockDataManager() {
  const [stats, setStats] = useState({
    equipments: 0,
    endmills: 0,
    camSheets: 0,
    inventory: 0,
    toolChanges: 0,
    users: 0
  })

  const updateStats = () => {
    const newStats = FileDataManager.getDataStats()
    setStats(newStats)
  }

  useEffect(() => {
    updateStats()
  }, [])

  const handleReset = () => {
    if (confirm('모든 목업 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      FileDataManager.resetAllData()
      updateStats()
      alert('데이터가 초기화되었습니다.')
      window.location.reload() // 페이지 새로고침
    }
  }

  const handleExport = () => {
    try {
      const exportData = FileDataManager.exportData()
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mockdata_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert('데이터 내보내기가 완료되었습니다.')
    } catch (error) {
      alert('데이터 내보내기에 실패했습니다.')
      console.error(error)
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = e.target?.result as string
            const success = FileDataManager.importData(jsonData)
            if (success) {
              updateStats()
              alert('데이터 가져오기가 완료되었습니다.')
              window.location.reload()
            } else {
              alert('데이터 가져오기에 실패했습니다.')
            }
          } catch (error) {
            alert('잘못된 파일 형식입니다.')
            console.error(error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleGenerateEquipments = () => {
    if (confirm('800대 설비 데이터를 생성하시겠습니까?')) {
      FileDataManager.generateEquipments(800)
      updateStats()
      alert('800대 설비 데이터가 생성되었습니다.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">🛠️ 목업 데이터 관리</h2>
        
        {/* 데이터 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">설비</div>
            <div className="text-2xl font-bold text-blue-900">{stats.equipments.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">앤드밀</div>
            <div className="text-2xl font-bold text-green-900">{stats.endmills.toLocaleString()}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">CAM Sheet</div>
            <div className="text-2xl font-bold text-purple-900">{stats.camSheets.toLocaleString()}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">재고</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.inventory.toLocaleString()}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-red-600 font-medium">교체 이력</div>
            <div className="text-2xl font-bold text-red-900">{stats.toolChanges.toLocaleString()}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="text-sm text-indigo-600 font-medium">사용자</div>
            <div className="text-2xl font-bold text-indigo-900">{stats.users.toLocaleString()}</div>
          </div>
        </div>

        {/* 관리 버튼들 */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={updateStats}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              📊 통계 새로고침
            </button>
            <button
              onClick={handleGenerateEquipments}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              🏭 설비 데이터 생성
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              📤 데이터 내보내기
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              📥 데이터 가져오기
            </button>
          </div>

          <div className="border-t pt-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              🗑️ 모든 데이터 초기화
            </button>
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ 주의: 모든 목업 데이터가 삭제되고 초기 상태로 돌아갑니다.
            </p>
          </div>
        </div>

        {/* 개발 정보 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📋 개발 정보</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• 데이터는 브라우저 로컬 스토리지에 저장됩니다</p>
            <p>• JSON 파일 기반으로 초기 데이터를 관리합니다</p>
            <p>• Supabase 연결 전까지 임시로 사용하는 목업 시스템입니다</p>
            <p>• 데이터 구조는 실제 데이터베이스 스키마와 일치합니다</p>
          </div>
        </div>
      </div>
    </div>
  )
} 