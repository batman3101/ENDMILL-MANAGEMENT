'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useToast } from '../shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

interface EndmillFormData {
  code: string
  category: string
  name: string
  standardLife: number
}


interface SupplierPrice {
  supplier_id: string
  supplier_name: string
  unit_price: number
  min_order_quantity?: number
  lead_time_days?: number
  quality_rating?: number
  current_stock?: number
  is_preferred?: boolean
}

interface EndmillFormProps {
  onSuccess?: (data: any) => void
  onClose: () => void
  editData?: any // 수정 모드용 (향후 확장)
}

// 모든 옵션들은 Supabase에서 동적으로 로드됩니다

export default function EndmillForm({ onSuccess, onClose, editData }: EndmillFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<EndmillFormData>({
    code: '',
    category: '',
    name: '',
    standardLife: 0
  })


  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([])
  const [_showSupplierSection, setShowSupplierSection] = useState(!editData) // 신규 등록 시 기본 표시
  const [categories, setCategories] = useState<any[]>([])
  const { showSuccess, showError } = useToast()

  // 수정 모드일 때 초기 데이터 설정
  useEffect(() => {
    if (editData) {
      setFormData({
        code: editData.code || '',
        category: editData.category || '',
        name: editData.name || '',
        standardLife: editData.standard_life || 0
      })
      setShowSupplierSection(false)
    } else {
      // 신규 등록 시 기본적으로 1개의 공급업체 가격 입력 폼 추가
      setSupplierPrices([{
        supplier_id: '',
        supplier_name: '',
        unit_price: 0,
        min_order_quantity: 1,
        lead_time_days: 7,
        quality_rating: 8,
        current_stock: 0,
        is_preferred: false
      }])
    }
  }, [editData])

  // 카테고리 및 공급업체 목록 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 카테고리 로드
        const categoryResponse = await fetch('/api/endmill/categories')
        const categoryResult = await categoryResponse.json()
        if (categoryResult.success) {
          setCategories(categoryResult.data)
        }

        // 공급업체 로드
        const supplierResponse = await fetch('/api/suppliers')
        const supplierResult = await supplierResponse.json()
        if (supplierResult.success) {
          setSuppliers(supplierResult.data)
        }
      } catch (error) {
        clientLogger.error('초기 데이터 로드 오류:', error)
      }
    }
    loadInitialData()
  }, [])

  // 폼 필드 변경 핸들러
  const handleInputChange = (field: keyof EndmillFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 에러 메시지 클리어
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // 카테고리 변경 시 이름 자동 생성
  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({ ...prev, category }))
  }


  // 공급업체 가격 추가
  const addSupplierPrice = () => {
    const newPrice: SupplierPrice = {
      supplier_id: '',
      supplier_name: '',
      unit_price: 0,
      min_order_quantity: 1,
      lead_time_days: 7,
      quality_rating: 8,
      current_stock: 0,
      is_preferred: false
    }
    setSupplierPrices(prev => [...prev, newPrice])
  }

  // 공급업체 가격 제거
  const removeSupplierPrice = (index: number) => {
    setSupplierPrices(prev => prev.filter((_, i) => i !== index))
  }

  // CAM Sheet 기능은 제거되었습니다. CAM Sheet는 별도로 먼저 등록해야 합니다.

  // 공급업체 가격 업데이트
  const updateSupplierPrice = (index: number, field: keyof SupplierPrice, value: any) => {
    setSupplierPrices(prev => prev.map((price, i) => {
      if (i === index) {
        const updated = { ...price, [field]: value }
        // 공급업체 선택 시 이름도 업데이트
        if (field === 'supplier_id') {
          const supplier = suppliers.find(s => s.id === value)
          updated.supplier_name = supplier?.name || ''
        }
        return updated
      }
      return price
    }))
  }

  // 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = t('endmill.endmillCodeError')
    } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      newErrors.code = t('endmill.endmillCodeFormatError')
    }

    if (!formData.category) {
      newErrors.category = t('endmill.categoryError')
    }

    if (!formData.name.trim()) {
      newErrors.name = t('endmill.endmillNameError')
    }

    if (formData.standardLife <= 0) {
      newErrors.standardLife = t('endmill.standardLifeError')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showError(t('endmill.inputError'), t('endmill.inputErrorMessage'))
      return
    }

    setLoading(true)

    try {
      // 공급업체별 가격 정보 (선택사항)
      const allSupplierPrices = supplierPrices.filter(sp => sp.supplier_id && sp.unit_price > 0)

      // 공급업체 가격 중 최소값을 기준 단가로 사용 (없으면 0)
      const unitCost = allSupplierPrices.length > 0
        ? Math.min(...allSupplierPrices.map(sp => sp.unit_price))
        : 0

      const submitData = {
        code: formData.code.trim().toUpperCase(),
        category: formData.category,
        name: formData.name.trim(),
        unit_cost: unitCost,
        standard_life: formData.standardLife
      }

      const response = await fetch('/api/endmill/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submitData,
          supplier_prices: allSupplierPrices
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        showSuccess(t('endmill.registerSuccess'), t('endmill.registerSuccessMessage'))
        onSuccess?.(result.data)
        onClose()
      } else {
        throw new Error(result.error || t('endmill.registerFailed'))
      }
    } catch (error) {
      clientLogger.error('엔드밀 등록 오류:', error)
      const errorMessage = error instanceof Error ? error.message : t('endmill.registerError')
      showError(t('endmill.registerFailed'), errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-modal-container" onClick={onClose}>
      <div className="mobile-modal-content md:max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-modal-header">
          <h3 className="text-title font-medium text-ink">
            {editData ? t('endmill.editEndmillTitle') : t('endmill.newEndmillTitle')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-ink-mute hover:text-ink-soft hover:bg-paper-warm rounded-full"
            aria-label="닫기"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="mobile-modal-body space-y-6">
          {/* 엔드밀 코드 */}
          <div>
            <label className="block text-label font-medium text-ink mb-2">
              {t('endmill.endmillCodeRequired')} <span className="text-signal-stop-strong">{t('endmill.required')}</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              placeholder={t('endmill.endmillCodePlaceholder')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink ${
                errors.code ? 'border-signal-stop-strong' : 'border-divider'
              }`}
              disabled={loading}
            />
            {errors.code && <p className="mt-1 text-caption text-signal-stop-strong">{errors.code}</p>}
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-label font-medium text-ink mb-2">
              {t('endmill.categoryRequired')} <span className="text-signal-stop-strong">{t('endmill.required')}</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink ${
                errors.category ? 'border-signal-stop-strong' : 'border-divider'
              }`}
              disabled={loading}
            >
              <option value="">{t('endmill.categoryPlaceholder')}</option>
              {categories.map(category => (
                <option key={category.code} value={category.code}>
                  {category.name_ko} - {category.description}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-caption text-signal-stop-strong">{errors.category}</p>}
          </div>

          {/* 엔드밀 이름 */}
          <div>
            <label className="block text-label font-medium text-ink mb-2">
              {t('endmill.endmillNameRequired')} <span className="text-signal-stop-strong">{t('endmill.required')}</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('endmill.endmillNamePlaceholder')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink ${
                errors.name ? 'border-signal-stop-strong' : 'border-divider'
              }`}
              disabled={loading}
            />
            {errors.name && <p className="mt-1 text-caption text-signal-stop-strong">{errors.name}</p>}
          </div>


          {/* 표준 수명 */}
          <div>
            <label className="block text-label font-medium text-ink mb-2">
              {t('endmill.standardLifeRequired')} <span className="text-signal-stop-strong">{t('endmill.required')}</span>
            </label>
            <input
              type="number"
              value={formData.standardLife || ''}
              onChange={(e) => handleInputChange('standardLife', Number(e.target.value))}
              min="0"
              step="100"
              placeholder="예: 3000"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink ${
                errors.standardLife ? 'border-signal-stop-strong' : 'border-divider'
              }`}
              disabled={loading}
            />
            {errors.standardLife && <p className="mt-1 text-caption text-signal-stop-strong">{errors.standardLife}</p>}
            <p className="text-caption text-ink-mute mt-1">
              표준 사용 수명 (회). 기준 단가는 공급업체 가격 중 최소값으로 자동 설정됩니다.
            </p>
          </div>


          {/* 공급업체별 가격 정보 섹션 */}
          <div className="border-t border-divider pt-6">
            <div className="mb-4">
              <h4 className="text-label font-medium text-ink mb-2">{t('endmill.supplierPriceInfo')}</h4>
              <p className="text-label text-ink-soft">
                {t('endmill.supplierPriceDescription')}
              </p>
            </div>

            <div className="space-y-4">
              {supplierPrices.map((price, index) => (
                <div key={index} className="bg-paper-warm p-4 rounded-md border border-divider">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="text-label font-medium text-ink">{t('endmill.supplierLabel')} {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeSupplierPrice(index)}
                      className="text-signal-stop-strong hover:opacity-80 text-label font-medium disabled:opacity-50"
                      disabled={supplierPrices.length === 1}
                    >
                      {t('common.delete')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-label font-medium text-ink mb-1">
                        {t('endmill.selectSupplier')} <span className="text-signal-stop-strong">*</span>
                      </label>
                      <select
                        value={price.supplier_id}
                        onChange={(e) => updateSupplierPrice(index, 'supplier_id', e.target.value)}
                        className="w-full px-3 py-2 border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink"
                        disabled={loading}
                      >
                        <option value="">{t('endmill.selectSupplierPlaceholder')}</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.code || supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-label font-medium text-ink mb-1">
                          {t('endmill.supplierUnitPrice')} <span className="text-signal-stop-strong">*</span>
                        </label>
                        <input
                          type="number"
                          value={price.unit_price || ''}
                          onChange={(e) => updateSupplierPrice(index, 'unit_price', Number(e.target.value))}
                          min="0"
                          step="1000"
                          placeholder="예: 145000"
                          className="w-full px-3 py-2 border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink"
                          disabled={loading || !price.supplier_id}
                        />
                      </div>

                      <div>
                        <label className="block text-label font-medium text-ink mb-1">
                          {t('endmill.qualityRating')}
                        </label>
                        <input
                          type="number"
                          value={price.quality_rating || 8}
                          onChange={(e) => updateSupplierPrice(index, 'quality_rating', Number(e.target.value))}
                          min="1"
                          max="10"
                          placeholder="8"
                          className="w-full px-3 py-2 border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-label font-medium text-ink mb-1">
                          {t('endmill.minOrder')}
                        </label>
                        <input
                          type="number"
                          value={price.min_order_quantity || 1}
                          onChange={(e) => updateSupplierPrice(index, 'min_order_quantity', Number(e.target.value))}
                          min="1"
                          placeholder="1"
                          className="w-full px-3 py-2 border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-label font-medium text-ink mb-1">
                          {t('endmill.leadTimeDays')}
                        </label>
                        <input
                          type="number"
                          value={price.lead_time_days || 7}
                          onChange={(e) => updateSupplierPrice(index, 'lead_time_days', Number(e.target.value))}
                          min="1"
                          placeholder="7"
                          className="w-full px-3 py-2 border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-label font-medium text-ink mb-1">
                          {t('endmill.currentStockLabel')}
                        </label>
                        <input
                          type="number"
                          value={price.current_stock || 0}
                          onChange={(e) => updateSupplierPrice(index, 'current_stock', Number(e.target.value))}
                          min="0"
                          placeholder="0"
                          className="w-full px-3 py-2 border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-gauge-cobalt bg-paper text-ink"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`is_preferred_${index}`}
                        checked={price.is_preferred || false}
                        onChange={(e) => updateSupplierPrice(index, 'is_preferred', e.target.checked)}
                        className="mr-2 rounded border-divider text-gauge-cobalt focus:ring-gauge-cobalt"
                        disabled={loading}
                      />
                      <label htmlFor={`is_preferred_${index}`} className="text-label text-ink">
                        {t('endmill.setAsPreferred')}
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addSupplierPrice}
                className="w-full px-4 py-2 text-label font-medium text-gauge-cobalt-strong bg-gauge-cobalt-soft border border-divider rounded-md hover:opacity-90 disabled:opacity-50 min-h-touch"
                disabled={loading}
              >
                {t('endmill.addSupplierButton')}
              </button>

              {supplierPrices.length === 0 && (
                <div className="text-center py-4 bg-signal-watch-soft border border-divider rounded-md">
                  <p className="text-label text-signal-watch-strong">
                    {t('endmill.noSupplierWarning')}
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* 버튼 */}
          <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-ink bg-paper-warm border border-divider rounded-md hover:bg-paper disabled:opacity-50 min-h-touch"
              disabled={loading}
            >
              {t('endmill.cancelButton')}
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 text-paper bg-gauge-cobalt rounded-md hover:bg-gauge-cobalt-strong disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
              disabled={loading}
            >
              {loading ? t('endmill.submitting') : (editData ? t('endmill.editButton') : t('endmill.submitButton'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}