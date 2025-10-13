'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../shared/Toast'
import AddSupplierPriceModal from './AddSupplierPriceModal'
import EditSupplierPriceModal from './EditSupplierPriceModal'
import { supabase } from '../../lib/supabase/client'
import { clientLogger } from '../../lib/utils/logger'

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
  const { t } = useTranslation()
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
        throw new Error(result.error || t('endmill.dataLoadFailed'))
      }
    } catch (error) {
      clientLogger.error('공급업체별 가격 로드 오류:', error)
      showError(t('endmill.dataLoadFailed'), t('endmill.supplierPricesLoadError'))
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
            clientLogger.log('실시간 데이터 변경 감지:', payload)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!confirm(t('endmill.deleteConfirm'))) {
      return
    }

    try {
      const response = await fetch(`/api/endmill/${endmillId}/suppliers/${priceId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('endmill.deleteSuccess'), t('endmill.deleteSuccessMessage'))
        loadSupplierPrices()
      } else {
        throw new Error(result.error || t('endmill.deleteFailed'))
      }
    } catch (error) {
      clientLogger.error('가격 정보 삭제 오류:', error)
      showError(t('endmill.deleteFailed'), t('endmill.deleteFailedMessage'))
    }
  }


  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">{t('endmill.loadingSupplierPrices')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 및 요약 정보 */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{t('endmill.supplierPricesTitle')}</h4>
          {supplierPrices.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="mr-4">{t('endmill.lowestPrice')}: <span className="font-medium text-green-600">{min.toLocaleString()} VND</span></span>
              <span className="mr-4">{t('endmill.highestPrice')}: <span className="font-medium text-red-600">{max.toLocaleString()} VND</span></span>
              <span>{t('endmill.averagePrice')}: <span className="font-medium text-blue-600">{Math.round(avg).toLocaleString()} VND</span></span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {t('endmill.addPriceButton')}
        </button>
      </div>

      {/* 공급업체별 가격 테이블 */}
      {supplierPrices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  {t('endmill.supplierColumn')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  {t('endmill.unitPriceColumn')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  {t('endmill.qualityRatingColumn')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  {t('endmill.actionsColumn')}
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
                            {t('endmill.preferredSupplier')}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500">{price.supplier.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {price.unit_price.toLocaleString()} VND
                    </div>
                    {price.unit_price === min && (
                      <span className="text-xs text-green-600 font-medium">{t('endmill.lowestPriceLabel')}</span>
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
                        {t('endmill.editAction')}
                      </button>
                      <button
                        onClick={() => handleDeletePrice(price.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        {t('endmill.deleteAction')}
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
          <p className="text-gray-500">{t('endmill.noSupplierPrices')}</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            {t('endmill.addFirstPrice')}
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
                {t('endmill.purchaseRecommendation')}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  {supplierPrices.filter(p => p.is_preferred).length > 0 && (
                    <li>{t('endmill.preferredSuppliers')}: {supplierPrices.filter(p => p.is_preferred).map(p => p.supplier.name).join(', ')}</li>
                  )}
                  <li>{t('endmill.bestPrice')}: {supplierPrices.find(p => p.unit_price === min)?.supplier.name} ({min.toLocaleString()} VND)</li>
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
            showSuccess(t('endmill.priceAddSuccess'), t('endmill.priceAddSuccessMessage'))
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
            showSuccess(t('endmill.priceUpdateSuccess'), t('endmill.priceUpdateSuccessMessage'))
          }}
        />
      )}
    </div>
  )
}