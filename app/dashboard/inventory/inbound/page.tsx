'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useToast } from '../../../../components/shared/Toast'
import ConfirmationModal from '../../../../components/shared/ConfirmationModal'
import { useConfirmation, createSaveConfirmation } from '../../../../lib/hooks/useConfirmation'
import { useTranslations } from '../../../../lib/hooks/useTranslations'
import { useFactory } from '../../../../lib/hooks/useFactory'
import { supabase } from '../../../../lib/supabase/client'
import { clientLogger } from '../../../../lib/utils/logger'
// inboundExcelExport is dynamically imported when needed

// 앤드밀 데이터 타입 정의
interface EndmillData {
  code: string
  name: string
  specifications: string
  unitPrice: number
  category?: string
  standardLife?: number
}

interface InboundItem {
  id: string
  endmillCode: string
  endmillName: string
  supplier: string
  quantity: number
  unitPrice: number // VND
  totalPrice: number // VND
  processedAt: string
  processedBy: string
}

export default function InboundPage() {
  const { t } = useTranslations()
  const { showSuccess, showError } = useToast()
  const confirmation = useConfirmation()
  const { currentFactory } = useFactory()
  const [scannedCode, setScannedCode] = useState('')
  const [inboundItems, setInboundItems] = useState<InboundItem[]>([])
  const [endmillData, setEndmillData] = useState<EndmillData | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [unitPrice, setUnitPrice] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [availableEndmills, setAvailableEndmills] = useState<any[]>([])
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([])
  const [supplierPrices, setSupplierPrices] = useState<Record<string, number>>({})

  // 기간 필터 상태
  const [period, setPeriod] = useState<'today' | 'lastWeek' | 'thisWeek' | 'thisMonth' | 'custom'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 검색 및 정렬 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'code' | 'quantity'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // 수정 모달 상태
  const [editingItem, setEditingItem] = useState<InboundItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // USB QR 스캐너를 위한 input ref 및 타이머
  const codeInputRef = useRef<HTMLInputElement>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 입고 내역 로드 함수
  const loadInboundItems = async () => {
    try {
      const factoryId = currentFactory?.id
      let url = `/api/inventory/inbound?period=${period}${factoryId ? `&factoryId=${factoryId}` : ''}`

      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setInboundItems(result.data || [])
        }
      }
    } catch (error) {
      clientLogger.error('입고 내역 로드 오류:', error)
    }
  }

  // 앤드밀 마스터 데이터 및 공급업체 데이터 로드
  useEffect(() => {
    loadAvailableEndmills()
    loadAvailableSuppliers()
    loadInboundItems()

    // inventory_transactions 테이블 realtime 구독
    const subscription = supabase
      .channel('inventory_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transactions',
          filter: 'transaction_type=eq.inbound'
        },
        (payload) => {
          clientLogger.log('Inventory transaction change:', payload)
          // 입고 내역 새로고침
          loadInboundItems()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFactory?.id])

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

  const loadAvailableSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableSuppliers(result.data || [])
        }
      }
    } catch (error) {
      clientLogger.error('공급업체 데이터 로드 오류:', error)
    }
  }

  const loadSupplierPrices = async (endmillCode: string) => {
    try {
      const foundEndmill = availableEndmills.find(endmill => endmill.code === endmillCode)
      if (!foundEndmill) return {}

      const response = await fetch(`/api/endmill/${foundEndmill.id}/suppliers`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const prices: Record<string, number> = {}
          result.data.forEach((item: any) => {
            if (item.supplier) {
              prices[item.supplier.name] = item.unit_price
            }
          })
          setSupplierPrices(prices)
          return prices
        }
      }
    } catch (error) {
      clientLogger.error('공급업체 가격 로드 오류:', error)
    }
    return {}
  }

  // 페이지 로드 시 input에 자동 포커스
  useEffect(() => {
    if (codeInputRef.current && !endmillData) {
      codeInputRef.current.focus()
    }
  }, [endmillData])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  const handleQRScan = async (code: string) => {
    if (!code.trim()) return

    clientLogger.log('QR 코드 검색 시작:', code)
    setErrorMessage('')

    const searchCode = code.trim().toUpperCase()

    // 앤드밀 마스터 데이터에서 검색 (정확히 일치 또는 부분 일치)
    // 1. 정확히 일치하는 코드 찾기
    let foundEndmill = availableEndmills.find(endmill =>
      endmill.code === searchCode
    )

    // 2. 정확히 일치하는 것이 없으면 코드 끝부분이 일치하는 것을 찾음 (예: "002" -> "AT002")
    if (!foundEndmill) {
      foundEndmill = availableEndmills.find(endmill =>
        endmill.code.endsWith(searchCode)
      )
    }

    // 3. 그래도 없으면 코드에 포함된 것을 찾음
    if (!foundEndmill) {
      foundEndmill = availableEndmills.find(endmill =>
        endmill.code.includes(searchCode)
      )
    }

    if (foundEndmill) {
      const endmillInfo: EndmillData = {
        code: foundEndmill.code,
        name: foundEndmill.name || '',
        specifications: foundEndmill.specifications || '',
        unitPrice: foundEndmill.unitPrice || 0,
        category: foundEndmill.category || t('inventory.uncategorized'),
        standardLife: foundEndmill.standardLife || 2000
      }

      setEndmillData(endmillInfo)
      setQuantity(1) // 수량 초기화
      setUnitPrice(0) // 공급업체 선택 시 가격이 자동 설정됨
      setSelectedSupplier('') // 공급업체는 직접 선택
      setSupplierPrices({}) // 가격 정보 초기화

      // 해당 앤드밀의 공급업체별 가격 로드
      const prices = await loadSupplierPrices(foundEndmill.code)
      clientLogger.log('Prices loaded for', foundEndmill.code, ':', prices)

      showSuccess(t('inventory.searchComplete'), `${t('inventory.infoLoaded')}: ${foundEndmill.code}`)
    } else {
      setEndmillData(null)
      setUnitPrice(0)
      setSelectedSupplier('')
      setErrorMessage(`${t('inventory.codeNotFound')} '${code}'`)
    }
  }

  const handleProcessInbound = async () => {
    if (!endmillData || quantity <= 0 || !selectedSupplier.trim() || unitPrice <= 0) {
      showError(t('inventory.checkInput'), t('inventory.checkAllFields'))
      return
    }

    const totalPrice = quantity * unitPrice
    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(
        `${endmillData.code} ${quantity}개 입고 (${selectedSupplier}, ${totalPrice.toLocaleString()} VND)`
      )
    )

    if (confirmed) {
      confirmation.setLoading(true)

      try {
        // API를 통해 입고 처리
        const response = await fetch('/api/inventory/inbound', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endmill_code: endmillData.code,
            endmill_name: endmillData.name,
            supplier: selectedSupplier,
            quantity: quantity,
            unit_price: unitPrice,
            total_amount: totalPrice,
            factory_id: currentFactory?.id
          })
        })

        if (!response.ok) {
          throw new Error('입고 처리 실패')
        }

        const result = await response.json()

        if (result.success) {
          // 입고 내역 새로고침
          loadInboundItems()

          // 폼 초기화
          setEndmillData(null)
          setQuantity(1)
          setSelectedSupplier('')
          setUnitPrice(0)
          setScannedCode('')
          setErrorMessage('')

          showSuccess(
            t('inventory.inboundProcessComplete'),
            `${endmillData.code} ${quantity}${t('inventory.successfullyInbound')} (${t('inventory.totalPrice')}: ${totalPrice.toLocaleString()} VND)`
          )
        } else {
          throw new Error(result.error || t('inventory.inboundProcessFailed'))
        }
      } catch (error) {
        clientLogger.error('입고 처리 오류:', error)
        showError(t('inventory.inboundProcessFailed'), t('inventory.inboundProcessError'))
      } finally {
        confirmation.setLoading(false)
      }
    }
  }

  // 총액 계산
  const getTotalPrice = () => {
    if (!endmillData || unitPrice <= 0) return 0
    return quantity * unitPrice
  }

  // 기간 필터 변경 시 데이터 다시 불러오기
  useEffect(() => {
    loadInboundItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, startDate, endDate, currentFactory?.id])

  // 검색 및 정렬이 적용된 데이터
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...inboundItems]

    // 검색 필터 적용
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.endmillCode.toLowerCase().includes(term) ||
          item.endmillName.toLowerCase().includes(term) ||
          item.supplier.toLowerCase().includes(term)
      )
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime()
          break
        case 'code':
          comparison = a.endmillCode.localeCompare(b.endmillCode)
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [inboundItems, searchTerm, sortBy, sortOrder])

  // 페이지네이션 적용
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedItems.slice(startIndex, endIndex)
  }, [filteredAndSortedItems, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage)

  // Excel 다운로드 핸들러
  const handleExcelDownload = async () => {
    try {
      if (filteredAndSortedItems.length === 0) {
        showError(t('inventory.excelDownloadFailed'), t('inventory.noDataToDownload'))
        return
      }

      const periodLabels = {
        today: '오늘',
        lastWeek: '최근일주일',
        thisWeek: '이번주',
        thisMonth: '이번달',
        custom: `${startDate}_${endDate}`
      }

      const { downloadInboundHistoryExcel } = await import('../../../../lib/utils/inboundExcelExport')
      const filename = await downloadInboundHistoryExcel(
        filteredAndSortedItems,
        periodLabels[period]
      )

      showSuccess(t('inventory.excelDownloadSuccess'), `${filename}`)
    } catch (error) {
      clientLogger.error('Excel 다운로드 오류:', error)
      showError(t('inventory.excelDownloadFailed'), String(error))
    }
  }

  // 입고 내역 수정 핸들러
  const handleEditInbound = (item: InboundItem) => {
    setEditingItem(item)
    setIsEditModalOpen(true)
  }

  // 입고 내역 수정 저장
  const handleSaveEdit = async () => {
    clientLogger.log('🔵 저장 버튼 클릭됨', { editingItem })

    if (!editingItem) {
      clientLogger.log('⚠️ editingItem이 없음')
      return
    }

    clientLogger.log('🔵 확인 모달 표시 중...')
    const confirmed = await confirmation.showConfirmation({
      type: 'save',
      title: t('inventory.updateInbound'),
      message: t('inventory.updateInboundConfirm'),
      confirmText: t('common.save'),
      cancelText: t('common.cancel')
    })

    clientLogger.log('🔵 확인 결과:', confirmed)

    if (confirmed) {
      try {
        const response = await fetch(`/api/inventory/inbound/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: editingItem.quantity,
            unitPrice: editingItem.unitPrice,
            supplier: editingItem.supplier
          })
        })

        const result = await response.json()

        if (result.success) {
          showSuccess(t('inventory.updateInboundSuccess'))
          setIsEditModalOpen(false)
          setEditingItem(null)
          await loadInboundItems()
        } else {
          showError(t('inventory.updateInboundFailed'), result.error)
        }
      } catch (error) {
        clientLogger.error('입고 내역 수정 오류:', error)
        showError(t('inventory.updateInboundFailed'), String(error))
      }
    }
  }

  // 입고 내역 삭제 핸들러
  const handleDeleteInbound = async (id: string) => {
    const confirmed = await confirmation.showConfirmation({
      type: 'delete',
      title: t('inventory.deleteInbound'),
      message: t('inventory.deleteInboundConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDangerous: true
    })

    if (confirmed) {
      try {
        const response = await fetch(`/api/inventory/inbound/${id}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (result.success) {
          showSuccess(t('inventory.deleteInboundSuccess'))
          await loadInboundItems()
        } else {
          showError(t('inventory.deleteInboundFailed'), result.error)
        }
      } catch (error) {
        clientLogger.error('입고 내역 삭제 오류:', error)
        showError(t('inventory.deleteInboundFailed'), String(error))
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">{t('inventory.scanDescription')}</p>
        <Link
          href="/dashboard/inventory"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          ← {t('inventory.backToInventory')}
        </Link>
      </div>

      {/* QR 스캔 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 {t('inventory.qrScanner')}</h2>

          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center text-3xl">
              📦
            </div>
            <p className="text-blue-800 font-medium mb-2">{t('inventory.usbScannerReady')}</p>
            <p className="text-sm text-blue-600 mb-6">{t('inventory.usbScannerGuide')}</p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  ref={codeInputRef}
                  type="text"
                  placeholder={t('inventory.enterCodePlaceholder')}
                  value={scannedCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setScannedCode(value)

                    // 기존 타이머 취소
                    if (scanTimeoutRef.current) {
                      clearTimeout(scanTimeoutRef.current)
                    }

                    // 입력이 있고 3자 이상이면 200ms 후 자동 검색
                    if (value.trim().length >= 3) {
                      scanTimeoutRef.current = setTimeout(async () => {
                        clientLogger.log('자동 검색 실행:', value)
                        await handleQRScan(value)
                        setScannedCode('') // 검색 후 input 초기화
                      }, 200)
                    }
                  }}
                  onKeyDown={async (e) => {
                    // Enter 키로도 즉시 검색 가능
                    if (e.key === 'Enter' && scannedCode.trim()) {
                      // 타이머가 있으면 취소
                      if (scanTimeoutRef.current) {
                        clearTimeout(scanTimeoutRef.current)
                      }
                      await handleQRScan(scannedCode)
                      setScannedCode('') // 검색 후 input 초기화
                    }
                  }}
                  className="flex-1 px-4 py-3 border-2 border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                  autoFocus
                />
                <button
                  onClick={async () => {
                    if (scannedCode.trim()) {
                      await handleQRScan(scannedCode)
                      setScannedCode('')
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  disabled={!scannedCode.trim()}
                >
                  {t('common.search')}
                </button>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                </div>
              )}

              <div className="bg-white border border-blue-200 rounded-md p-4 text-left">
                <p className="text-xs font-medium text-blue-800 mb-2">💡 {t('inventory.scannerUsageGuide')}</p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>{t('inventory.scannerStep1')}</li>
                  <li>{t('inventory.scannerStep2')}</li>
                  <li>{t('inventory.scannerStep3')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 입고 정보 입력 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 {t('inventory.inboundInfo')}</h2>
          
          {endmillData ? (
            <div className="space-y-4">
              {/* 자동 입력된 앤드밀 정보 (읽기 전용) */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.endmillCodeLabel')}</label>
                    <div className="text-lg font-bold text-blue-600">{endmillData.code}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.category')}</label>
                    <div className="text-sm text-gray-900">{endmillData.category}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.endmillNameLabel')}</label>
                    <div className="text-sm font-medium text-gray-900">{endmillData.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.standardLife')}</label>
                    <div className="text-sm text-gray-600">{endmillData.standardLife?.toLocaleString() || '2,000'}{t('inventory.times')}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600">{endmillData.specifications}</div>
                  </div>
                </div>
              </div>

              {/* 입고 정보 입력 필드들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.supplierLabel')} {t('inventory.required')}</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => {
                      const supplier = e.target.value
                      setSelectedSupplier(supplier)
                      // 선택된 공급업체의 가격이 있으면 자동 설정
                      if (supplier && supplierPrices[supplier]) {
                        setUnitPrice(supplierPrices[supplier])
                      }
                    }}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('inventory.selectSupplier')}</option>
                    {availableSuppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.name}>
                        {supplier.code || supplier.name}
                        {supplierPrices[supplier.name] ? ` (${supplierPrices[supplier.name].toLocaleString()} VND)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.unitPriceVNDLabel')} {t('inventory.required')}</label>
                  <input
                    type="number"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('inventory.enterUnitPrice')}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.inboundQuantity')} {t('inventory.required')}</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder={t('inventory.enterQuantity')}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* 총액 표시 */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{t('inventory.totalInboundAmount')}:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {getTotalPrice().toLocaleString()} VND
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {unitPrice.toLocaleString()} VND × {quantity}{t('inventory.pieces')} = {getTotalPrice().toLocaleString()} VND
                </div>
              </div>

              {/* 입고 처리 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={handleProcessInbound}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  disabled={quantity <= 0 || !selectedSupplier.trim() || unitPrice <= 0}
                >
                  📥 {t('inventory.processInbound')}
                </button>
                <button
                  onClick={() => {
                    setEndmillData(null)
                    setQuantity(1)
                    setSelectedSupplier('')
                    setUnitPrice(0)
                    setScannedCode('')
                    setErrorMessage('')
                  }}
                  className="px-4 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  {t('common.reset')}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                📦
              </div>
              <p className="text-lg font-medium mb-2">{t('inventory.scanEndmillInfo')}</p>
              <p className="text-sm">{t('inventory.scanOrEnterCode')}</p>
              <p className="text-sm">{t('inventory.autoLoadInfo')}</p>
              <p className="text-xs text-gray-400 mt-2">{t('inventory.enterSupplierAndPrice')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 입고 처리 내역 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-200">
        {/* 헤더와 필터 */}
        <div className="px-6 py-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('inventory.inboundHistory')}</h2>
            <button
              onClick={handleExcelDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              disabled={filteredAndSortedItems.length === 0}
            >
              📥 {t('inventory.downloadExcel')}
            </button>
          </div>

          {/* 기간 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('inventory.periodFilter')}
              </label>
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as any)
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">{t('inventory.periodFilter')} - {t('common.date')}</option>
                <option value="lastWeek">{t('inventory.lastWeek')}</option>
                <option value="thisWeek">{t('inventory.thisWeek')}</option>
                <option value="thisMonth">{t('inventory.thisMonth')}</option>
                <option value="custom">{t('inventory.customPeriod')}</option>
              </select>
            </div>

            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('inventory.startDate')}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('inventory.endDate')}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      loadInboundItems()
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('inventory.apply')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 검색 및 정렬 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder={t('inventory.searchPlaceholderInbound')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">{t('inventory.sortByDate')}</option>
                <option value="code">{t('inventory.sortByCode')}</option>
                <option value="quantity">{t('inventory.sortByQuantity')}</option>
              </select>
            </div>
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">{t('inventory.sortDescending')}</option>
                <option value="asc">{t('inventory.sortAscending')}</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? t('common.noResults') : t('inventory.noInboundHistory')}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.processedTime')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.endmillCode')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.endmillName')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.supplier')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.quantity')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.unitPriceVND')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.totalAmount')} (VND)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.processor')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('inventory.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.processedAt}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.endmillCode}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.endmillName}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.supplier}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.totalPrice.toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.processedBy}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditInbound(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteInbound(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {t('inventory.showingEntries', {
                    from: (currentPage - 1) * itemsPerPage + 1,
                    to: Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length),
                    total: filteredAndSortedItems.length
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('toolChanges.previous')}
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('toolChanges.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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

      {/* 수정 모달 */}
      {isEditModalOpen && editingItem && (
        <div className="mobile-modal-container" onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}>
          <div className="mobile-modal-content md:max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('inventory.editInbound')}</h3>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="mobile-modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.endmillCode')}
                </label>
                <input
                  type="text"
                  value={editingItem.endmillCode}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.supplier')}
                </label>
                <input
                  type="text"
                  value={editingItem.supplier}
                  onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingItem.quantity}
                  onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.unitPriceVND')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingItem.unitPrice}
                  onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingItem(null)
                }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 