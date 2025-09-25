'use client'

import { useState, useMemo } from 'react'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createStatusChangeConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import StatusChangeDropdown from '../../../components/shared/StatusChangeDropdown'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useEquipment, useEquipmentStatus, Equipment } from '../../../lib/hooks/useEquipment'
import PageLoadingIndicator, { SkeletonCard, SkeletonTableRow } from '../../../components/shared/PageLoadingIndicator'
import EquipmentExcelUploader from '../../../components/features/EquipmentExcelUploader'

export default function EquipmentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<'equipment_number' | 'location' | 'status' | 'current_model' | 'process'>('equipment_number')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editEquipment, setEditEquipment] = useState<any>(null)
  const confirmation = useConfirmation()
  const { showSuccess, showError } = useToast()

  // Supabase에서 실제 데이터 가져오기
  const {
    equipments,
    loading: isLoading,
    error: dataError,
    refetch,
    createEquipment,
    updateEquipment,
    getEquipmentStats,
    getAvailableModels,
    getAvailableProcesses,
    getAvailableLocations
  } = useEquipment()

  const { changeStatus } = useEquipmentStatus()

  // 설정에서 값 가져오기
  const { settings, updateCategorySettings } = useSettings()
  const itemsPerPage = 20 // 20대씩 고정 표시
  const equipmentLocations = getAvailableLocations()
  const equipmentStatuses = settings.equipment.statuses
  const toolPositionCount = settings.equipment.toolPositionCount


  
  // 설비 추가 폼 상태
  const [addFormData, setAddFormData] = useState({
    equipmentNumber: '',
    location: 'A동' as 'A동' | 'B동',
    status: '가동중' as '가동중' | '점검중' | '셋업중',
    currentModel: '',
    process: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // CAM Sheet 데이터 가져오기
  const { camSheets, getAvailableModels: getCamSheetModels, getAvailableProcesses: getCamSheetProcesses } = useCAMSheets()
  const availableModels = getCamSheetModels // CAM Sheet에서 등록된 모델 사용
  const availableProcesses = getCamSheetProcesses // CAM Sheet에서 등록된 공정 사용
  const equipmentAvailableModels = getAvailableModels() // equipment hook의 모델 (기본값용)
  const equipmentAvailableProcesses = getAvailableProcesses() // equipment hook의 공정 (기본값용)



  // 필터링 및 정렬된 설비 목록
  const filteredEquipments = useMemo(() => {
    let filtered = equipments.filter(equipment => {
      const matchesSearch = searchTerm === '' ||
        equipment.equipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.current_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.process?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === '' || equipment.status === statusFilter
      const matchesModel = modelFilter === '' || equipment.current_model === modelFilter

      return matchesSearch && matchesStatus && matchesModel
    })

    // 정렬 적용
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // 설비번호 정렬 시 숫자로 변환
      if (sortField === 'equipment_number') {
        aValue = parseInt(a.equipment_number?.toString() || '0')
        bValue = parseInt(b.equipment_number?.toString() || '0')
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [equipments, searchTerm, statusFilter, modelFilter, sortField, sortOrder])



  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEquipments = filteredEquipments.slice(startIndex, endIndex)

  // 필터가 변경되면 첫 페이지로 이동
  const resetToFirstPage = () => {
    setCurrentPage(1)
  }

  // 필터나 정렬 상태 변경 시 첫 페이지로 이동
  useMemo(() => {
    resetToFirstPage()
  }, [searchTerm, statusFilter, modelFilter, sortField, sortOrder])

  // 상태별 색상
  const getStatusBadge = (status: Equipment['status']) => {
    switch (status) {
      case '가동중':
        return 'bg-green-100 text-green-800'
      case '점검중':
        return 'bg-red-100 text-red-800'
      case '셋업중':
        return 'bg-purple-100 text-purple-800'
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

  // 상태 관련 함수들은 StatusChangeDropdown 컴포넌트로 이동됨

  // 설비 상태 변경
  const handleStatusChange = async (equipmentId: string, newStatus: string) => {
    const equipment = equipments.find(eq => eq.id === equipmentId)
    if (!equipment) return

    const confirmed = await confirmation.showConfirmation(
      createStatusChangeConfirmation(
        equipment.equipment_number,
        equipment.status || '',
        newStatus
      )
    )

    if (confirmed) {
      changeStatus(equipmentId, newStatus)
      showSuccess(
        '상태 변경 완료',
        `${equipment.equipment_number}의 상태가 ${newStatus}(으)로 변경되었습니다.`
      )
    }
  }

  // 설비 추가 처리
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!addFormData.equipmentNumber.trim()) {
      showError('입력 오류', '설비번호를 입력해주세요.')
      return
    }
    
    if (!addFormData.currentModel) {
      showError('입력 오류', '모델을 선택해주세요.')
      return
    }
    
    if (!addFormData.process) {
      showError('입력 오류', '공정을 선택해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      createEquipment({
        equipment_number: parseInt(addFormData.equipmentNumber.replace('C', '')),
        model_code: addFormData.currentModel,
        location: addFormData.location,
        status: addFormData.status,
        current_model: addFormData.currentModel,
        process: addFormData.process,
      })

      // 폼 초기화
      setAddFormData({
        equipmentNumber: '',
        location: 'A동',
        status: '가동중',
        currentModel: '',
        process: ''
      })

      setShowAddModal(false)
      showSuccess('설비 추가 완료', `설비 ${addFormData.equipmentNumber}가 성공적으로 추가되었습니다.`)

    } catch (error) {
      console.error('설비 추가 에러:', error)
      showError('설비 추가 실패', error instanceof Error ? error.message : '설비 추가 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 설비 번호 자동 생성
  const generateNextEquipmentNumber = () => {
    const existingNumbers = equipments.map(eq =>
      parseInt(eq.equipment_number?.toString() || '0')
    ).filter(num => !isNaN(num))

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
    const nextNumber = maxNumber + 1
    return nextNumber.toString()
  }

  // 정렬 토글 함수
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }


  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEquipment) return

    try {
      updateEquipment({
        id: editEquipment.id,
        location: editEquipment.location,
        status: editEquipment.status,
        current_model: editEquipment.current_model,
        process: editEquipment.process
      })

      setShowEditModal(false)
      showSuccess('설비 수정 완료', `설비 C${editEquipment.equipment_number?.toString().padStart(3, '0')}이(가) 수정되었습니다.`)
    } catch (error) {
      showError('설비 수정 실패', error instanceof Error ? error.message : '설비 수정 중 오류가 발생했습니다.')
    }
  }

  // 설비 편집 모달 열기
  const handleOpenEditModal = (equipment: any) => {
    setEditEquipment({
      ...equipment,
      equipmentNumber: `C${equipment.equipment_number?.toString().padStart(3, '0')}`
    })
    setShowEditModal(true)
  }

  // 설비 추가 모달 열기
  const handleOpenAddModal = () => {
    const defaultStatus = equipmentStatuses && equipmentStatuses.length > 0
      ? (equipmentStatuses[0]?.code || equipmentStatuses[0]?.name || equipmentStatuses[0] || '가동중')
      : '가동중'

    setAddFormData(prev => ({
      ...prev,
      equipmentNumber: generateNextEquipmentNumber(),
      location: (equipmentLocations && equipmentLocations.length > 0 ? equipmentLocations[0] : 'A동') as 'A동' | 'B동',
      status: defaultStatus as '가동중' | '점검중' | '셋업중',
      currentModel: availableModels[0] || '',
      process: availableProcesses[0] || ''
    }))
    setShowAddModal(true)
  }

  // 데이터 없음 아르면 메시지 표시
  if (!isLoading && equipments.length === 0 && !dataError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">표시할 설비 데이터가 없습니다</h3>
            <p className="text-gray-500 mb-4">데이터베이스에 설비 정보가 등록되어 있지 않습니다.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + 개별 설비 추가
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                📄 일괄 설비 추가
              </button>
            </div>
          </div>
        </div>

        {/* 설비 추가 모달 - 완전한 기능 구현 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">새 설비 추가</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isSubmitting}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddEquipment} className="p-6 space-y-4">
                {/* 설비번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설비번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addFormData.equipmentNumber}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, equipmentNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: C001"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* 위치 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    위치 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.location}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, location: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    {equipmentLocations && equipmentLocations.length > 0
                      ? equipmentLocations.map(location => (
                          <option key={location} value={location}>{location}</option>
                        ))
                      : [
                          <option key="A동" value="A동">A동</option>,
                          <option key="B동" value="B동">B동</option>
                        ]
                    }
                  </select>
                </div>

                {/* 초기 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    초기 상태 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.status}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, status: e.target.value as Equipment['status'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    {equipmentStatuses && equipmentStatuses.length > 0
                      ? equipmentStatuses.map((status, index) => (
                          <option key={String(status.code || status.name || status || index)} value={String(status.code || status.name || status)}>
                            {String(status.name || status)}
                          </option>
                        ))
                      : [
                          <option key="가동중" value="가동중">가동중</option>,
                          <option key="점검중" value="점검중">점검중</option>,
                          <option key="셋업중" value="셋업중">셋업중</option>
                        ]
                    }
                  </select>
                </div>

                {/* 모델 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    생산 모델 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.currentModel}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, currentModel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">모델 선택</option>
                    {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* 공정 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공정 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.process}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, process: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">공정 선택</option>
                    {(availableProcesses.length > 0 ? availableProcesses : equipmentAvailableProcesses).map(process => (
                      <option key={process} value={process}>{process}</option>
                    ))}
                  </select>
                </div>

                {/* 버튼 */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {isSubmitting ? '추가 중...' : '설비 추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 일괄 업로드 모달 */}
        {showBulkUploadModal && (
          <EquipmentExcelUploader
            onUploadSuccess={() => {
              setShowBulkUploadModal(false)
              refetch() // 데이터 새로고침
            }}
            onCancel={() => setShowBulkUploadModal(false)}
          />
        )}
      </div>
    )
  }

  // 에러 상태일 때
  if (dataError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 로드 오류</h3>
          <p className="text-gray-500 mb-4">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // 로딩 중일 때 - 개선된 스켈레톤 UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* 상단 카드 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} className="p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded mb-2 w-16"></div>
                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>

        {/* 차트 스켈레톤 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <SkeletonCard key={i} className="p-6">
              <div className="h-5 bg-gray-200 rounded mb-4 w-32"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-24 h-10 bg-gray-200 rounded-lg mr-3"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded mb-1 w-20"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-5 bg-gray-200 rounded mb-1 w-8"></div>
                      <div className="h-3 bg-gray-200 rounded w-6"></div>
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>
          ))}
        </div>

        {/* 테이블 스켈레톤 */}
        <SkeletonCard className="overflow-hidden">
          <div className="px-6 py-4 border-b animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="p-6">
            {[...Array(5)].map((_, i) => (
              <SkeletonTableRow key={i} columns={7} />
            ))}
          </div>
        </SkeletonCard>

        {/* 로딩 인디케이터 */}
        <PageLoadingIndicator
          message="설비 데이터를 불러오는 중..."
          subMessage="잠시만 기다려주세요"
          size="md"
        />
      </div>
    )
  }

  // 설비 통계
  const equipmentStats = getEquipmentStats()

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* 상단 설비 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-sm text-gray-600">총 설비</p>
              <p className="text-xl font-bold text-gray-900">{equipmentStats.total}대</p>
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
                {equipmentStats.active}대
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
                {equipmentStats.maintenance}대
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
                {equipmentStats.setup}대
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 모델별/공정별 설비 배치 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 모델별 배치 현황 - CAM Sheet 데이터 기반 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 모델별 설비 배치</h3>
          <div className="space-y-3">
            {(availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']).map(model => {
              const modelEquipments = equipments.filter(eq => eq.current_model === model)
              const aCount = modelEquipments.filter(eq => eq.location === 'A동').length
              const bCount = modelEquipments.filter(eq => eq.location === 'B동').length
              const total = modelEquipments.length
              
              return (
                <div key={model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-24 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600 text-center truncate px-1">{model}</span>
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

        {/* 공정별 배치 현황 - CAM Sheet 데이터 기반 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ 공정별 설비 배치</h3>
          <div className="space-y-3">
            {(availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']).map(process => {
              const processEquipments = equipments.filter(eq => eq.process === process)
              const aCount = processEquipments.filter(eq => eq.location === 'A동').length
              const bCount = processEquipments.filter(eq => eq.location === 'B동').length
              const total = processEquipments.length
              const activeCount = processEquipments.filter(eq => eq.status === '가동중').length
              
              return (
                <div key={process} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-24 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-green-600 text-center truncate px-1">{process}</span>
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
              {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
          >
            + 설비 추가
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            📄 일괄 추가
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('equipment_number')}>
                  <div className="flex items-center">
                    설비번호
                    <span className="ml-1">
                      {sortField === 'equipment_number' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('location')}>
                  <div className="flex items-center">
                    현장
                    <span className="ml-1">
                      {sortField === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}>
                  <div className="flex items-center">
                    상태
                    <span className="ml-1">
                      {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('current_model')}>
                  <div className="flex items-center">
                    모델
                    <span className="ml-1">
                      {sortField === 'current_model' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('process')}>
                  <div className="flex items-center">
                    공정
                    <span className="ml-1">
                      {sortField === 'process' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
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
              {currentEquipments.map((equipment) => {
                return (
                  <tr key={equipment.id} className="hover:bg-gray-50">
                    {/* 설비번호 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        C{equipment.equipment_number?.toString().padStart(3, '0')}
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
                        {equipment.current_model}
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
                            className={`h-2 rounded-full ${
                              (equipment.tool_usage_percentage || 0) >= 80
                                ? 'bg-red-500'
                                : (equipment.tool_usage_percentage || 0) >= 60
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{width: `${equipment.tool_usage_percentage || 0}%`}}
                          ></div>
                        </div>
                        <span className="text-sm">
                          {equipment.used_tool_positions || 0}/{equipment.total_tool_positions || equipment.tool_position_count || 21}
                        </span>
                      </div>
                    </td>
                    
                    {/* 작업 컬럼 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* 상태 변경 드롭다운 */}
                        <StatusChangeDropdown
                          currentStatus={equipment.status || ''}
                          equipmentId={equipment.id}
                          equipmentNumber={`C${equipment.equipment_number?.toString().padStart(3, '0')}`}
                          onStatusChange={handleStatusChange}
                        />

                        {/* 수정 버튼 */}
                        <button
                          onClick={() => handleOpenEditModal(equipment)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          title="수정"
                        >
                          ✏️
                        </button>
                      </div>
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

      {/* 설비 추가 모달 - 완전한 기능 구현 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">새 설비 추가</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddEquipment} className="p-6 space-y-4">
              {/* 설비번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설비번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addFormData.equipmentNumber}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, equipmentNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: C001"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* 위치 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  위치 <span className="text-red-500">*</span>
                </label>
                                  <select
                    value={addFormData.location}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, location: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    {equipmentLocations && equipmentLocations.length > 0
                      ? equipmentLocations.map(location => (
                          <option key={location} value={location}>{location}</option>
                        ))
                      : [
                          <option key="A동" value="A동">A동</option>,
                          <option key="B동" value="B동">B동</option>
                        ]
                    }
                  </select>
              </div>

              {/* 초기 상태 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  초기 상태 <span className="text-red-500">*</span>
                </label>
                                  <select
                    value={addFormData.status}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, status: e.target.value as Equipment['status'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    {equipmentStatuses && equipmentStatuses.length > 0
                      ? equipmentStatuses.map((status, index) => (
                          <option key={String(status.code || status.name || status || index)} value={String(status.code || status.name || status)}>
                            {String(status.name || status)}
                          </option>
                        ))
                      : [
                          <option key="가동중" value="가동중">가동중</option>,
                          <option key="점검중" value="점검중">점검중</option>,
                          <option key="셋업중" value="셋업중">셋업중</option>
                        ]
                    }
                  </select>
              </div>

              {/* 모델 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생산 모델 <span className="text-red-500">*</span>
                </label>
                <select
                  value={addFormData.currentModel}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, currentModel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">모델 선택</option>
                  {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              {/* 공정 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  공정 <span className="text-red-500">*</span>
                </label>
                <select
                  value={addFormData.process}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, process: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">공정 선택</option>
                  {(availableProcesses.length > 0 ? availableProcesses : equipmentAvailableProcesses).map(process => (
                    <option key={process} value={process}>{process}</option>
                  ))}
                </select>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? '추가 중...' : '설비 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 설비 수정 모달 */}
      {showEditModal && editEquipment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  설비 상세 정보 - {editEquipment.equipmentNumber}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateEquipment} className="p-6">
              {/* 설비 정보 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 설비번호 (읽기 전용) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설비번호
                  </label>
                  <input
                    type="text"
                    value={editEquipment.equipmentNumber}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* 위치 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    위치
                  </label>
                  <select
                    value={editEquipment.location || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A동">A동</option>
                    <option value="B동">B동</option>
                  </select>
                </div>

                {/* 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상태
                  </label>
                  <select
                    value={editEquipment.status || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="가동중">가동중</option>
                    <option value="점검중">점검중</option>
                    <option value="셋업중">셋업중</option>
                  </select>
                </div>

                {/* 모델 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    생산 모델
                  </label>
                  <select
                    value={editEquipment.current_model || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, current_model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">모델 선택</option>
                    {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* 공정 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공정
                  </label>
                  <select
                    value={editEquipment.process || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, process: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">공정 선택</option>
                    {(availableProcesses.length > 0 ? availableProcesses : equipmentAvailableProcesses).map(process => (
                      <option key={process} value={process}>{process}</option>
                    ))}
                  </select>
                </div>

                {/* 툴 포지션 수 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    툴 포지션 수
                  </label>
                  <input
                    type="text"
                    value={editEquipment.tool_position_count || 21}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 생성/수정 정보 */}
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  {editEquipment.created_at && (
                    <div>
                      <span className="font-medium">등록일:</span>{' '}
                      {new Date(editEquipment.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                  {editEquipment.updated_at && (
                    <div>
                      <span className="font-medium">수정일:</span>{' '}
                      {new Date(editEquipment.updated_at).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  수정 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일괄 업로드 모달 */}
      {showBulkUploadModal && (
        <EquipmentExcelUploader
          onUploadSuccess={() => {
            setShowBulkUploadModal(false)
            refetch() // 데이터 새로고침
          }}
          onCancel={() => setShowBulkUploadModal(false)}
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