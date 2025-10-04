'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/shared/Toast'

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
  const [disposals, setDisposals] = useState<EndmillDisposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()

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
      showError('로드 실패', '폐기 데이터를 불러오는데 실패했습니다.')
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

      showSuccess('등록 완료', '폐기 기록이 등록되었습니다.')
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
      showError('등록 실패', '폐기 기록 등록에 실패했습니다.')
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🗑️ 앤드밀 폐기 관리</h1>
          <p className="text-gray-600">매일 폐기되는 앤드밀을 기록하고 관리합니다</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? '취소' : '+ 폐기 기록 추가'}
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
              <p className="text-sm font-medium text-gray-600">총 폐기 수량</p>
              <p className="text-2xl font-bold text-blue-600">{insights.totalQuantity.toLocaleString()}개</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">⚖️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">총 폐기 무게</p>
              <p className="text-2xl font-bold text-green-600">{insights.totalWeight.toFixed(2)}kg</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">일평균 수량</p>
              <p className="text-2xl font-bold text-purple-600">{insights.avgQuantityPerDay}개/일</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">📈</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">일평균 무게</p>
              <p className="text-2xl font-bold text-orange-600">{insights.avgWeightPerDay}kg/일</p>
            </div>
          </div>
        </div>
      </div>

      {/* 폐기 기록 추가 폼 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 폐기 기록 추가</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  폐기일 <span className="text-red-500">*</span>
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
                  수량 (개) <span className="text-red-500">*</span>
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
                  무게 (kg) <span className="text-red-500">*</span>
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
                  점검자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.inspector}
                  onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="점검자 이름"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  검수자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.reviewer}
                  onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="검수자 이름"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이미지 첨부
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
                  비고
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="추가 메모 사항"
                />
              </div>

              {imagePreview && (
                <div className="md:col-span-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">미리보기</p>
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
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                등록하기
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 기간 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">시작일:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">종료일:</label>
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
              최근 7일
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              최근 30일
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              최근 3개월
            </button>
          </div>
        </div>
      </div>

      {/* 폐기 기록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">폐기 기록 목록</h2>
          <p className="text-sm text-gray-500">총 {disposals.length}건</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">로딩 중...</p>
          </div>
        ) : disposals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            선택한 기간에 폐기 기록이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    폐기일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수량
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    무게 (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    점검자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    검수자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이미지
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비고
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
                      {disposal.quantity.toLocaleString()}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disposal.weight_kg.toFixed(2)}kg
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
                          📷 보기
                        </a>
                      ) : (
                        <span className="text-gray-400">없음</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {disposal.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
