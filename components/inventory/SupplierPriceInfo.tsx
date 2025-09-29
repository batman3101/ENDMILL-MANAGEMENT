'use client'

import { useState, useEffect } from 'react'

interface SupplierPriceInfoProps {
  endmillTypeId?: string
}

interface SupplierPrice {
  id: string
  supplier: {
    id: string
    name: string
    quality_rating: number
  }
  unit_price: number
  min_order_quantity: number
  lead_time_days: number
  is_preferred: boolean
  current_stock: number
}

export default function SupplierPriceInfo({ endmillTypeId }: SupplierPriceInfoProps) {
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (endmillTypeId) {
      loadSupplierPrices()
    }
  }, [endmillTypeId])

  const loadSupplierPrices = async () => {
    if (!endmillTypeId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/endmill/${endmillTypeId}/suppliers`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSupplierPrices(result.data || [])
        }
      }
    } catch (error) {
      console.error('공급업체 가격 정보 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    )
  }

  if (supplierPrices.length === 0) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">등록된 공급업체 정보가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {supplierPrices.map((item) => (
        <div
          key={item.id}
          className={`flex justify-between items-center p-3 rounded-lg border ${
            item.is_preferred ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div>
            <div className="flex items-center">
              <span className="font-medium text-gray-900">{item.supplier.name}</span>
              {item.is_preferred && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  선호
                </span>
              )}
              <span className="ml-2 text-xs text-gray-500">
                ⭐ {item.supplier.quality_rating}/10
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              재고: {item.current_stock}개 | 최소주문: {item.min_order_quantity}개 |
              리드타임: {item.lead_time_days}일
            </div>
          </div>
          <span className="font-mono text-gray-900 font-bold">
            {item.unit_price.toLocaleString()} VND
          </span>
        </div>
      ))}
    </div>
  )
}