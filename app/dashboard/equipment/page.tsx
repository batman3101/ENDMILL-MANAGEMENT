'use client'

import { useState, useMemo, useEffect } from 'react'

// 로컬 상태용 타입 정의
interface Equipment {
  id: string
  equipmentNumber: string // C001-C800
  location: 'A동' | 'B동'
  status: '가동중' | '점검중' | '셋업중'
  currentModel: string // 현재 생산 모델
  process: string // CNC1, CNC2, CNC2-1 등
  toolPositions: {
    used: number
    total: number
  }
  lastMaintenance: string
}

// 800대 설비 데이터 생성 함수
const generateEquipmentData = (): Equipment[] => {
  const equipments: Equipment[] = []
  const models = ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  const processes = ['CNC1', 'CNC2', 'CNC2-1']
  const locations: ('A동' | 'B동')[] = ['A동', 'B동']
  const statuses: ('가동중' | '점검중' | '셋업중')[] = ['가동중', '점검중', '셋업중']
  
  for (let i = 1; i <= 800; i++) {
    const equipmentNumber = `C${i.toString().padStart(3, '0')}`
    const location = i <= 400 ? 'A동' : 'B동'
    const currentModel = models[Math.floor(Math.random() * models.length)]
    const process = processes[Math.floor(Math.random() * processes.length)]
    
    // 상태 분포: 가동중 70%, 점검중 20%, 셋업중 10%
    let status: '가동중' | '점검중' | '셋업중'
    const rand = Math.random()
    if (rand < 0.7) status = '가동중'
    else if (rand < 0.9) status = '점검중'
    else status = '셋업중'
    
    // 앤드밀 사용량: 점검중이면 0, 나머지는 15-21개
    const used = status === '점검중' ? 0 : Math.floor(Math.random() * 7) + 15
    
    // 마지막 점검일
    const lastMaintenanceDate = new Date()
    lastMaintenanceDate.setDate(lastMaintenanceDate.getDate() - Math.floor(Math.random() * 30))
    
    equipments.push({
      id: i.toString(),
      equipmentNumber,
      location,
      status,
      currentModel,
      process,
      toolPositions: { used, total: 21 },
      lastMaintenance: lastMaintenanceDate.toISOString().split('T')[0]
    })
  }
  
  return equipments
}

