'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '../../../../components/shared/Toast'
import ConfirmationModal from '../../../../components/shared/ConfirmationModal'
import { useConfirmation, createSaveConfirmation } from '../../../../lib/hooks/useConfirmation'
import { supabase } from '../../../../lib/supabase/client'

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
  const { showSuccess, showError, showWarning } = useToast()
  const confirmation = useConfirmation()
  const [isScanning, setIsScanning] = useState(false)
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

  // 입고 내역 로드 함수
  const loadInboundItems = async () => {
    try {
      const response = await fetch('/api/inventory/inbound')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setInboundItems(result.data || [])
        }
      }
    } catch (error) {
      console.error('입고 내역 로드 오류:', error)
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
          console.log('Inventory transaction change:', payload)
          // 입고 내역 새로고침
          loadInboundItems()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
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
      console.error('앤드밀 마스터 데이터 로드 오류:', error)
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
      console.error('공급업체 데이터 로드 오류:', error)
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
      console.error('공급업체 가격 로드 오류:', error)
    }
    return {}
  }

  const handleQRScan = async (code: string) => {
    setScannedCode(code)
    setIsScanning(false)
    setErrorMessage('')

    // 앤드밀 마스터 데이터에서 검색
    const foundEndmill = availableEndmills.find(endmill =>
      endmill.code === code.trim()
    )

    if (foundEndmill) {
      const endmillInfo: EndmillData = {
        code: foundEndmill.code,
        name: foundEndmill.name || '',
        specifications: foundEndmill.specifications || '',
        unitPrice: foundEndmill.unitPrice || 0,
        category: foundEndmill.category || '미분류',
        standardLife: foundEndmill.standardLife || 2000
      }

      setEndmillData(endmillInfo)
      setQuantity(1) // 수량 초기화
      setUnitPrice(0) // 공급업체 선택 시 가격이 자동 설정됨
      setSelectedSupplier('') // 공급업체는 직접 선택
      setSupplierPrices({}) // 가격 정보 초기화

      // 해당 앤드밀의 공급업체별 가격 로드
      const prices = await loadSupplierPrices(foundEndmill.code)
      console.log('Prices loaded for', foundEndmill.code, ':', prices)

      showSuccess('앤드밀 검색 완료', `앤드밀 정보가 로드되었습니다: ${foundEndmill.code}`)
    } else {
      setEndmillData(null)
      setUnitPrice(0)
      setSelectedSupplier('')
      setErrorMessage(`앤드밀 코드 '${code}'를 찾을 수 없습니다. 코드를 확인해주세요.`)
    }
  }

  const handleProcessInbound = async () => {
    if (!endmillData || quantity <= 0 || !selectedSupplier.trim() || unitPrice <= 0) {
      showError('입력 확인 필요', '앤드밀 정보, 수량, 공급업체, 단가를 모두 확인해주세요.')
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
            total_amount: totalPrice
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
            '입고 처리 완료',
            `${endmillData.code} ${quantity}개가 성공적으로 입고되었습니다. (총액: ${totalPrice.toLocaleString()} VND)`
          )
        } else {
          throw new Error(result.error || '입고 처리 실패')
        }
      } catch (error) {
        console.error('입고 처리 오류:', error)
        showError('입고 처리 실패', '입고 처리 중 오류가 발생했습니다.')
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">QR 스캔을 통한 앤드밀 입고 처리</p>
        </div>
        <Link 
          href="/dashboard/inventory"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          ← 재고현황으로
        </Link>
      </div>

      {/* QR 스캔 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 QR 스캐너</h2>
          
          {isScanning ? (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                📷
              </div>
              <p className="text-blue-600 mb-4">카메라가 활성화되었습니다</p>
              <p className="text-sm text-gray-600 mb-4">QR 코드를 카메라에 비춰주세요</p>
              <button 
                onClick={() => setIsScanning(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                스캔 중지
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                📷
              </div>
              <p className="text-gray-500 mb-4">QR 코드를 스캔하여 앤드밀 정보를 불러오세요</p>
              <button 
                onClick={() => setIsScanning(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-2"
              >
                카메라 시작
              </button>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">또는</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="앤드밀 코드 입력 (예: AT001)"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter' && scannedCode.trim()) {
                        await handleQRScan(scannedCode)
                      }
                    }}
                  />
                  <button
                    onClick={async () => scannedCode.trim() && await handleQRScan(scannedCode)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={!scannedCode.trim()}
                  >
                    검색
                  </button>
                </div>
                {errorMessage && (
                  <p className="text-red-600 text-sm mt-2">{errorMessage}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 입고 정보 입력 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 입고 정보</h2>
          
          {endmillData ? (
            <div className="space-y-4">
              {/* 자동 입력된 앤드밀 정보 (읽기 전용) */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">앤드밀 코드</label>
                    <div className="text-lg font-bold text-blue-600">{endmillData.code}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                    <div className="text-sm text-gray-900">{endmillData.category}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">앤드밀 이름</label>
                    <div className="text-sm font-medium text-gray-900">{endmillData.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">표준 수명</label>
                    <div className="text-sm text-gray-600">{endmillData.standardLife?.toLocaleString() || '2,000'}회</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600">{endmillData.specifications}</div>
                  </div>
                </div>
              </div>

              {/* 입고 정보 입력 필드들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">공급업체 *</label>
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
                    <option value="">공급업체 선택</option>
                    {availableSuppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.name}>
                        {supplier.name}
                        {supplierPrices[supplier.name] ? ` (${supplierPrices[supplier.name].toLocaleString()} VND)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">단가 (VND) *</label>
                  <input
                    type="number"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="단가 입력"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">입고 수량 *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="수량 입력"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* 총액 표시 */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">총 입고 금액:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {getTotalPrice().toLocaleString()} VND
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {unitPrice.toLocaleString()} VND × {quantity}개 = {getTotalPrice().toLocaleString()} VND
                </div>
              </div>
              
              {/* 입고 처리 버튼 */}
              <div className="flex gap-3">
                <button 
                  onClick={handleProcessInbound}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  disabled={quantity <= 0 || !selectedSupplier.trim() || unitPrice <= 0}
                >
                  📥 입고 처리
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
                  초기화
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                📦
              </div>
              <p className="text-lg font-medium mb-2">앤드밀 정보를 스캔해주세요</p>
              <p className="text-sm">QR 코드를 스캔하거나 앤드밀 코드를 입력하면</p>
              <p className="text-sm">자동으로 정보가 불러와집니다</p>
              <p className="text-xs text-gray-400 mt-2">공급업체와 단가는 직접 입력하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 입고 처리 내역 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">오늘 입고 처리 내역</h2>
        </div>
        
        {inboundItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            아직 처리된 입고 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">처리시간</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 코드</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 이름</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">공급업체</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">단가 (VND)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">총액 (VND)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">처리자</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inboundItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.processedAt}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.endmillCode}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.endmillName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.supplier}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.unitPrice.toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.totalPrice.toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.processedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  )
} 