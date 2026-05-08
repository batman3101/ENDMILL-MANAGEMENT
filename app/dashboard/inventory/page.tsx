'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { useInventory, useInventorySearch, useInventoryAlerts } from '../../../lib/hooks/useInventory'
import { useToast } from '../../../components/shared/Toast'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createUpdateConfirmation, createCreateConfirmation } from '../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../lib/hooks/useSettings'
import SupplierPriceInfo from '../../../components/inventory/SupplierPriceInfo'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'
import { useTranslations } from '../../../lib/hooks/useTranslations'
import { clientLogger } from '../../../lib/utils/logger'
import { InventoryListCard } from '../../../components/features/inventory/inventory-list-card'
import { StatusBadge, type StatusBadgeVariant } from '../../../components/ui/status-badge'
// ExcelJS and inventory templates are dynamically imported when needed

export default function InventoryPage() {
  const { t } = useTranslations()
  const { showSuccess, showError, showWarning } = useToast()
  const confirmation = useConfirmation()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_supplierFilter, _setSupplierFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string>('code')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  
  // 새로운 Hook 사용
  const {
    inventory,
    loading,
    error,
    createInventory,
    updateInventory,
    deleteInventory,
    getInventoryStats,
    getEndmillMasterData
  } = useInventory()

  // 향후 사용 예정 훅들
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _inventorySearch = useInventorySearch()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _inventoryAlerts = useInventoryAlerts()

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const itemsPerPage = settings.system.itemsPerPage
  const categories = settings.inventory.categories

  // 실제 공급업체 및 카테고리 데이터 로드
  useEffect(() => {
    loadAvailableSuppliers()
    loadAvailableCategories()
  }, [])

  const loadAvailableSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const supplierNames = result.data.map((supplier: any) => supplier.name)
          setAvailableSuppliers(supplierNames)
        }
      }
    } catch (error) {
      clientLogger.error('공급업체 데이터 로드 오류:', error)
    }
  }

  const loadAvailableCategories = async () => {
    try {
      const response = await fetch('/api/endmill-categories')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const categoryNames = result.data.map((category: any) => category.name_ko || category.code)
          setAvailableCategories(categoryNames)
        }
      }
    } catch (error) {
      clientLogger.error('카테고리 데이터 로드 오류:', error)
    }
  }

  // 상태 관리
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    specifications: '',
    supplier: '',
    unitPrice: 0,
    currentStock: 0,
    minStock: 0,
    maxStock: 0
  })
  const [editFormData, setEditFormData] = useState<any>(null)
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    processing: boolean
    success: number
    updated: number
    errors: string[]
  }>({ processing: false, success: 0, updated: 0, errors: [] })

  // 앤드밀 자동완성을 위한 상태
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [availableEndmills, setAvailableEndmills] = useState<any[]>([])

  // 앤드밀 마스터 데이터 로드
  useEffect(() => {
    loadAvailableEndmills()
  }, [])

  const loadAvailableEndmills = async () => {
    try {
      const response = await fetch('/api/endmill')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableEndmills(result.data)
        }
      }
    } catch (error) {
      clientLogger.error('앤드밀 마스터 데이터 로드 오류:', error)
    }
  }

  // 앤드밀 코드 입력 변경 처리
  const handleEndmillCodeChange = (value: string) => {
    setFormData({...formData, code: value})

    if (value.length > 1) {
      const filtered = availableEndmills.filter(endmill =>
        endmill.code.toLowerCase().includes(value.toLowerCase()) ||
        endmill.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // 최대 10개만 표시
      setSearchSuggestions(filtered)
    } else {
      setSearchSuggestions([])
    }
  }

  // 자동완성 선택 처리
  const handleSelectSuggestion = (suggestion: any) => {
    setFormData({
      ...formData,
      code: suggestion.code,
      name: suggestion.name,
      category: suggestion.category || '',
      specifications: suggestion.specifications || ''
    })
    setSearchSuggestions([])
  }

  // QR 코드 스캔 결과 처리
  const handleQRScanResult = (scannedCode: string) => {
    // QR 코드에서 앤드밀 코드 추출
    const endmillCode = scannedCode.trim()

    // 앤드밀 마스터 데이터에서 해당 코드 찾기
    const foundEndmill = availableEndmills.find(endmill =>
      endmill.code === endmillCode
    )

    if (foundEndmill) {
      setFormData({
        ...formData,
        code: foundEndmill.code,
        name: foundEndmill.name,
        category: foundEndmill.category || '',
        specifications: foundEndmill.specifications || ''
      })
      showSuccess(t('inventory.qrScanComplete'), `${t('inventory.autoInputMessage')} ${foundEndmill.code}`)
    } else {
      // 등록되지 않은 앤드밀 코드인 경우 코드만 입력
      setFormData({...formData, code: endmillCode})
      showWarning(t('inventory.unregisteredEndmill'), t('inventory.unregisteredMessage'))
    }

    setShowQRScanner(false)
  }

  // 재고 상태 계산 함수 (먼저 정의)
  const calculateStockStatus = (current: number, min: number, _max: number): 'sufficient' | 'low' | 'critical' => {
    if (current <= min) return 'critical'
    if (current <= min * 1.5) return 'low'
    return 'sufficient'
  }

  // 클릭 외부 영역 클릭시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchSuggestions.length > 0) {
        const target = event.target as Element
        if (!target.closest('.relative')) {
          setSearchSuggestions([])
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchSuggestions])

  // 필터링된 재고 목록
  const filteredInventory = useMemo(() => {
    let filtered = inventory

    // 카테고리 필터
    if (categoryFilter) {
      filtered = filtered.filter(item => {
        const categoryCode = item.endmill_type?.endmill_categories?.code
        const categoryName = item.endmill_type?.endmill_categories?.name_ko
        return categoryCode === categoryFilter || categoryName === categoryFilter
      })
    }

    // 상태 필터
    if (statusFilter) {
      filtered = filtered.filter(item => {
        const status = calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0)
        return status === statusFilter
      })
    }

    return filtered
  }, [inventory, statusFilter, categoryFilter])

  // 검색 적용
  const searchFilteredInventory = useMemo(() => {
    if (!searchTerm) return filteredInventory

    return filteredInventory.filter(item =>
      item.endmill_type?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.endmill_type?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [filteredInventory, searchTerm])

  // 정렬 처리 함수
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // 테이블 렌더링을 위한 플랫 데이터 생성
  const flattenedData = useMemo(() => {
    const result = searchFilteredInventory.map(item => ({
      itemId: item.id,
      code: item.endmill_type?.code || '',
      name: item.endmill_type?.name || '',
      category: item.endmill_type?.endmill_categories?.name_ko || item.endmill_type?.endmill_categories?.code || '',
      totalCurrentStock: item.current_stock || 0,
      minStock: item.min_stock || 0,
      maxStock: item.max_stock || 0,
      overallStatus: calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0),
      unitPrice: item.endmill_type?.unit_cost || 0,
      lastUpdated: item.last_updated || item.created_at,
      location: item.location || ''
    }))

    // 정렬 적용
    result.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'code':
          aValue = a.code
          bValue = b.code
          break
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'category':
          aValue = a.category
          bValue = b.category
          break
        case 'current_stock':
          aValue = a.totalCurrentStock
          bValue = b.totalCurrentStock
          break
        case 'status':
          aValue = a.overallStatus
          bValue = b.overallStatus
          break
        case 'unit_price':
          aValue = a.unitPrice
          bValue = b.unitPrice
          break
        default:
          aValue = a.code
          bValue = b.code
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? comparison : -comparison
      } else {
        const comparison = aValue - bValue
        return sortDirection === 'asc' ? comparison : -comparison
      }
    })

    return result
  }, [searchFilteredInventory, sortField, sortDirection])

  // 통계 계산
  const stats = getInventoryStats(searchFilteredInventory)

  // id → inventory item Map — currentData/desktop 핸들러의 N+1 lookup 제거용
  const inventoryByItemId = useMemo(
    () => new Map(searchFilteredInventory.map(it => [it.id, it])),
    [searchFilteredInventory]
  )

  // 페이지네이션
  const totalPages = Math.ceil(flattenedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = flattenedData.slice(startIndex, endIndex)

  // currentPage clamp — 필터 적용 또는 항목 삭제로 totalPages가 줄어든 경우
  // 모바일 카드 뷰가 빈 화면을 보이지 않도록 마지막 유효 페이지로 이동
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const getStatusText = (status: 'sufficient' | 'low' | 'critical') => {
    switch (status) {
      case 'sufficient': return t('inventory.sufficient')
      case 'low': return t('inventory.low')
      case 'critical': return t('inventory.critical')
      default: return t('inventory.unknown')
    }
  }

  const handleViewDetail = (item: any) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  const handleEdit = (item: any) => {
    clientLogger.log('Edit clicked for item:', item)
    setEditFormData(item)
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFormData) return

    const confirmed = await confirmation.showConfirmation(
      createUpdateConfirmation('재고 정보')
    )
    if (!confirmed) return

    try {
      await updateInventory({
        id: editFormData.id,
        current_stock: editFormData.current_stock,
        min_stock: editFormData.min_stock,
        max_stock: editFormData.max_stock,
        location: editFormData.location
      })
      
      setShowEditModal(false)
      setEditFormData(null)
      showSuccess(t('inventory.updateSuccess'), t('inventory.updateSuccessMessage'))
    } catch (_error) {
      showError(t('inventory.updateFailed'), t('inventory.updateFailedMessage'))
    }
  }

  const handleDelete = async (item: any) => {
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`${t('inventory.confirmDelete')} (${item.code})`)
    )
    if (!confirmed) return

    try {
      await deleteInventory(item.itemId)
      showSuccess(t('inventory.deleteSuccess'), t('inventory.deleteSuccessMessage'))
    } catch (_error) {
      showError(t('inventory.deleteFailed'), t('inventory.deleteFailedMessage'))
    }
  }

  const handleAddEndmill = async (e: React.FormEvent) => {
    e.preventDefault()

    const confirmed = await confirmation.showConfirmation(
      createCreateConfirmation(t('inventory.confirmCreate'))
    )
    if (!confirmed) return

    try {
      // 실제 구현에서는 endmill_type_id를 찾아야 함
      await createInventory({
        endmill_type_id: 'temp-id', // 실제로는 코드로 endmill_type_id를 찾아야 함
        current_stock: formData.currentStock,
        min_stock: formData.minStock,
        max_stock: formData.maxStock,
        location: 'A-001'
      })

      setFormData({
        code: '',
        name: '',
        category: '',
        specifications: '',
        supplier: '',
        unitPrice: 0,
        currentStock: 0,
        minStock: 0,
        maxStock: 0
      })
      setShowAddModal(false)
      showSuccess(t('inventory.createSuccess'), t('inventory.createSuccessMessage'))
    } catch (_error) {
      showError(t('inventory.createFailed'), t('inventory.createFailedMessage'))
    }
  }

  const handleExcelUpload = () => {
    setShowExcelUploadModal(true)
    setExcelFile(null)
    setUploadProgress({ processing: false, success: 0, updated: 0, errors: [] })
  }

  // 엑셀 다운로드 핸들러 (새로운 API 사용)
  const handleExcelDownload = async () => {
    try {
      const endmillData = getEndmillMasterData()

      // 워크북 및 워크시트 생성
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('앤드밀마스터')

      // 헤더 설정 (endmillData의 첫 번째 객체의 키를 사용)
      if (endmillData.length > 0) {
        const headers = Object.keys(endmillData[0])
        worksheet.columns = headers.map(header => ({
          header,
          key: header,
          width: 15
        }))

        // 데이터 추가
        endmillData.forEach(item => {
          worksheet.addRow(item)
        })

        // 헤더 스타일
        worksheet.getRow(1).font = { bold: true }
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        }
      }

      // 파일 다운로드
      const fileName = `앤드밀마스터_${new Date().toISOString().split('T')[0]}.xlsx`
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      window.URL.revokeObjectURL(url)

      showSuccess(t('inventory.downloadComplete'), `${endmillData.length}${t('inventory.downloadSuccessMessage')}`)
    } catch (error) {
      showError(t('inventory.downloadFailed'), t('inventory.downloadFailedMessage'))
      clientLogger.error('Excel download error:', error)
    }
  }

  const handleDownloadInventoryTemplate = async () => {
    try {
      const { downloadInventoryTemplate } = await import('../../../lib/utils/inventoryExcelTemplate')
      await downloadInventoryTemplate()
      showSuccess('템플릿 다운로드 완료', '기초 재고 등록 템플릿이 다운로드되었습니다.')
    } catch (error) {
      showError('템플릿 다운로드 실패', '템플릿 다운로드 중 오류가 발생했습니다.')
      clientLogger.error('Template download error:', error)
    }
  }

  const handleDownloadInventorySurvey = async () => {
    try {
      // 현재 필터링된 재고 데이터 사용
      const { downloadInventorySurveyTemplate } = await import('../../../lib/utils/inventoryExcelTemplate')
      await downloadInventorySurveyTemplate(flattenedData)
      showSuccess(t('inventory.surveyDownloadSuccess'), t('inventory.surveyDownloadSuccessMessage'))
    } catch (error) {
      showError(t('inventory.surveyDownloadFailed'), t('inventory.surveyDownloadError'))
      clientLogger.error('Inventory survey download error:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel') {
        setExcelFile(file)
      } else {
        showError(t('inventory.fileFormatError'), t('inventory.fileFormatErrorMessage'))
      }
    }
  }

  const handleProcessExcel = async () => {
    if (!excelFile) {
      showError(t('inventory.selectFileError'), t('inventory.selectFileErrorMessage'))
      return
    }

    setUploadProgress({ processing: true, success: 0, updated: 0, errors: [] })

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer
          const ExcelJS = (await import('exceljs')).default
          const workbook = new ExcelJS.Workbook()
          await workbook.xlsx.load(data)

          const worksheet = workbook.worksheets[0]
          if (!worksheet) {
            throw new Error('워크시트를 찾을 수 없습니다.')
          }

          // JSON 데이터로 변환
          const jsonData: any[] = []
          const headers: string[] = []

          // 헤더 읽기
          const headerRow = worksheet.getRow(1)
          headerRow.eachCell((cell) => {
            headers.push(cell.value?.toString() || '')
          })

          // 데이터 읽기
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return // 헤더 스킵

            const rowData: any = {}
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber - 1]
              rowData[header] = cell.value
            })

            // 빈 행이 아니면 추가
            if (Object.values(rowData).some(v => v !== null && v !== undefined && v !== '')) {
              jsonData.push(rowData)
            }
          })

          // 데이터 검증
          const validationOptions = {
            validCategories: availableCategories,
            validSuppliers: availableSuppliers
          }

          const { validateInventoryData } = await import('../../../lib/utils/inventoryExcelTemplate')
          const validation = await validateInventoryData(jsonData, validationOptions)

          if (!validation.isValid) {
            setUploadProgress({
              processing: false,
              success: 0,
              updated: 0,
              errors: validation.errors
            })
            showError('데이터 검증 실패', `${validation.errors.length}개의 오류가 발견되었습니다.`)
            return
          }

          // 경고가 있으면 표시
          if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
              clientLogger.log('Excel validation warning:', warning)
            })
          }

          // 데이터 변환
          const { convertExcelToInventoryData } = await import('../../../lib/utils/inventoryExcelTemplate')
          const inventoryData = convertExcelToInventoryData(validation.validData)

          // API로 데이터 전송
          const response = await fetch('/api/inventory/bulk-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: inventoryData })
          })

          const result = await response.json()

          if (result.success) {
            setUploadProgress({
              processing: false,
              success: result.created || 0,
              updated: result.updated || 0,
              errors: result.errors || []
            })
            showSuccess(
              '업로드 완료',
              `신규 등록: ${result.created || 0}개, 업데이트: ${result.updated || 0}개`
            )
          } else {
            setUploadProgress({
              processing: false,
              success: 0,
              updated: 0,
              errors: [result.error || '업로드 실패']
            })
            showError('업로드 실패', result.error || '서버 오류가 발생했습니다.')
          }
        } catch (error) {
          setUploadProgress({ processing: false, success: 0, updated: 0, errors: [t('inventory.processingFileError')] })
          showError(t('inventory.fileProcessingError'), t('inventory.fileProcessingErrorMessage'))
          clientLogger.error('Excel processing error:', error)
        }
      }

      reader.onerror = () => {
        setUploadProgress({ processing: false, success: 0, updated: 0, errors: [t('inventory.cannotReadFile')] })
        showError(t('inventory.fileReadError'), t('inventory.fileReadErrorMessage'))
      }

      reader.readAsArrayBuffer(excelFile)
    } catch (error) {
      setUploadProgress({ processing: false, success: 0, updated: 0, errors: [t('inventory.uploadingFileError')] })
      showError(t('inventory.uploadError'), t('inventory.uploadErrorMessage'))
      clientLogger.error('File upload error:', error)
    }
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gauge-cobalt"></div>
          <span className="ml-4 text-ink-soft">{t('inventory.loadingData')}</span>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-signal-stop-soft border border-divider rounded-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="text-signal-stop-strong text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-title font-semibold text-signal-stop-strong">{t('inventory.dataLoadingError')}</h3>
              <p className="text-signal-stop-strong mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 재고 현황 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-paper-warm p-4 sm:p-6 rounded-md border border-divider">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-paper rounded-md flex items-center justify-center">
                📦
              </div>
            </div>
            <div className="ml-4">
              <p className="text-base font-medium text-ink-soft">{t('inventory.totalStockQuantity')}</p>
              <p className="text-2xl font-bold text-ink tabular">{stats.totalItems.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm p-4 sm:p-6 rounded-md border border-divider">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-signal-stop-soft rounded-md flex items-center justify-center">
                ⚠️
              </div>
            </div>
            <div className="ml-4">
              <p className="text-base font-medium text-ink-soft">{t('inventory.criticalCode')}</p>
              <p className="text-2xl font-bold text-signal-stop-strong tabular">{stats.criticalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm p-4 sm:p-6 rounded-md border border-divider">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-signal-watch-soft rounded-md flex items-center justify-center">
                📋
              </div>
            </div>
            <div className="ml-4">
              <p className="text-base font-medium text-ink-soft">{t('inventory.lowStockCode')}</p>
              <p className="text-2xl font-bold text-signal-watch-strong tabular">{stats.lowStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm p-4 sm:p-6 rounded-md border border-divider">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-signal-go-soft rounded-md flex items-center justify-center">
                💰
              </div>
            </div>
            <div className="ml-4">
              <p className="text-base font-medium text-ink-soft">{t('inventory.totalHoldingValue')}</p>
              <p className="text-2xl font-bold text-signal-go-strong tabular">
                {stats.totalValue.toLocaleString()} VND
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 입고/출고 버튼 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Link
          href="/dashboard/inventory/inbound"
          className="group bg-paper-warm p-4 sm:p-6 rounded-md border border-divider transition-colors hover:border-gauge-cobalt"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📥</span>
            </div>
            <h3 className="text-title font-semibold text-ink mb-2">{t('inventory.inboundManagement')}</h3>
            <p className="text-base text-ink-soft mb-4">{t('inventory.inboundDescription')}</p>
            <div className="inline-flex min-h-touch items-center justify-center px-6 py-3 bg-gauge-cobalt text-paper text-label font-medium rounded-sm transition-colors group-hover:bg-gauge-cobalt-strong">
              📱 {t('inventory.inboundProcess')}
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/inventory/outbound"
          className="group bg-paper-warm p-4 sm:p-6 rounded-md border border-divider transition-colors hover:border-signal-go"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📤</span>
            </div>
            <h3 className="text-title font-semibold text-ink mb-2">{t('inventory.outboundManagement')}</h3>
            <p className="text-base text-ink-soft mb-4">{t('inventory.outboundDescription')}</p>
            <div className="inline-flex min-h-touch items-center justify-center px-6 py-3 bg-signal-go-strong text-paper text-label font-medium rounded-sm transition-colors group-hover:bg-signal-go">
              📱 {t('inventory.outboundProcess')}
            </div>
          </div>
        </Link>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-paper-warm p-4 rounded-md border border-divider">
        {/* 검색 및 필터 */}
        <div className="space-y-3 md:space-y-0 md:flex md:gap-3 md:items-center md:justify-between">
          {/* 검색 입력 */}
          <div className="w-full md:flex-1">
            <input
              type="text"
              placeholder={t('inventory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-gauge-cobalt transition-colors"
            />
          </div>

          {/* 필터 드롭다운 - 모바일에서 2열 그리드 */}
          <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-11 px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-gauge-cobalt transition-colors"
            >
              <option value="">{t('inventory.allCategories')}</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-gauge-cobalt transition-colors"
            >
              <option value="">{t('inventory.stockStatusFilter')}</option>
              <option value="sufficient">{t('inventory.sufficient')}</option>
              <option value="low">{t('inventory.low')}</option>
              <option value="critical">{t('inventory.critical')}</option>
            </select>
          </div>
        </div>

        {/* 액션 버튼 - 단일 시각 위계: 1차(추가) + 2차(나머지)
            모바일 2열 그리드, sm 이상 가로 정렬 */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          {/* 1차 액션: 신규 추가 — gauge-cobalt */}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex min-h-touch items-center justify-center gap-1.5 px-4 py-2 bg-gauge-cobalt text-paper text-label font-medium rounded-sm transition-colors hover:bg-gauge-cobalt-strong"
          >
            <span aria-hidden="true">➕</span>
            <span className="hidden sm:inline">{t('inventory.addNewEndmill')}</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </button>

          {/* 2차 액션들: 모두 동일 시각 위계(border + ink) */}
          <button
            onClick={handleExcelUpload}
            className="inline-flex min-h-touch items-center justify-center gap-1.5 px-4 py-2 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
          >
            <span aria-hidden="true">📤</span>
            <span className="hidden sm:inline">{t('inventory.excelUpload')}</span>
            <span className="sm:hidden">{t('common.upload')}</span>
          </button>
          <button
            onClick={handleExcelDownload}
            className="inline-flex min-h-touch items-center justify-center gap-1.5 px-4 py-2 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
          >
            <span aria-hidden="true">📥</span>
            <span className="hidden sm:inline">{t('inventory.excelDownload')}</span>
            <span className="sm:hidden">{t('common.download')}</span>
          </button>
          <button
            onClick={handleDownloadInventoryTemplate}
            className="inline-flex min-h-touch items-center justify-center gap-1.5 px-4 py-2 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
          >
            <span aria-hidden="true">📋</span>
            <span className="hidden sm:inline">{t('inventory.inventoryTemplate')}</span>
            <span className="sm:hidden">{t('common.template')}</span>
          </button>
          <button
            onClick={handleDownloadInventorySurvey}
            className="col-span-2 sm:col-span-1 inline-flex min-h-touch items-center justify-center gap-1.5 px-4 py-2 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
            title={t('inventory.inventorySurveyTooltip')}
          >
            <span aria-hidden="true">📊</span>
            <span>{t('inventory.inventorySurvey')}</span>
          </button>
        </div>
      </div>

      {/* 재고 목록 */}
      <div className="space-y-3">
        {/* 헤더: 카운트 + 페이지 정보 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-3">
          <h2 className="text-title font-semibold text-ink">
            {t('inventory.stockStatusList')}{' '}
            <span className="text-base font-normal text-ink-soft tabular">
              ({flattenedData.length}{t('inventory.items')})
            </span>
          </h2>
          {totalPages > 0 && (
            <p className="text-caption text-ink-mute tabular shrink-0">
              {t('inventory.page')} {currentPage} / {totalPages} ({t('inventory.itemsPerPage')} {itemsPerPage}{t('inventory.items')})
            </p>
          )}
        </div>

        {/* 모바일 카드 리스트 (lg 미만) */}
        <div className="lg:hidden">
          {currentData.length > 0 ? (
            <div className="space-y-3">
              {currentData.map((row) => (
                <InventoryListCard
                  key={row.itemId}
                  item={{
                    itemId: row.itemId,
                    code: row.code,
                    name: row.name,
                    category: row.category,
                    totalCurrentStock: row.totalCurrentStock,
                    minStock: row.minStock,
                    overallStatus: row.overallStatus,
                    unitPrice: row.unitPrice ?? 0,
                  }}
                  labels={{
                    category: t('inventory.category'),
                    currentStockMin: t('inventory.currentStockShort'),
                    unitPriceVND: t('inventory.unitPriceVND'),
                    detail: t('inventory.detail'),
                    edit: t('inventory.edit'),
                    delete: t('inventory.delete'),
                  }}
                  statusText={getStatusText}
                  onDetail={(itemId) => {
                    const item = inventoryByItemId.get(itemId)
                    if (item) handleViewDetail(item)
                  }}
                  onEdit={(itemId) => {
                    const item = inventoryByItemId.get(itemId)
                    if (item) handleEdit(item)
                  }}
                  onDelete={(itemId) => {
                    const item = inventoryByItemId.get(itemId)
                    if (item) handleDelete(item)
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* 데스크톱 테이블 (lg 이상) */}
        <div className="hidden lg:block bg-paper-warm rounded-md border border-divider overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-paper">
              <tr>
                <SortableTableHeader
                  label={t('inventory.endmillCode')}
                  field="code"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('inventory.endmillName')}
                  field="name"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('inventory.category')}
                  field="category"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('inventory.currentStockShort')}
                  field="current_stock"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('inventory.status')}
                  field="status"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('inventory.unitPriceVND')}
                  field="unit_price"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">
                  {t('inventory.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-paper-warm divide-y divide-divider">
              {currentData.map((row) => {
                const stockPercentage = row.minStock > 0
                  ? Math.min((row.totalCurrentStock / row.minStock) * 100, 100)
                  : 100
                const progressColor =
                  row.overallStatus === 'critical' ? 'bg-signal-stop' :
                  row.overallStatus === 'low' ? 'bg-signal-watch' : 'bg-signal-go'
                const statusVariant: StatusBadgeVariant =
                  row.overallStatus === 'critical' ? 'stop' :
                  row.overallStatus === 'low' ? 'watch' : 'go'

                return (
                  <tr key={row.itemId} className="hover:bg-paper transition-colors">
                    {/* 앤드밀 코드 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-medium text-ink tabular">{row.code}</div>
                    </td>

                    {/* 앤드밀 이름 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-ink">{row.name}</div>
                    </td>

                    {/* 카테고리 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-ink-soft">{row.category}</div>
                    </td>

                    {/* 현재고 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-ink tabular">
                        {row.totalCurrentStock} / {row.minStock}
                      </div>
                      <div className="w-full bg-paper rounded-full h-1.5 mt-1.5">
                        <div
                          className={`h-1.5 rounded-full ${progressColor}`}
                          style={{width: `${stockPercentage}%`}}
                        ></div>
                      </div>
                    </td>

                    {/* 상태 — StatusBadge (Triple-Encoding: 색+형태+라벨) */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        variant={statusVariant}
                        label={getStatusText(row.overallStatus)}
                      />
                    </td>

                    {/* 단가 — 헤더에 (VND) 표기되어 있으므로 셀에서는 제거.
                        모바일 카드와 동일하게 0 또는 미입력은 '—'로 통일 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-medium text-ink tabular">
                        {row.unitPrice && row.unitPrice > 0 ? row.unitPrice.toLocaleString() : '—'}
                      </div>
                    </td>

                    {/* 작업 */}
                    <td className="px-6 py-4 whitespace-nowrap text-label">
                      <button
                        onClick={() => {
                          const item = inventoryByItemId.get(row.itemId)
                          if (item) handleViewDetail(item)
                        }}
                        className="text-gauge-cobalt-strong font-medium hover:text-gauge-cobalt mr-3 transition-colors"
                      >
                        {t('inventory.detail')}
                      </button>
                      <button
                        onClick={() => {
                          const item = inventoryByItemId.get(row.itemId)
                          if (item) handleEdit(item)
                        }}
                        className="text-signal-go-strong font-medium hover:text-signal-go mr-3 transition-colors"
                      >
                        {t('inventory.edit')}
                      </button>
                      <button
                        onClick={() => {
                          const item = inventoryByItemId.get(row.itemId)
                          if (item) handleDelete(item)
                        }}
                        className="text-signal-stop-strong font-medium hover:text-signal-stop transition-colors"
                      >
                        {t('inventory.delete')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </div>

        {/* 페이지네이션 — 모바일/데스크톱 공통 */}
        {totalPages > 1 && (
          <div className="bg-paper-warm border border-divider rounded-md px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-ink-soft tabular">
                {t('inventory.showing')} <span className="font-medium text-ink">{flattenedData.length}</span>{t('inventory.of')}{' '}
                <span className="font-medium text-ink">{startIndex + 1}</span>-
                <span className="font-medium text-ink">{Math.min(endIndex, flattenedData.length)}</span>{t('inventory.displayed')}
              </p>
              <nav className="inline-flex items-center gap-1 self-end sm:self-auto" aria-label={t('inventory.page')}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center px-3 text-label font-medium text-ink-soft bg-paper border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                  aria-label={t('inventory.previous')}
                >
                  ‹
                </button>
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
                  const isActive = currentPage === pageNum
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex min-h-touch min-w-touch items-center justify-center px-3 text-label font-medium tabular border rounded-sm transition-colors ${
                        isActive
                          ? 'bg-gauge-cobalt text-paper border-gauge-cobalt'
                          : 'bg-paper text-ink-soft border-divider hover:bg-paper-warm hover:text-ink'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center px-3 text-label font-medium text-ink-soft bg-paper border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                  aria-label={t('inventory.next')}
                >
                  ›
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* 검색 결과가 없을 때 — 필터 초기화 CTA */}
      {flattenedData.length === 0 && (
        <div className="rounded-md border border-divider bg-paper-warm px-4 py-8 text-center">
          <p className="text-base text-ink-soft">{t('inventory.noMatchingInventory')}</p>
          <button
            onClick={() => {
              setSearchTerm('')
              setCategoryFilter('')
              setStatusFilter('')
              setCurrentPage(1)
            }}
            className="mt-3 inline-flex min-h-touch items-center justify-center px-4 py-2 bg-paper text-gauge-cobalt-strong text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
          >
            {t('inventory.resetFilters')}
          </button>
        </div>
      )}

      {/* 신규 앤드밀 추가 모달 */}
      {showAddModal && (
        <div className="mobile-modal-container" onClick={() => setShowAddModal(false)}>
          <div className="mobile-modal-content md:max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('inventory.addNewEndmillModal')}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEndmill} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.endmillCodeLabel')} {t('inventory.required')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleEndmillCodeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('inventory.enterEndmillCodeOrQRScan')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowQRScanner(true)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title={t('inventory.qrScanHint')}
                    >
                      📷
                    </button>
                  </div>
                  {/* 자동완성 드롭다운 */}
                  {searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{suggestion.code}</div>
                          <div className="text-sm text-gray-500">{suggestion.name}</div>
                          <div className="text-xs text-gray-400">{suggestion.category}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.endmillNameLabel')} {t('inventory.required')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.code ? 'bg-blue-50' : ''
                    }`}
                    placeholder={t('inventory.enterEndmillCodeOnSelect')}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.code ? t('inventory.autoInputFromCode') : t('inventory.autoInputFromMaster')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.categoryLabel')} {t('inventory.required')}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className={`w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.code ? 'bg-blue-50' : ''
                    }`}
                    required
                  >
                    <option value="">{t('inventory.selectCategory')}</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.code ? t('inventory.autoInputFromCode') : t('inventory.autoInputFromMaster')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.specificationsLabel')} {t('inventory.required')}</label>
                  <input
                    type="text"
                    value={formData.specifications}
                    onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.code ? 'bg-blue-50' : ''
                    }`}
                    placeholder={t('inventory.enterEndmillCodeOnSelect')}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.code ? t('inventory.autoInputFromCode') : t('inventory.autoInputFromMaster')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.supplierLabel')} {t('inventory.required')}</label>
                  <select
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('inventory.selectSupplier')}</option>
                    {availableSuppliers.map(supplier => (
                      <option key={supplier} value={supplier}>{supplier}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.unitPriceVNDLabel')} {t('inventory.required')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({...formData, unitPrice: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.currentStockLabel')} {t('inventory.required')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({...formData, currentStock: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="25"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.minStockLabel')} {t('inventory.required')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.maxStockLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({...formData, maxStock: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>
              </div>
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  {t('inventory.cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('inventory.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 상세보기 모달 */}
      {showDetailModal && selectedItem && (
        <div className="mobile-modal-container" onClick={() => setShowDetailModal(false)}>
          <div className="mobile-modal-content md:max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('inventory.endmillDetail')}</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="mobile-modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">{t('inventory.basicInfo')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.endmillCodeLabel')}</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{selectedItem.endmill_type?.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.type')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.endmill_type?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.category')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.endmill_type?.endmill_categories?.name_ko || selectedItem.endmill_type?.endmill_categories?.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.endmillNameInfo')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.endmill_type?.description_ko || selectedItem.endmill_type?.description_vi || ''}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">{t('inventory.stockInfo')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.currentStockInfo')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.current_stock}{t('inventory.pieces')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.minStockInfo')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.min_stock}{t('inventory.pieces')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.maxStockInfo')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.max_stock}{t('inventory.pieces')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('inventory.statusInfo')}</label>
                      {(() => {
                        // settings.inventory.stockThresholds 기반 — 사용자 설정 임계값 적용
                        // 추가: 기존 코드의 조건 순서 버그(첫 조건이 항상 매칭되어 'low' 도달 불가) 함께 수정
                        const min = selectedItem.min_stock || 0
                        const current = selectedItem.current_stock || 0
                        const thresholds = settings.inventory?.stockThresholds ?? { criticalPercent: 50, lowPercent: 100 }
                        const criticalLine = min * (thresholds.criticalPercent / 100)
                        const lowLine = min * (thresholds.lowPercent / 100)
                        const isCritical = current <= criticalLine
                        const isLow = !isCritical && current <= lowLine
                        return (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            isCritical ? 'bg-red-100 text-red-800' :
                            isLow ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {isCritical ? t('inventory.critical') :
                             isLow ? t('inventory.low') : t('inventory.sufficient')}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-4">{t('inventory.supplierPriceInfo')}</h4>
                <SupplierPriceInfo endmillTypeId={selectedItem.endmill_type_id} />
              </div>
            </div>

            <div className="mobile-modal-footer">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t('inventory.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && editFormData && (
        <div className="mobile-modal-container" onClick={() => setShowEditModal(false)}>
          <div className="mobile-modal-content md:max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('inventory.editEndmillInfo')}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.endmillCodeLabel')}</label>
                  <input
                    type="text"
                    value={editFormData.endmill_type?.code || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.endmillNameLabel')}</label>
                  <input
                    type="text"
                    value={editFormData.endmill_type?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.categoryLabel')}</label>
                  <input
                    type="text"
                    value={editFormData.endmill_type?.endmill_categories?.name_ko || editFormData.endmill_type?.endmill_categories?.code || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.currentStockLabel')}</label>
                  <input
                    type="number"
                    value={editFormData.current_stock || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, current_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.minStockLabel')}</label>
                  <input
                    type="number"
                    value={editFormData.min_stock || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, min_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.maxStockLabel')}</label>
                  <input
                    type="number"
                    value={editFormData.max_stock || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, max_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                </div>
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  {t('inventory.cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('inventory.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 엑셀 업로드 모달 */}
      {showExcelUploadModal && (
        <div className="mobile-modal-container" onClick={() => setShowExcelUploadModal(false)}>
          <div className="mobile-modal-content md:max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('inventory.excelMasterDataUpload')}</h3>
              <button
                onClick={() => setShowExcelUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="mobile-modal-body">
              {/* 업로드 안내 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">{t('inventory.uploadFormatGuide')}</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>• {t('inventory.excelFileOnly')}</p>
                  <p>• {t('inventory.requiredColumns')}</p>
                  <p>• {t('inventory.optionalColumns')}</p>
                  <p>• {t('inventory.supplierInfoColumns')}</p>
                </div>
              </div>

              {/* 파일 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.selectExcelFile')}</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {excelFile && (
                  <p className="mt-2 text-sm text-green-600">
                    {t('inventory.selectedFile')} {excelFile.name}
                  </p>
                )}
              </div>

              {/* 진행 상황 */}
              {uploadProgress.processing && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                    <span className="text-sm text-yellow-800">{t('inventory.fileProcessing')}</span>
                  </div>
                </div>
              )}

              {/* 결과 표시 */}
              {(!uploadProgress.processing && (uploadProgress.success > 0 || uploadProgress.updated > 0 || uploadProgress.errors.length > 0)) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{t('inventory.processingResult')}</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-3 bg-green-100 rounded-lg">
                      <div className="text-lg font-bold text-green-800">{uploadProgress.success}</div>
                      <div className="text-xs text-green-600">{t('inventory.newlyAdded')}</div>
                    </div>
                    <div className="text-center p-3 bg-blue-100 rounded-lg">
                      <div className="text-lg font-bold text-blue-800">{uploadProgress.updated}</div>
                      <div className="text-xs text-blue-600">{t('inventory.updated')}</div>
                    </div>
                  </div>

                  {uploadProgress.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-red-800 mb-2">{t('inventory.errorList')}</h5>
                      <div className="max-h-32 overflow-y-auto">
                        {uploadProgress.errors.map((error, index) => (
                          <p key={index} className="text-xs text-red-600 mb-1">• {error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExcelUploadModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t('inventory.close')}
              </button>
              <button
                onClick={handleProcessExcel}
                disabled={!excelFile || uploadProgress.processing}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploadProgress.processing ? t('inventory.loading') : t('inventory.processUpload')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR 스캐너 모달 */}
      {showQRScanner && (
        <div className="mobile-modal-container" onClick={() => setShowQRScanner(false)}>
          <div className="mobile-modal-content md:max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('inventory.qrCodeScan')}</h3>
              <button
                onClick={() => setShowQRScanner(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="mobile-modal-body">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📷</span>
                </div>
                <p className="text-gray-600 mb-4">{t('inventory.scanEndmillQR')}</p>

                {/* 임시로 수동 입력 필드 제공 */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder={t('inventory.orManualInput')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement
                        if (target.value.trim()) {
                          handleQRScanResult(target.value.trim())
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {t('inventory.pressEnterToInput')}
                  </p>
                </div>

                <div className="text-sm text-gray-500">
                  {t('inventory.qrFeatureNotice')}
                </div>
              </div>
            </div>

            <div className="mobile-modal-footer">
              <button
                onClick={() => setShowQRScanner(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t('inventory.close')}
              </button>
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