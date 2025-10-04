'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../shared/Toast'

interface Supplier {
  id: string
  code: string
  name: string
}

interface AddSupplierPriceModalProps {
  endmillId: string
  endmillCode: string
  onClose: () => void
  onSuccess: () => void
}

export default function AddSupplierPriceModal({
  endmillId,
  endmillCode,
  onClose,
  onSuccess
}: AddSupplierPriceModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [minOrderQuantity, setMinOrderQuantity] = useState('1')
  const [leadTimeDays, setLeadTimeDays] = useState('7')
  const [isPreferred, setIsPreferred] = useState(false)
  const [currentStock, setCurrentStock] = useState('0')
  const [qualityRating, setQualityRating] = useState('8')
  const [loading, setLoading] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const { showError } = useToast()

  // 공급업체 목록 로드
  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true)
      const response = await fetch('/api/suppliers')
      const result = await response.json()

      if (result.success) {
        setSuppliers(result.data)
        if (result.data.length > 0) {
          setSelectedSupplierId(result.data[0].id)
        }
      } else {
        throw new Error(result.error || '공급업체 목록 로드 실패')
      }
    } catch (error) {
      console.error('공급업체 목록 로드 오류:', error)
      showError('오류', '공급업체 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (!selectedSupplierId) {
      showError('입력 오류', '공급업체를 선택해주세요.')
      return
    }

    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      showError('입력 오류', '올바른 단가를 입력해주세요.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/endmill/${endmillId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          unit_price: parseFloat(unitPrice),
          min_order_quantity: parseInt(minOrderQuantity) || 1,
          lead_time_days: parseInt(leadTimeDays) || 7,
          is_preferred: isPreferred,
          current_stock: parseInt(currentStock) || 0,
          quality_rating: parseInt(qualityRating) || 8
        })
      })

      const result = await response.json()

      if (response.status === 409) {
        showError('중복 오류', '이미 해당 공급업체의 가격 정보가 존재합니다.')
        return
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || '가격 정보 등록 실패')
      }

      onSuccess()
    } catch (error) {
      console.error('가격 정보 등록 오류:', error)
      showError('등록 실패', '가격 정보 등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">공급업체 가격 추가</h3>
          <p className="text-sm text-gray-600 mt-1">
            엔드밀 코드: <span className="font-medium">{endmillCode}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 공급업체 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              공급업체 <span className="text-red-500">*</span>
            </label>
            {loadingSuppliers ? (
              <div className="text-sm text-gray-500">공급업체 목록 로딩 중...</div>
            ) : suppliers.length > 0 ? (
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">선택하세요</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.code})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-500">등록된 공급업체가 없습니다.</div>
            )}
          </div>

          {/* 단가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              단가 (VND) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 145000"
              required
              min="1"
            />
          </div>

          {/* 최소 주문 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최소 주문 수량
            </label>
            <input
              type="number"
              value={minOrderQuantity}
              onChange={(e) => setMinOrderQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="기본값: 1"
              min="1"
            />
          </div>

          {/* 납기일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              납기일 (일)
            </label>
            <input
              type="number"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="기본값: 7"
              min="1"
            />
          </div>

          {/* 현재 재고 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              현재 재고
            </label>
            <input
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="기본값: 0"
              min="0"
            />
          </div>

          {/* 품질등급 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              품질등급 (1-10)
            </label>
            <input
              type="number"
              value={qualityRating}
              onChange={(e) => setQualityRating(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1-10 사이의 점수"
              min="1"
              max="10"
            />
            <p className="text-xs text-gray-500 mt-1">
              10점이 최고 품질입니다
            </p>
          </div>

          {/* 선호업체 여부 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPreferred"
              checked={isPreferred}
              onChange={(e) => setIsPreferred(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isPreferred" className="text-sm text-gray-700">
              선호업체로 설정
            </label>
          </div>

          {/* 버튼들 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !selectedSupplierId || !unitPrice}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}