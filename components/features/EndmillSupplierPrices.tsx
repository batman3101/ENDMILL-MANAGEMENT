'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../shared/Toast'
import AddSupplierPriceModal from './AddSupplierPriceModal'
import EditSupplierPriceModal from './EditSupplierPriceModal'
import { supabase } from '../../lib/supabase/client'

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
  updated_at: string
}

interface EndmillSupplierPricesProps {
  endmillId: string
  endmillCode: string
}

export default function EndmillSupplierPrices({ endmillId, endmillCode }: EndmillSupplierPricesProps) {
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPrice, setEditingPrice] = useState<SupplierPrice | null>(null)
  const { showSuccess, showError } = useToast()

  // 공급업체별 가격 정보 로드
  const loadSupplierPrices = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/endmill/${endmillId}/suppliers`)
      const result = await response.json()

      if (result.success) {
        setSupplierPrices(result.data)
      } else {
        throw new Error(result.error || '데이터 로드 실패')
      }
    } catch (error) {
      console.error('공급업체별 가격 로드 오류:', error)
      showError('데이터 로드 실패', '공급업체별 가격 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (endmillId) {
      loadSupplierPrices()

      // 실시간 구독 설정
      const channel = supabase
        .channel('endmill_supplier_prices_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'endmill_supplier_prices',
            filter: `endmill_type_id=eq.${endmillId}`
          },
          (payload) => {
            console.log('실시간 데이터 변경 감지:', payload)
            // 데이터가 변경되면 다시 로드
            loadSupplierPrices()
          }
        )
        .subscribe()

      // 컴포넌트 언마운트 시 구독 해제
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [endmillId])

  // 가격 범위 계산
  const getPriceRange = () => {
    if (supplierPrices.length === 0) return { min: 0, max: 0, avg: 0 }

    const prices = supplierPrices.map(sp => sp.unit_price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length

    return { min, max, avg }
  }

  const { min, max, avg } = getPriceRange()

  // 품질 등급 색상
  const getQualityColor = (rating: number) => {
    if (rating >= 9) return 'text-green-600 bg-green-100'
    if (rating >= 8) return 'text-blue-600 bg-blue-100'
    if (rating >= 7) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // 가격 정보 삭제
  const handleDeletePrice = async (priceId: string) => {
    if (!confirm('정말로 이 가격 정보를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/endmill/${endmillId}/suppliers/${priceId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('삭제 완료', '공급업체 가격 정보가 삭제되었습니다.')
        loadSupplierPrices()
      } else {
        throw new Error(result.error || '삭제 실패')
      }
    } catch (error) {
      console.error('가격 정보 삭제 오류:', error)
      showError('삭제 실패', '가격 정보 삭제 중 오류가 발생했습니다.')
    }
  }


  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">공급업체별 가격 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 및 요약 정보 */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">공급업체별 가격 정보</h4>
          {supplierPrices.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="mr-4">최저가: <span className="font-medium text-green-600">{min.toLocaleString()}원</span></span>
              <span className="mr-4">최고가: <span className="font-medium text-red-600">{max.toLocaleString()}원</span></span>
              <span>평균가: <span className="font-medium text-blue-600">{Math.round(avg).toLocaleString()}원</span></span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + 가격 추가
        </button>
      </div>

      {/* 공급업체별 가격 테이블 */}
      {supplierPrices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  공급업체
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  단가
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  품질등급
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {supplierPrices.map((price) => (
                <tr key={price.id} className={`hover:bg-gray-50 ${price.is_preferred ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center">
                        {price.supplier.name}
                        {price.is_preferred && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            선호업체
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500">{price.supplier.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {price.unit_price.toLocaleString()}원
                    </div>
                    {price.unit_price === min && (
                      <span className="text-xs text-green-600 font-medium">최저가</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQualityColor(price.supplier.quality_rating)}`}>
                      {price.supplier.quality_rating}/10
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingPrice(price)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeletePrice(price.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">등록된 공급업체별 가격 정보가 없습니다.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            첫 번째 가격 정보를 추가해보세요
          </button>
        </div>
      )}

      {/* 추가 정보 */}
      {supplierPrices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400">💡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                구매 권장사항
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  {supplierPrices.filter(p => p.is_preferred).length > 0 && (
                    <li>선호업체: {supplierPrices.filter(p => p.is_preferred).map(p => p.supplier.name).join(', ')}</li>
                  )}
                  <li>최적 가격: {supplierPrices.find(p => p.unit_price === min)?.supplier.name} ({min.toLocaleString()}원)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가격 추가 폼 모달 */}
      {showAddForm && (
        <AddSupplierPriceModal
          endmillId={endmillId}
          endmillCode={endmillCode}
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false)
            loadSupplierPrices()
            showSuccess('등록 완료', '공급업체 가격 정보가 등록되었습니다.')
          }}
        />
      )}

      {/* 가격 수정 폼 모달 */}
      {editingPrice && (
        <EditSupplierPriceModal
          endmillId={endmillId}
          endmillCode={endmillCode}
          supplierPrice={editingPrice}
          onClose={() => setEditingPrice(null)}
          onSuccess={() => {
            setEditingPrice(null)
            loadSupplierPrices()
            showSuccess('수정 완료', '공급업체 가격 정보가 수정되었습니다.')
          }}
        />
      )}
    </div>
  )
}