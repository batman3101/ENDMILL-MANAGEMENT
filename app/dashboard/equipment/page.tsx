'use client'

import { useState, useMemo, useEffect } from 'react'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createStatusChangeConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import StatusChangeDropdown from '../../../components/shared/StatusChangeDropdown'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import { useSettings } from '../../../lib/hooks/useSettings'

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

// StatusTransition 인터페이스 제거됨 (StatusChangeDropdown 컴포넌트로 이동)

// 설비 데이터 생성 함수 - 설정값 기반으로 수정
const generateEquipmentData = (
  availableModels: string[], 
  availableProcesses: string[],
  totalCount: number,
  locations: string[],
  statuses: any[],
  toolTotal: number
): Equipment[] => {
  const equipments: Equipment[] = []
  // CAM Sheet에서 실제 모델/공정 데이터가 없으면 기본값 사용
  const models = availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  const processes = availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']
  const validLocations = locations.length > 0 ? locations : ['A동', 'B동']
  const validStatuses = statuses.length > 0 ? statuses.map(s => s.code || s.name || s) : ['가동중', '점검중', '셋업중']
  
  for (let i = 1; i <= totalCount; i++) {
    const equipmentNumber = `C${i.toString().padStart(3, '0')}`
    const location = validLocations[Math.floor((i - 1) / Math.ceil(totalCount / validLocations.length))]
    const currentModel = models[Math.floor(Math.random() * models.length)]
    const process = processes[Math.floor(Math.random() * processes.length)]
    
    // 상태 분포: 가동중 70%, 점검중 20%, 셋업중 10%
    let status: any
    const rand = Math.random()
    if (rand < 0.7) status = validStatuses[0] || '가동중'
    else if (rand < 0.9) status = validStatuses[1] || '점검중'
    else status = validStatuses[2] || '셋업중'
    
    // 앤드밀 사용량: 점검중이면 0, 나머지는 툴 포지션의 70-100%
    const isUnderMaintenance = status === '점검중' || status === 'maintenance'
    const used = isUnderMaintenance ? 0 : Math.floor(Math.random() * (toolTotal * 0.3)) + Math.floor(toolTotal * 0.7)
    
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
      toolPositions: { used, total: toolTotal },
      lastMaintenance: lastMaintenanceDate.toISOString().split('T')[0]
    })
  }
  
  return equipments
}

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const confirmation = useConfirmation()
  const { showSuccess, showError } = useToast()
  
  // 설정에서 값 가져오기
  const { settings, updateCategorySettings } = useSettings()
  const itemsPerPage = settings.system.itemsPerPage
  const totalEquipmentCount = settings.equipment.totalCount
  const equipmentLocations = settings.equipment.locations
  const equipmentStatuses = settings.equipment.statuses
  const toolPositionCount = settings.equipment.toolPositionCount

  // 디버깅: 설정값 확인
  console.log('🔧 [Equipment] 현재 설정값:', {
    itemsPerPage,
    totalEquipmentCount,
    equipmentLocations,
    equipmentStatuses,
    toolPositionCount,
    equipmentNumberFormat: settings.equipment.numberFormat,
    allSettings: settings
  })

  // 디버깅 함수 추가
  const debugSettings = () => {
    console.log('=== 설정 디버깅 시작 ===')
    
    // 1. localStorage 원본 확인 (올바른 키 사용)
    const storedSettings = localStorage.getItem('endmill_system_settings')
    console.log('📱 localStorage 원본:', storedSettings)
    
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings)
        console.log('📱 localStorage 파싱됨:', parsedSettings)
        console.log('📱 localStorage itemsPerPage:', parsedSettings?.system?.itemsPerPage)
        console.log('📱 localStorage numberFormat:', parsedSettings?.equipment?.numberFormat)
      } catch (e) {
        console.error('📱 localStorage 파싱 오류:', e)
      }
    }
    
    // 2. React state 확인
    console.log('⚛️ React state settings:', settings)
    console.log('⚛️ React state itemsPerPage:', settings.system.itemsPerPage)
    console.log('⚛️ React state numberFormat:', settings.equipment.numberFormat)
    
    // 3. 실제 사용되는 값 확인
    console.log('🎯 실제 사용값 itemsPerPage:', itemsPerPage)
    console.log('🎯 실제 사용값 totalEquipmentCount:', totalEquipmentCount)
    console.log('🎯 실제 사용값 equipmentNumberFormat:', settings.equipment.numberFormat)
    
    // 4. 설정 매니저 직접 호출
    try {
      const settingsManager = require('../../../lib/data/settingsManager').SettingsManager.getInstance()
      const directSettings = settingsManager.getSettings()
      console.log('🔧 SettingsManager 직접 호출:', directSettings)
      console.log('🔧 SettingsManager itemsPerPage:', directSettings.system.itemsPerPage)
      console.log('🔧 SettingsManager numberFormat:', directSettings.equipment.numberFormat)
    } catch (e) {
      console.error('🔧 SettingsManager 호출 오류:', e)
    }
    
    // 5. 수동 확인 명령어 제공
    console.log('📋 수동 확인 명령어:')
    console.log('   localStorage.getItem("endmill_system_settings")')
    console.log('   JSON.parse(localStorage.getItem("endmill_system_settings"))')
    
    console.log('=== 설정 디버깅 끝 ===')
  }

  // 강제 설정 테스트 함수
  const forceUpdateSettings = async () => {
    console.log('=== 강제 설정 업데이트 시작 ===')
    try {
      // 테스트 값으로 강제 업데이트
      await updateCategorySettings('system', {
        itemsPerPage: 15  // 테스트용 값
      }, '디버그', '강제 테스트 업데이트')
      
      await updateCategorySettings('equipment', {
        numberFormat: 'CNC{number:3}'  // 테스트용 값
      }, '디버그', '강제 테스트 업데이트')
      
      console.log('✅ 강제 설정 업데이트 완료')
      
      // 1초 후 디버깅 다시 실행
      setTimeout(() => {
        debugSettings()
      }, 1000)
      
    } catch (error) {
      console.error('❌ 강제 설정 업데이트 실패:', error)
    }
    console.log('=== 강제 설정 업데이트 끝 ===')
  }
  
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
  const { camSheets, getAvailableModels, getAvailableProcesses } = useCAMSheets()

  // 클라이언트 사이드에서만 데이터 로드 - 설정 데이터 기반으로 생성
  useEffect(() => {
    console.log('🔄 [Equipment] useEffect 실행됨 - 설정값 변경 감지')
    console.log('🔄 dependencies:', {
      getAvailableModels, 
      getAvailableProcesses,
      totalEquipmentCount,
      equipmentLocations,
      equipmentStatuses,
      toolPositionCount,
      itemsPerPage
    })
    
    setEquipments(generateEquipmentData(
      getAvailableModels, 
      getAvailableProcesses,
      totalEquipmentCount,
      equipmentLocations,
      equipmentStatuses,
      toolPositionCount
    ))
    setIsLoading(false)
  }, [getAvailableModels, getAvailableProcesses, totalEquipmentCount, equipmentLocations, equipmentStatuses, toolPositionCount, itemsPerPage])

  useEffect(() => {
    console.log('🏭 [Equipment] equipment settings 변경됨:', {
      totalEquipmentCount,
      numberFormat: settings.equipment.numberFormat,
      toolPositionCount
    })
  }, [totalEquipmentCount, settings.equipment.numberFormat, toolPositionCount])

  // 실시간 설정 변경 감지 테스트
  useEffect(() => {
    console.log('⚡ [Equipment] 전체 settings 변경 감지:', {
      timestamp: new Date().toLocaleTimeString(),
      itemsPerPage: settings.system.itemsPerPage,
      numberFormat: settings.equipment.numberFormat,
      totalCount: settings.equipment.totalCount,
      toolPositions: settings.equipment.toolPositionCount
    })
  }, [settings])

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

  // 설정값 변경 감지를 위한 별도 useEffect (filteredEquipments 정의 후에 배치)
  useEffect(() => {
    console.log('📊 [Equipment] itemsPerPage 변경됨:', itemsPerPage)
    console.log('🔄 [Equipment] 현재 페이지네이션 상태:', {
      currentPage,
      totalPages: Math.ceil(filteredEquipments.length / itemsPerPage),
      filteredEquipmentsLength: filteredEquipments.length,
      itemsPerPage,
      startIndex: (currentPage - 1) * itemsPerPage,
      endIndex: (currentPage - 1) * itemsPerPage + itemsPerPage
    })
  }, [itemsPerPage, currentPage, filteredEquipments])

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
  const handleStatusChange = async (equipmentId: string, newStatus: Equipment['status']) => {
    const equipment = equipments.find(eq => eq.id === equipmentId)
    if (!equipment) return

    const confirmed = await confirmation.showConfirmation(
      createStatusChangeConfirmation(
        equipment.equipmentNumber,
        equipment.status,
        newStatus
      )
    )

    if (confirmed) {
      setEquipments(prev => prev.map(eq => 
        eq.id === equipmentId ? { ...eq, status: newStatus } : eq
      ))
      showSuccess(
        '상태 변경 완료',
        `${equipment.equipmentNumber}의 상태가 ${newStatus}(으)로 변경되었습니다.`
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
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equipmentNumber: addFormData.equipmentNumber,
          location: addFormData.location,
          status: addFormData.status,
          currentModel: addFormData.currentModel,
          process: addFormData.process,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '설비 추가에 실패했습니다.')
      }

      const result = await response.json()
      
      // 새로운 설비를 로컬 상태에 추가
      setEquipments(prev => [...prev, result.data])
      
      // 폼 초기화
      setAddFormData({
        equipmentNumber: '',
        location: 'A동',
        status: '가동중',
        currentModel: '',
        process: ''
      })
      
      setShowAddModal(false)
      showSuccess('설비 추가 완료', `설비 ${result.data.equipmentNumber}가 성공적으로 추가되었습니다.`)
      
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
      parseInt(eq.equipmentNumber.replace('C', ''))
    ).filter(num => !isNaN(num))
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
    const nextNumber = maxNumber + 1
    return `C${nextNumber.toString().padStart(3, '0')}`
  }

  // 설비 추가 모달 열기
  const handleOpenAddModal = () => {
    setAddFormData(prev => ({
      ...prev,
      equipmentNumber: generateNextEquipmentNumber(),
      location: equipmentLocations[0] || 'A동',
      status: (equipmentStatuses[0]?.code || equipmentStatuses[0]?.name || equipmentStatuses[0] || '가동중') as Equipment['status'],
      currentModel: getAvailableModels[0] || 'PA1',
      process: getAvailableProcesses[0] || 'CNC1'
    }))
    setShowAddModal(true)
  }

  // 로딩 중일 때 - 중복 디스크립션 제거
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏭</span>
            </div>
            <p className="text-gray-600">설비 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // CAM Sheet에서 실제 모델/공정 목록 가져오기 (메모이제이션된 값)
  const availableModels = getAvailableModels
  const availableProcesses = getAvailableProcesses

  return (
    <div className="space-y-6">

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
        {/* 모델별 배치 현황 - CAM Sheet 데이터 기반 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 모델별 설비 배치</h3>
          <div className="space-y-3">
            {(availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']).map(model => {
              const modelEquipments = equipments.filter(eq => eq.currentModel === model)
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
              {(availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={debugSettings}
            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            title="콘솔에서 설정값 확인"
          >
            🔍 디버그
          </button>
          <button 
            onClick={forceUpdateSettings}
            className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
            title="강제로 설정값 업데이트 (테스트용)"
          >
            🔧 강제업데이트
          </button>
          <button 
            onClick={handleOpenAddModal}
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
              {currentEquipments.map((equipment) => {
                return (
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
                    
                    {/* 작업 컬럼 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* 상태 변경 드롭다운 */}
                        <StatusChangeDropdown
                          currentStatus={equipment.status}
                          equipmentId={equipment.id}
                          equipmentNumber={equipment.equipmentNumber}
                          onStatusChange={handleStatusChange}
                        />
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
                    {equipmentLocations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
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
                    {equipmentStatuses.map(status => (
                      <option key={status.code || status.name || status} value={status.code || status.name || status}>
                        {status.name || status}
                      </option>
                    ))}
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
                  {(availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']).map(model => (
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
                  {(availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']).map(process => (
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