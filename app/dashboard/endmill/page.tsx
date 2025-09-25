'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createUpdateConfirmation, createCustomConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import { useSettings } from '../../../lib/hooks/useSettings'
import EndmillExcelUploader from '../../../components/features/EndmillExcelUploader'
import EndmillForm from '../../../components/features/EndmillForm'
import EndmillSupplierPrices from '../../../components/features/EndmillSupplierPrices'
import { downloadEndmillTemplate } from '../../../lib/utils/endmillExcelTemplate'

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
  camSheets?: Array<{
    model: string
    process: string
    toolLife: number
    tNumber: number
  }>
}

// 실제 데이터베이스에서 앤드밀 인스턴스 데이터를 가져오는 함수로 교체 예정

export default function EndmillPage() {
  const queryClient = useQueryClient()
  const [endmills, setEndmills] = useState<EndmillInstance[]>([])
  const [equipments, setEquipments] = useState<any[]>([])
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
  const [showExcelUploader, setShowExcelUploader] = useState(false)
  const [showEndmillForm, setShowEndmillForm] = useState(false)
  
  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const itemsPerPage = settings.system.itemsPerPage
  const categories = settings.inventory.categories
  const equipmentLocations = settings.equipment.locations
  const totalEquipmentCount = settings.equipment.totalCount
  const toolPositionCount = settings.equipment.toolPositionCount

  // 실제 데이터베이스에서 데이터 로드 및 URL 파라미터 처리
  useEffect(() => {
    // URL 파라미터에서 검색어 추출
    const urlParams = new URLSearchParams(window.location.search)
    const searchParam = urlParams.get('search')
    if (searchParam) {
      setSearchTerm(searchParam)
      // URL 파라미터를 제거하여 깔끔하게 유지
      window.history.replaceState({}, '', window.location.pathname)
    }

    // 실제 엔드밀 데이터 로드
    loadEndmillData()
    loadEquipmentData()
  }, [])

  const loadEndmillData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/endmill')
      if (!response.ok) {
        throw new Error('엔드밀 데이터 로드 실패')
      }

      const result = await response.json()
      if (result.success) {
        // API 응답 데이터를 UI 형식에 맞게 변환
        const transformedData: EndmillInstance[] = result.data.map((item: any) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.categoryName || item.category || 'N/A', // categoryName을 우선 사용
          equipment: Array.from(new Set(item.camSheets?.map((cs: any) => cs.model) || [])).join(', ') || 'N/A',
          location: item.inventory?.location || 'N/A',
          process: Array.from(new Set(item.camSheets?.map((cs: any) => cs.process) || [])).join(', ') || 'N/A',
          position: Array.from(new Set(item.camSheets?.map((cs: any) => `T${cs.tNumber}`) || [])).join(', ') || 'N/A',
          currentLife: 0, // 실제 사용량 데이터가 필요
          totalLife: item.camSheets?.[0]?.toolLife || item.standardLife || 1000,
          status: item.inventory?.status || 'new',
          installDate: new Date().toISOString().split('T')[0],
          lastMaintenance: new Date().toISOString().split('T')[0],
          // camSheets 데이터를 직접 포함
          camSheets: item.camSheets || []
        }))

        setEndmills(transformedData)
      } else {
        showError('데이터 로드 실패', '엔드밀 데이터를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('엔드밀 데이터 로드 오류:', error)
      showError('오류 발생', '엔드밀 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadEquipmentData = async () => {
    try {
      const response = await fetch('/api/equipment')
      if (!response.ok) {
        throw new Error('설비 데이터 로드 실패')
      }

      const result = await response.json()
      if (result.success) {
        setEquipments(result.data)
      } else {
        console.error('설비 데이터 로드 실패:', result.error)
      }
    } catch (error) {
      console.error('설비 데이터 로드 오류:', error)
    }
  }

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
      todayReplaced: 0 // 실제 교체 기록에서 계산 예정
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

  // 현황 정보 집계 함수 - 실제 설비 데이터 기반으로 계산
  const getEndmillUsageInfo = (code: string) => {
    // 해당 엔드밀 코드가 사용되는 모델/공정 조합 찾기
    const endmillData = endmills.find(e => e.code === code)

    // 디버깅 로그
    console.log(`[DEBUG] ${code} - endmillData:`, endmillData)
    console.log(`[DEBUG] ${code} - equipments count:`, equipments.length)

    if (!endmillData || !endmillData.camSheets) {
      console.log(`[DEBUG] ${code} - No endmill data or camSheets`)
      return {
        usedEquipmentCount: 0,
        usedModels: [],
        usedProcesses: [],
        usedEquipmentNumbers: []
      }
    }

    // CAM Sheet에서 해당 코드가 사용되는 모델/공정 조합들
    const modelProcessPairs = endmillData.camSheets.map((cs: any) => ({
      model: cs.model,
      process: cs.process
    }))

    console.log(`[DEBUG] ${code} - modelProcessPairs:`, modelProcessPairs)

    // 실제 설비 데이터에서 해당 모델/공정 조합을 가진 설비들 찾기
    const matchingEquipments = equipments.filter(eq => {
      return modelProcessPairs.some(pair =>
        eq.current_model === pair.model && eq.process === pair.process
      )
    })

    console.log(`[DEBUG] ${code} - matchingEquipments:`, matchingEquipments.length)

    const usedModels = Array.from(new Set(modelProcessPairs.map(p => p.model)))
    const usedProcesses = Array.from(new Set(modelProcessPairs.map(p => p.process)))
    const usedEquipmentNumbers = matchingEquipments.map(eq => eq.equipment_number)

    return {
      usedEquipmentCount: matchingEquipments.length,
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

  // 템플릿 다운로드 핸들러
  const handleDownloadTemplate = () => {
    const result = downloadEndmillTemplate()
    if (result.success) {
      showSuccess('템플릿 다운로드', `${result.fileName} 파일이 다운로드되었습니다.`)
    } else {
      showError('다운로드 실패', result.error || '템플릿 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 엑셀 업로드 성공 핸들러
  const handleUploadSuccess = (data: any[]) => {
    showSuccess('업로드 완료', '엔드밀 데이터가 성공적으로 등록되었습니다.')
    // CAM Sheet 데이터 새로고침 (일괄 등록 시 CAM Sheet도 생성되므로)
    queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    // 엔드밀 데이터 새로고침
    loadEndmillData()
  }

  // 개별 등록 성공 핸들러
  const handleCreateSuccess = (data: any) => {
    showSuccess('등록 완료', '엔드밀이 성공적으로 등록되었습니다.')
    // CAM Sheet 데이터 새로고침 (엔드밀 등록 시 CAM Sheet도 생성되므로)
    queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    // 엔드밀 데이터 새로고침
    loadEndmillData()
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
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600">앤드밀 별 모델, 설비, 공정의 사용 현황</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEndmillForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            ➕ 신규 엔드밀 등록
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            📥 엑셀 템플릿 다운로드
          </button>
          <button
            onClick={() => setShowExcelUploader(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📤 엔드밀 일괄 등록
          </button>
        </div>
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
                  엔드밀 코드 {sortColumn === 'code' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('category')}>
                  카테고리 {sortColumn === 'category' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('name')}>
                  이름 {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용 댓수
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
                      <div className="text-sm font-medium text-gray-900">{item.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(() => {
                          // 이름에서 타입명(FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL) 제거
                          const name = item.name.replace(/^(FLAT|BALL|T-CUT|C-CUT|REAMER|DRILL)\s*/i, '')
                          return name
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getEndmillUsageInfo(item.code).usedEquipmentCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetail(item)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        세부보기
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

      {/* 데이터가 없거나 검색 결과가 없을 때 */}
      {endmills.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🔧</span>
          </div>
          <p className="text-lg text-gray-600 mb-2">표시할 앤드밀 데이터가 없습니다</p>
          <p className="text-sm text-gray-500">앤드밀 마스터 데이터를 등록하거나 데이터베이스 설정을 확인해주세요.</p>
        </div>
      )}

      {/* 검색 결과가 없을 때 */}
      {endmills.length > 0 && sortedEndmills.length === 0 && (
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

              {/* 공급업체별 가격 정보 */}
              <div className="border-t pt-6">
                <EndmillSupplierPrices
                  endmillId={selectedEndmill.id}
                  endmillCode={selectedEndmill.code}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 개별 등록 모달 */}
      {showEndmillForm && (
        <EndmillForm
          onSuccess={handleCreateSuccess}
          onClose={() => setShowEndmillForm(false)}
        />
      )}

      {/* 엑셀 업로더 모달 */}
      {showExcelUploader && (
        <EndmillExcelUploader
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowExcelUploader(false)}
        />
      )}
    </div>
  )
} 