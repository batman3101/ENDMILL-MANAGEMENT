'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { clientLogger } from '../../../lib/utils/logger'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createStatusChangeConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import StatusChangeDropdown from '../../../components/shared/StatusChangeDropdown'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useEquipment, useEquipmentStatus, Equipment } from '../../../lib/hooks/useEquipment'
import PageLoadingIndicator, { SkeletonCard, SkeletonTableRow } from '../../../components/shared/PageLoadingIndicator'
import EquipmentExcelUploader from '../../../components/features/EquipmentExcelUploader'
import { supabase } from '../../../lib/supabase/client'

export default function EquipmentPage() {
  const router = useRouter()
  const { t } = useTranslation()
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
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const lastRefreshTimeRef = useRef<number>(0)
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

  // Throttled refresh function to prevent excessive API calls
  const throttledRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshTimeRef.current > 3000) { // 최소 3초 간격
      lastRefreshTimeRef.current = now
      refetch()
    }
  }, [refetch])

  // 실시간 구독 설정
  useEffect(() => {
    const equipmentChannel = supabase
      .channel('equipment_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' },
        (payload) => {
          clientLogger.log('🏭 설비 변경:', payload)
          throttledRefresh()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tool_positions' },
        (payload) => {
          clientLogger.log('🔧 공구 포지션 변경:', payload)
          throttledRefresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clientLogger.log('✅ 설비 실시간 연결됨')
          setIsRealtimeConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          clientLogger.log('❌ 설비 실시간 연결 실패')
          setIsRealtimeConnected(false)
        }
      })

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      supabase.removeChannel(equipmentChannel)
    }
  }, [throttledRefresh])

  // 설비 추가 폼 상태
  const [addFormData, setAddFormData] = useState({
    equipmentNumber: 'C000',
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
    const filtered = equipments.filter(equipment => {
      // 포맷팅된 설비번호 생성 (C001, C002 형식)
      const formattedNumber = `C${equipment.equipment_number?.toString().padStart(3, '0')}`

      const matchesSearch = searchTerm === '' ||
        formattedNumber.toLowerCase().includes(searchTerm.toLowerCase()) || // 포맷팅된 번호로 검색
        equipment.current_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.process?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipment.status?.toLowerCase().includes(searchTerm.toLowerCase()) // 상태도 검색 가능

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
  const getStatusBadge = (status: Equipment['status'] | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800'

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

  const getStatusIcon = (status: Equipment['status'] | null | undefined) => {
    if (!status) return '❓'

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

    // 상태 번역
    const translateStatus = (status: string) => {
      if (status === '가동중') return t('equipment.operating')
      if (status === '점검중') return t('equipment.maintenance')
      if (status === '셋업중') return t('equipment.setup')
      return status
    }

    const confirmed = await confirmation.showConfirmation({
      type: 'update',
      title: t('equipment.statusChangeConfirmTitle'),
      message: `${equipment.equipment_number}${t('equipment.statusChangeConfirmMessage')}\n\n${t('equipment.currentStatus')}: ${translateStatus(equipment.status || '')}\n${t('equipment.changeStatus')}: ${translateStatus(newStatus)}`,
      confirmText: t('equipment.confirmChange'),
      cancelText: t('common.cancel')
    })

    if (confirmed) {
      changeStatus(equipmentId, newStatus)
      showSuccess(
        t('equipment.statusChangeComplete'),
        `${equipment.equipment_number} → ${translateStatus(newStatus)}`
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
      // C001 → 1로 변환하여 저장
      const equipmentNumberInt = parseInt(addFormData.equipmentNumber.replace(/^C/i, '')) || 0

      createEquipment({
        equipment_number: equipmentNumberInt,
        model_code: addFormData.currentModel,
        location: addFormData.location,
        status: addFormData.status,
        current_model: addFormData.currentModel,
        process: addFormData.process,
      })

      // 폼 초기화
      setAddFormData({
        equipmentNumber: 'C000',
        location: 'A동',
        status: '가동중',
        currentModel: '',
        process: ''
      })

      setShowAddModal(false)
      showSuccess('설비 추가 완료', `설비 ${addFormData.equipmentNumber}가 성공적으로 추가되었습니다.`)

    } catch (error) {
      clientLogger.error('설비 추가 에러:', error)
      showError('설비 추가 실패', error instanceof Error ? error.message : '설비 추가 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 설비 번호 자동 생성
  const generateNextEquipmentNumber = () => {
    const existingNumbers = equipments.map(eq => {
      const numStr = eq.equipment_number?.toString() || '0'
      // C로 시작하는 경우 C를 제거하고 숫자만 추출
      const cleanNum = numStr.replace(/^C/i, '')
      return parseInt(cleanNum)
    }).filter(num => !isNaN(num))

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
    const nextNumber = maxNumber + 1
    return `C${nextNumber.toString().padStart(3, '0')}`
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

    // 원본 설비 데이터 찾기
    const originalEquipment = equipments.find(eq => eq.id === editEquipment.id)
    if (!originalEquipment) return

    // 모델 또는 공정이 변경되었는지 확인
    const modelOrProcessChanged =
      originalEquipment.current_model !== editEquipment.current_model ||
      originalEquipment.process !== editEquipment.process

    try {
      setIsSubmitting(true)

      if (modelOrProcessChanged) {
        // 모델/공정이 변경되었으면 assign API 호출 (CAM Sheet 기준 앤드밀 자동 장착)
        const response = await fetch(`/api/equipment/${editEquipment.id}/assign`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentModel: editEquipment.current_model,
            process: editEquipment.process
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '설비 배정 변경에 실패했습니다.')
        }

        // 위치/상태가 변경되었으면 추가로 업데이트
        if (originalEquipment.location !== editEquipment.location || originalEquipment.status !== editEquipment.status) {
          updateEquipment({
            id: editEquipment.id,
            location: editEquipment.location,
            status: editEquipment.status,
            current_model: editEquipment.current_model,
            process: editEquipment.process
          })
        }

        const { createdAndInstalledPositions, installedPositions } = result.data.updateResults
        const totalInstalled = (createdAndInstalledPositions || 0) + (installedPositions || 0)

        setShowEditModal(false)
        showSuccess(
          '설비 수정 완료',
          `${editEquipment.equipmentNumber} 수정 완료\nCAM Sheet 기준으로 ${totalInstalled}개 앤드밀이 자동 장착되었습니다.`
        )
        refetch() // 데이터 새로고침
      } else {
        // 모델/공정이 변경되지 않았으면 기존 방식대로 업데이트
        updateEquipment({
          id: editEquipment.id,
          location: editEquipment.location,
          status: editEquipment.status,
          current_model: editEquipment.current_model,
          process: editEquipment.process
        })

        setShowEditModal(false)
        showSuccess('설비 수정 완료', `설비 ${editEquipment.equipmentNumber}이(가) 수정되었습니다.`)
      }
    } catch (error) {
      clientLogger.error('설비 수정 에러:', error)
      showError('설비 수정 실패', error instanceof Error ? error.message : '설비 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('equipment.noEquipment')}</h3>
            <p className="text-gray-500 mb-4">{t('equipment.noEquipmentMessage')}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + {t('equipment.individualAdd')}
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                📄 {t('equipment.bulkUpload')}
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
                  <h3 className="text-lg font-medium text-gray-900">{t('equipment.newEquipment')}</h3>
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
                    {t('equipment.equipmentNumber')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      C
                    </span>
                    <input
                      type="text"
                      value={addFormData.equipmentNumber.replace(/^C/i, '')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        if (value) {
                          setAddFormData(prev => ({ ...prev, equipmentNumber: `C${value.padStart(3, '0')}` }))
                        } else {
                          setAddFormData(prev => ({ ...prev, equipmentNumber: 'C000' }))
                        }
                      }}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="001"
                      maxLength={3}
                      pattern="[0-9]{3}"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{t('equipment.numberFormat')}</p>
                </div>

                {/* 위치 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.location')} <span className="text-red-500">*</span>
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
                          <option key={location} value={location}>
                            {location === 'A동' ? t('equipment.locationA') : location === 'B동' ? t('equipment.locationB') : location}
                          </option>
                        ))
                      : [
                          <option key="A동" value="A동">{t('equipment.locationA')}</option>,
                          <option key="B동" value="B동">{t('equipment.locationB')}</option>
                        ]
                    }
                  </select>
                </div>

                {/* 초기 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.initialStatus')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.status}
                    onChange={(e) => {
                      const value = e.target.value as '가동중' | '점검중' | '셋업중'
                      setAddFormData(prev => ({ ...prev, status: value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    {equipmentStatuses && equipmentStatuses.length > 0
                      ? equipmentStatuses.map((status, index) => {
                          const statusValue = String(status.code || status.name || status)
                          const statusText = statusValue === '가동중' ? t('equipment.operating') :
                                           statusValue === '점검중' ? t('equipment.maintenance') :
                                           statusValue === '셋업중' ? t('equipment.setup') :
                                           String(status.name || status)
                          return (
                            <option key={String(status.code || status.name || status || index)} value={statusValue}>
                              {statusText}
                            </option>
                          )
                        })
                      : [
                          <option key="가동중" value="가동중">{t('equipment.operating')}</option>,
                          <option key="점검중" value="점검중">{t('equipment.maintenance')}</option>,
                          <option key="셋업중" value="셋업중">{t('equipment.setup')}</option>
                        ]
                    }
                  </select>
                </div>

                {/* 모델 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.productionModel')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.currentModel}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, currentModel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">{t('equipment.selectModel')}</option>
                    {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* 공정 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.process')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addFormData.process}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, process: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">{t('equipment.selectProcess')}</option>
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
                    {t('equipment.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {isSubmitting ? t('equipment.adding') : t('equipment.addEquipment')}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('equipment.loadError')}</h3>
          <p className="text-gray-500 mb-4">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('equipment.retry')}
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
          message={t('equipment.loadingData')}
          subMessage={t('equipment.pleaseWait')}
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
        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.totalEquipment')}</p>
              <p className="text-xl font-bold text-gray-900">{equipmentStats.total}{t('equipment.unit')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              🟢
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.operatingEquipment')}</p>
              <p className="text-xl font-bold text-green-600">
                {equipmentStats.active}{t('equipment.unit')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              🔧
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.maintenance')}</p>
              <p className="text-xl font-bold text-red-600">
                {equipmentStats.maintenance}{t('equipment.unit')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              ⚙️
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.setup')}</p>
              <p className="text-xl font-bold text-orange-600">
                {equipmentStats.setup}{t('equipment.unit')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 모델별/공정별 설비 배치 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 모델별 배치 현황 - CAM Sheet 데이터 기반 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 {t('equipment.modelDistribution')}</h3>
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
                      <p className="font-medium text-gray-900">{model} {t('equipment.modelModel')}</p>
                      <p className="text-sm text-gray-500">{t('equipment.locationA')}: {aCount}{t('equipment.unit')} | {t('equipment.locationB')}: {bCount}{t('equipment.unit')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{total}{t('equipment.unit')}</p>
                    <p className="text-xs text-gray-500">{t('equipment.total')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 공정별 배치 현황 - CAM Sheet 데이터 기반 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ {t('equipment.processDistribution')}</h3>
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
                      <p className="font-medium text-gray-900">{process} {t('equipment.processProcess')}</p>
                      <p className="text-sm text-gray-500">
                        {t('equipment.locationA')}: {aCount}{t('equipment.unit')} | {t('equipment.locationB')}: {bCount}{t('equipment.unit')} | {t('equipment.operatingStatus')}: {activeCount}{t('equipment.unit')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{total}{t('equipment.unit')}</p>
                    <p className="text-xs text-gray-500">{t('equipment.total')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('equipment.searchPlaceholder')}
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
              <option value="">{t('equipment.allStatus')}</option>
              <option value="가동중">{t('equipment.operating')}</option>
              <option value="점검중">{t('equipment.maintenance')}</option>
              <option value="셋업중">{t('equipment.setup')}</option>
            </select>
          </div>
          <div>
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('equipment.allModel')}</option>
              {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
          >
            + {t('equipment.addEquipment')}
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            📄 {t('equipment.bulkAdd')}
          </button>
        </div>
      </div>

      {/* 설비 목록 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('equipment.equipmentList')} ({filteredEquipments.length}{t('equipment.items')})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('equipment.page')} {currentPage} {t('equipment.ofTotal')} {totalPages} (1{t('equipment.perPage')} {itemsPerPage}{t('equipment.items')})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('equipment_number')}>
                  <div className="flex items-center">
                    {t('equipment.equipmentNumber')}
                    <span className="ml-1">
                      {sortField === 'equipment_number' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('location')}>
                  <div className="flex items-center">
                    {t('equipment.site')}
                    <span className="ml-1">
                      {sortField === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}>
                  <div className="flex items-center">
                    {t('equipment.status')}
                    <span className="ml-1">
                      {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('current_model')}>
                  <div className="flex items-center">
                    {t('equipment.model')}
                    <span className="ml-1">
                      {sortField === 'current_model' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('process')}>
                  <div className="flex items-center">
                    {t('equipment.process')}
                    <span className="ml-1">
                      {sortField === 'process' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('equipment.endmillUsage')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('equipment.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEquipments.map((equipment) => {
                return (
                  <tr key={equipment.id} className="hover:bg-gray-50">
                    {/* 설비번호 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dashboard/equipment/${equipment.equipment_number}`)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      >
                        C{equipment.equipment_number?.toString().padStart(3, '0')}
                      </button>
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
                        {equipment.status === '가동중' ? t('equipment.operating') :
                         equipment.status === '점검중' ? t('equipment.maintenance') :
                         equipment.status === '셋업중' ? t('equipment.setup') :
                         equipment.status}
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
                {t('equipment.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('equipment.next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('equipment.showing')} <span className="font-medium">{filteredEquipments.length}</span>{t('equipment.ofItems')}{' '}
                  <span className="font-medium">{startIndex + 1}</span>
                  {t('equipment.to')}
                  <span className="font-medium">{Math.min(endIndex, filteredEquipments.length)}</span>{t('equipment.itemsDisplay')}
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
          <p className="text-gray-500">{t('equipment.noMatchingEquipment')}</p>
          <button
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('')
              setModelFilter('')
              setCurrentPage(1)
            }}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            {t('equipment.filterReset')}
          </button>
        </div>
      )}

      {/* 설비 추가 모달 - 완전한 기능 구현 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{t('equipment.newEquipment')}</h3>
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
                  {t('equipment.equipmentNumber')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    C
                  </span>
                  <input
                    type="text"
                    value={addFormData.equipmentNumber.replace(/^C/i, '')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      if (value) {
                        setAddFormData(prev => ({ ...prev, equipmentNumber: `C${value.padStart(3, '0')}` }))
                      } else {
                        setAddFormData(prev => ({ ...prev, equipmentNumber: 'C000' }))
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="001"
                    maxLength={3}
                    pattern="[0-9]{3}"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* 위치 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('equipment.location')} <span className="text-red-500">*</span>
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
                          <option key={location} value={location}>
                            {location === 'A동' ? t('equipment.locationA') : location === 'B동' ? t('equipment.locationB') : location}
                          </option>
                        ))
                      : [
                          <option key="A동" value="A동">{t('equipment.locationA')}</option>,
                          <option key="B동" value="B동">{t('equipment.locationB')}</option>
                        ]
                    }
                  </select>
              </div>

              {/* 초기 상태 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('equipment.initialStatus')} <span className="text-red-500">*</span>
                </label>
                                  <select
                    value={addFormData.status}
                    onChange={(e) => {
                      const value = e.target.value as '가동중' | '점검중' | '셋업중'
                      setAddFormData(prev => ({ ...prev, status: value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    {equipmentStatuses && equipmentStatuses.length > 0
                      ? equipmentStatuses.map((status, index) => {
                          const statusValue = String(status.code || status.name || status)
                          const statusText = statusValue === '가동중' ? t('equipment.operating') :
                                           statusValue === '점검중' ? t('equipment.maintenance') :
                                           statusValue === '셋업중' ? t('equipment.setup') :
                                           String(status.name || status)
                          return (
                            <option key={String(status.code || status.name || status || index)} value={statusValue}>
                              {statusText}
                            </option>
                          )
                        })
                      : [
                          <option key="가동중" value="가동중">{t('equipment.operating')}</option>,
                          <option key="점검중" value="점검중">{t('equipment.maintenance')}</option>,
                          <option key="셋업중" value="셋업중">{t('equipment.setup')}</option>
                        ]
                    }
                  </select>
              </div>

              {/* 모델 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('equipment.productionModel')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={addFormData.currentModel}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, currentModel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">{t('equipment.selectModel')}</option>
                  {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              {/* 공정 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('equipment.process')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={addFormData.process}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, process: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">{t('equipment.selectProcess')}</option>
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
                  {t('equipment.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? t('equipment.adding') : t('equipment.addEquipment')}
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
                  {t('equipment.equipmentDetail')} - {editEquipment.equipmentNumber}
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
                    {t('equipment.equipmentNumber')}
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
                    {t('equipment.location')}
                  </label>
                  <select
                    value={editEquipment.location || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A동">{t('equipment.locationA')}</option>
                    <option value="B동">{t('equipment.locationB')}</option>
                  </select>
                </div>

                {/* 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.status')}
                  </label>
                  <select
                    value={editEquipment.status || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="가동중">{t('equipment.operating')}</option>
                    <option value="점검중">{t('equipment.maintenance')}</option>
                    <option value="셋업중">{t('equipment.setup')}</option>
                  </select>
                </div>

                {/* 모델 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.productionModel')}
                  </label>
                  <select
                    value={editEquipment.current_model || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, current_model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('equipment.selectModel')}</option>
                    {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* 공정 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.process')}
                  </label>
                  <select
                    value={editEquipment.process || ''}
                    onChange={(e) => setEditEquipment({...editEquipment, process: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('equipment.selectProcess')}</option>
                    {(availableProcesses.length > 0 ? availableProcesses : equipmentAvailableProcesses).map(process => (
                      <option key={process} value={process}>{process}</option>
                    ))}
                  </select>
                </div>

                {/* 툴 포지션 수 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('equipment.toolPositionCount')}
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
                      <span className="font-medium">{t('equipment.registeredDate')}:</span>{' '}
                      {new Date(editEquipment.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                  {editEquipment.updated_at && (
                    <div>
                      <span className="font-medium">{t('equipment.modifiedDate')}:</span>{' '}
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
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {t('equipment.close')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSubmitting ? '저장 중...' : t('equipment.saveEdit')}
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