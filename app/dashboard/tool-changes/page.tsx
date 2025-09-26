'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../../components/shared/Toast'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createUpdateConfirmation, createSaveConfirmation } from '../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useToolChanges, type ToolChange, type ToolChangeFilters } from '../../../lib/hooks/useToolChanges'

export default function ToolChangesPage() {
  const { showSuccess, showError, showWarning } = useToast()
  const { camSheets, getAvailableModels, getAvailableProcesses } = useCAMSheets()
  const confirmation = useConfirmation()

  // 필터 상태
  const [filters, setFilters] = useState<ToolChangeFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('')
  const [selectedEndmillType, setSelectedEndmillType] = useState<string>('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // 실제 Supabase 데이터 훅 사용
  const {
    toolChanges,
    isLoading,
    error: toolChangesError,
    refreshData,
    loadMore,
    hasMore,
    totalCount
  } = useToolChanges(filters)

  // 폼 상태
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ToolChange | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [availableProcesses, setAvailableProcesses] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string, employee_id: string}[]>([])
  const [isManualEndmillInput, setIsManualEndmillInput] = useState(false)
  const [isEditManualEndmillInput, setIsEditManualEndmillInput] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const toolChangesReasons = settings.toolChanges.reasons
  const tNumberRange = settings.toolChanges.tNumberRange

  // 필터 업데이트 함수들
  const updateFilters = useCallback(() => {
    const newFilters: ToolChangeFilters = {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortField,
      sortDirection
    }

    if (searchTerm.trim()) {
      newFilters.searchTerm = searchTerm.trim()
    }

    if (selectedEquipment) {
      newFilters.equipmentNumber = parseInt(selectedEquipment)
    }

    if (selectedEndmillType) {
      newFilters.endmillType = selectedEndmillType
    }

    if (dateRange.start) {
      newFilters.startDate = dateRange.start
    }

    if (dateRange.end) {
      newFilters.endDate = dateRange.end
    }

    setFilters(newFilters)
  }, [searchTerm, selectedEquipment, selectedEndmillType, dateRange, currentPage, sortField, sortDirection, itemsPerPage])

  // 정렬 처리
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // 같은 필드 클릭시 방향 변경
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // 다른 필드 클릭시 새 필드로 오름차순 시작
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // 정렬 변경시 첫 페이지로
  }, [sortField])

  // 정렬 아이콘 반환
  const getSortIcon = useCallback((field: string) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }, [sortField, sortDirection])

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedEquipment('')
    setSelectedEndmillType('')
    setDateRange({ start: '', end: '' })
    setCurrentPage(1)
    setSortField('created_at')
    setSortDirection('desc')
    setFilters({ limit: itemsPerPage })
  }, [])

  // 필터 변경시 페이지 리셋과 필터 업데이트를 하나의 useEffect로 통합
  useEffect(() => {
    // 필터 변경시 첫 페이지로 리셋
    if (currentPage !== 1) {
      setCurrentPage(1)
      return // 페이지가 변경되면 다음 렌더링에서 필터 업데이트
    }

    // 페이지가 1이거나 currentPage 상태가 업데이트된 후 필터 업데이트
    updateFilters()
  }, [searchTerm, selectedEquipment, selectedEndmillType, dateRange.start, dateRange.end, currentPage, sortField, sortDirection, updateFilters])

  // 설비번호 기반 자동입력 함수
  const autoFillByEquipmentNumber = useCallback(async (equipmentNumber: string) => {
    if (!equipmentNumber.trim()) return

    try {
      const response = await fetch(`/api/tool-changes/auto-fill?equipmentNumber=${equipmentNumber}`)
      const result = await response.json()

      if (result.success && result.data.equipmentInfo) {
        const { model, process } = result.data.equipmentInfo
        setFormData(prev => ({
          ...prev,
          productionModel: model || '',
          process: process || ''
        }))
      }
    } catch (error) {
      console.error('설비번호 자동입력 오류:', error)
    }
  }, [])

  // T번호 기반 자동입력 함수
  const autoFillByTNumber = useCallback(async (model: string, process: string, tNumber: number) => {
    if (!model || !process || !tNumber) return

    try {
      const response = await fetch(`/api/tool-changes/auto-fill?model=${model}&process=${process}&tNumber=${tNumber}`)
      const result = await response.json()

      if (result.success && result.data.endmillInfo) {
        const { endmillCode, endmillName } = result.data.endmillInfo
        setFormData(prev => ({
          ...prev,
          endmillCode: endmillCode || '',
          endmillName: endmillName || ''
        }))
      }
    } catch (error) {
      console.error('T번호 자동입력 오류:', error)
    }
  }, [])

  // 앤드밀 정보 자동 입력 함수 (기존 CAM Sheet 기반 - 백업용)
  const autoFillEndmillInfo = useCallback((model: string, process: string, tNumber: number) => {
    if (!model || !process || !tNumber) return null

    const sheet = camSheets.find(s => s.model === model && s.process === process)
    if (!sheet) return null

    const endmill = (sheet.cam_sheet_endmills || []).find((e: any) => e.t_number === tNumber)
    if (!endmill) return null

    return {
      endmillCode: endmill.endmill_code,
      endmillName: endmill.specifications, // specifications가 실제 앤드밀 이름
      suggestedToolLife: endmill.tool_life
    }
  }, [camSheets])

  const getCurrentDateTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }

  const getTodayDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    change_date: getCurrentDateTime(),
    equipmentNumber: '',
    productionModel: '',
    process: '',
    tNumber: 1,
    endmillCode: '',
    endmillName: '',
    actualToolLife: 0,
    changeReason: '',
    changedBy: '' // 교체자 ID 추가
  })

  // CAM SHEET에서 사용 가능한 모델과 공정 목록 로드
  useEffect(() => {
    setAvailableModels(getAvailableModels)
    setAvailableProcesses(getAvailableProcesses)
  }, [getAvailableModels, getAvailableProcesses])

  // 사용자 목록 로드
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/user-profiles')
        const result = await response.json()
        if (result.success) {
          setAvailableUsers(result.data)
        }
      } catch (error) {
        console.error('사용자 목록 로드 오류:', error)
      }
    }
    loadUsers()
  }, [])

  // 설비번호 변경시 생산모델, 공정 자동입력
  useEffect(() => {
    if (formData.equipmentNumber.trim() && formData.equipmentNumber.match(/^C[0-9]{3}$/)) {
      autoFillByEquipmentNumber(formData.equipmentNumber)
    }
  }, [formData.equipmentNumber, autoFillByEquipmentNumber])

  // 생산 모델, 공정, T번호가 변경될 때 앤드밀 정보 자동 입력 (추가 폼)
  useEffect(() => {
    if (formData.productionModel && formData.process && formData.tNumber && !isManualEndmillInput) {
      // API 기반 자동입력 시도
      autoFillByTNumber(formData.productionModel, formData.process, formData.tNumber)

      // 기존 CAM Sheet 기반 자동입력도 백업으로 유지
      const endmillInfo = autoFillEndmillInfo(formData.productionModel, formData.process, formData.tNumber)
      if (endmillInfo) {
        setFormData(prev => ({
          ...prev,
          endmillCode: prev.endmillCode || endmillInfo.endmillCode,
          endmillName: prev.endmillName || endmillInfo.endmillName
        }))
      }
    }
  }, [formData.productionModel, formData.process, formData.tNumber, isManualEndmillInput, autoFillByTNumber, autoFillEndmillInfo])

  // 수정 모달: 설비번호 기반 자동입력 함수
  const autoFillEditByEquipmentNumber = useCallback(async (equipmentNumber: string) => {
    if (!equipmentNumber.trim()) return

    try {
      const response = await fetch(`/api/tool-changes/auto-fill?equipmentNumber=${equipmentNumber}`)
      const result = await response.json()

      if (result.success && result.data.equipmentInfo) {
        const { model, process } = result.data.equipmentInfo
        setEditingItem(prev => prev ? ({
          ...prev,
          productionModel: model || '',
          process: process || ''
        }) : null)
      }
    } catch (error) {
      console.error('수정 모달 설비번호 자동입력 오류:', error)
    }
  }, [])

  // 수정 모달: T번호 기반 자동입력 함수
  const autoFillEditByTNumber = useCallback(async (model: string, process: string, tNumber: number) => {
    if (!model || !process || !tNumber) return

    try {
      const response = await fetch(`/api/tool-changes/auto-fill?model=${model}&process=${process}&tNumber=${tNumber}`)
      const result = await response.json()

      if (result.success && result.data.endmillInfo) {
        const { endmillCode, endmillName } = result.data.endmillInfo
        setEditingItem(prev => prev ? ({
          ...prev,
          endmillCode: endmillCode || '',
          endmillName: endmillName || ''
        }) : null)
      }
    } catch (error) {
      console.error('수정 모달 T번호 자동입력 오류:', error)
    }
  }, [])

  // 수정 모달: 설비번호 변경시 자동입력
  useEffect(() => {
    if (editingItem?.equipmentNumber && editingItem.equipmentNumber.match(/^C[0-9]{3}$/)) {
      autoFillEditByEquipmentNumber(editingItem.equipmentNumber)
    }
  }, [editingItem?.equipmentNumber, autoFillEditByEquipmentNumber])

  // 생산 모델, 공정, T번호가 변경될 때 앤드밀 정보 자동 입력 (수정 모달)
  useEffect(() => {
    if (editingItem && editingItem.productionModel && editingItem.process && editingItem.tNumber && !isEditManualEndmillInput) {
      // API 기반 자동입력 시도
      autoFillEditByTNumber(editingItem.productionModel, editingItem.process, editingItem.tNumber)

      // 기존 CAM Sheet 기반 자동입력도 백업으로 유지
      const endmillInfo = autoFillEndmillInfo(editingItem.productionModel, editingItem.process, editingItem.tNumber)
      if (endmillInfo) {
        setEditingItem(prev => prev ? ({
          ...prev,
          endmillCode: prev.endmillCode || endmillInfo.endmillCode,
          endmillName: prev.endmillName || endmillInfo.endmillName
        }) : null)
      }
    }
  }, [editingItem?.productionModel, editingItem?.process, editingItem?.tNumber, isEditManualEndmillInput, autoFillEditByTNumber, autoFillEndmillInfo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(`${formData.equipmentNumber} T${formData.tNumber.toString().padStart(2, '0')} 교체 실적`)
    )

    if (confirmed) {
      try {
        // API 데이터 구조에 맞게 변환
        const toolChangeData = {
          equipment_number: formData.equipmentNumber,
          production_model: formData.productionModel,
          process: formData.process,
          t_number: typeof formData.tNumber === 'string' ? parseInt(formData.tNumber.replace(/^T/, '')) : formData.tNumber,
          endmill_code: formData.endmillCode,
          endmill_name: formData.endmillName,
          tool_life: formData.actualToolLife,
          change_reason: formData.changeReason,
          changed_by: formData.changedBy || undefined
        }

        // API 호출하여 교체 실적 저장
        const response = await fetch('/api/tool-changes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(toolChangeData)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '교체 실적 저장에 실패했습니다.')
        }

        if (result.success) {
          // 데이터 새로고침
          await refreshData()
          setShowAddForm(false)

          showSuccess(
            '교체 실적 등록 완료',
            `${formData.equipmentNumber} T${formData.tNumber.toString().padStart(2, '0')} 교체 실적이 등록되었습니다.`
          )

          // 폼 초기화
          setFormData({
            change_date: getCurrentDateTime(),
            equipmentNumber: '',
            productionModel: '',
            process: '',
            tNumber: 1,
            endmillCode: '',
            endmillName: '',
            actualToolLife: 0,
            changeReason: ''
          })
          setIsManualEndmillInput(false)
        } else {
          showError('등록 실패', result.error || '교체 실적 등록에 실패했습니다.')
        }
      } catch (error) {
        console.error('교체 실적 등록 오류:', error)
        showError(
          '등록 실패',
          error instanceof Error ? error.message : '교체 실적 등록 중 오류가 발생했습니다.'
        )
      }
    }
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case '정기교체':
        return 'bg-blue-100 text-blue-800'
      case '파손':
        return 'bg-red-100 text-red-800'
      case '마모':
        return 'bg-yellow-100 text-yellow-800'
      case '모델변경':
        return 'bg-purple-100 text-purple-800'
      case '품질불량':
        return 'bg-orange-100 text-orange-800'
      case '기타':
        return 'bg-gray-100 text-gray-800'
      // Legacy support for old reason names
      case 'Tool Life 종료':
        return 'bg-blue-100 text-blue-800'
      case '모델 변경':
        return 'bg-purple-100 text-purple-800'
      case '예방':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getToolLifeStatus = (toolLife: number) => {
    if (toolLife < 1000) return { color: 'text-red-600', status: '짧음' }
    if (toolLife < 2000) return { color: 'text-yellow-600', status: '보통' }
    return { color: 'text-green-600', status: '양호' }
  }

  // 수정 모달 열기
  const handleEdit = (item: ToolChange) => {
    // Convert the database structure to the expected form structure
    const editItem = {
      ...item,
      equipmentNumber: item.equipment_number ? `C${item.equipment_number.toString().padStart(3, '0')}` : '',
      productionModel: item.production_model,
      tNumber: item.t_number,
      endmillCode: item.endmill_code,
      endmillName: item.endmill_name,
      toolLife: item.tool_life,
      changeReason: item.change_reason
    }
    setEditingItem(editItem)
    setIsEditManualEndmillInput(false) // 수동 입력 모드 초기화
    setShowEditModal(true)
  }

  // 수정 내용 저장
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    const confirmed = await confirmation.showConfirmation(
      createUpdateConfirmation(`${editingItem.equipmentNumber} T${editingItem.tNumber.toString().padStart(2, '0')} 교체 실적`)
    )

    if (confirmed) {
      try {
        if (!editingItem) return

        // API 데이터 구조에 맞게 변환
        const updateData = {
          id: editingItem.id,
          equipment_number: typeof editingItem.equipmentNumber === 'string'
            ? parseInt(editingItem.equipmentNumber.replace(/^C/, ''))
            : editingItem.equipmentNumber,
          production_model: editingItem.productionModel,
          process: editingItem.process,
          t_number: editingItem.tNumber,
          endmill_code: editingItem.endmillCode,
          endmill_name: editingItem.endmillName,
          tool_life: editingItem.actualToolLife,
          change_reason: editingItem.changeReason,
          changed_by: editingItem.changedBy || undefined
        }

        // API 호출하여 수정 처리
        const response = await fetch('/api/tool-changes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '교체 실적 수정에 실패했습니다.')
        }

        if (result.success) {
          // 데이터 새로고침
          await refreshData()
          setShowEditModal(false)
          setEditingItem(null)
          setIsEditManualEndmillInput(false)

          showSuccess(
            '교체 실적 수정 완료',
            `${editingItem.equipmentNumber} T${editingItem.tNumber.toString().padStart(2, '0')} 교체 실적이 수정되었습니다.`
          )
        }
      } catch (error) {
        console.error('수정 오류:', error)
        showError(
          '수정 실패',
          error instanceof Error ? error.message : '교체 실적 수정 중 오류가 발생했습니다.'
        )
      }
    }
  }

  // 수정 모달 닫기
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingItem(null)
    setIsEditManualEndmillInput(false) // 수동 입력 모드 초기화
  }

  // 삭제 처리
  const handleDelete = async (item: ToolChange) => {
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`${item.equipment_number ? `C${item.equipment_number.toString().padStart(3, '0')}` : '설비'} T${item.t_number?.toString().padStart(2, '0') || '??'} 교체 실적 (${item.endmill_code} ${item.endmill_name})`)
    )

    if (confirmed) {
      try {
        setDeletingItemId(item.id)

        // API 호출하여 삭제 처리
        const response = await fetch(`/api/tool-changes?id=${item.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '교체 실적 삭제에 실패했습니다.')
        }

        if (result.success) {
          // 데이터 새로고침
          await refreshData()
          showSuccess(
            '삭제 완료',
            `${item.equipment_number ? `C${item.equipment_number.toString().padStart(3, '0')}` : '설비'} T${item.t_number?.toString().padStart(2, '0') || '??'} 교체 실적이 성공적으로 삭제되었습니다.`
          )
        }
      } catch (error) {
        console.error('삭제 오류:', error)
        showError(
          '삭제 실패',
          error instanceof Error ? error.message : '교체 실적 삭제 중 오류가 발생했습니다.'
        )
      } finally {
        setDeletingItemId(null)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">오늘 교체</p>
              <p className="text-xl font-bold text-blue-600">{toolChanges.filter(tc => tc.change_date?.startsWith(getTodayDate())).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              ⏱️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">정기교체</p>
              <p className="text-xl font-bold text-green-600">
                {toolChanges.filter(tc => tc.change_reason === '정기교체' || tc.reason === '정기교체').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              💥
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">파손</p>
              <p className="text-xl font-bold text-red-600">
                {toolChanges.filter(tc => tc.change_reason === '파손' || tc.reason === '파손').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">마모</p>
              <p className="text-xl font-bold text-yellow-600">
                {toolChanges.filter(tc => tc.change_reason === '마모' || tc.reason === '마모').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">모델변경</p>
              <p className="text-xl font-bold text-purple-600">
                {toolChanges.filter(tc => tc.change_reason === '모델변경' || tc.reason === '모델변경').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              🛡️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">품질불량</p>
              <p className="text-xl font-bold text-orange-600">
                {toolChanges.filter(tc => tc.change_reason === '품질불량' || tc.reason === '품질불량').length}
              </p>
            </div>
          </div>
        </div>

        {(() => {
          // 오늘 교체 데이터만 필터링
          const todayChanges = toolChanges.filter(tc => tc.change_date?.startsWith(getTodayDate()))
          
          // 모델별 교체 수량 계산
          const modelCounts = todayChanges.reduce((acc: Record<string, number>, tc) => {
            const model = tc.production_model || tc.productionModel || 'Unknown'
            acc[model] = (acc[model] || 0) + 1
            return acc
          }, {})
          
          // 가장 많은 교체가 발생한 모델 찾기
          const topModel = Object.entries(modelCounts).length > 0 
            ? Object.entries(modelCounts).reduce((a, b) => a[1] > b[1] ? a : b)
            : ['없음', 0]
          
          return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  🏭
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">오늘 최다 교체 모델</p>
                  <p className="text-lg font-bold text-indigo-600">{topModel[0]}</p>
                  <p className="text-xs text-gray-500">{topModel[1]}건</p>
                </div>
              </div>
            </div>
          )
        })()}

        {(() => {
          // 오늘 교체 데이터만 필터링
          const todayChanges = toolChanges.filter(tc => tc.change_date?.startsWith(getTodayDate()))
          
          // 공정별 교체 수량 계산
          const processCounts = todayChanges.reduce((acc: Record<string, number>, tc) => {
            const process = tc.process || 'Unknown'
            acc[process] = (acc[process] || 0) + 1
            return acc
          }, {})
          
          // 가장 많은 교체가 발생한 공정 찾기
          const topProcess = Object.entries(processCounts).length > 0 
            ? Object.entries(processCounts).reduce((a, b) => a[1] > b[1] ? a : b)
            : ['없음', 0]
          
          return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                  ⚙️
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">오늘 최다 교체 공정</p>
                  <p className="text-lg font-bold text-teal-600">{topProcess[0]}</p>
                  <p className="text-xs text-gray-500">{topProcess[1]}건</p>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* 교체 실적 입력 폼 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 교체 실적 입력</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">교체일자</label>
                <input
                  type="text"
                  value={formData.change_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">자동으로 현재 날짜/시간이 입력됩니다</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">설비번호</label>
                <input
                  type="text"
                  placeholder="C001"
                  value={formData.equipmentNumber}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setFormData({...formData, equipmentNumber: value})
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  pattern="C[0-9]{3}"
                  title="C001-C800 형식으로 입력해주세요"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">설비번호 입력시 생산모델과 공정이 자동으로 입력됩니다</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">생산 모델</label>
                <select
                  value={formData.productionModel}
                  onChange={(e) => setFormData({...formData, productionModel: e.target.value})}
                  className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.equipmentNumber ? 'bg-blue-50' : ''
                  }`}
                  required
                >
                  <option value="">모델 선택</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.equipmentNumber ? '설비번호 기준 자동입력됨' : '등록된 CAM SHEET의 모델들'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">공정</label>
                <select
                  value={formData.process}
                  onChange={(e) => setFormData({...formData, process: e.target.value})}
                  className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.equipmentNumber ? 'bg-blue-50' : ''
                  }`}
                  required
                >
                  <option value="">공정 선택</option>
                  <option value="CNC1">CNC1</option>
                  <option value="CNC2">CNC2</option>
                  <option value="CNC2-1">CNC2-1</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.equipmentNumber ? '설비번호 기준 자동입력됨' : '공정을 선택하세요'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">T번호</label>
                                    <select
                      value={formData.tNumber}
                      onChange={(e) => setFormData({...formData, tNumber: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {Array.from({length: tNumberRange.max - tNumberRange.min + 1}, (_, i) => i + tNumberRange.min).map(num => (
                        <option key={num} value={num}>T{num.toString().padStart(2, '0')}</option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 코드</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isManualEndmillInput ? "앤드밀 코드 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                    value={formData.endmillCode}
                    onChange={(e) => isManualEndmillInput && setFormData({...formData, endmillCode: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                      isManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                    }`}
                    readOnly={!isManualEndmillInput}
                    required
                  />
                  {formData.productionModel && formData.process && formData.tNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isManualEndmillInput) {
                          // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                          setIsManualEndmillInput(false)
                          const endmillInfo = autoFillEndmillInfo(formData.productionModel, formData.process, formData.tNumber)
                          if (endmillInfo) {
                            setFormData(prev => ({
                              ...prev,
                              endmillCode: endmillInfo.endmillCode,
                              endmillName: endmillInfo.endmillName
                            }))
                          }
                        } else {
                          // 수동입력 모드로 전환
                          setIsManualEndmillInput(true)
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {isManualEndmillInput ? "자동입력" : "수동입력"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isManualEndmillInput ? "수동으로 입력해주세요" : "T번호 선택시 자동으로 입력됩니다"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isManualEndmillInput ? "앤드밀 이름 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                    value={formData.endmillName}
                    onChange={(e) => isManualEndmillInput && setFormData({...formData, endmillName: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                      isManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                    }`}
                    readOnly={!isManualEndmillInput}
                    required
                  />
                  {formData.productionModel && formData.process && formData.tNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isManualEndmillInput) {
                          // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                          setIsManualEndmillInput(false)
                          const endmillInfo = autoFillEndmillInfo(formData.productionModel, formData.process, formData.tNumber)
                          if (endmillInfo) {
                            setFormData(prev => ({
                              ...prev,
                              endmillCode: endmillInfo.endmillCode,
                              endmillName: endmillInfo.endmillName
                            }))
                          }
                        } else {
                          // 수동입력 모드로 전환
                          setIsManualEndmillInput(true)
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {isManualEndmillInput ? "자동입력" : "수동입력"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isManualEndmillInput ? "수동으로 입력해주세요" : "T번호 선택시 자동으로 입력됩니다"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">실제 Tool life</label>
                <input
                  type="number"
                  placeholder="2500"
                  value={formData.actualToolLife}
                  onChange={(e) => setFormData({...formData, actualToolLife: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="10000"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">교체된 앤드밀의 실제 사용 횟수</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">교체사유</label>
                <select
                  value={formData.changeReason}
                  onChange={(e) => setFormData({...formData, changeReason: e.target.value})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">사유 선택</option>
                  {toolChangesReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">교체자</label>
                <select
                  value={formData.changedBy}
                  onChange={(e) => setFormData({...formData, changedBy: e.target.value})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">교체자 선택</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.employee_id})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">교체 작업을 수행한 작업자를 선택하세요</p>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 버튼 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col gap-4">
          {/* 첫 번째 줄: 검색, 설비, 사유 필터 */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <input
                type="text"
                placeholder="설비번호, 앤드밀 코드, 사용자명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 설비</option>
                <option value="1">C001</option>
                <option value="2">C002</option>
                <option value="3">C003</option>
                <option value="4">C004</option>
                <option value="5">C005</option>
              </select>
              <select
                value={selectedEndmillType}
                onChange={(e) => setSelectedEndmillType(e.target.value)}
                className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 엔드밀</option>
                {/* TODO: 실제 endmill_types 데이터로 교체 필요 */}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                필터 초기화
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + 교체 기록 추가
              </button>
            </div>
          </div>

          {/* 두 번째 줄: 날짜 필터 */}
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">기간:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* 에러 및 로딩 상태 표시 */}
            {toolChangesError && (
              <div className="text-red-600 text-sm">
                오류: {toolChangesError}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center text-blue-600 text-sm">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                로딩 중...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 교체 실적 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">교체 실적 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('change_date')}
                >
                  교체일시 {getSortIcon('change_date')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('equipment_number')}
                >
                  설비번호 {getSortIcon('equipment_number')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('production_model')}
                >
                  생산모델 {getSortIcon('production_model')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('process')}
                >
                  공정 {getSortIcon('process')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('t_number')}
                >
                  T번호 {getSortIcon('t_number')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  앤드밀 코드
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('endmill_name')}
                >
                  앤드밀 이름 {getSortIcon('endmill_name')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  교체자
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('change_reason')}
                >
                  교체사유 {getSortIcon('change_reason')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('tool_life')}
                >
                  Tool Life {getSortIcon('tool_life')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {toolChanges.length > 0 ? toolChanges.map((change) => {
                const toolLifeStatus = getToolLifeStatus(change.tool_life || 0)
                // Format date properly - change_date is just a date string, not datetime
                const formattedDate = change.change_date
                const formattedDateTime = change.created_at ? new Date(change.created_at).toLocaleString('ko-KR') : change.change_date

                return (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formattedDateTime}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {change.equipment?.name || (change.equipment_number ? `C${change.equipment_number.toString().padStart(3, '0')}` : '-')}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.production_model || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.process || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {change.t_number ? `T${change.t_number.toString().padStart(2, '0')}` : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{change.endmill_code || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {change.endmill_name || change.endmill_type?.name || change.endmill_type?.code || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.user?.name || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReasonBadge(change.change_reason || change.reason || '')}`}>
                        {change.change_reason || change.reason || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${toolLifeStatus.color}`}>
                        {(change.tool_life || change.old_life_hours || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">{toolLifeStatus.status}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(change)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        수정
                      </button>
                      <button 
                        onClick={() => handleDelete(change)}
                        className={`${
                          deletingItemId === change.id 
                            ? 'text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded font-medium' 
                            : 'text-red-600 hover:text-red-800'
                        }`}
                      >
                        {deletingItemId === change.id ? '확인 삭제' : '삭제'}
                      </button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                        데이터를 불러오는 중...
                      </div>
                    ) : (
                      '교체 실적 데이터가 없습니다.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {toolChanges.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                전체 {totalCount || toolChanges.length}개 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount || toolChanges.length)}개 표시
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const totalPages = Math.ceil((totalCount || toolChanges.length) / itemsPerPage)
                    const pageNumbers = []
                    const maxVisiblePages = 5

                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1)
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          disabled={isLoading}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            currentPage === i
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {i}
                        </button>
                      )
                    }

                    return pageNumbers
                  })()}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => {
                    const totalPages = Math.ceil((totalCount || toolChanges.length) / itemsPerPage)
                    return Math.min(prev + 1, totalPages)
                  })}
                  disabled={!hasMore || isLoading}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">교체 실적 수정</h3>
                <button 
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveEdit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">교체일자</label>
                    <input
                      type="text"
                      value={editingItem.change_date}
                      onChange={(e) => setEditingItem({...editingItem, change_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">설비번호</label>
                    <input
                      type="text"
                      value={editingItem.equipmentNumber}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase()
                        setEditingItem({...editingItem, equipmentNumber: value})
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      pattern="C[0-9]{3}"
                      title="C001-C800 형식으로 입력해주세요"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">설비번호 입력시 생산모델과 공정이 자동으로 입력됩니다</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">생산 모델</label>
                    <select
                      value={editingItem.productionModel}
                      onChange={(e) => setEditingItem({...editingItem, productionModel: e.target.value})}
                      className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editingItem.equipmentNumber ? 'bg-blue-50' : ''
                      }`}
                      required
                    >
                      <option value="">모델 선택</option>
                      {availableModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingItem.equipmentNumber ? '설비번호 기준 자동입력됨' : '등록된 CAM SHEET의 모델들'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">공정</label>
                    <select
                      value={editingItem.process}
                      onChange={(e) => setEditingItem({...editingItem, process: e.target.value})}
                      className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editingItem.equipmentNumber ? 'bg-blue-50' : ''
                      }`}
                      required
                    >
                      <option value="CNC1">CNC1</option>
                      <option value="CNC2">CNC2</option>
                      <option value="CNC2-1">CNC2-1</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingItem.equipmentNumber ? '설비번호 기준 자동입력됨' : '공정을 선택하세요'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">T번호</label>
                    <select
                      value={editingItem.tNumber}
                      onChange={(e) => setEditingItem({...editingItem, tNumber: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {Array.from({length: tNumberRange.max - tNumberRange.min + 1}, (_, i) => i + tNumberRange.min).map(num => (
                        <option key={num} value={num}>T{num.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 코드</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={isEditManualEndmillInput ? "앤드밀 코드 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                        value={editingItem.endmillCode}
                        onChange={(e) => isEditManualEndmillInput && setEditingItem({...editingItem, endmillCode: e.target.value})}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                          isEditManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                        }`}
                        readOnly={!isEditManualEndmillInput}
                        required
                      />
                      {editingItem.productionModel && editingItem.process && editingItem.tNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditManualEndmillInput) {
                              // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                              setIsEditManualEndmillInput(false)
                              const endmillInfo = autoFillEndmillInfo(editingItem.productionModel, editingItem.process, editingItem.tNumber)
                              if (endmillInfo) {
                                setEditingItem(prev => prev ? ({
                                  ...prev,
                                  endmillCode: endmillInfo.endmillCode,
                                  endmillName: endmillInfo.endmillName
                                }) : null)
                              }
                            } else {
                              // 수동입력 모드로 전환
                              setIsEditManualEndmillInput(true)
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {isEditManualEndmillInput ? "자동입력" : "수동입력"}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {isEditManualEndmillInput ? "수동으로 입력해주세요" : "CAM SHEET에서 자동으로 입력됩니다"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={isEditManualEndmillInput ? "앤드밀 이름 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                        value={editingItem.endmillName}
                        onChange={(e) => isEditManualEndmillInput && setEditingItem({...editingItem, endmillName: e.target.value})}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                          isEditManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                        }`}
                        readOnly={!isEditManualEndmillInput}
                        required
                      />
                      {editingItem.productionModel && editingItem.process && editingItem.tNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditManualEndmillInput) {
                              // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                              setIsEditManualEndmillInput(false)
                              const endmillInfo = autoFillEndmillInfo(editingItem.productionModel, editingItem.process, editingItem.tNumber)
                              if (endmillInfo) {
                                setEditingItem(prev => prev ? ({
                                  ...prev,
                                  endmillCode: endmillInfo.endmillCode,
                                  endmillName: endmillInfo.endmillName
                                }) : null)
                              }
                            } else {
                              // 수동입력 모드로 전환
                              setIsEditManualEndmillInput(true)
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {isEditManualEndmillInput ? "자동입력" : "수동입력"}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {isEditManualEndmillInput ? "수동으로 입력해주세요" : "CAM SHEET에서 자동으로 입력됩니다"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tool Life</label>
                    <input
                      type="number"
                      value={editingItem.toolLife || 0}
                      onChange={(e) => setEditingItem({...editingItem, toolLife: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="10000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">교체사유</label>
                    <select
                      value={editingItem.changeReason}
                      onChange={(e) => setEditingItem({...editingItem, changeReason: e.target.value})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {toolChangesReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button 
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
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
    </div>
  )
} 