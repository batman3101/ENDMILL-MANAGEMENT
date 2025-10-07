'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useInventorySearch } from '../../../../lib/hooks/useInventory'
import { useToast } from '../../../../components/shared/Toast'
import ConfirmationModal from '../../../../components/shared/ConfirmationModal'
import { useConfirmation, createSaveConfirmation } from '../../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../../lib/hooks/useSettings'
import { useTranslations } from '../../../../lib/hooks/useTranslations'
import { supabase } from '../../../../lib/supabase/client'

// 앤드밀 데이터 타입 정의
interface EndmillData {
  code: string
  name: string
  specifications: string
  currentStock: number
  unitPrice: number
  category?: string
  standardLife?: number
}

interface OutboundItem {
  id: string
  endmillCode: string
  endmillName: string
  equipmentNumber: string
  tNumber: number
  quantity: number
  unitPrice: number
  totalValue: number
  processedAt: string
  processedBy: string
  purpose: string
}

export default function OutboundPage() {
  const { t } = useTranslations()
  const { showSuccess, showError, showWarning } = useToast()
  const confirmation = useConfirmation()
  const { searchByCode } = useInventorySearch()
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [outboundItems, setOutboundItems] = useState<OutboundItem[]>([])
  const [endmillData, setEndmillData] = useState<EndmillData | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [equipmentNumber, setEquipmentNumber] = useState('')
  const [tNumber, setTNumber] = useState(1)
  const [purpose, setPurpose] = useState('예방교체')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableEndmills, setAvailableEndmills] = useState<any[]>([])

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const tNumberRange = settings.toolChanges.tNumberRange
  const toolChangesReasons = settings.toolChanges.reasons

  // 앤드밀 마스터 데이터 로드
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
      console.error('앤드밀 데이터 로드 오류:', error)
    }
  }

  // T번호 자동 입력 기능 (기존 아키텍처 사용)
  const autoFillTNumber = async (equipmentNum: string, endmillCode: string) => {
    if (!equipmentNum || !endmillCode) return

    try {
      // 1단계: 설비번호로 model, process 가져오기
      const equipmentResponse = await fetch(`/api/tool-changes/auto-fill?equipmentNumber=${equipmentNum}`)
      if (equipmentResponse.ok) {
        const equipmentResult = await equipmentResponse.json()
        if (equipmentResult.success && equipmentResult.data.equipmentInfo) {
          const { model, process } = equipmentResult.data.equipmentInfo

          // 2단계: model, process로 CAM sheet 조회해서 엔드밀 코드에 해당하는 T번호 찾기
          // CAM sheet의 모든 T번호를 확인해서 해당 엔드밀 코드와 매칭되는 것 찾기
          for (let t = 1; t <= 24; t++) {
            const endmillResponse = await fetch(`/api/tool-changes/auto-fill?model=${model}&process=${process}&tNumber=${t}`)
            if (endmillResponse.ok) {
              const endmillResult = await endmillResponse.json()
              if (endmillResult.success && endmillResult.data.endmillInfo) {
                const { endmillCode: foundEndmillCode } = endmillResult.data.endmillInfo
                if (foundEndmillCode === endmillCode) {
                  setTNumber(t)
                  showSuccess(t('inventory.tNumberAutoInput'), `T${t.toString().padStart(2, '0')}${t('inventory.tNumberAutoInputSuccess')}`)
                  return
                }
              }
            }
          }
          showWarning(t('inventory.tNumberAutoInputFailed'), t('inventory.tNumberNotFound'))
        }
      }
    } catch (error) {
      console.error('T번호 자동 입력 오류:', error)
    }
  }

  // 설비번호 변경 핸들러
  const handleEquipmentNumberChange = (value: string) => {
    setEquipmentNumber(value)

    // 엔드밀이 이미 검색되어 있다면 T번호 자동 입력 시도
    if (endmillData && value.trim()) {
      autoFillTNumber(value, endmillData.code)
    }
  }

  // 컴포넌트 마운트 시 출고 내역 불러오기
  useEffect(() => {
    loadAvailableEndmills()
    loadOutboundHistory()

    // Realtime 구독 설정
    const channel = supabase
      .channel('outbound-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transactions',
          filter: 'transaction_type=eq.outbound'
        },
        (payload) => {
          console.log('실시간 출고 업데이트:', payload)
          loadOutboundHistory()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadOutboundHistory = async () => {
    try {
      const response = await fetch('/api/inventory/outbound')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const formattedItems = result.data.map((item: any) => ({
            id: item.id,
            endmillCode: item.inventory?.endmill_type?.code || item.endmill_type?.code || '',
            endmillName: item.inventory?.endmill_type?.name || item.endmill_type?.name || '',
            equipmentNumber: item.equipment_number || item.notes?.split(' ')?.[0] || '',
            tNumber: item.t_number || 0,
            quantity: item.quantity,
            unitPrice: item.unit_price || 0,
            totalValue: item.total_amount || (item.quantity * (item.unit_price || 0)),
            processedAt: new Date(item.created_at).toLocaleString('ko-KR'),
            processedBy: item.processed_by?.name || '관리자',
            purpose: item.purpose || '예방교체'
          }))
          setOutboundItems(formattedItems)
        }
      }
    } catch (error) {
      console.error('출고 내역 로드 오류:', error)
    }
  }

  const handleQRScan = async (code: string) => {
    setScannedCode(code)
    setIsScanning(false)
    setErrorMessage('')

    // 앤드밀 마스터 데이터에서 검색
    const foundEndmill = availableEndmills.find(endmill =>
      endmill.code === code.trim().toUpperCase()
    )

    if (foundEndmill) {
      // 재고 정보를 별도로 가져오기 (기존 아키텍처 사용)
      try {
        const inventoryResponse = await fetch('/api/inventory')
        let currentStock = 0

        if (inventoryResponse.ok) {
          const inventoryResult = await inventoryResponse.json()
          if (inventoryResult.success && inventoryResult.data) {
            const inventoryItem = inventoryResult.data.find((item: any) =>
              item.endmill_type?.code === foundEndmill.code
            )
            if (inventoryItem) {
              currentStock = inventoryItem.current_stock || 0
            }
          }
        }

        // 공급업체별 가격 중 최저가 계산
        let lowestPrice = foundEndmill.unitCost || 0
        if (foundEndmill.suppliers && foundEndmill.suppliers.length > 0) {
          const prices = foundEndmill.suppliers.map((supplier: any) => supplier.unitPrice || 0)
          lowestPrice = Math.min(...prices.filter(price => price > 0))
        }

        const endmillInfo: EndmillData = {
          code: foundEndmill.code,
          name: foundEndmill.name || '',
          specifications: foundEndmill.specifications || '',
          currentStock: currentStock,
          unitPrice: lowestPrice,
          category: foundEndmill.categoryName || '미분류',
          standardLife: foundEndmill.standardLife || 2000
        }

        setEndmillData(endmillInfo)
        setQuantity(1) // 수량 초기화

        showSuccess(t('inventory.searchComplete'), `${t('inventory.infoLoaded')}: ${foundEndmill.code} (${t('inventory.stock')}: ${currentStock}${t('inventory.pieces')})`)

        // 설비번호가 이미 입력되어 있다면 T번호 자동 입력 시도
        if (equipmentNumber.trim()) {
          autoFillTNumber(equipmentNumber, foundEndmill.code)
        }
      } catch (error) {
        console.error('재고 정보 조회 오류:', error)
        // 재고 정보를 못 가져와도 기본 정보는 표시
        // 공급업체별 가격 중 최저가 계산 (에러 케이스)
        let lowestPrice = foundEndmill.unitCost || 0
        if (foundEndmill.suppliers && foundEndmill.suppliers.length > 0) {
          const prices = foundEndmill.suppliers.map((supplier: any) => supplier.unitPrice || 0)
          lowestPrice = Math.min(...prices.filter(price => price > 0))
        }

        const endmillInfo: EndmillData = {
          code: foundEndmill.code,
          name: foundEndmill.name || '',
          specifications: foundEndmill.specifications || '',
          currentStock: 0,
          unitPrice: lowestPrice,
          category: foundEndmill.categoryName || '미분류',
          standardLife: foundEndmill.standardLife || 2000
        }
        setEndmillData(endmillInfo)
        setQuantity(1)
        showSuccess(t('inventory.searchComplete'), `${t('inventory.infoLoaded')}: ${foundEndmill.code} (${t('inventory.stockInfo')})`)
      }
    } else {
      setEndmillData(null)
      setErrorMessage(`${t('inventory.codeNotFound')} '${code}'`)
    }
  }

  const handleProcessOutbound = async () => {
    if (!endmillData || quantity <= 0 || !equipmentNumber.trim()) {
      showError(t('inventory.checkInput'), t('inventory.checkOutboundFields'))
      return
    }

    // 설비번호 패턴 검증
    const equipmentPattern = /^C[0-9]{3}$/
    if (!equipmentPattern.test(equipmentNumber)) {
      showWarning(t('inventory.equipmentNumberFormat'), t('inventory.equipmentNumberFormatError'))
      return
    }

    // 재고 확인
    if (endmillData.currentStock < quantity) {
      showError(t('inventory.insufficientStock'), `${t('inventory.insufficientStockError')} (${endmillData.currentStock}${t('inventory.pieces')})`)
      return
    }

    const totalValue = quantity * endmillData.unitPrice
    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(
        `${endmillData.code} ${quantity}개 출고 (${equipmentNumber} T${tNumber.toString().padStart(2, '0')}, ${purpose})`
      )
    )

    if (confirmed) {
      confirmation.setLoading(true)
      setLoading(true)

      try {
        const response = await fetch('/api/inventory/outbound', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endmill_code: endmillData.code,
            equipment_number: equipmentNumber,
            t_number: tNumber,
            quantity: quantity,
            purpose: purpose,
            notes: `출고 처리: ${equipmentNumber} T${tNumber.toString().padStart(2, '0')}`
          })
        })

        const result = await response.json()

        if (response.ok && result.success) {
          // 폼 초기화
          setEndmillData(null)
          setQuantity(1)
          setEquipmentNumber('')
          setTNumber(1)
          setPurpose('예방교체')
          setScannedCode('')
          setErrorMessage('')

          // 출고 내역 새로고침
          await loadOutboundHistory()

          showSuccess(
            t('inventory.outboundProcessComplete'),
            `${endmillData.code} ${quantity}${t('inventory.successfullyOutbound')} ${equipmentNumber} T${tNumber.toString().padStart(2, '0')}${t('inventory.outboundTo')}`
          )
        } else {
          showError(t('inventory.outboundProcessFailed'), result.error || t('inventory.outboundProcessError'))
        }
      } catch (error) {
        console.error('출고 처리 오류:', error)
        showError(t('inventory.outboundProcessFailed'), t('inventory.outboundProcessError'))
      } finally {
        confirmation.setLoading(false)
        setLoading(false)
      }
    }
  }

  const handleCancelOutbound = async (transactionId: string) => {
    const confirmed = await confirmation.showConfirmation({
      title: t('inventory.cancelOutbound'),
      message: t('inventory.cancelOutboundConfirm'),
      type: 'danger',
      confirmText: t('common.cancel'),
      cancelText: t('inventory.keep')
    })

    if (confirmed) {
      try {
        const response = await fetch(`/api/inventory/outbound?id=${transactionId}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (response.ok && result.success) {
          await loadOutboundHistory()
          showSuccess(t('inventory.cancelOutboundSuccess'), t('inventory.cancelOutboundSuccessMessage'))
        } else {
          showError(t('inventory.cancelOutboundFailed'), result.error || t('inventory.cancelOutboundError'))
        }
      } catch (error) {
        console.error('출고 취소 오류:', error)
        showError(t('inventory.cancelOutboundFailed'), t('inventory.cancelOutboundError'))
      }
    }
  }

  // 총액 계산
  const getTotalValue = () => {
    if (!endmillData) return 0
    return quantity * endmillData.unitPrice
  }

  // 현재 재고의 총 가치 계산
  const getCurrentStockValue = () => {
    if (!endmillData) return 0
    return endmillData.unitPrice * endmillData.currentStock
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-gray-600">{t('inventory.subtitle')}</p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          ← {t('inventory.backToInventory')}
        </Link>
      </div>

      {/* QR 스캔을 통한 앤드밀 출고 처리 */}
      <p className="text-gray-600">{t('inventory.outboundScanDescription')}</p>

      {/* QR 스캔 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 {t('inventory.qrScanner')}</h2>

          {isScanning ? (
            <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center bg-green-50">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                📷
              </div>
              <p className="text-green-600 mb-4">{t('inventory.cameraActivated')}</p>
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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mb-2"
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && scannedCode.trim()) {
                        handleQRScan(scannedCode)
                      }
                    }}
                  />
                  <button
                    onClick={() => scannedCode.trim() && handleQRScan(scannedCode)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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

        {/* 출고 정보 입력 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 출고 정보</h2>

          {endmillData ? (
            <div className="space-y-4">
              {/* 자동 입력된 앤드밀 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">앤드밀 코드</label>
                    <div className="text-lg font-bold text-green-600">{endmillData.code}</div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">현재 재고</label>
                    <div className={`text-sm font-bold ${endmillData.currentStock < quantity ? 'text-red-600' : 'text-gray-900'}`}>
                      {endmillData.currentStock}개
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      총 가치: {getCurrentStockValue().toLocaleString()} VND
                    </div>
                    <div className="text-xs text-gray-500">
                      ({endmillData.unitPrice.toLocaleString()} VND/개, 최저가)
                    </div>
                  </div>
                </div>
              </div>

              {/* 출고 관련 입력 필드들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">설비번호 *</label>
                  <input
                    type="text"
                    value={equipmentNumber}
                    onChange={(e) => handleEquipmentNumberChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="C001"
                    pattern="C[0-9]{3}"
                    title="C001-C800 형식으로 입력해주세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">T번호 *</label>
                  <select
                    value={tNumber}
                    onChange={(e) => setTNumber(parseInt(e.target.value))}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    {Array.from({length: tNumberRange.max - tNumberRange.min + 1}, (_, i) => i + tNumberRange.min).map(num => (
                      <option key={num} value={num}>T{num.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">출고 수량 *</label>
                  <input
                    type="number"
                    min="1"
                    max={endmillData.currentStock}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg ${
                      quantity > endmillData.currentStock ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="수량 입력"
                    required
                  />
                  {quantity > endmillData.currentStock && (
                    <p className="text-red-600 text-xs mt-1">재고 부족! 현재 재고: {endmillData.currentStock}개</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">출고 목적 *</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">사유 선택</option>
                    {toolChangesReasons.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 총액 표시 */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">총 출고 가치:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {getTotalValue().toLocaleString()} VND
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {endmillData.unitPrice.toLocaleString()} VND × {quantity}개 = {getTotalValue().toLocaleString()} VND
                </div>
              </div>

              {/* 출고 처리 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={handleProcessOutbound}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-gray-400"
                  disabled={quantity <= 0 || !equipmentNumber.trim() || quantity > endmillData.currentStock || loading}
                >
                  {loading ? '처리 중...' : '📤 출고 처리'}
                </button>
                <button
                  onClick={() => {
                    setEndmillData(null)
                    setQuantity(1)
                    setEquipmentNumber('')
                    setTNumber(1)
                    setPurpose('예방교체')
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
              <p className="text-xs text-gray-400 mt-2">출고 정보는 직접 입력하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 출고 처리 내역 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">오늘 출고 처리 내역</h2>
        </div>

        {outboundItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            아직 처리된 출고 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">처리시간</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 코드</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">앤드밀 이름</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">설비번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">T번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">목적</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">가치 (VND)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">처리자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {outboundItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.processedAt}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.endmillCode}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.endmillName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.equipmentNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">T{item.tNumber.toString().padStart(2, '0')}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.purpose}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">{item.totalValue.toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.processedBy}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleCancelOutbound(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        취소
                      </button>
                    </td>
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