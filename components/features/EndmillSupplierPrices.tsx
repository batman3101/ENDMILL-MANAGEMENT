'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Lightbulb } from 'lucide-react'
import { NoBreak } from '@/components/ui/no-break'
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
  quality_rating: number  // price별 품질등급
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
    if (rating >= 9) return 'text-signal-go-strong bg-signal-go-soft'
    if (rating >= 8) return 'text-gauge-cobalt-strong bg-gauge-cobalt-soft'
    if (rating >= 7) return 'text-signal-watch-strong bg-signal-watch-soft'
    return 'text-signal-stop-strong bg-signal-stop-soft'
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gauge-cobalt mx-auto"></div>
        <p className="mt-2 text-ink-soft">{t('endmill.loadingSupplierPrices')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 및 요약 정보 */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-title font-semibold text-ink">{t('endmill.supplierPricesTitle')}</h4>
          {supplierPrices.length > 0 && (
            <div className="mt-2 text-label text-ink-soft">
              <span className="mr-4">{t('endmill.lowestPrice')}: <span className="font-medium text-signal-go-strong">{min.toLocaleString()} VND</span></span>
              <span className="mr-4">{t('endmill.highestPrice')}: <span className="font-medium text-signal-stop-strong">{max.toLocaleString()} VND</span></span>
              <span>{t('endmill.averagePrice')}: <span className="font-medium text-gauge-cobalt-strong">{Math.round(avg).toLocaleString()} VND</span></span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-gauge-cobalt px-4 py-2 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <NoBreak>{t('endmill.addPriceButton')}</NoBreak>
        </button>
      </div>

      {/* 공급업체별 가격 테이블 */}
      {supplierPrices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider text-label">
            <thead className="bg-paper-warm">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink-soft uppercase tracking-wider">
                  {t('endmill.supplierColumn')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-ink-soft uppercase tracking-wider">
                  {t('endmill.unitPriceColumn')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-ink-soft uppercase tracking-wider">
                  {t('endmill.qualityRatingColumn')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-ink-soft uppercase tracking-wider">
                  {t('endmill.actionsColumn')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-paper divide-y divide-divider">
              {supplierPrices.map((price) => (
                <tr key={price.id} className={`hover:bg-paper-warm ${price.is_preferred ? 'bg-gauge-cobalt-soft' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-ink flex items-center">
                        {price.supplier.code || price.supplier.name}
                        {price.is_preferred && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-sm text-caption font-medium bg-gauge-cobalt-soft text-gauge-cobalt-strong">
                            {t('endmill.preferredSupplier')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">
                      {price.unit_price.toLocaleString()} VND
                    </div>
                    {price.unit_price === min && (
                      <span className="text-caption text-signal-go-strong font-medium">{t('endmill.lowestPriceLabel')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium ${getQualityColor(price.quality_rating || price.supplier.quality_rating)}`}>
                      {price.quality_rating || price.supplier.quality_rating}/10
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingPrice(price)}
                        className="text-gauge-cobalt-strong hover:opacity-80 text-label"
                      >
                        {t('endmill.editAction')}
                      </button>
                      <button
                        onClick={() => handleDeletePrice(price.id)}
                        className="text-signal-stop-strong hover:opacity-80 text-label"
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
        <div className="text-center py-8 bg-paper-warm rounded-md">
          <p className="text-ink-mute">{t('endmill.noSupplierPrices')}</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 text-gauge-cobalt-strong hover:opacity-80"
          >
            {t('endmill.addFirstPrice')}
          </button>
        </div>
      )}

      {/* 추가 정보 */}
      {supplierPrices.length > 0 && (
        <div className="bg-gauge-cobalt-soft border border-divider rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-gauge-cobalt-strong" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-label font-medium text-gauge-cobalt-strong">
                {t('endmill.purchaseRecommendation')}
              </h3>
              <div className="mt-2 text-label text-gauge-cobalt-strong">
                <ul className="list-disc list-inside space-y-1">
                  {supplierPrices.filter(p => p.is_preferred).length > 0 && (
                    <li>{t('endmill.preferredSuppliers')}: {supplierPrices.filter(p => p.is_preferred).map(p => p.supplier.code || p.supplier.name).join(', ')}</li>
                  )}
                  <li>{t('endmill.bestPrice')}: {supplierPrices.find(p => p.unit_price === min)?.supplier.code || supplierPrices.find(p => p.unit_price === min)?.supplier.name} ({min.toLocaleString()} VND)</li>
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