// 샘플 데이터
const initialEquipments: Equipment[] = generateEquipmentData()

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>(initialEquipments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // 필터링된 설비 목록
  const filteredEquipments = useMemo(() => {
    return equipments.filter(equipment => {
      const matchesSearch = searchTerm === '' || 
        equipment.equipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.currentModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.process.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === '' || equipment.status === statusFilter
      const matchesModel = modelFilter === '' || equipment.currentModel === modelFilter
      
      return matchesSearch && matchesStatus && matchesModel
    })
  }, [equipments, searchTerm, statusFilter, modelFilter])

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEquipments = filteredEquipments.slice(startIndex, endIndex)

  // 필터가 변경되면 첫 페이지로 이동
  const resetToFirstPage = () => {
    setCurrentPage(1)
  }

  // 필터 상태 변경 시 첫 페이지로 이동
  useMemo(() => {
    resetToFirstPage()
  }, [searchTerm, statusFilter, modelFilter])

  // 상태별 색상
  const getStatusBadge = (status: Equipment['status']) => {
    switch (status) {
      case '가동중':
        return 'bg-green-100 text-green-800'
      case '점검중':
        return 'bg-red-100 text-red-800'
      case '셋업중':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Equipment['status']) => {
    switch (status) {
      case '가동중':
        return '🟢'
      case '점검중':
        return '🔧'
      case '셋업중':
        return '⚙️'
      default:
        return '❓'
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
        <p className="text-gray-600">800대 CNC 설비 현황 및 관리</p>
      </div>

      {/* 상단 설비 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-sm text-gray-600">총 설비</p>
              <p className="text-xl font-bold text-gray-900">{equipments.length}대</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              🟢
            </div>
            <div>
              <p className="text-sm text-gray-600">가동설비</p>
              <p className="text-xl font-bold text-green-600">
                {equipments.filter(eq => eq.status === '가동중').length}대
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
              <p className="text-sm text-gray-600">점검중</p>
              <p className="text-xl font-bold text-red-600">
                {equipments.filter(eq => eq.status === '점검중').length}대
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              ⚙️
            </div>
            <div>
              <p className="text-sm text-gray-600">셋업중</p>
              <p className="text-xl font-bold text-orange-600">
                {equipments.filter(eq => eq.status === '셋업중').length}대
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 모델별/공정별 설비 배치 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 모델별 배치 현황 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 모델별 설비 배치</h3>
          <div className="space-y-3">
            {['PA1', 'PA2', 'PS', 'B7', 'Q7'].map(model => {
              const modelEquipments = equipments.filter(eq => eq.currentModel === model)
              const aCount = modelEquipments.filter(eq => eq.location === 'A동').length
              const bCount = modelEquipments.filter(eq => eq.location === 'B동').length
              const total = modelEquipments.length
              
              return (
                <div key={model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600">{model}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{model} 모델</p>
                      <p className="text-sm text-gray-500">A동: {aCount}대 | B동: {bCount}대</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{total}대</p>
                    <p className="text-xs text-gray-500">전체</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 공정별 배치 현황 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ 공정별 설비 배치</h3>
          <div className="space-y-3">
            {['CNC1', 'CNC2', 'CNC2-1'].map(process => {
              const processEquipments = equipments.filter(eq => eq.process === process)
              const aCount = processEquipments.filter(eq => eq.location === 'A동').length
              const bCount = processEquipments.filter(eq => eq.location === 'B동').length
              const total = processEquipments.length
              const activeCount = processEquipments.filter(eq => eq.status === '가동중').length
              
              return (
                <div key={process} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-xs font-bold text-green-600">{process}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{process} 공정</p>
                      <p className="text-sm text-gray-500">
                        A동: {aCount}대 | B동: {bCount}대 | 가동: {activeCount}대
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{total}대</p>
                    <p className="text-xs text-gray-500">전체</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="설비번호, 모델, 현장, 공정 검색..."
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
              <option value="가동중">가동중</option>
              <option value="점검중">점검중</option>
              <option value="셋업중">셋업중</option>
            </select>
          </div>
          <div>
            <select 
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 모델</option>
              <option value="PA1">PA1</option>
              <option value="PA2">PA2</option>
              <option value="PS">PS</option>
              <option value="B7">B7</option>
              <option value="Q7">Q7</option>
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
          <p className="text-sm text-gray-500 mt-1">
            페이지 {currentPage} / {totalPages} (1페이지당 {itemsPerPage}개)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설비번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  현장
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  모델
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공정
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  앤드밀 사용량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEquipments.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-gray-50">
                  {/* 설비번호 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {equipment.equipmentNumber}
                    </div>
                  </td>
                  
                  {/* 현장 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${equipment.location === 'A동' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm text-gray-900">{equipment.location}</span>
                    </div>
                  </td>
                  
                  {/* 상태 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(equipment.status)}`}>
                      <span className="mr-1">{getStatusIcon(equipment.status)}</span>
                      {equipment.status}
                    </span>
                  </td>
                  
                  {/* 모델 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {equipment.currentModel}
                    </div>
                  </td>
                  
                  {/* 공정 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {equipment.process}
                    </div>
                  </td>
                  
                  {/* 앤드밀 사용량 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
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
                  
                  {/* 작업 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">상세</button>
                    
                    {equipment.status === '가동중' && (
                      <>
                        <button 
                          onClick={() => handleStatusChange(equipment.id, '점검중')}
                          className="text-yellow-600 hover:text-yellow-800 mr-2"
                        >
                          점검
                        </button>
                        <button 
                          onClick={() => handleStatusChange(equipment.id, '셋업중')}
                          className="text-orange-600 hover:text-orange-800 mr-2"
                        >
                          셋업
                        </button>
                      </>
                    )}
                    
                    {equipment.status === '점검중' && (
                      <>
                        <button 
                          onClick={() => handleStatusChange(equipment.id, '가동중')}
                          className="text-green-600 hover:text-green-800 mr-2"
                        >
                          재가동
                        </button>
                        <button 
                          onClick={() => handleStatusChange(equipment.id, '셋업중')}
                          className="text-orange-600 hover:text-orange-800 mr-2"
                        >
                          셋업
                        </button>
                      </>
                    )}
                    
                    {equipment.status === '셋업중' && (
                      <>
                        <button 
                          onClick={() => handleStatusChange(equipment.id, '가동중')}
                          className="text-green-600 hover:text-green-800 mr-2"
                        >
                          가동
                        </button>
                        <button 
                          onClick={() => handleStatusChange(equipment.id, '점검중')}
                          className="text-yellow-600 hover:text-yellow-800 mr-2"
                        >
                          점검
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="bg-white px-6 py-3 flex items-center justify-between border-t">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  총 <span className="font-medium">{filteredEquipments.length}</span>개 중{' '}
                  <span className="font-medium">{startIndex + 1}</span>-
                  <span className="font-medium">{Math.min(endIndex, filteredEquipments.length)}</span>개 표시
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  
                  {/* 페이지 번호들 */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
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
              setCurrentPage(1)
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