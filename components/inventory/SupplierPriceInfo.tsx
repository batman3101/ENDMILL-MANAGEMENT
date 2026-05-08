'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { clientLogger } from '@/lib/utils/logger'

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
  quality_rating: number  // price별 품질등급
}

export default function SupplierPriceInfo({ endmillTypeId }: SupplierPriceInfoProps) {
  const { t } = useTranslation()
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (endmillTypeId) {
      loadSupplierPrices()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      clientLogger.error('공급업체 가격 정보 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gauge-cobalt"></div>
        <span className="ml-2 text-ink-soft">{t('common.loading')}</span>
      </div>
    )
  }

  if (supplierPrices.length === 0) {
    return (
      <div className="text-center p-4 bg-paper-warm rounded-md">
        <p className="text-ink-mute">{t('endmill.noSupplierInfo')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {supplierPrices.map((item) => (
        <div
          key={item.id}
          className={`flex justify-between items-center p-3 rounded-md border ${
            item.is_preferred ? 'bg-gauge-cobalt-soft border-divider' : 'bg-paper-warm border-divider'
          }`}
        >
          <div>
            <div className="flex items-center">
              <span className="font-medium text-ink">{item.supplier.name}</span>
              {item.is_preferred && (
                <span className="ml-2 px-2 py-1 text-caption bg-gauge-cobalt-soft text-gauge-cobalt-strong rounded-full">
                  {t('endmill.preferred')}
                </span>
              )}
              <span className="ml-2 text-caption text-ink-mute inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-signal-watch-strong fill-signal-watch-strong" aria-hidden="true" />
                {item.quality_rating || item.supplier.quality_rating}/10
              </span>
            </div>
            <div className="text-label text-ink-soft mt-1">
              {t('endmill.stockLabel')}: {item.current_stock}{t('endmill.pieces')} | {t('endmill.minOrder')}: {item.min_order_quantity}{t('endmill.pieces')} |
              {t('endmill.leadTimeDays')}: {item.lead_time_days}{t('endmill.days')}
            </div>
          </div>
          <span className="font-mono text-ink font-bold">
            {item.unit_price.toLocaleString()} VND
          </span>
        </div>
      ))}
    </div>
  )
}
