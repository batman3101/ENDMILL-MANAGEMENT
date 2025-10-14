'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

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
  const { t } = useTranslation()
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        throw new Error(result.error || t('endmill.dataLoadFailed'))
      }
    } catch (error) {
      clientLogger.error('공급업체 목록 로드 오류:', error)
      showError(t('common.error'), t('endmill.suppliersLoadError'))
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (!selectedSupplierId) {
      showError(t('endmill.inputError'), t('endmill.selectSupplierError'))
      return
    }

    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      showError(t('endmill.inputError'), t('endmill.validPriceError'))
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
        showError(t('endmill.duplicateError'), t('endmill.duplicateSupplierError'))
        return
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('endmill.priceAddFailed'))
      }

      onSuccess()
    } catch (error) {
      clientLogger.error('가격 정보 등록 오류:', error)
      showError(t('endmill.priceAddFailed'), t('endmill.priceAddError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">{t('endmill.addSupplierPriceTitle')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('endmill.endmillCodeLabel')}: <span className="font-medium">{endmillCode}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 공급업체 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endmill.supplierRequired')} <span className="text-red-500">{t('endmill.required')}</span>
            </label>
            {loadingSuppliers ? (
              <div className="text-sm text-gray-500">{t('endmill.loadingSuppliers')}</div>
            ) : suppliers.length > 0 ? (
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('endmill.selectSupplierOption')}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code || supplier.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-500">{t('endmill.noSuppliersAvailable')}</div>
            )}
          </div>

          {/* 단가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endmill.unitPriceRequired')} <span className="text-red-500">{t('endmill.required')}</span>
            </label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('endmill.unitPricePlaceholder')}
              required
              min="1"
            />
          </div>

          {/* 최소 주문 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endmill.minOrderQuantity')}
            </label>
            <input
              type="number"
              value={minOrderQuantity}
              onChange={(e) => setMinOrderQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('endmill.minOrderPlaceholder')}
              min="1"
            />
          </div>

          {/* 납기일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endmill.leadTimeDays')}
            </label>
            <input
              type="number"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('endmill.leadTimePlaceholder')}
              min="1"
            />
          </div>

          {/* 현재 재고 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endmill.currentStockLabel')}
            </label>
            <input
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('endmill.currentStockPlaceholder')}
              min="0"
            />
          </div>

          {/* 품질등급 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endmill.qualityRatingLabel')}
            </label>
            <input
              type="number"
              value={qualityRating}
              onChange={(e) => setQualityRating(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('endmill.qualityRatingPlaceholder')}
              min="1"
              max="10"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('endmill.qualityRatingHelp')}
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
              {t('endmill.setAsPreferred')}
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
              {t('endmill.cancelButton')}
            </button>
            <button
              type="submit"
              disabled={loading || !selectedSupplierId || !unitPrice}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('endmill.submitting') : t('endmill.submitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}