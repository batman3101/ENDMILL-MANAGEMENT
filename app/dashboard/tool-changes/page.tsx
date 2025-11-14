'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../../components/shared/Toast'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createUpdateConfirmation, createSaveConfirmation } from '../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useToolChanges, useToolChangeStats, type ToolChange, type ToolChangeFilters } from '../../../lib/hooks/useToolChanges'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'
import { clientLogger } from '@/lib/utils/logger'

export default function ToolChangesPage() {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
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
    hasMore,
    totalCount
  } = useToolChanges(filters)

  // 통계 데이터 훅 사용 (오늘 날짜 기준, 실시간 업데이트 활성화)
  const {
    stats,
    isLoading: isStatsLoading,
    error: statsError
  } = useToolChangeStats(undefined, true)

  // 폼 상태
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ToolChange | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [, setAvailableProcesses] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string, employee_id: string}[]>([])
  const [availableTNumbers, setAvailableTNumbers] = useState<number[]>([]) // CAM Sheet 기준 T번호 목록 (추가 폼용)
  const [editAvailableTNumbers, setEditAvailableTNumbers] = useState<number[]>([]) // CAM Sheet 기준 T번호 목록 (수정 모달용)
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

  // 교체사유 번역 매핑 함수
  const getReasonTranslation = (reason: string) => {
    const reasonMap: Record<string, string> = {
      '정기교체': t('toolChanges.regularReplacement'),
      '수명완료': t('toolChanges.lifeCompleted'),
      '파손': t('toolChanges.broken'),
      '마모': t('toolChanges.wear'),
      '모델변경': t('toolChanges.modelChange'),
      '모델교체': t('toolChanges.modelChange'),
      '품질불량': t('toolChanges.qualityDefect'),
      '품질테스트': t('toolChanges.qualityDefect'),
      '공구테스트': t('toolChanges.toolTest'),
      '예방교체': t('toolChanges.preventive'),
      '기타': t('toolChanges.other'),
    }
    return reasonMap[reason] || reason
  }

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

  // 필터 변경시 페이지 리셋 (currentPage 제외)
  useEffect(() => {
    setCurrentPage(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedEquipment, selectedEndmillType, dateRange.start, dateRange.end, sortField, sortDirection])

  // 필터 업데이트 (currentPage 포함)
  useEffect(() => {
    updateFilters()
  }, [updateFilters])

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
          production_model: model || '',
          process: process || ''
        }))
      }
    } catch (error) {
      clientLogger.error('설비번호 자동입력 오류:', error)
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
          endmill_code: endmillCode || '',
          endmill_name: endmillName || ''
        }))
      }
    } catch (error) {
      clientLogger.error('T번호 자동입력 오류:', error)
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

  interface ToolChangeFormData {
    change_date: string
    equipment_number: string
    production_model: string
    process: string
    t_number: number
    endmill_code: string | null
    endmill_name: string | null
    tool_life: number
    change_reason: string
    changed_by: string
  }

  const [formData, setFormData] = useState<ToolChangeFormData>({
    change_date: getCurrentDateTime(),
    equipment_number: '',
    production_model: '',
    process: '',
    t_number: 1,
    endmill_code: null,
    endmill_name: null,
    tool_life: 0,
    change_reason: '',
    changed_by: ''
  })

  // CAM SHEET에서 사용 가능한 모델과 공정 목록 로드
  useEffect(() => {
    setAvailableModels(getAvailableModels)
    setAvailableProcesses(getAvailableProcesses)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camSheets])

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
        clientLogger.error('사용자 목록 로드 오류:', error)
      }
    }
    loadUsers()
  }, [])

  // 설비번호 변경시 생산모델, 공정 자동입력
  useEffect(() => {
    if (formData.equipment_number.trim() && formData.equipment_number.match(/^C[0-9]{3}$/)) {
      autoFillByEquipmentNumber(formData.equipment_number)
    }
  }, [formData.equipment_number, autoFillByEquipmentNumber])

  // 생산모델과 공정이 선택되면 해당 CAM Sheet의 T번호 목록 가져오기
  useEffect(() => {
    if (formData.production_model && formData.process) {
      const sheet = camSheets.find(s => s.model === formData.production_model && s.process === formData.process)
      if (sheet && sheet.cam_sheet_endmills) {
        const tNumbers = sheet.cam_sheet_endmills
          .map((e: any) => e.t_number)
          .filter((t: number) => t != null)
          .sort((a: number, b: number) => a - b)
        setAvailableTNumbers(tNumbers)

        // T번호 목록이 변경되면 첫 번째 T번호로 초기화
        if (tNumbers.length > 0 && !tNumbers.includes(formData.t_number)) {
          setFormData(prev => ({ ...prev, t_number: tNumbers[0] }))
        }
      } else {
        setAvailableTNumbers([])
      }
    } else {
      setAvailableTNumbers([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.production_model, formData.process])

  // 생산 모델, 공정, T번호가 변경될 때 앤드밀 정보 자동 입력 (추가 폼)
  useEffect(() => {
    if (formData.production_model && formData.process && formData.t_number && !isManualEndmillInput) {
      // API 기반 자동입력 시도
      autoFillByTNumber(formData.production_model, formData.process, formData.t_number)

      // 기존 CAM Sheet 기반 자동입력도 백업으로 유지
      const endmillInfo = autoFillEndmillInfo(formData.production_model, formData.process, formData.t_number)
      if (endmillInfo) {
        setFormData(prev => ({
          ...prev,
          endmill_code: prev.endmill_code || endmillInfo.endmillCode || null,
          endmill_name: prev.endmill_name || endmillInfo.endmillName || null
        }))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.production_model, formData.process, formData.t_number, isManualEndmillInput])

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
          production_model: model || '',
          process: process || ''
        }) : null)
      }
    } catch (error) {
      clientLogger.error('수정 모달 설비번호 자동입력 오류:', error)
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
          endmill_code: endmillCode || '',
          endmill_name: endmillName || ''
        }) : null)
      }
    } catch (error) {
      clientLogger.error('수정 모달 T번호 자동입력 오류:', error)
    }
  }, [])

  // 수정 모달: 설비번호 변경시 자동입력
  useEffect(() => {
    if (editingItem?.equipment_number && String(editingItem.equipment_number).match(/^C[0-9]{3}$/)) {
      autoFillEditByEquipmentNumber(String(editingItem.equipment_number))
    }
  }, [editingItem?.equipment_number, autoFillEditByEquipmentNumber])

  // 수정 모달: 생산모델과 공정이 선택되면 해당 CAM Sheet의 T번호 목록 가져오기
  useEffect(() => {
    if (editingItem && editingItem.production_model && editingItem.process) {
      const sheet = camSheets.find(s => s.model === editingItem.production_model && s.process === editingItem.process)
      if (sheet && sheet.cam_sheet_endmills) {
        const tNumbers = sheet.cam_sheet_endmills
          .map((e: any) => e.t_number)
          .filter((t: number) => t != null)
          .sort((a: number, b: number) => a - b)
        setEditAvailableTNumbers(tNumbers)

        // T번호 목록이 변경되면 첫 번째 T번호로 초기화
        if (tNumbers.length > 0 && !tNumbers.includes(editingItem.t_number)) {
          setEditingItem(prev => prev ? ({ ...prev, t_number: tNumbers[0] }) : null)
        }
      } else {
        setEditAvailableTNumbers([])
      }
    } else {
      setEditAvailableTNumbers([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem?.production_model, editingItem?.process])

  // 생산 모델, 공정, T번호가 변경될 때 앤드밀 정보 자동 입력 (수정 모달)
  useEffect(() => {
    if (editingItem && editingItem.production_model && editingItem.process && editingItem.t_number && !isEditManualEndmillInput) {
      // API 기반 자동입력 시도
      autoFillEditByTNumber(editingItem.production_model, editingItem.process, editingItem.t_number)

      // 기존 CAM Sheet 기반 자동입력도 백업으로 유지
      const endmillInfo = autoFillEndmillInfo(editingItem.production_model, editingItem.process, editingItem.t_number)
      if (endmillInfo) {
        setEditingItem(prev => prev ? ({
          ...prev,
          endmill_code: prev.endmill_code || endmillInfo.endmillCode,
          endmill_name: prev.endmill_name || endmillInfo.endmillName
        }) : null)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem?.production_model, editingItem?.process, editingItem?.t_number, isEditManualEndmillInput])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(`${formData.equipment_number} T${formData.t_number.toString().padStart(2, '0')} 교체 실적`)
    )

    if (confirmed) {
      try {
        // API 데이터 구조에 맞게 변환
        const toolChangeData = {
          equipment_number: parseInt(formData.equipment_number.replace(/^C/, '')) || 0,
          production_model: formData.production_model,
          process: formData.process,
          t_number: formData.t_number,
          endmill_code: formData.endmill_code || '',
          endmill_name: formData.endmill_name || '',
          tool_life: formData.tool_life,
          change_reason: formData.change_reason,
          changed_by: formData.changed_by || undefined
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
            `${formData.equipment_number} T${formData.t_number.toString().padStart(2, '0')} 교체 실적이 등록되었습니다.`
          )

          // 폼 초기화
          setFormData({
            change_date: getCurrentDateTime(),
            equipment_number: '',
            production_model: '',
            process: '',
            t_number: 1,
            endmill_code: null,
            endmill_name: null,
            tool_life: 0,
            change_reason: '',
            changed_by: ''
          })
          setIsManualEndmillInput(false)
        } else {
          showError('등록 실패', result.error || '교체 실적 등록에 실패했습니다.')
        }
      } catch (error) {
        clientLogger.error('교체 실적 등록 오류:', error)
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
    if (toolLife < 1000) return { color: 'text-red-600', status: t('toolChanges.toolLifeShort') }
    if (toolLife < 2000) return { color: 'text-yellow-600', status: t('toolChanges.toolLifeNormal') }
    return { color: 'text-green-600', status: t('toolChanges.toolLifeGood') }
  }

  // 수정 모달 열기
  const handleEdit = (item: ToolChange) => {
    setEditingItem(item)
    setIsEditManualEndmillInput(false) // 수동 입력 모드 초기화
    setShowEditModal(true)
  }

  // 수정 내용 저장
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    const confirmed = await confirmation.showConfirmation(
      createUpdateConfirmation(`${editingItem.equipment_number} T${editingItem.t_number.toString().padStart(2, '0')} 교체 실적`)
    )

    if (confirmed) {
      try {
        if (!editingItem) return

        // API 데이터 구조에 맞게 변환
        const updateData = {
          id: editingItem.id,
          equipment_number: editingItem.equipment_number,
          production_model: editingItem.production_model,
          process: editingItem.process,
          t_number: editingItem.t_number,
          endmill_code: editingItem.endmill_code,
          endmill_name: editingItem.endmill_name,
          tool_life: editingItem.tool_life,
          change_reason: editingItem.change_reason,
          changed_by: editingItem.changed_by || undefined
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
            `${editingItem.equipment_number} T${editingItem.t_number.toString().padStart(2, '0')} 교체 실적이 수정되었습니다.`
          )
        }
      } catch (error) {
        clientLogger.error('수정 오류:', error)
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
        clientLogger.error('삭제 오류:', error)
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.todayChanges')}</p>
              <p className="text-xl font-bold text-blue-600">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.todayTotal || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              ⏱️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.regularReplacement')}</p>
              <p className="text-xl font-bold text-green-600">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.regularReplacement || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              💥
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.broken')}</p>
              <p className="text-xl font-bold text-red-600">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.broken || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.wear')}</p>
              <p className="text-xl font-bold text-yellow-600">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.wear || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.modelChange')}</p>
              <p className="text-xl font-bold text-purple-600">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.modelChange || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              🛡️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.qualityDefect')}</p>
              <p className="text-xl font-bold text-orange-600">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.qualityDefect || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.topModelToday')}</p>
              {isStatsLoading ? (
                <p className="text-lg font-bold text-indigo-600">...</p>
              ) : (
                <>
                  <p className="text-lg font-bold text-indigo-600">{stats?.topModelToday.name || '없음'}</p>
                  <p className="text-xs text-gray-500">{stats?.topModelToday.count || 0} {t('toolChanges.cases')}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
              ⚙️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">{t('toolChanges.topProcessToday')}</p>
              {isStatsLoading ? (
                <p className="text-lg font-bold text-teal-600">...</p>
              ) : (
                <>
                  <p className="text-lg font-bold text-teal-600">{stats?.topProcessToday.name || '없음'}</p>
                  <p className="text-xs text-gray-500">{stats?.topProcessToday.count || 0} {t('toolChanges.cases')}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 교체 실적 입력 폼 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('toolChanges.newChangeRecordInput')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.changeDate')}</label>
                <input
                  type="text"
                  value={formData.change_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">{t('toolChanges.autoFilledDateTime')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.equipmentNumber')}</label>
                <input
                  type="text"
                  placeholder="C001"
                  value={formData.equipment_number}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setFormData({...formData, equipment_number: value})
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  pattern="C[0-9]{3}"
                  title={t('toolChanges.equipmentNumberFormat')}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('toolChanges.autoFilledModelProcess')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.productionModel')}</label>
                <select
                  value={formData.production_model}
                  onChange={(e) => setFormData({...formData, production_model: e.target.value})}
                  className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.equipment_number ? 'bg-blue-50' : ''
                  }`}
                  required
                >
                  <option value="">{t('toolChanges.selectModel')}</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.equipment_number ? t('toolChanges.autoFilledByEquipment') : t('toolChanges.registeredCAMSheetModels')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.process')}</label>
                <select
                  value={formData.process}
                  onChange={(e) => setFormData({...formData, process: e.target.value})}
                  className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.equipment_number ? 'bg-blue-50' : ''
                  }`}
                  required
                >
                  <option value="">{t('toolChanges.selectProcess')}</option>
                  <option value="CNC1">CNC1</option>
                  <option value="CNC2">CNC2</option>
                  <option value="CNC2-1">CNC2-1</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.equipment_number ? t('toolChanges.autoFilledByEquipment') : t('toolChanges.selectProcessPrompt')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.tNumber')}</label>
                <select
                  value={formData.t_number}
                  onChange={(e) => setFormData({...formData, t_number: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={availableTNumbers.length === 0}
                >
                  {availableTNumbers.length > 0 ? (
                    availableTNumbers.map(num => (
                      <option key={num} value={num}>T{num.toString().padStart(2, '0')}</option>
                    ))
                  ) : (
                    <option value={formData.t_number}>
                      {formData.production_model && formData.process
                        ? 'CAM Sheet에 등록된 T번호 없음'
                        : '모델, 공정, T번호 선택 시 자동 입력'}
                    </option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {availableTNumbers.length > 0
                    ? `등록된 CAM SHEET의 모델들`
                    : 'T번호 선택시 자동으로 입력됩니다'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.endmillCode')}</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isManualEndmillInput ? t('toolChanges.enterEndmillCode') : t('toolChanges.autoFilledEndmillCode')}
                    value={formData.endmill_code || ''}
                    onChange={(e) => isManualEndmillInput && setFormData({...formData, endmill_code: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                      isManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                    }`}
                    readOnly={!isManualEndmillInput}
                    required
                  />
                  {formData.production_model && formData.process && formData.t_number && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isManualEndmillInput) {
                          // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                          setIsManualEndmillInput(false)
                          const endmillInfo = autoFillEndmillInfo(formData.production_model, formData.process, formData.t_number)
                          if (endmillInfo) {
                            setFormData(prev => ({
                              ...prev,
                              endmill_code: endmillInfo.endmillCode,
                              endmill_name: endmillInfo.endmillName
                            }))
                          }
                        } else {
                          // 수동입력 모드로 전환
                          setIsManualEndmillInput(true)
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {isManualEndmillInput ? t('toolChanges.autoInput') : t('toolChanges.manualInput')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isManualEndmillInput ? t('toolChanges.pleaseEnterManually') : t('toolChanges.autoFilledOnTNumber')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.endmillName')}</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isManualEndmillInput ? t('toolChanges.enterEndmillName') : t('toolChanges.autoFilledEndmillName')}
                    value={formData.endmill_name || ''}
                    onChange={(e) => isManualEndmillInput && setFormData({...formData, endmill_name: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                      isManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                    }`}
                    readOnly={!isManualEndmillInput}
                    required
                  />
                  {formData.production_model && formData.process && formData.t_number && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isManualEndmillInput) {
                          // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                          setIsManualEndmillInput(false)
                          const endmillInfo = autoFillEndmillInfo(formData.production_model, formData.process, formData.t_number)
                          if (endmillInfo) {
                            setFormData(prev => ({
                              ...prev,
                              endmill_code: endmillInfo.endmillCode,
                              endmill_name: endmillInfo.endmillName
                            }))
                          }
                        } else {
                          // 수동입력 모드로 전환
                          setIsManualEndmillInput(true)
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {isManualEndmillInput ? t('toolChanges.autoInput') : t('toolChanges.manualInput')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isManualEndmillInput ? t('toolChanges.pleaseEnterManually') : t('toolChanges.autoFilledOnTNumber')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.actualToolLife')}</label>
                <input
                  type="number"
                  placeholder="2500"
                  value={formData.tool_life}
                  onChange={(e) => setFormData({...formData, tool_life: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="10000"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('toolChanges.actualToolLifeDescription')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.changeReason')}</label>
                <select
                  value={formData.change_reason}
                  onChange={(e) => setFormData({...formData, change_reason: e.target.value})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('toolChanges.selectReason')}</option>
                  {toolChangesReasons.map(reason => (
                    <option key={reason} value={reason}>{getReasonTranslation(reason)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.replacedBy')}</label>
                <select
                  value={formData.changed_by}
                  onChange={(e) => setFormData({...formData, changed_by: e.target.value})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('toolChanges.selectReplacer')}</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.employee_id})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('toolChanges.selectReplacerDescription')}</p>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('toolChanges.save')}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t('toolChanges.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 버튼 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
        <div className="flex flex-col gap-4">
          {/* 첫 번째 줄: 검색, 설비, 사유 필터 */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <input
                type="text"
                placeholder={t('toolChanges.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                {t('toolChanges.resetFilters')}
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('toolChanges.addChangeRecord')}
              </button>
            </div>
          </div>

          {/* 두 번째 줄: 날짜 필터 */}
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">{t('toolChanges.period')}:</label>
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
                {t('toolChanges.error')}: {toolChangesError}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center text-blue-600 text-sm">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                {t('toolChanges.loading')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 교체 실적 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{t('toolChanges.changeHistoryList')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t('toolChanges.changeDateTime')}
                  field="change_date"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.equipmentNumber')}
                  field="equipment_number"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.productionModel')}
                  field="production_model"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.process')}
                  field="process"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.tNumber')}
                  field="t_number"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('toolChanges.endmillCode')}
                </th>
                <SortableTableHeader
                  label={t('toolChanges.endmillName')}
                  field="endmill_name"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('toolChanges.replacedBy')}
                </th>
                <SortableTableHeader
                  label={t('toolChanges.changeReason')}
                  field="change_reason"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.toolLife')}
                  field="tool_life"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('toolChanges.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {toolChanges.length > 0 ? toolChanges.map((change) => {
                const toolLifeStatus = getToolLifeStatus(change.tool_life || 0)
                // Format date properly - change_date is just a date string, not datetime
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
                        {getReasonTranslation(change.change_reason || change.reason || '-')}
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
                        {t('toolChanges.edit')}
                      </button>
                      <button 
                        onClick={() => handleDelete(change)}
                        className={`${
                          deletingItemId === change.id 
                            ? 'text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded font-medium' 
                            : 'text-red-600 hover:text-red-800'
                        }`}
                      >
                        {deletingItemId === change.id ? t('toolChanges.confirmDelete') : t('toolChanges.delete')}
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
                        {t('toolChanges.loadingData')}
                      </div>
                    ) : (
                      t('toolChanges.noData')
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
                {t('toolChanges.showing', {
                  total: totalCount || toolChanges.length,
                  from: ((currentPage - 1) * itemsPerPage) + 1,
                  to: Math.min(currentPage * itemsPerPage, totalCount || toolChanges.length)
                })}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('toolChanges.previous')}
                </button>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const totalPages = Math.ceil((totalCount || toolChanges.length) / itemsPerPage)
                    const pageNumbers = []
                    const maxVisiblePages = 5

                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

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
                  {t('toolChanges.next')}
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
                <h3 className="text-lg font-medium">{t('toolChanges.editChangeRecord')}</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editChangeDate')}</label>
                    <input
                      type="text"
                      value={editingItem.change_date}
                      onChange={(e) => setEditingItem({...editingItem, change_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editEquipmentNumber')}</label>
                    <input
                      type="text"
                      value={`C${editingItem.equipment_number.toString().padStart(3, '0')}`}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/^C/, '')
                        const numValue = parseInt(value) || 0
                        setEditingItem({...editingItem, equipment_number: numValue})
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      pattern="C[0-9]{3}"
                      title={t('toolChanges.equipmentNumberPattern')}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('toolChanges.autoFillOnEquipment')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editProductionModel')}</label>
                    <select
                      value={editingItem.production_model}
                      onChange={(e) => setEditingItem({...editingItem, production_model: e.target.value})}
                      className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editingItem.equipment_number ? 'bg-blue-50' : ''
                      }`}
                      required
                    >
                      <option value="">{t('toolChanges.selectModelPrompt')}</option>
                      {availableModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingItem.equipment_number ? t('toolChanges.autoFilledBasis') : t('toolChanges.camSheetModels')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editProcess')}</label>
                    <select
                      value={editingItem.process}
                      onChange={(e) => setEditingItem({...editingItem, process: e.target.value})}
                      className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editingItem.equipment_number ? 'bg-blue-50' : ''
                      }`}
                      required
                    >
                      <option value="CNC1">CNC1</option>
                      <option value="CNC2">CNC2</option>
                      <option value="CNC2-1">CNC2-1</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingItem.equipment_number ? t('toolChanges.autoFilledBasis') : t('toolChanges.selectProcessOption')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editTNumber')}</label>
                    <select
                      value={editingItem.t_number}
                      onChange={(e) => setEditingItem({...editingItem, t_number: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={editAvailableTNumbers.length === 0}
                    >
                      {editAvailableTNumbers.length > 0 ? (
                        editAvailableTNumbers.map(num => (
                          <option key={num} value={num}>T{num.toString().padStart(2, '0')}</option>
                        ))
                      ) : (
                        <option value={editingItem.t_number}>
                          {editingItem.production_model && editingItem.process
                            ? 'CAM Sheet에 등록된 T번호 없음'
                            : '모델, 공정 선택 시 자동 입력'}
                        </option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editAvailableTNumbers.length > 0
                        ? `CAM Sheet에 등록된 T번호만 선택 가능`
                        : 'T번호 선택시 자동으로 입력됩니다'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editEndmillCode')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={isEditManualEndmillInput ? t('toolChanges.endmillCodeInputPrompt') : t('toolChanges.endmillCodeAutoFill')}
                        value={editingItem.endmill_code || ''}
                        onChange={(e) => isEditManualEndmillInput && setEditingItem({...editingItem, endmill_code: e.target.value})}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                          isEditManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                        }`}
                        readOnly={!isEditManualEndmillInput}
                        required
                      />
                      {editingItem.production_model && editingItem.process && editingItem.t_number && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditManualEndmillInput) {
                              // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                              setIsEditManualEndmillInput(false)
                              const endmillInfo = autoFillEndmillInfo(editingItem.production_model, editingItem.process, editingItem.t_number)
                              if (endmillInfo) {
                                setEditingItem(prev => prev ? ({
                                  ...prev,
                                  endmill_code: endmillInfo.endmillCode,
                                  endmill_name: endmillInfo.endmillName
                                }) : null)
                              }
                            } else {
                              // 수동입력 모드로 전환
                              setIsEditManualEndmillInput(true)
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {isEditManualEndmillInput ? t('toolChanges.autoInput') : t('toolChanges.manualInput')}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {isEditManualEndmillInput ? t('toolChanges.pleaseEnterManually') : t('toolChanges.camSheetAutoFill')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editEndmillName')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={isEditManualEndmillInput ? t('toolChanges.endmillNameInputPrompt') : t('toolChanges.endmillNameAutoFill')}
                        value={editingItem.endmill_name || ''}
                        onChange={(e) => isEditManualEndmillInput && setEditingItem({...editingItem, endmill_name: e.target.value})}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                          isEditManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                        }`}
                        readOnly={!isEditManualEndmillInput}
                        required
                      />
                      {editingItem.production_model && editingItem.process && editingItem.t_number && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditManualEndmillInput) {
                              // 자동입력 모드로 전환하고 CAM SHEET 데이터로 자동 채우기
                              setIsEditManualEndmillInput(false)
                              const endmillInfo = autoFillEndmillInfo(editingItem.production_model, editingItem.process, editingItem.t_number)
                              if (endmillInfo) {
                                setEditingItem(prev => prev ? ({
                                  ...prev,
                                  endmill_code: endmillInfo.endmillCode,
                                  endmill_name: endmillInfo.endmillName
                                }) : null)
                              }
                            } else {
                              // 수동입력 모드로 전환
                              setIsEditManualEndmillInput(true)
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {isEditManualEndmillInput ? t('toolChanges.autoInput') : t('toolChanges.manualInput')}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {isEditManualEndmillInput ? t('toolChanges.pleaseEnterManually') : t('toolChanges.camSheetAutoFill')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editToolLife')}</label>
                    <input
                      type="number"
                      value={editingItem.tool_life || 0}
                      onChange={(e) => setEditingItem({...editingItem, tool_life: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="10000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toolChanges.editChangeReason')}</label>
                    <select
                      value={editingItem.change_reason}
                      onChange={(e) => setEditingItem({...editingItem, change_reason: e.target.value})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {toolChangesReasons.map(reason => (
                        <option key={reason} value={reason}>{getReasonTranslation(reason)}</option>
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
                    {t('toolChanges.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('toolChanges.save')}
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