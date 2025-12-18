'use client'

import { useState } from 'react'
import { useToast } from '../shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

interface SupplierPrice {
  id: string
  supplier: {
    id: string
    code: string
    name: string
    contact_info: any
    quality_rating: number
  }
  unit_price: number
  min_order_quantity: number
  lead_time_days: number
  is_preferred: boolean
  current_stock: number
  quality_rating: number  // price별 품질등급
  updated_at: string
}

interface EditSupplierPriceModalProps {
  endmillId: string
  endmillCode: string
  supplierPrice: SupplierPrice
  onClose: () => void
  onSuccess: () => void
}

export default function EditSupplierPriceModal({
  endmillId,
  endmillCode,
  supplierPrice,
  onClose,
  onSuccess
}: EditSupplierPriceModalProps) {
  const [unitPrice, setUnitPrice] = useState(supplierPrice.unit_price.toString())
  const [minOrderQuantity, setMinOrderQuantity] = useState(supplierPrice.min_order_quantity.toString())
  const [leadTimeDays, setLeadTimeDays] = useState(supplierPrice.lead_time_days.toString())
  const [isPreferred, setIsPreferred] = useState(supplierPrice.is_preferred)
  const [currentStock, setCurrentStock] = useState(supplierPrice.current_stock.toString())
  const [qualityRating, setQualityRating] = useState((supplierPrice.quality_rating || supplierPrice.supplier.quality_rating).toString())
  const [loading, setLoading] = useState(false)
  const { showError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      showError('입력 오류', '올바른 단가를 입력해주세요.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/endmill/${endmillId}/suppliers/${supplierPrice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_price: parseFloat(unitPrice),
          min_order_quantity: parseInt(minOrderQuantity) || 1,
          lead_time_days: parseInt(leadTimeDays) || 7,
          is_preferred: isPreferred,
          current_stock: parseInt(currentStock) || 0,
          quality_rating: parseInt(qualityRating) || 8
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '가격 정보 수정 실패')
      }

      onSuccess()
    } catch (error) {
      clientLogger.error('가격 정보 수정 오류:', error)
      showError('수정 실패', '가격 정보 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-modal-container" onClick={onClose}>
      <div className="mobile-modal-content md:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-modal-header flex-col items-start">
          <h3 className="text-lg font-medium">공급업체 가격 수정</h3>
          <p className="text-sm text-gray-600 mt-1">
            엔드밀 코드: <span className="font-medium">{endmillCode}</span> |
            공급업체: <span className="font-medium">{supplierPrice.supplier.code || supplierPrice.supplier.name}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="mobile-modal-body space-y-4">
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

          </div>
          {/* 버튼들 */}
          <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !unitPrice}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '수정 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}