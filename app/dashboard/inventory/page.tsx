'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { getAllSuppliers, getAllCategories } from '../../../lib/data/mockData'
import { useToast } from '../../../components/shared/Toast'

interface InventoryItem {
  id: string
  code: string
  name: string
  category: string
  specifications: string
  currentStock: number
  minStock: number
  maxStock: number
  status: 'sufficient' | 'low' | 'critical'
  suppliers: {
    name: string
    unitPrice: number
    currentStock: number
    status: 'sufficient' | 'low' | 'critical'
  }[]
}

interface NewEndmill {
  code: string
  name: string
  category: string
  specifications: string
  supplier: string
  unitPrice: number
  currentStock: number
  minStock: number
  maxStock: number
}

// 재고 데이터 생성 함수
const generateInventoryData = (): InventoryItem[] => {
  const categories = getAllCategories()
  const suppliers = getAllSuppliers()
  const items: InventoryItem[] = []
  
  // 각 카테고리별로 10-15개 앤드밀 생성
  categories.forEach((category, categoryIndex) => {
    const itemCount = 10 + Math.floor(Math.random() * 6) // 10-15개
    
    for (let i = 1; i <= itemCount; i++) {
      const itemNumber = (categoryIndex * 15 + i).toString().padStart(3, '0')
      const code = `AT${itemNumber}`
      
      const minStock = 10 + Math.floor(Math.random() * 20) // 10-30
      const maxStock = minStock + 50 + Math.floor(Math.random() * 50) // minStock + 50-100
      
      // 각 앤드밀마다 2-4개의 공급업체 정보 생성
      const supplierCount = 2 + Math.floor(Math.random() * 3) // 2-4개
      const selectedSuppliers = suppliers.sort(() => 0.5 - Math.random()).slice(0, supplierCount)
      
      const supplierInfos = selectedSuppliers.map(supplier => {
        const currentStock = Math.floor(Math.random() * (maxStock + 20)) // 0 ~ maxStock+20
        
        // 상태 결정
        let status: 'sufficient' | 'low' | 'critical'
        if (currentStock < minStock * 0.5) status = 'critical'
        else if (currentStock < minStock) status = 'low'
        else status = 'sufficient'
        
        // 공급업체별로 가격 차이 (베트남 동)
        const basePrice = 800000 + Math.floor(Math.random() * 1000000) // 800,000 - 1,800,000 VND
        const priceVariation = Math.floor(Math.random() * 200000) - 100000 // ±100,000 VND
        
        return {
          name: supplier,
          unitPrice: Math.max(500000, basePrice + priceVariation),
          currentStock,
          status
        }
      })
      
      // 전체 재고량 계산 (모든 공급업체 합계)
      const totalCurrentStock = supplierInfos.reduce((sum, s) => sum + s.currentStock, 0)
      
      // 전체 상태 결정
      let overallStatus: 'sufficient' | 'low' | 'critical'
      if (totalCurrentStock < minStock * 0.5) overallStatus = 'critical'
      else if (totalCurrentStock < minStock) overallStatus = 'low'
      else overallStatus = 'sufficient'
      
      items.push({
        id: itemNumber,
        code,
        name: `${category} ${6 + Math.floor(Math.random() * 15)}mm ${2 + Math.floor(Math.random() * 4)}날`,
        category,
        specifications: `${6 + Math.floor(Math.random() * 15)}mm ${2 + Math.floor(Math.random() * 4)}날`,
        currentStock: totalCurrentStock,
        minStock,
        maxStock,
        status: overallStatus,
        suppliers: supplierInfos
      })
    }
  })
  
  return items.sort((a, b) => a.code.localeCompare(b.code))
}

const inventoryItems = generateInventoryData()

export default function InventoryPage() {
  const { showSuccess, showError } = useToast()
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<NewEndmill>({
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

  // 필터링된 재고 목록
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.specifications.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === '' || item.category === categoryFilter
      const matchesStatus = statusFilter === '' || item.status === statusFilter
      const matchesSupplier = supplierFilter === '' || item.suppliers.some(s => s.name === supplierFilter)
      
      return matchesSearch && matchesCategory && matchesStatus && matchesSupplier
    })
  }, [inventory, searchTerm, categoryFilter, statusFilter, supplierFilter])

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
      supplier: string
      unitPrice: number
      supplierStock: number
      supplierStatus: 'sufficient' | 'low' | 'critical'
      isFirstRow: boolean
      rowSpan: number
    }> = []
    
    filteredInventory.forEach(item => {
      item.suppliers.forEach((supplier, index) => {
        result.push({
          itemId: item.id,
          code: item.code,
          name: item.name,
          category: item.category,
          specifications: item.specifications,
          totalCurrentStock: item.currentStock,
          minStock: item.minStock,
          maxStock: item.maxStock,
          overallStatus: item.status,
          supplier: supplier.name,
          unitPrice: supplier.unitPrice,
          supplierStock: supplier.currentStock,
          supplierStatus: supplier.status,
          isFirstRow: index === 0,
          rowSpan: item.suppliers.length
        })
      })
    })
    
    return result
  }, [filteredInventory])

  // 페이지네이션 계산 (플랫 데이터 기준)
  const totalPages = Math.ceil(flattenedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = flattenedData.slice(startIndex, endIndex)

  // 필터 상태 변경 시 첫 페이지로 이동
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, statusFilter, supplierFilter])

  // 상태별 카운트 (수정)
  const statusCounts = useMemo(() => {
    return {
      total: inventory.reduce((sum, item) => sum + item.currentStock, 0),
      critical: inventory.filter(item => item.status === 'critical').length,
      low: inventory.filter(item => item.status === 'low').length,
      orderPending: inventory.filter(item => item.status === 'critical' || item.status === 'low').length,
      totalValue: inventory.reduce((sum, item) => 
        sum + item.suppliers.reduce((supplierSum, supplier) => 
          supplierSum + (supplier.currentStock * supplier.unitPrice), 0
        ), 0
      )
    }
  }, [inventory])

  // 상태 배지 색상
  const getStatusBadge = (status: InventoryItem['status']) => {
    switch (status) {
      case 'sufficient':
        return 'bg-green-100 text-green-800'
      case 'low':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: InventoryItem['status']) => {
    switch (status) {
      case 'sufficient':
        return '충분'
      case 'low':
        return '부족'
      case 'critical':
        return '위험'
      default:
        return '알 수 없음'
    }
  }

  const handleAddEndmill = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 여기서 실제로는 API 호출을 통해 데이터베이스에 저장
    console.log('새 앤드밀 추가:', formData)
    
    // 폼 초기화
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
    showSuccess('앤드밀 추가 완료', `${formData.code} - ${formData.name}이 성공적으로 추가되었습니다.`)
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
              <p className="text-2xl font-bold text-gray-900">{statusCounts.total.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-red-600">{statusCounts.critical}</p>
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
              <p className="text-sm font-medium text-gray-600">발주 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.orderPending}</p>
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
                {(statusCounts.totalValue / 1000000000).toFixed(1)}B VND
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
              {getAllCategories().map(category => (
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
              {getAllSuppliers().map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            + 신규 앤드밀 추가
          </button>
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
                        {row.unitPrice.toLocaleString()} VND
                      </div>
                    </td>

                    {/* 작업 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-800 mr-3">상세</button>
                      <button className="text-green-600 hover:text-green-800 mr-3">수정</button>
                      <button className="text-red-600 hover:text-red-800">삭제</button>
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
                    {getAllCategories().map(category => (
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
                    {getAllSuppliers().map(supplier => (
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
    </div>
  )
} 