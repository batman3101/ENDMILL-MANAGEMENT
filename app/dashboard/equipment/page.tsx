'use client'

import { useState, useMemo } from 'react'

// 로컬 상태용 타입 정의
interface Equipment {
  id: string
  modelCode: string
  equipmentNumber: number
  status: 'active' | 'maintenance' | 'offline'
  location: string
  processes: string[]
  toolPositions: {
    used: number
    total: number
  }
  lastMaintenance: string
}

// 샘플 데이터
const initialEquipments: Equipment[] = [
  {
    id: '1',
    modelCode: 'C001',
    equipmentNumber: 1,
    status: 'active',
    location: '1공장 A구역',
    processes: ['2공정', '2공종'],
    toolPositions: { used: 21, total: 21 },
    lastMaintenance: '2024-01-08'
  },
  {
    id: '2',
    modelCode: 'C002',
    equipmentNumber: 2,
    status: 'maintenance',
    location: '1공장 A구역',
    processes: ['2공정', '2-1공정'],
    toolPositions: { used: 0, total: 21 },
    lastMaintenance: '2024-01-10'
  },
  {
    id: '3',
    modelCode: 'C025',
    equipmentNumber: 25,
    status: 'active',
    location: '2공장 B구역',
    processes: ['1공정'],
    toolPositions: { used: 20, total: 21 },
    lastMaintenance: '2024-01-05'
  },
  {
    id: '4',
    modelCode: 'C156',
    equipmentNumber: 156,
    status: 'offline',
    location: '2공장 C구역',
    processes: ['3공정', '2공종'],
    toolPositions: { used: 12, total: 21 },
    lastMaintenance: '2023-12-28'
  },
  {
    id: '5',
    modelCode: 'C342',
    equipmentNumber: 342,
    status: 'active',
    location: '3공장 A구역',
    processes: ['2공정'],
    toolPositions: { used: 19, total: 21 },
    lastMaintenance: '2024-01-12'
  }
]

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>(initialEquipments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // 필터링된 설비 목록
  const filteredEquipments = useMemo(() => {
    return equipments.filter(equipment => {
      const matchesSearch = searchTerm === '' || 
        equipment.modelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.equipmentNumber.toString().includes(searchTerm) ||
        equipment.location.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === '' || equipment.status === statusFilter
      const matchesModel = modelFilter === '' || equipment.modelCode === modelFilter
      
      return matchesSearch && matchesStatus && matchesModel
    })
  }, [equipments, searchTerm, statusFilter, modelFilter])

  // 상태별 색상
  const getStatusBadge = (status: Equipment['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'maintenance':
        return 'bg-red-100 text-red-800'
      case 'offline':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: Equipment['status']) => {
    switch (status) {
      case 'active':
        return '가동 중'
      case 'maintenance':
        return '점검 중'
      case 'offline':
        return '정지'
      default:
        return '알 수 없음'
    }
  }

  // 설비 상태 변경
  const handleStatusChange = (equipmentId: string, newStatus: Equipment['status']) => {
    setEquipments(prev => prev.map(eq => 
      eq.id === equipmentId ? { ...eq, status: newStatus } : eq
    ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설비 관리</h1>
        <p className="text-gray-600">800대 CNC 설비 현황 및 관리</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-sm text-gray-600">총 설비</p>
              <p className="text-xl font-bold text-gray-900">{equipments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              ✅
            </div>
            <div>
              <p className="text-sm text-gray-600">가동 중</p>
              <p className="text-xl font-bold text-green-600">
                {equipments.filter(eq => eq.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              🔧
            </div>
            <div>
              <p className="text-sm text-gray-600">점검 중</p>
              <p className="text-xl font-bold text-red-600">
                {equipments.filter(eq => eq.status === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              ⏸️
            </div>
            <div>
              <p className="text-sm text-gray-600">정지</p>
              <p className="text-xl font-bold text-gray-600">
                {equipments.filter(eq => eq.status === 'offline').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="설비 번호 또는 모델명, 위치 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="active">가동 중</option>
              <option value="maintenance">점검 중</option>
              <option value="offline">정지</option>
            </select>
          </div>
          <div>
            <select 
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 설비</option>
              <option value="C001-C100">C001-C100</option>
              <option value="C101-C200">C101-C200</option>
              <option value="C201-C300">C201-C300</option>
              <option value="C301-C400">C301-C400</option>
              <option value="C401-C500">C401-C500</option>
              <option value="C501-C600">C501-C600</option>
              <option value="C601-C700">C601-C700</option>
              <option value="C701-C800">C701-C800</option>
            </select>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + 설비 추가
          </button>
        </div>
      </div>

      {/* 설비 목록 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            설비 목록 ({filteredEquipments.length}개)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설비 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공구 위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마지막 점검
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEquipments.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {equipment.modelCode}
                      </div>
                      <div className="text-sm text-gray-500">{equipment.processes.join(', ')}</div>
                      <div className="text-xs text-gray-400">{equipment.location}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(equipment.status)}`}>
                      {getStatusText(equipment.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${(equipment.toolPositions.used / equipment.toolPositions.total) * 100}%`}}
                        ></div>
                      </div>
                      <span className="text-sm">
                        {equipment.toolPositions.used}/{equipment.toolPositions.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {equipment.lastMaintenance}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">상세</button>
                    
                    {equipment.status === 'active' && (
                      <button 
                        onClick={() => handleStatusChange(equipment.id, 'maintenance')}
                        className="text-yellow-600 hover:text-yellow-800 mr-3"
                      >
                        점검
                      </button>
                    )}
                    
                    {equipment.status === 'maintenance' && (
                      <button 
                        onClick={() => handleStatusChange(equipment.id, 'active')}
                        className="text-green-600 hover:text-green-800 mr-3"
                      >
                        재가동
                      </button>
                    )}
                    
                    {equipment.status === 'offline' && (
                      <button 
                        onClick={() => handleStatusChange(equipment.id, 'active')}
                        className="text-green-600 hover:text-green-800 mr-3"
                      >
                        가동
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 검색 결과가 없을 때 */}
      {filteredEquipments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">검색 조건에 맞는 설비가 없습니다.</p>
          <button 
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('')
              setModelFilter('')
            }}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* 설비 추가 모달 (간단한 알림) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-medium mb-4">설비 추가</h3>
            <p className="text-gray-600 mb-4">
              설비 추가 기능은 다음 단계에서 구현될 예정입니다.
            </p>
            <button 
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 