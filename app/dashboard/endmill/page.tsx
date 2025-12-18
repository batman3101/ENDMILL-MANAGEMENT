'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createCustomConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
// import { useCAMSheets } from '../../../lib/hooks/useCAMSheets' // 미사용
import { useSettings } from '../../../lib/hooks/useSettings'
import EndmillExcelUploader from '../../../components/features/EndmillExcelUploader'
import EndmillForm from '../../../components/features/EndmillForm'
import EndmillSupplierPrices from '../../../components/features/EndmillSupplierPrices'
import { downloadEndmillTemplate } from '../../../lib/utils/endmillExcelTemplate'
import { supabase } from '../../../lib/supabase/client'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'
import { logger, clientLogger } from '@/lib/utils/logger'

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
  const router = useRouter()
  const { t } = useTranslation()
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
  const [selectedEndmill, setSelectedEndmill] = useState<EndmillInstance | null>(null)
  const [showExcelUploader, setShowExcelUploader] = useState(false)
  const [showEndmillForm, setShowEndmillForm] = useState(false)
  const lastRefreshTimeRef = useRef<number>(0)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const itemsPerPage = settings.system.itemsPerPage

  // 실제 DB에서 사용 중인 카테고리 동적으로 추출
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    endmills.forEach(endmill => {
      if (endmill.category) {
        uniqueCategories.add(endmill.category)
      }
    })
    return Array.from(uniqueCategories).sort()
  }, [endmills])

  // Throttled refresh function to prevent excessive API calls
  const throttledRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshTimeRef.current > 3000) { // 최소 3초 간격
      lastRefreshTimeRef.current = now
      loadEndmillData()
      loadEquipmentData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    // 실시간 구독 설정
    const endmillChannel = supabase
      .channel('endmill_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'endmill_types' },
        (payload) => {
          logger.log('🔧 엔드밀 타입 변경:', payload)
          throttledRefresh()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'endmill_categories' },
        (payload) => {
          logger.log('📂 엔드밀 카테고리 변경:', payload)
          throttledRefresh()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          logger.log('📦 재고 변경:', payload)
          throttledRefresh()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cam_sheet_endmills' },
        (payload) => {
          logger.log('📋 CAM 시트 앤드밀 변경:', payload)
          throttledRefresh()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'endmill_supplier_prices' },
        (payload) => {
          logger.log('💰 공급업체 가격 변경:', payload)
          throttledRefresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.log('✅ 엔드밀 실시간 연결됨')
          setIsRealtimeConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          logger.log('❌ 엔드밀 실시간 연결 실패')
          setIsRealtimeConnected(false)
        }
      })

    const equipmentChannel = supabase
      .channel('equipment_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' },
        (payload) => {
          logger.log('🏭 설비 변경:', payload)
          throttledRefresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.log('✅ 설비 실시간 연결됨')
        } else if (status === 'CHANNEL_ERROR') {
          logger.log('❌ 설비 실시간 연결 실패')
        }
      })

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      supabase.removeChannel(endmillChannel)
      supabase.removeChannel(equipmentChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        showError(t('endmill.loadDataFailed'), t('endmill.loadDataFailedMessage'))
      }
    } catch (error) {
      clientLogger.error('엔드밀 데이터 로드 오류:', error)
      showError(t('endmill.loadDataError'), t('endmill.loadDataErrorMessage'))
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
        clientLogger.error('설비 데이터 로드 실패:', result.error)
      }
    } catch (error) {
      clientLogger.error('설비 데이터 로드 오류:', error)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, typeFilter])

  // 상태별 통계 (향후 사용 예정)
  const _statusStats = useMemo(() => {
    return {
      total: endmills.length,
      active: endmills.filter(item => item.status === 'active').length,
      warning: endmills.filter(item => item.status === 'warning').length,
      critical: endmills.filter(item => item.status === 'critical').length,
      todayReplaced: 0 // 실제 교체 기록에서 계산 예정
    }
  }, [endmills])

  // 상태 배지 색상 (향후 사용 예정)
  const _getStatusBadge = (status: EndmillInstance['status']) => {
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

  const _getStatusText = (status: EndmillInstance['status']) => {
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

  const _getStatusIcon = (status: EndmillInstance['status']) => {
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
    logger.log(`[DEBUG] ${code} - endmillData:`, endmillData)
    logger.log(`[DEBUG] ${code} - equipments count:`, equipments.length)

    if (!endmillData || !endmillData.camSheets) {
      logger.log(`[DEBUG] ${code} - No endmill data or camSheets`)
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

    logger.log(`[DEBUG] ${code} - modelProcessPairs:`, modelProcessPairs)

    // 실제 설비 데이터에서 해당 모델/공정 조합을 가진 설비들 찾기
    const matchingEquipments = equipments.filter(eq => {
      return modelProcessPairs.some(pair =>
        eq.current_model === pair.model && eq.process === pair.process
      )
    })

    logger.log(`[DEBUG] ${code} - matchingEquipments:`, matchingEquipments.length)

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
    // Next.js 라우터를 사용하여 클라이언트 사이드 네비게이션
    router.push(`/dashboard/endmill-detail/${item.code}`)
  }

  // 향후 사용 예정 핸들러들
  const _handleImmediateReplace = async (item: EndmillInstance) => {
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

  const _handleScheduleReplace = async (item: EndmillInstance) => {
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

  const _handleMaintenance = async (item: EndmillInstance) => {
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
  const handleDownloadTemplate = async () => {
    const result = await downloadEndmillTemplate()
    if (result.success) {
      showSuccess('템플릿 다운로드', `${result.fileName} 파일이 다운로드되었습니다.`)
    } else {
      showError('다운로드 실패', result.error || '템플릿 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 공급업체별 단가표 다운로드 핸들러
  const handleDownloadSupplierPriceList = async () => {
    try {
      const response = await fetch('/api/endmill/supplier-price-list')

      if (!response.ok) {
        throw new Error('단가표 다운로드 실패')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `공급업체별_단가표_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showSuccess(t('endmill.downloadSupplierPriceList'), t('endmill.supplierPriceListDownloaded'))
    } catch (error) {
      clientLogger.error('단가표 다운로드 오류:', error)
      showError(t('endmill.downloadPriceListFailed'), t('endmill.downloadPriceListError'))
    }
  }

  // 엑셀 업로드 성공 핸들러
  const handleUploadSuccess = (_data: any[]) => {
    showSuccess('업로드 완료', '엔드밀 데이터가 성공적으로 등록되었습니다.')
    // CAM Sheet 데이터 새로고침 (일괄 등록 시 CAM Sheet도 생성되므로)
    queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    // 엔드밀 데이터 새로고침
    loadEndmillData()
  }

  // 개별 등록 성공 핸들러
  const handleCreateSuccess = (_data: any) => {
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
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
            <p className="text-gray-600">{t('endmill.loadingData')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className={`text-xs font-medium ${isRealtimeConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isRealtimeConnected ? t('endmill.realtimeConnected') : t('endmill.connecting')}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEndmillForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            ➕ {t('endmill.newEndmillRegister')}
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            📥 {t('endmill.excelTemplateDownload')}
          </button>
          <button
            onClick={handleDownloadSupplierPriceList}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
            title={t('endmill.supplierPriceListTooltip')}
          >
            💰 {t('endmill.supplierPriceList')}
          </button>
          <button
            onClick={() => setShowExcelUploader(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📤 {t('endmill.endmillBulkRegister')}
          </button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('endmill.searchPlaceholderEndmill')}
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
            <option value="">{t('endmill.allStatus')}</option>
            <option value="new">{t('endmill.new')}</option>
            <option value="active">{t('endmill.inUse')}</option>
            <option value="warning">{t('endmill.warning')}</option>
            <option value="critical">{t('endmill.danger')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('endmill.allType')}</option>
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
              {t('endmill.filterReset')}
            </button>
          </div>
        )}
      </div>

      {/* 앤드밀 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('endmill.endmillStatusList')} ({sortedEndmills.length}{t('endmill.count')})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('endmill.page')} {currentPage} / {totalPages} ({t('endmill.perPage')} {itemsPerPage}{t('endmill.items')})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t('endmill.endmillCodeLabel')}
                  field="code"
                  currentSortField={sortColumn}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('endmill.categoryLabel')}
                  field="category"
                  currentSortField={sortColumn}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('endmill.nameLabel')}
                  field="name"
                  currentSortField={sortColumn}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('endmill.usageCountLabel')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('endmill.actionsLabel')}
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
                        {t('endmill.detailViewButton')}
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
                {t('endmill.previousButton')}
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('endmill.nextButton')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('endmill.total')} <span className="font-medium">{sortedEndmills.length}</span>{t('endmill.of')}{' '}
                  <span className="font-medium">{startIndex + 1}</span>-
                  <span className="font-medium">{Math.min(endIndex, sortedEndmills.length)}</span>{t('endmill.display')}
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
          <p className="text-lg text-gray-600 mb-2">{t('endmill.noEndmillData')}</p>
          <p className="text-sm text-gray-500">{t('endmill.noEndmillMessage')}</p>
        </div>
      )}

      {/* 검색 결과가 없을 때 */}
      {endmills.length > 0 && sortedEndmills.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('endmill.noSearchResults')}</p>
          <button
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('')
              setTypeFilter('')
              setCurrentPage(1)
            }}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            {t('endmill.filterReset')}
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
        <div className="mobile-modal-container" onClick={() => setSelectedEndmill(null)}>
          <div className="mobile-modal-content md:max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('endmill.statusDetailTitle')} - {selectedEndmill.code}</h3>
              <button
                onClick={() => setSelectedEndmill(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="mobile-modal-body space-y-6">
              {/* 현황 정보 */}
              {(() => {
                const usage = getEndmillUsageInfo(selectedEndmill.code)
                return (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-3">{t('endmill.currentUsageStatus')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">{t('endmill.usedEquipmentCount')}</span>
                        <div className="text-lg font-bold text-blue-600">{usage.usedEquipmentCount}{t('endmill.unit')}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('endmill.endmillCodeLabel')}</span>
                        <div className="text-lg font-bold text-gray-900">{selectedEndmill.code}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('endmill.categoryLabel')}</span>
                        <div className="text-sm text-gray-900">{selectedEndmill.category}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">{t('endmill.nameLabel')}</span>
                        <div className="text-sm text-gray-900">{selectedEndmill.name}</div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 모델/공정별 사용 현황 테이블 */}
              {(() => {
                const _usage = getEndmillUsageInfo(selectedEndmill.code)

                if (!selectedEndmill.camSheets || selectedEndmill.camSheets.length === 0) {
                  return (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold mb-2">{t('endmill.usageByModelProcess')}</h4>
                      <p className="text-gray-500">{t('endmill.noUsageInfo')}</p>
                    </div>
                  )
                }

                // 모델/공정별로 그룹핑
                const groupedData = selectedEndmill.camSheets.reduce((acc: any, cs: any) => {
                  const key = `${cs.model}_${cs.process}`
                  if (!acc[key]) {
                    acc[key] = {
                      model: cs.model,
                      process: cs.process,
                      tNumbers: [],
                      toolLife: cs.toolLife,
                      equipmentNumbers: []
                    }
                  }
                  acc[key].tNumbers.push(cs.tNumber)
                  return acc
                }, {})

                // 각 모델/공정에 해당하는 설비 번호 찾기
                Object.keys(groupedData).forEach(key => {
                  const data = groupedData[key]
                  const matchingEquipments = equipments.filter(eq =>
                    eq.current_model === data.model && eq.process === data.process
                  )
                  data.equipmentNumbers = matchingEquipments.map(eq => eq.equipment_number)
                })

                return (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-3">{t('endmill.usageByModelProcess')}</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 rounded-lg">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">{t('endmill.model')}</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">{t('endmill.process')}</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">{t('endmill.tNumberLabel')}</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">{t('endmill.equipmentCount')}</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">{t('endmill.equipmentNumbers')}</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">{t('endmill.toolLifeLabel')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(groupedData).map((data: any, index: number) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2 text-sm text-gray-900 border-b">{data.model}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 border-b">{data.process}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                {data.tNumbers.sort((a: number, b: number) => a - b).map((t: number) => `T${t}`).join(', ')}
                              </td>
                              <td className="px-4 py-2 text-sm font-semibold text-blue-600 border-b">{data.equipmentNumbers.length}{t('endmill.unit')}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                {data.equipmentNumbers.length > 0 ? data.equipmentNumbers.sort((a: string, b: string) => Number(a) - Number(b)).join(', ') : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 border-b">{data.toolLife.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* 공급업체별 가격 정보 */}
              <div className="border-t pt-6">
                <EndmillSupplierPrices
                  endmillId={selectedEndmill.id}
                  endmillCode={selectedEndmill.code}
                />
              </div>
            </div>
            <div className="mobile-modal-footer">
              <button
                onClick={() => setSelectedEndmill(null)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t('common.close')}
              </button>
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