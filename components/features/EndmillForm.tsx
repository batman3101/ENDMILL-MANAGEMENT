'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../shared/Toast'

interface EndmillFormData {
  code: string
  category: string
  name: string
  unitCost: number
  standardLife: number
}

interface CamSheetData {
  model: string
  process: string
  toolLife: number
  tNumber: number
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

// 카테고리 옵션 (동적으로 로드)

// 모델 옵션
const modelOptions = ['PA1', 'PA2', 'PS', 'B7', 'Q7']

// 프로세스 옵션
const processOptions = ['거친가공', '중간가공', '정밀가공', '마감가공', '드릴링', '탭핑']

export default function EndmillForm({ onSuccess, onClose, editData }: EndmillFormProps) {
  const [formData, setFormData] = useState<EndmillFormData>({
    code: '',
    category: '',
    name: '',
    unitCost: 0,
    standardLife: 0
  })

  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [camSheetData, setCamSheetData] = useState<CamSheetData[]>([{
    model: '',
    process: '',
    toolLife: 0,
    tNumber: 1
  }])
  const [showCamSheetSection, setShowCamSheetSection] = useState(false)

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
        console.error('초기 데이터 로드 오류:', error)
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

  // CAM Sheet 데이터 추가
  const addCamSheetData = () => {
    setCamSheetData(prev => [...prev, {
      model: '',
      process: '',
      toolLife: 0,
      tNumber: prev.length + 1
    }])
  }

  // CAM Sheet 데이터 제거
  const removeCamSheetData = (index: number) => {
    setCamSheetData(prev => prev.filter((_, i) => i !== index))
  }

  // CAM Sheet 데이터 업데이트
  const updateCamSheetData = (index: number, field: keyof CamSheetData, value: any) => {
    setCamSheetData(prev => prev.map((data, i) =>
      i === index ? { ...data, [field]: value } : data
    ))
  }

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
      newErrors.code = '엔드밀 코드는 필수입니다.'
    } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      newErrors.code = '엔드밀 코드는 영문 대문자, 숫자, 하이픈만 사용 가능합니다.'
    }

    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요.'
    }

    if (!formData.name.trim()) {
      newErrors.name = '엔드밀 이름은 필수입니다.'
    }

    if (!selectedSupplier) {
      newErrors.supplier = '공급업체를 선택해주세요.'
    }


    if (formData.unitCost <= 0) {
      newErrors.unitCost = '단가는 0보다 큰 숫자여야 합니다.'
    }

    if (formData.standardLife <= 0) {
      newErrors.standardLife = '표준 수명은 0보다 큰 숫자여야 합니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showError('입력 오류', '모든 필수 필드를 올바르게 입력해주세요.')
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

      // 기본 공급업체 가격 정보 추가
      const allSupplierPrices = [
        {
          supplier_id: selectedSupplier,
          unit_price: formData.unitCost
        },
        ...supplierPrices.filter(sp => sp.supplier_id && sp.unit_price > 0)
      ]

      // CAM Sheet 데이터 준비
      const validCamSheetData = camSheetData.filter(cs =>
        cs.model && cs.process && cs.toolLife > 0 && cs.tNumber > 0
      )

      const response = await fetch('/api/endmill/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submitData,
          supplier_prices: allSupplierPrices,
          cam_sheet_data: validCamSheetData
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        showSuccess('등록 완료', '엔드밀이 성공적으로 등록되었습니다.')
        onSuccess?.(result.data)
        onClose()
      } else {
        throw new Error(result.error || '등록 실패')
      }
    } catch (error) {
      console.error('엔드밀 등록 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '엔드밀 등록 중 오류가 발생했습니다.'
      showError('등록 실패', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {editData ? '엔드밀 수정' : '신규 엔드밀 등록'}
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
              엔드밀 코드 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              placeholder="예: EM-F-12"
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
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            >
              <option value="">카테고리를 선택하세요</option>
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
              엔드밀 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="예: FLAT 12mm 2날"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>


          {/* 공급업체 및 단가 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기본 공급업체 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.supplier ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">공급업체를 선택하세요</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.code})
                  </option>
                ))}
              </select>
              {errors.supplier && <p className="mt-1 text-sm text-red-600">{errors.supplier}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  단가 (원) <span className="text-red-500">*</span>
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
                  disabled={loading || !selectedSupplier}
                  placeholder={!selectedSupplier ? '공급업체를 먼저 선택하세요' : ''}
                />
                {errors.unitCost && <p className="mt-1 text-sm text-red-600">{errors.unitCost}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  표준 수명 (회) <span className="text-red-500">*</span>
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

          {/* CAM Sheet 정보 섹션 */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">CAM Sheet 정보</h4>
              <button
                type="button"
                onClick={() => setShowCamSheetSection(!showCamSheetSection)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showCamSheetSection ? '숨기기' : '추가하기'}
              </button>
            </div>

            {showCamSheetSection && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  모델별, 프로세스별 수명 정보를 입력할 수 있습니다. (선택사항)
                </div>

                {camSheetData.map((camData, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="text-sm font-medium text-gray-700">CAM Sheet {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeCamSheetData(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          모델
                        </label>
                        <select
                          value={camData.model}
                          onChange={(e) => updateCamSheetData(index, 'model', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        >
                          <option value="">모델을 선택하세요</option>
                          {modelOptions.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          프로세스
                        </label>
                        <select
                          value={camData.process}
                          onChange={(e) => updateCamSheetData(index, 'process', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        >
                          <option value="">프로세스를 선택하세요</option>
                          {processOptions.map(process => (
                            <option key={process} value={process}>{process}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          수명 (회)
                        </label>
                        <input
                          type="number"
                          value={camData.toolLife || ''}
                          onChange={(e) => updateCamSheetData(index, 'toolLife', Number(e.target.value))}
                          min="0"
                          step="50"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          T 번호
                        </label>
                        <input
                          type="number"
                          value={camData.tNumber || ''}
                          onChange={(e) => updateCamSheetData(index, 'tNumber', Number(e.target.value))}
                          min="1"
                          max="24"
                          step="1"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCamSheetData}
                  className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                  disabled={loading}
                >
                  + CAM Sheet 추가
                </button>
              </div>
            )}
          </div>

          {/* 공급업체별 가격 정보 섹션 */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">공급업체별 가격 정보</h4>
              <button
                type="button"
                onClick={() => setShowSupplierSection(!showSupplierSection)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showSupplierSection ? '숨기기' : '추가하기'}
              </button>
            </div>

            {showSupplierSection && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  공급업체별로 다른 단가와 조건을 입력할 수 있습니다. (선택사항)
                </div>

                {supplierPrices.map((price, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="text-sm font-medium text-gray-700">공급업체 {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeSupplierPrice(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          공급업체 선택
                        </label>
                        <select
                          value={price.supplier_id}
                          onChange={(e) => updateSupplierPrice(index, 'supplier_id', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        >
                          <option value="">공급업체를 선택하세요</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name} ({supplier.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          단가 (원)
                        </label>
                        <input
                          type="number"
                          value={price.unit_price || ''}
                          onChange={(e) => updateSupplierPrice(index, 'unit_price', Number(e.target.value))}
                          min="0"
                          step="1000"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading || !price.supplier_id}
                          placeholder={!price.supplier_id ? '공급업체를 먼저 선택하세요' : ''}
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
                  + 공급업체 추가
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
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '등록 중...' : (editData ? '수정' : '등록')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}