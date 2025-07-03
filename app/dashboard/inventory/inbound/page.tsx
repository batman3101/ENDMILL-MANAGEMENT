'use client'

import { useState } from 'react'
import Link from 'next/link'
import { findEndmillByCode, getAllSuppliers, EndmillMaster } from '../../../../lib/data/mockData'
import { useToast } from '../../../../components/shared/Toast'
import ConfirmationModal from '../../../../components/shared/ConfirmationModal'
import { useConfirmation, createSaveConfirmation } from '../../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../../lib/hooks/useSettings'

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
  const [endmillData, setEndmillData] = useState<EndmillMaster | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [unitPrice, setUnitPrice] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  
  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const suppliers = settings.inventory.suppliers

  const handleQRScan = (code: string) => {
    setScannedCode(code)
    setIsScanning(false)
    setErrorMessage('')
    
    // 앤드밀 데이터베이스에서 검색 (공급업체 정보 제외)
    const foundEndmill = findEndmillByCode(code.trim().toUpperCase())
    
    if (foundEndmill) {
      setEndmillData(foundEndmill)
      setQuantity(1) // 수량 초기화
      setUnitPrice(foundEndmill.unitPrice) // 기본 단가 설정 (수정 가능)
      setSelectedSupplier('') // 공급업체는 직접 선택
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
        const newItem: InboundItem = {
          id: Date.now().toString(),
          endmillCode: endmillData.code,
          endmillName: endmillData.name,
          supplier: selectedSupplier,
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          processedAt: new Date().toLocaleString('ko-KR'),
          processedBy: '관리자' // 실제로는 로그인된 사용자 정보
        }

        setInboundItems([newItem, ...inboundItems])
        
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
      } catch (error) {
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && scannedCode.trim()) {
                        handleQRScan(scannedCode)
                      }
                    }}
                  />
                  <button 
                    onClick={() => scannedCode.trim() && handleQRScan(scannedCode)}
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
                    <div className="text-sm text-gray-600">{endmillData.standardLife.toLocaleString()}회</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">사양</label>
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
                    onChange={(e) => setSelectedSupplier(e.target.value)}
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
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000000"
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