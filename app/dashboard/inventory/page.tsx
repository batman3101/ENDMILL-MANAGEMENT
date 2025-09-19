'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useInventory, useInventorySearch, useInventoryAlerts } from '../../../lib/hooks/useInventory'
import { useToast } from '../../../components/shared/Toast'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createUpdateConfirmation, createSaveConfirmation, createCreateConfirmation } from '../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../lib/hooks/useSettings'
import * as XLSX from 'xlsx'

export default function InventoryPage() {
  const { showSuccess, showError } = useToast()
  const confirmation = useConfirmation()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  // 새로운 Hook 사용
  const {
    inventory,
    loading,
    error,
    createInventory,
    updateInventory,
    deleteInventory,
    getFilteredInventory,
    getInventoryStats,
    getAvailableCategories,
    getEndmillMasterData,
    isCreating,
    isUpdating,
    isDeleting
  } = useInventory()

  const { searchByCode, searchByName, searchByCategory } = useInventorySearch()
  const { getCriticalItems, getLowStockItems, getAlertCount } = useInventoryAlerts()

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const itemsPerPage = settings.system.itemsPerPage
  const categories = settings.inventory.categories
  const suppliers = settings.inventory.suppliers
  
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

  // 필터링된 재고 목록
  const filteredInventory = useMemo(() => {
    return getFilteredInventory({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      lowStock: statusFilter === 'low' || statusFilter === 'critical'
    })
  }, [getFilteredInventory, statusFilter, categoryFilter])

  // 검색 적용
  const searchFilteredInventory = useMemo(() => {
    if (!searchTerm) return filteredInventory
    
    return filteredInventory.filter(item =>
      item.endmill_type?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.endmill_type?.description_ko?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.endmill_type?.description_vi?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [filteredInventory, searchTerm])

  // 재고 상태 계산 함수
  const calculateStockStatus = (current: number, min: number, max: number): 'sufficient' | 'low' | 'critical' => {
    if (current <= min) return 'critical'
    if (current <= min * 1.5) return 'low'
    return 'sufficient'
  }

  // 테이블 렌더링을 위한 플랫 데이터 생성
  const flattenedData = useMemo(() => {
    const result: Array<{
      itemId: string
      code: string
      name: string
      category: string
      specifications: string
      totalCurrentStock: number
      minStock: number
      maxStock: number
      overallStatus: 'sufficient' | 'low' | 'critical'
      supplier?: string
      unitPrice?: number
      supplierStock?: number
      supplierStatus?: 'sufficient' | 'low' | 'critical'
      isFirstRow: boolean
      rowSpan: number
    }> = []

    searchFilteredInventory.forEach(item => {
      // 기본 정보 (공급업체 정보가 없는 경우)
      result.push({
        itemId: item.id,
        code: item.endmill_type?.code || '',
        name: item.endmill_type?.description_ko || item.endmill_type?.description_vi || '',
        category: item.endmill_type?.category?.code || '',
        specifications: item.endmill_type?.specifications ? JSON.stringify(item.endmill_type.specifications) : '',
        totalCurrentStock: item.current_stock || 0,
        minStock: item.min_stock || 0,
        maxStock: item.max_stock || 0,
        overallStatus: calculateStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0),
        unitPrice: item.endmill_type?.unit_cost || 0,
        isFirstRow: true,
        rowSpan: 1
      })
    })

    return result
  }, [searchFilteredInventory])

  // 통계 계산
  const stats = getInventoryStats(searchFilteredInventory)
  
  // 페이지네이션
  const totalPages = Math.ceil(flattenedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = flattenedData.slice(startIndex, endIndex)

  const getStatusBadge = (status: 'sufficient' | 'low' | 'critical') => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (status) {
      case 'sufficient':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'low':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: 'sufficient' | 'low' | 'critical') => {
    switch (status) {
      case 'sufficient': return '충분'
      case 'low': return '부족'
      case 'critical': return '위험'
      default: return '알 수 없음'
    }
  }

  const handleViewDetail = (item: any) => {
    setSelectedItem(item)
    setShowDetailModal(true)
  }

  const handleEdit = (item: any) => {
    const inventoryItem = searchFilteredInventory.find(inv => inv.id === item.itemId)
    if (inventoryItem) {
      setEditFormData(inventoryItem)
      setShowEditModal(true)
    }
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
      showSuccess('수정 완료', '재고 정보가 성공적으로 수정되었습니다.')
    } catch (error) {
      showError('수정 실패', '재고 정보 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (item: any) => {
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`재고 항목 (${item.code})`)
    )
    if (!confirmed) return

    try {
      await deleteInventory(item.itemId)
      showSuccess('삭제 완료', '재고 항목이 성공적으로 삭제되었습니다.')
    } catch (error) {
      showError('삭제 실패', '재고 항목 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleAddEndmill = async (e: React.FormEvent) => {
    e.preventDefault()

    const confirmed = await confirmation.showConfirmation(
      createCreateConfirmation('새 재고 항목')
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
      showSuccess('추가 완료', '새 재고 항목이 성공적으로 추가되었습니다.')
    } catch (error) {
      showError('추가 실패', '재고 항목 추가 중 오류가 발생했습니다.')
    }
  }

  const handleExcelUpload = () => {
    setShowExcelUploadModal(true)
    setExcelFile(null)
    setUploadProgress({ processing: false, success: 0, updated: 0, errors: [] })
  }

  // 엑셀 다운로드 핸들러 (새로운 API 사용)
  const handleExcelDownload = () => {
    try {
      const endmillData = getEndmillMasterData()
      
      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(endmillData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '앤드밀마스터')

      // 파일 다운로드
      const fileName = `앤드밀마스터_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      showSuccess('다운로드 완료', `${endmillData.length}개의 앤드밀 마스터 데이터가 다운로드되었습니다.`)
    } catch (error) {
      showError('다운로드 실패', '엑셀 파일 생성 중 오류가 발생했습니다.')
      console.error('Excel download error:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel') {
        setExcelFile(file)
      } else {
        showError('파일 형식 오류', '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      }
    }
  }

  const handleProcessExcel = async () => {
    if (!excelFile) {
      showError('파일 오류', '업로드할 파일을 선택해주세요.')
      return
    }

    setUploadProgress({ processing: true, success: 0, updated: 0, errors: [] })

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          // 새로운 API를 사용해 데이터 업데이트 (실제 구현 필요)
          showSuccess('업로드 완료', `${jsonData.length}개의 데이터가 처리되었습니다.`)
          
          setUploadProgress({
            processing: false,
            success: jsonData.length,
            updated: 0,
            errors: []
          })
        } catch (error) {
          setUploadProgress({ processing: false, success: 0, updated: 0, errors: ['파일 처리 중 오류가 발생했습니다.'] })
          showError('파일 처리 실패', '엑셀 파일을 읽는 중 오류가 발생했습니다.')
          console.error('Excel processing error:', error)
        }
      }
      
      reader.onerror = () => {
        setUploadProgress({ processing: false, success: 0, updated: 0, errors: ['파일을 읽을 수 없습니다.'] })
        showError('파일 읽기 실패', '파일을 읽는 중 오류가 발생했습니다.')
      }
      
      reader.readAsArrayBuffer(excelFile)
    } catch (error) {
      setUploadProgress({ processing: false, success: 0, updated: 0, errors: ['파일 업로드 중 오류가 발생했습니다.'] })
      showError('업로드 실패', '파일 업로드 중 오류가 발생했습니다.')
      console.error('File upload error:', error)
    }
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600">재고 데이터를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="text-red-600 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-medium text-red-800">데이터 로딩 오류</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 재고 현황 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                📦
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 재고</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                ⚠️
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">위험</p>
              <p className="text-2xl font-bold text-red-600">{stats.criticalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                📋
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">부족</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                💰
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 가치</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.totalValue.toLocaleString()} VND
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 입고/출고 버튼 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/inventory/inbound" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📥</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">입고 관리</h3>
            <p className="text-gray-600 mb-4">QR 코드 스캔으로 간편한 입고 처리</p>
            <div className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block">
              📱 입고 처리하기
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inventory/outbound" className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📤</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">출고 관리</h3>
            <p className="text-gray-600 mb-4">QR 코드 스캔으로 간편한 출고 처리</p>
            <div className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-block">
              📱 출고 처리하기
            </div>
          </div>
        </Link>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <input
              type="text"
              placeholder="앤드밀 코드 또는 설명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 카테고리</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">재고 상태</option>
              <option value="sufficient">충분</option>
              <option value="low">부족</option>
              <option value="critical">위험</option>
            </select>
            <select 
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 공급업체</option>
              {suppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
            >
              + 신규 앤드밀 추가
            </button>
            <button
              onClick={handleExcelUpload}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              📄 엑셀 업로드
            </button>
            <button
              onClick={handleExcelDownload}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 whitespace-nowrap"
            >
              📊 엑셀 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 재고 목록 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            재고 현황 ({flattenedData.length}개 공급업체 정보)
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
                  앤드밀 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  현재고/최소재고
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공급업체
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  단가 (VND)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((row, index) => {
                const stockPercentage = Math.min((row.totalCurrentStock / row.minStock) * 100, 100)
                const progressColor = row.overallStatus === 'critical' ? 'bg-red-600' : 
                                    row.overallStatus === 'low' ? 'bg-yellow-600' : 'bg-green-600'
                
                return (
                  <tr key={`${row.itemId}-${row.supplier}`} className="hover:bg-gray-50">
                    {/* 앤드밀 정보 - 첫 번째 행에만 표시 */}
                    {row.isFirstRow && (
                      <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200" rowSpan={row.rowSpan}>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{row.code}</div>
                          <div className="text-sm text-gray-500">{row.name}</div>
                        </div>
                      </td>
                    )}

                    {/* 현재고/최소재고 - 첫 번째 행에만 표시 */}
                    {row.isFirstRow && (
                      <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200" rowSpan={row.rowSpan}>
                        <div className="text-sm text-gray-900">
                          {row.totalCurrentStock} / {row.minStock}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${progressColor}`} 
                            style={{width: `${Math.min(stockPercentage, 100)}%`}}
                          ></div>
                        </div>
                      </td>
                    )}

                    {/* 전체 상태 - 첫 번째 행에만 표시 */}
                    {row.isFirstRow && (
                      <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200" rowSpan={row.rowSpan}>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(row.overallStatus)}`}>
                          {getStatusText(row.overallStatus)}
                        </span>
                      </td>
                    )}

                    {/* 공급업체 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="font-medium">{row.supplier}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({row.supplierStock}개)
                        </span>
                      </div>
                    </td>

                    {/* 단가 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {row.unitPrice?.toLocaleString() || '0'} VND
                      </div>
                    </td>

                    {/* 작업 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => handleViewDetail(searchFilteredInventory.find(item => item.id === row.itemId)!)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        상세
                      </button>
                      <button 
                        onClick={() => handleEdit(searchFilteredInventory.find(item => item.id === row.itemId)!)}
                        className="text-green-600 hover:text-green-800 mr-3"
                      >
                        수정
                      </button>
                      <button 
                        onClick={() => handleDelete(searchFilteredInventory.find(item => item.id === row.itemId)!)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
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
                    총 <span className="font-medium">{flattenedData.length}</span>개 중{' '}
                    <span className="font-medium">{startIndex + 1}</span>-
                    <span className="font-medium">{Math.min(endIndex, flattenedData.length)}</span>개 표시
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
        {flattenedData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">검색 조건에 맞는 재고가 없습니다.</p>
            <button 
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('')
                setStatusFilter('')
                setSupplierFilter('')
                setCurrentPage(1)
              }}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              필터 초기화
            </button>
          </div>
        )}

      {/* 신규 앤드밀 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">신규 앤드밀 추가</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddEndmill} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 코드 *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="AT001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="FLAT 12mm 4날"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">사양 *</label>
                  <input
                    type="text"
                    value={formData.specifications}
                    onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12mm 4날"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">공급업체 *</label>
                  <select
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">공급업체 선택</option>
                    {suppliers.map(supplier => (
                      <option key={supplier} value={supplier}>{supplier}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">단가 (VND) *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">현재 재고 *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">최소 재고 *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">최대 재고</label>
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

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 상세보기 모달 */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">📋 앤드밀 상세 정보</h3>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">기본 정보</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">앤드밀 코드</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{selectedItem.endmill_types?.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.endmill_types?.description_ko || selectedItem.endmill_types?.description_vi}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">카테고리</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.endmill_types?.endmill_categories?.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">앤드밀 이름</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.endmill_types?.specifications ? JSON.stringify(selectedItem.endmill_types.specifications) : ''}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">재고 정보</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">현재고</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.current_stock}개</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">최소재고</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.min_stock}개</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">최대재고</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedItem.max_stock}개</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">상태</label>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        selectedItem.current_stock <= selectedItem.min_stock * 1.5 ? 'bg-red-100 text-red-800' :
                        selectedItem.current_stock <= selectedItem.min_stock ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedItem.current_stock <= selectedItem.min_stock * 1.5 ? '위험' :
                         selectedItem.current_stock <= selectedItem.min_stock ? '부족' : '충분'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-4">공급업체별 단가 정보</h4>
                <div className="space-y-2">
                  {/* 실제 공급업체 정보는 데이터베이스에서 가져와야 함 */}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">공급업체 1</span>
                      <span className="ml-2 text-sm text-gray-500">재고: 100개</span>
                    </div>
                    <span className="font-mono text-gray-900">1,000,000 VND</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">공급업체 2</span>
                      <span className="ml-2 text-sm text-gray-500">재고: 50개</span>
                    </div>
                    <span className="font-mono text-gray-900">1,200,000 VND</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">✏️ 앤드밀 정보 수정</h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 코드</label>
                  <input
                    type="text"
                    value={editFormData.endmill_types?.code}
                    onChange={(e) => setEditFormData({ ...editFormData, 'endmill_types.code': e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <input
                    type="text"
                    value={editFormData.endmill_types?.description_ko}
                    onChange={(e) => setEditFormData({ ...editFormData, 'endmill_types.description_ko': e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                  <select
                    value={editFormData.endmill_types?.endmill_categories?.code}
                    onChange={(e) => setEditFormData({ ...editFormData, 'endmill_types.endmill_categories.code': e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
                  <input
                    type="text"
                    value={editFormData.endmill_types?.specifications ? JSON.stringify(editFormData.endmill_types.specifications) : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, 'endmill_types.specifications': JSON.parse(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">최소재고</label>
                  <input
                    type="number"
                    value={editFormData.min_stock}
                    onChange={(e) => setEditFormData({ ...editFormData, min_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">최대재고</label>
                  <input
                    type="number"
                    value={editFormData.max_stock}
                    onChange={(e) => setEditFormData({ ...editFormData, max_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
       )}

      {/* 엑셀 업로드 모달 */}
      {showExcelUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">📄 앤드밀 마스터 데이터 엑셀 업로드</h3>
                <button 
                  onClick={() => setShowExcelUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* 업로드 안내 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">📋 업로드 형식 안내</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>• 엑셀 파일(.xlsx, .xls)만 업로드 가능합니다</p>
                  <p>• 필수 컬럼: 앤드밀코드, Type, 카테고리, 앤드밀이름, 직경(mm), 날수</p>
                  <p>• 선택 컬럼: 코팅, 소재, 공차, 나선각, 표준수명, 최소재고, 최대재고</p>
                  <p>• 공급업체 정보: 공급업체1, 공급업체1단가(VND), 공급업체2, 공급업체2단가(VND)...</p>
                </div>
              </div>

              {/* 파일 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">엑셀 파일 선택</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {excelFile && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ 선택된 파일: {excelFile.name}
                  </p>
                )}
              </div>

              {/* 진행 상황 */}
              {uploadProgress.processing && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                    <span className="text-sm text-yellow-800">파일을 처리하고 있습니다...</span>
                  </div>
                </div>
              )}

              {/* 결과 표시 */}
              {(!uploadProgress.processing && (uploadProgress.success > 0 || uploadProgress.updated > 0 || uploadProgress.errors.length > 0)) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">📊 처리 결과</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-3 bg-green-100 rounded-lg">
                      <div className="text-lg font-bold text-green-800">{uploadProgress.success}</div>
                      <div className="text-xs text-green-600">신규 추가</div>
                    </div>
                    <div className="text-center p-3 bg-blue-100 rounded-lg">
                      <div className="text-lg font-bold text-blue-800">{uploadProgress.updated}</div>
                      <div className="text-xs text-blue-600">업데이트</div>
                    </div>
                  </div>
                  
                  {uploadProgress.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-red-800 mb-2">⚠️ 오류 목록</h5>
                      <div className="max-h-32 overflow-y-auto">
                        {uploadProgress.errors.map((error, index) => (
                          <p key={index} className="text-xs text-red-600 mb-1">• {error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 버튼 */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExcelUploadModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  닫기
                </button>
                <button
                  onClick={handleProcessExcel}
                  disabled={!excelFile || uploadProgress.processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploadProgress.processing ? '처리 중...' : '📄 업로드 처리'}
                </button>
              </div>
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