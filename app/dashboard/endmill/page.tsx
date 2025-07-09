'use client'

import { useState, useMemo, useEffect } from 'react'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createUpdateConfirmation, createCustomConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import { useSettings } from '../../../lib/hooks/useSettings'

// 앤드밀 인스턴스 타입 정의
interface EndmillInstance {
  id: string
  code: string
  name: string
  category: string
  equipment: string
  location: string
  process: string
  position: string
  currentLife: number
  totalLife: number
  status: 'new' | 'active' | 'warning' | 'critical'
  installDate: string
  lastMaintenance: string
}

// 앤드밀 데이터 생성 함수 - 설정값 기반
const generateEndmillData = (
  totalEquipments: number,
  toolPositions: number,
  availableCategories: string[],
  availableLocations: string[]
): EndmillInstance[] => {
  const categories = availableCategories.length > 0 ? availableCategories : ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL']
  const processes = ['CNC1', 'CNC2', 'CNC2-1']
  const locations = availableLocations.length > 0 ? availableLocations : ['A동', 'B동']
  const items: EndmillInstance[] = []
  
  // 설비 수 * 툴 포지션 수 = 총 앤드밀 개수
  const totalEndmills = totalEquipments * toolPositions
  for (let i = 1; i <= totalEndmills; i++) {
    const equipmentNum = Math.floor((i - 1) / toolPositions) + 1
    const equipment = `C${equipmentNum.toString().padStart(3, '0')}`
    const position = `T${(((i - 1) % toolPositions) + 1).toString().padStart(2, '0')}`
    const category = categories[Math.floor(Math.random() * categories.length)]
    const process = processes[Math.floor(Math.random() * processes.length)]
    
    const totalLife = 1500 + Math.floor(Math.random() * 1500) // 1500-3000
    const currentLife = Math.floor(Math.random() * totalLife)
    
    // 상태 결정
    let status: 'new' | 'active' | 'warning' | 'critical'
    const lifePercentage = (currentLife / totalLife) * 100
    if (lifePercentage < 10) status = 'critical'
    else if (lifePercentage < 30) status = 'warning'
    else if (currentLife === 0) status = 'new'
    else status = 'active'
    
    // 설치일과 마지막 정비일
    const installDate = new Date()
    installDate.setDate(installDate.getDate() - Math.floor(Math.random() * 180))
    
    const lastMaintenance = new Date()
    lastMaintenance.setDate(lastMaintenance.getDate() - Math.floor(Math.random() * 30))
    
    items.push({
      id: i.toString(),
      code: `AT${(Math.floor(Math.random() * 100) + 1).toString().padStart(3, '0')}`,
      name: `${category} ${6 + Math.floor(Math.random() * 15)}mm ${2 + Math.floor(Math.random() * 4)}날`,
      category,
      equipment,
      location: locations[Math.floor((equipmentNum - 1) / Math.ceil(totalEquipments / locations.length))],
      process,
      position,
      currentLife,
      totalLife,
      status,
      installDate: installDate.toISOString().split('T')[0],
      lastMaintenance: lastMaintenance.toISOString().split('T')[0]
    })
  }
  
  return items.sort((a, b) => a.equipment.localeCompare(b.equipment) || a.position.localeCompare(b.position))
}

