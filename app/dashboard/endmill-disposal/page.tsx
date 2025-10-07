'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/shared/Toast'
import { useTranslations } from '@/lib/hooks/useTranslations'
import ConfirmationModal from '@/components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation } from '@/lib/hooks/useConfirmation'

interface EndmillDisposal {
  id: string
  disposal_date: string
  quantity: number
  weight_kg: number
  inspector: string
  reviewer: string
  image_url: string | null
  notes: string | null
  created_at: string
}

export default function EndmillDisposalPage() {
  const { t } = useTranslations()
  const [disposals, setDisposals] = useState<EndmillDisposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingDisposal, setEditingDisposal] = useState<EndmillDisposal | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()
  const confirmation = useConfirmation()

  // 필터 상태
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // 폼 데이터
  const [formData, setFormData] = useState({
    disposal_date: new Date().toISOString().split('T')[0],
    quantity: '',
    weight_kg: '',
    inspector: '',
    reviewer: '',
    notes: ''
  })

  // 데이터 로드
  const loadDisposals = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/endmill-disposals?start=${dateRange.start}&end=${dateRange.end}`)
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)
      setDisposals(result.data || [])
    } catch (error) {
      console.error('Error loading disposals:', error)
      showError(t('common.error'), t('endmillDisposal.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDisposals()
  }, [dateRange])

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('disposal_date', formData.disposal_date)
      formDataToSend.append('quantity', formData.quantity)
      formDataToSend.append('weight_kg', formData.weight_kg)
      formDataToSend.append('inspector', formData.inspector)
      formDataToSend.append('reviewer', formData.reviewer)
      formDataToSend.append('notes', formData.notes)

      if (selectedImage) {
        formDataToSend.append('image', selectedImage)
      }

      const response = await fetch('/api/endmill-disposals', {
        method: 'POST',
        body: formDataToSend
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      showSuccess(t('common.success'), t('endmillDisposal.registerSuccess'))
      setShowAddForm(false)
      setFormData({
        disposal_date: new Date().toISOString().split('T')[0],
        quantity: '',
        weight_kg: '',
        inspector: '',
        reviewer: '',
        notes: ''
      })
      setSelectedImage(null)
      setImagePreview(null)
      loadDisposals()
    } catch (error) {
      console.error('Error adding disposal:', error)
      showError(t('common.error'), t('endmillDisposal.registerError'))
    }
  }

  // 수정 시작
  const handleEdit = (disposal: EndmillDisposal) => {
    setEditingDisposal(disposal)
    setFormData({
      disposal_date: disposal.disposal_date,
      quantity: disposal.quantity.toString(),
      weight_kg: disposal.weight_kg.toString(),
      inspector: disposal.inspector,
      reviewer: disposal.reviewer,
      notes: disposal.notes || ''
    })
    setImagePreview(disposal.image_url)
    setShowEditForm(true)
    setShowAddForm(false)
  }

  // 수정 제출
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDisposal) return

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('disposal_date', formData.disposal_date)
      formDataToSend.append('quantity', formData.quantity)
      formDataToSend.append('weight_kg', formData.weight_kg)
      formDataToSend.append('inspector', formData.inspector)
      formDataToSend.append('reviewer', formData.reviewer)
      formDataToSend.append('notes', formData.notes)

      if (selectedImage) {
        formDataToSend.append('image', selectedImage)
      }

      const response = await fetch(`/api/endmill-disposals?id=${editingDisposal.id}`, {
        method: 'PUT',
        body: formDataToSend
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      showSuccess(t('common.success'), t('endmillDisposal.updateSuccess'))
      setShowEditForm(false)
      setEditingDisposal(null)
      setFormData({
        disposal_date: new Date().toISOString().split('T')[0],
        quantity: '',
        weight_kg: '',
        inspector: '',
        reviewer: '',
        notes: ''
      })
      setSelectedImage(null)
      setImagePreview(null)
      loadDisposals()
    } catch (error) {
      console.error('Error updating disposal:', error)
      showError(t('common.error'), t('endmillDisposal.updateError'))
    }
  }

  // 삭제
  const handleDelete = async (disposal: EndmillDisposal) => {
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`${new Date(disposal.disposal_date).toLocaleDateString('ko-KR')} 폐기 기록`)
    )

    if (confirmed) {
      try {
        const response = await fetch(`/api/endmill-disposals?id=${disposal.id}`, {
          method: 'DELETE'
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error)

        showSuccess(t('common.success'), t('endmillDisposal.deleteSuccess'))
        loadDisposals()
      } catch (error) {
        console.error('Error deleting disposal:', error)
        showError(t('common.error'), t('endmillDisposal.deleteError'))
      }
    }
  }

  // 인사이트 계산
  const insights = {
    totalQuantity: disposals.reduce((sum, d) => sum + d.quantity, 0),
    totalWeight: disposals.reduce((sum, d) => sum + d.weight_kg, 0),
    avgQuantityPerDay: disposals.length > 0
      ? Math.round(disposals.reduce((sum, d) => sum + d.quantity, 0) / disposals.length)
      : 0,
    avgWeightPerDay: disposals.length > 0
      ? (disposals.reduce((sum, d) => sum + d.weight_kg, 0) / disposals.length).toFixed(2)
      : '0.00'
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? t('endmillDisposal.cancel') : `+ ${t('endmillDisposal.addRecord')}`}
        </button>
      </div>

      {/* 인사이트 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('endmillDisposal.totalQuantity')}</p>
              <p className="text-2xl font-bold text-blue-600">{insights.totalQuantity.toLocaleString()}{t('endmillDisposal.quantityUnit')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">⚖️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('endmillDisposal.totalWeight')}</p>
              <p className="text-2xl font-bold text-green-600">{insights.totalWeight.toFixed(2)}{t('endmillDisposal.weightUnit')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('endmillDisposal.avgQuantityPerDay')}</p>
              <p className="text-2xl font-bold text-purple-600">{insights.avgQuantityPerDay}{t('endmillDisposal.quantityUnit')}{t('endmillDisposal.perDay')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">📈</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('endmillDisposal.avgWeightPerDay')}</p>
              <p className="text-2xl font-bold text-orange-600">{insights.avgWeightPerDay}{t('endmillDisposal.weightUnit')}{t('endmillDisposal.perDay')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 폐기 기록 추가 폼 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">✏️ {t('endmillDisposal.newRecord')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.disposalDate')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="date"
                  value={formData.disposal_date}
                  onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.quantityPcs')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.weightKg')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.inspector')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  value={formData.inspector}
                  onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.inspectorName')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.reviewer')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  value={formData.reviewer}
                  onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.reviewerName')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.imageAttachment')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t('endmillDisposal.additionalNotes')}
                />
              </div>

              {imagePreview && (
                <div className="md:col-span-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('endmillDisposal.preview')}</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-48 h-48 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({
                    disposal_date: new Date().toISOString().split('T')[0],
                    quantity: '',
                    weight_kg: '',
                    inspector: '',
                    reviewer: '',
                    notes: ''
                  })
                  setSelectedImage(null)
                  setImagePreview(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('endmillDisposal.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('endmillDisposal.register')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 폐기 기록 수정 폼 */}
      {showEditForm && editingDisposal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">✏️ {t('endmillDisposal.editRecord')}</h2>
          <form onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.disposalDate')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="date"
                  value={formData.disposal_date}
                  onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.quantityPcs')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.weightKg')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.inspector')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  value={formData.inspector}
                  onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.inspectorName')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.reviewer')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  value={formData.reviewer}
                  onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.reviewerName')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.imageAttachment')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t('endmillDisposal.additionalNotes')}
                />
              </div>

              {imagePreview && (
                <div className="md:col-span-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('endmillDisposal.preview')}</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-48 h-48 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false)
                  setEditingDisposal(null)
                  setFormData({
                    disposal_date: new Date().toISOString().split('T')[0],
                    quantity: '',
                    weight_kg: '',
                    inspector: '',
                    reviewer: '',
                    notes: ''
                  })
                  setSelectedImage(null)
                  setImagePreview(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('endmillDisposal.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('endmillDisposal.update')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 기간 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{t('endmillDisposal.startDate')}:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{t('endmillDisposal.endDate')}:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              {t('endmillDisposal.last7Days')}
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              {t('endmillDisposal.last30Days')}
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              {t('endmillDisposal.last3Months')}
            </button>
          </div>
        </div>
      </div>

      {/* 폐기 기록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{t('endmillDisposal.recordList')}</h2>
          <p className="text-sm text-gray-500">{t('endmillDisposal.totalRecords')} {disposals.length}{t('endmillDisposal.recordsCount')}</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">{t('endmillDisposal.loading')}</p>
          </div>
        ) : disposals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('endmillDisposal.noRecords')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.disposalDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.quantityPcs').replace(' (개)', '')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.weightKg')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.inspector')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.reviewer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.imageAttachment').replace(' 첨부', '').replace(' Đính kèm', '')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.notes')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('endmillDisposal.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {disposals.map((disposal) => (
                  <tr key={disposal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(disposal.disposal_date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disposal.quantity.toLocaleString()}{t('endmillDisposal.quantityUnit')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disposal.weight_kg.toFixed(2)}{t('endmillDisposal.weightUnit')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disposal.inspector}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disposal.reviewer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {disposal.image_url ? (
                        <a
                          href={disposal.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          📷 {t('endmillDisposal.imageView')}
                        </a>
                      ) : (
                        <span className="text-gray-400">{t('endmillDisposal.noImage')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {disposal.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(disposal)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('endmillDisposal.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(disposal)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          {t('endmillDisposal.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 확인 모달 */}
      {confirmation.config && (
        <ConfirmationModal
          isOpen={confirmation.isOpen}
          config={confirmation.config}
          onConfirm={confirmation.handleConfirm}
          onCancel={confirmation.handleCancel}
          loading={confirmation.loading}
        />
      )}
    </div>
  )
}
