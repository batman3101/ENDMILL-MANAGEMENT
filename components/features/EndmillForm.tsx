'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

interface EndmillFormData {
  code: string
  category: string
  name: string
  unitCost: number
  standardLife: number
}


interface SupplierPrice {
  supplier_id: string
  supplier_name: string
  unit_price: number
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
    unitCost: 0,
    standardLife: 0
  })


  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([])
  const [showSupplierSection, setShowSupplierSection] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const { showSuccess, showError } = useToast()

  // 수정 모드일 때 초기 데이터 설정
  useEffect(() => {
    if (editData) {
      setFormData({
        code: editData.code || '',
        category: editData.category || '',
        name: editData.name || '',
        unitCost: editData.unit_cost || 0,
        standardLife: editData.standard_life || 0
      })
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
      unit_price: 0
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



    if (formData.unitCost <= 0) {
      newErrors.unitCost = t('endmill.unitCostError')
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
      const submitData = {
        code: formData.code.trim().toUpperCase(),
        category: formData.category,
        name: formData.name.trim(),
        unit_cost: formData.unitCost,
        standard_life: formData.standardLife
      }

      // 공급업체별 가격 정보 (선택사항)
      const allSupplierPrices = supplierPrices.filter(sp => sp.supplier_id && sp.unit_price > 0)

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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {editData ? t('endmill.editEndmillTitle') : t('endmill.newEndmillTitle')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 엔드밀 코드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('endmill.endmillCodeRequired')} <span className="text-red-500">{t('endmill.required')}</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              placeholder={t('endmill.endmillCodePlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('endmill.categoryRequired')} <span className="text-red-500">{t('endmill.required')}</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
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
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* 엔드밀 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('endmill.endmillNameRequired')} <span className="text-red-500">{t('endmill.required')}</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('endmill.endmillNamePlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>


          {/* 공급업체 및 단가 */}
          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmill.unitCostRequired')} <span className="text-red-500">{t('endmill.required')}</span>
                </label>
                <input
                  type="number"
                  value={formData.unitCost || ''}
                  onChange={(e) => handleInputChange('unitCost', Number(e.target.value))}
                  min="0"
                  step="1000"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.unitCost ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.unitCost && <p className="mt-1 text-sm text-red-600">{errors.unitCost}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmill.standardLifeRequired')} <span className="text-red-500">{t('endmill.required')}</span>
                </label>
                <input
                  type="number"
                  value={formData.standardLife || ''}
                  onChange={(e) => handleInputChange('standardLife', Number(e.target.value))}
                  min="0"
                  step="100"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.standardLife ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                {errors.standardLife && <p className="mt-1 text-sm text-red-600">{errors.standardLife}</p>}
              </div>
            </div>
          </div>


          {/* 공급업체별 가격 정보 섹션 */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">{t('endmill.supplierPriceInfo')}</h4>
              <button
                type="button"
                onClick={() => setShowSupplierSection(!showSupplierSection)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showSupplierSection ? t('endmill.hideButton') : t('endmill.addButton')}
              </button>
            </div>

            {showSupplierSection && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  {t('endmill.supplierPriceDescription')}
                </div>

                {supplierPrices.map((price, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="text-sm font-medium text-gray-700">{t('endmill.supplierNumber')} {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeSupplierPrice(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        {t('endmill.deleteButton')}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('endmill.selectSupplier')}
                        </label>
                        <select
                          value={price.supplier_id}
                          onChange={(e) => updateSupplierPrice(index, 'supplier_id', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        >
                          <option value="">{t('endmill.selectSupplierPlaceholder')}</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.code || supplier.name} ({supplier.unit_price?.toLocaleString() || 0} VND)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('endmill.supplierUnitPrice')}
                        </label>
                        <input
                          type="number"
                          value={price.unit_price || ''}
                          onChange={(e) => updateSupplierPrice(index, 'unit_price', Number(e.target.value))}
                          min="0"
                          step="1000"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading || !price.supplier_id}
                          placeholder={!price.supplier_id ? t('endmill.selectSupplierFirst') : ''}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSupplierPrice}
                  className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                  disabled={loading}
                >
                  {t('endmill.addSupplierButton')}
                </button>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-300 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              disabled={loading}
            >
              {t('endmill.cancelButton')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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