export default function EndmillPage() {
  const [endmills, setEndmills] = useState<EndmillInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const confirmation = useConfirmation()
  const { showSuccess, showError, showWarning } = useToast()
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const { camSheets } = useCAMSheets()
  const [selectedEndmill, setSelectedEndmill] = useState<EndmillInstance | null>(null)
  
  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const itemsPerPage = settings.system.itemsPerPage
  const categories = settings.inventory.categories
  const equipmentLocations = settings.equipment.locations
  const totalEquipmentCount = settings.equipment.totalCount
  const toolPositionCount = settings.equipment.toolPositionCount

  // 클라이언트 사이드에서만 데이터 로드 - 설정값 기반
  useEffect(() => {
    setEndmills(generateEndmillData(
      totalEquipmentCount,
      toolPositionCount,
      categories,
      equipmentLocations
    ))
    setIsLoading(false)
  }, [totalEquipmentCount, toolPositionCount, categories, equipmentLocations])

  // 필터링된 앤드밀 목록
  const filteredEndmills = useMemo(() => {
    return endmills.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === '' || item.status === statusFilter
      const matchesType = typeFilter === '' || item.category.toLowerCase() === typeFilter.toLowerCase()
      
      return matchesSearch && matchesStatus && matchesType
    })
  }, [endmills, searchTerm, statusFilter, typeFilter])

  // 정렬 함수
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // 정렬 적용된 앤드밀 목록
  const sortedEndmills = useMemo(() => {
    const arr = [...filteredEndmills]
    if (!sortColumn) return arr
    return arr.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof EndmillInstance]
      let bValue: any = b[sortColumn as keyof EndmillInstance]
      // 숫자/문자 구분
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      } else {
        aValue = aValue?.toString() || ''
        bValue = bValue?.toString() || ''
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
    })
  }, [filteredEndmills, sortColumn, sortDirection])

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedEndmills.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEndmills = sortedEndmills.slice(startIndex, endIndex)

  // 필터 상태 변경 시 첫 페이지로 이동
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter])

  // 상태별 통계
  const statusStats = useMemo(() => {
    return {
      total: endmills.length,
      active: endmills.filter(item => item.status === 'active').length,
      warning: endmills.filter(item => item.status === 'warning').length,
      critical: endmills.filter(item => item.status === 'critical').length,
      todayReplaced: Math.floor(Math.random() * 50) + 10 // 임시로 랜덤 값
    }
  }, [endmills])

  // 상태 배지 색상
  const getStatusBadge = (status: EndmillInstance['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: EndmillInstance['status']) => {
    switch (status) {
      case 'new':
        return '신규'
      case 'active':
        return '정상'
      case 'warning':
        return '교체 권장'
      case 'critical':
        return '즉시 교체'
      default:
        return '알 수 없음'
    }
  }

  const getStatusIcon = (status: EndmillInstance['status']) => {
    switch (status) {
      case 'new':
        return '🆕'
      case 'active':
        return '🔧'
      case 'warning':
        return '⚠️'
      case 'critical':
        return '🚨'
      default:
        return '❓'
    }
  }

  // 현황 정보 집계 함수
  const getEndmillUsageInfo = (code: string) => {
    // CAM Sheet에서 해당 코드가 포함된 모델/공정 추출
    const usedInSheets = camSheets.filter(sheet =>
      (sheet.cam_sheet_endmills || []).some((e: any) => e.endmill_code === code)
    )
    const usedModels = Array.from(new Set(usedInSheets.map(s => s.model)))
    const usedProcesses = Array.from(new Set(usedInSheets.map(s => s.process)))
    // 설비 데이터(목업)에서 해당 코드가 사용중인 설비 수 추출
    const usedEquipments = endmills.filter(e => e.code === code)
    const usedEquipmentNumbers = Array.from(new Set(usedEquipments.map(e => e.equipment)))
    return {
      usedEquipmentCount: usedEquipmentNumbers.length,
      usedModels,
      usedProcesses,
      usedEquipmentNumbers
    }
  }

  // 상세 버튼 클릭 핸들러 수정
  const handleViewDetail = (item: EndmillInstance) => {
    setSelectedEndmill(item)
  }

  const handleImmediateReplace = async (item: EndmillInstance) => {
    const confirmed = await confirmation.showConfirmation(
      createCustomConfirmation(
        'warning',
        '즉시 교체 확인',
        `${item.equipment} ${item.position}의 앤드밀을 즉시 교체하시겠습니까?\n\n앤드밀: ${item.code} - ${item.name}\n현재 수명: ${item.currentLife.toLocaleString()}회 / ${item.totalLife.toLocaleString()}회\n⚠️ 위험: 즉시 교체가 필요한 상태입니다.`,
        '즉시 교체',
        '취소'
      )
    )

    if (confirmed) {
      // 교체 실적 등록 페이지로 이동 (데이터와 함께)
      const url = `/dashboard/tool-changes?equipment=${item.equipment}&process=${item.process}&tNumber=${item.position.replace('T', '')}&reason=즉시교체`
      window.location.href = url
      showSuccess('교체 처리 시작', `${item.equipment} ${item.position} 앤드밀 교체를 진행합니다.`)
    }
  }

  const handleScheduleReplace = async (item: EndmillInstance) => {
    const confirmed = await confirmation.showConfirmation(
      createCustomConfirmation(
        'warning',
        '교체 예약 확인',
        `${item.equipment} ${item.position}의 앤드밀 교체를 예약하시겠습니까?\n\n앤드밀: ${item.code} - ${item.name}\n현재 수명: ${item.currentLife.toLocaleString()}회 / ${item.totalLife.toLocaleString()}회\n⚠️ 경고: 교체 권장 상태입니다.`,
        '교체 예약',
        '취소'
      )
    )

    if (confirmed) {
      // 앤드밀 상태를 예약됨으로 변경하고 알림 등록
      showWarning('교체 예약 완료', `${item.equipment} ${item.position} 앤드밀 교체가 예약되었습니다. 적절한 시기에 교체해 주세요.`)
    }
  }

  const handleMaintenance = async (item: EndmillInstance) => {
    const confirmed = await confirmation.showConfirmation(
      createCustomConfirmation(
        'update',
        '정비 확인',
        `${item.equipment} ${item.position}의 앤드밀 정비를 진행하시겠습니까?\n\n앤드밀: ${item.code} - ${item.name}\n현재 수명: ${item.currentLife.toLocaleString()}회 / ${item.totalLife.toLocaleString()}회\nℹ️ 상태: 정상 사용 중입니다.`,
        '정비 진행',
        '취소'
      )
    )

    if (confirmed) {
      // 정비 기록 등록
      const updatedEndmills = endmills.map(endmill => 
        endmill.id === item.id 
          ? { ...endmill, lastMaintenance: new Date().toISOString().split('T')[0] }
          : endmill
      )
      setEndmills(updatedEndmills)
      showSuccess('정비 완료', `${item.equipment} ${item.position} 앤드밀 정비가 완료되었습니다.`)
    }
  }

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-gray-600">앤드밀 별 모델, 설비, 공정의 사용 현황</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <p className="text-gray-600">앤드밀 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600">앤드밀 별 모델, 설비, 공정의 사용 현황</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="앤드밀 코드, 설비, 위치 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 상태</option>
            <option value="new">신규</option>
            <option value="active">사용중</option>
            <option value="warning">경고</option>
            <option value="critical">위험</option>
          </select>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 타입</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        {/* 필터 초기화 버튼 */}
        {(searchTerm || statusFilter || typeFilter) && (
          <div className="mt-4">
            <button 
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
                setCurrentPage(1)
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {/* 앤드밀 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            앤드밀 현황 ({sortedEndmills.length}개)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            페이지 {currentPage} / {totalPages} (1페이지당 {itemsPerPage}개)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('code')}>
                  앤드밀 정보 {sortColumn === 'code' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('equipment')}>
                  위치 {sortColumn === 'equipment' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('process')}>
                  공정 {sortColumn === 'process' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('position')}>
                  위치번호 {sortColumn === 'position' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('name')}>
                  이름 {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('category')}>
                  카테고리 {sortColumn === 'category' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEndmills.map((item) => {
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          item.status === 'critical' ? 'bg-red-100' :
                          item.status === 'warning' ? 'bg-yellow-100' :
                          item.status === 'new' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {getStatusIcon(item.status)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.code}</div>
                          <div className="text-sm text-gray-500">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.equipment} ({getEndmillUsageInfo(item.code).usedEquipmentCount}대 사용중)
                      </div>
                      <div className="text-sm text-gray-500">{item.process} {item.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.process}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* 이름만 표시 (타입 제거) */}
                      {(() => {
                        // 이름에서 타입명(FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL) 제거
                        const name = item.name.replace(/^(FLAT|BALL|T-CUT|C-CUT|REAMER|DRILL)\s*/i, '')
                        return name
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => handleViewDetail(item)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                )
              })}
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
                  총 <span className="font-medium">{sortedEndmills.length}</span>개 중{' '}
                  <span className="font-medium">{startIndex + 1}</span>-
                  <span className="font-medium">{Math.min(endIndex, sortedEndmills.length)}</span>개 표시
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
      {sortedEndmills.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">검색 조건에 맞는 앤드밀이 없습니다.</p>
          <button 
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('')
              setTypeFilter('')
              setCurrentPage(1)
            }}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            필터 초기화
          </button>
        </div>
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

      {/* 상세 모달 */}
      {selectedEndmill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">앤드밀 현황 상세 - {selectedEndmill.code}</h3>
              <button 
                onClick={() => setSelectedEndmill(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 현황 정보 */}
              {(() => {
                const usage = getEndmillUsageInfo(selectedEndmill.code)
                return (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-2">현재 사용중인 현황</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">사용중인 설비 수</span>
                        <div className="text-lg font-bold text-blue-600">{usage.usedEquipmentCount}대</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">사용중인 설비번호</span>
                        <div className="text-sm text-gray-900">{usage.usedEquipmentNumbers.join(', ') || '-'}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">사용중인 모델</span>
                        <div className="text-sm text-gray-900">{usage.usedModels.join(', ') || '-'}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">사용중인 공정</span>
                        <div className="text-sm text-gray-900">{usage.usedProcesses.join(', ') || '-'}</div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">앤드밀 코드</span>
                  <div className="text-lg font-bold text-gray-900">{selectedEndmill.code}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">타입/이름</span>
                  <div className="text-sm text-gray-900">{selectedEndmill.name}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">카테고리</span>
                  <div className="text-sm text-gray-900">{selectedEndmill.category}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">설비</span>
                  <div className="text-sm text-gray-900">{selectedEndmill.equipment}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">위치</span>
                  <div className="text-sm text-gray-900">{selectedEndmill.position}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">공정</span>
                  <div className="text-sm text-gray-900">{selectedEndmill.process}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 