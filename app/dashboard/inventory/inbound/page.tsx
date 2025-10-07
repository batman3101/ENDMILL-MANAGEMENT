'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '../../../../components/shared/Toast'
import ConfirmationModal from '../../../../components/shared/ConfirmationModal'
import { useConfirmation, createSaveConfirmation } from '../../../../lib/hooks/useConfirmation'
import { useTranslations } from '../../../../lib/hooks/useTranslations'
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
  const { t } = useTranslations()
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
            t('inventory.inboundProcessComplete'),
            `${endmillData.code} ${quantity}${t('inventory.successfullyInbound')} (${t('inventory.totalPrice')}: ${totalPrice.toLocaleString()} VND)`
          )
        } else {
          throw new Error(result.error || t('inventory.inboundProcessFailed'))
        }
      } catch (error) {
        console.error('입고 처리 오류:', error)
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">{t('inventory.scanDescription')}</p>
        </div>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 {t('inventory.qrScanner')}</h2>
          
          {isScanning ? (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                📷
              </div>
              <p className="text-blue-600 mb-4">{t('inventory.cameraActivated')}</p>
              <p className="text-sm text-gray-600 mb-4">{t('inventory.showQRToCamera')}</p>
              <button
                onClick={() => setIsScanning(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                {t('inventory.stopScanning')}
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                📷
              </div>
              <p className="text-gray-500 mb-4">{t('inventory.scanToLoadInfo')}</p>
              <button
                onClick={() => setIsScanning(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-2"
              >
                {t('inventory.startCamera')}
              </button>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">{t('inventory.or')}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('inventory.enterCodePlaceholder')}
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
                    {t('common.search')}
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
                        {supplier.name}
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
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{t('inventory.todayInboundHistory')}</h2>
        </div>

        {inboundItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('inventory.noInboundHistory')}
          </div>
        ) : (
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