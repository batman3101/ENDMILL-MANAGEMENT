'use client'

import { useState, useEffect, useMemo } from 'react'
import NextImage from 'next/image'
import { useToast } from '@/components/shared/Toast'
import { useTranslations } from '@/lib/hooks/useTranslations'
import ConfirmationModal from '@/components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation } from '@/lib/hooks/useConfirmation'
import { clientLogger } from '@/lib/utils/logger'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

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

type SortField = 'disposal_date' | 'quantity' | 'weight_kg' | 'inspector' | 'reviewer'

export default function EndmillDisposalPage() {
  const { t } = useTranslations()
  const { hasPermission } = useAuth()
  const [disposals, setDisposals] = useState<EndmillDisposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingDisposal, setEditingDisposal] = useState<EndmillDisposal | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()
  const confirmation = useConfirmation()

  // 권한 체크 (DB 권한 자동 적용)
  const canCreate = hasPermission('endmill_disposals', 'create')
  const canUpdate = hasPermission('endmill_disposals', 'update')
  const canDelete = hasPermission('endmill_disposals', 'delete')

  // 필터 상태
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // 페이지네이션 및 정렬 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('disposal_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const itemsPerPage = 20

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
      clientLogger.error('Error loading disposals:', error)
      showError(t('common.error'), t('endmillDisposal.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDisposals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  // dateRange 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, sortField, sortOrder])

  // 정렬 토글 함수
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // 정렬된 폐기 기록 목록
  const sortedDisposals = useMemo(() => {
    const sorted = [...disposals].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // 날짜 정렬
      if (sortField === 'disposal_date') {
        aValue = new Date(a.disposal_date).getTime()
        bValue = new Date(b.disposal_date).getTime()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [disposals, sortField, sortOrder])

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedDisposals.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDisposals = sortedDisposals.slice(startIndex, endIndex)

  // 이미지 압축 함수
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // 최대 크기 제한 (2000px)
          const MAX_SIZE = 2000
          if (width > height && width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width
            width = MAX_SIZE
          } else if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height
            height = MAX_SIZE
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          // 품질 조정하여 압축 (0.8 = 80% 품질)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error('이미지 압축 실패'))
              }
            },
            'image/jpeg',
            0.8
          )
        }
        img.onerror = () => reject(new Error('이미지 로드 실패'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('파일 읽기 실패'))
      reader.readAsDataURL(file)
    })
  }

  // 이미지 선택 핸들러
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 파일 크기 체크 (20MB)
      const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
      if (file.size > MAX_FILE_SIZE) {
        showError(t('common.error'), '이미지 크기가 20MB를 초과합니다. 더 작은 이미지를 선택해주세요.')
        e.target.value = '' // 입력 초기화
        return
      }

      try {
        // 이미지 타입 체크
        if (!file.type.startsWith('image/')) {
          showError(t('common.error'), '이미지 파일만 업로드 가능합니다.')
          e.target.value = ''
          return
        }

        // 5MB 이상이면 자동 압축
        let processedFile = file
        if (file.size > 5 * 1024 * 1024) {
          clientLogger.log('이미지가 5MB 이상입니다. 압축을 시작합니다...')
          processedFile = await compressImage(file)
          clientLogger.log(`압축 완료: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)
        }

        setSelectedImage(processedFile)

        // 미리보기 생성
        const reader = new FileReader()
        reader.onloadend = () => {
          setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(processedFile)
      } catch (error) {
        clientLogger.error('이미지 처리 오류:', error)
        showError(t('common.error'), '이미지 처리 중 오류가 발생했습니다.')
        e.target.value = ''
      }
    }
  }

  // 이미지를 서버를 통해 업로드 (RLS 문제 해결)
  const uploadImageToStorage = async (file: File): Promise<string> => {
    try {
      // 파일 크기 로깅
      clientLogger.log(`업로드 시작: ${file.name}, 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

      // File을 Base64로 변환
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // data:image/jpeg;base64, 부분 제거
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // 서버 API를 통해 업로드 (서버에서 인증 체크 수행)
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          fileName,
          fileExt,
          bucket: 'endmill-images',
          folder: 'disposal-images'
        })
      })

      // 응답이 JSON이 아닐 수 있으므로 확인
      const contentType = response.headers.get('content-type')
      let result

      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        clientLogger.error('Non-JSON response:', text)
        result = { error: text }
      }

      if (!response.ok) {
        // 401 에러면 세션 만료
        if (response.status === 401) {
          throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
        }
        // 413 에러면 파일 크기 초과
        if (response.status === 413) {
          throw new Error('이미지 파일이 너무 큽니다. 더 작은 이미지를 선택해주세요.')
        }
        throw new Error(result.error || '이미지 업로드에 실패했습니다.')
      }

      clientLogger.log('업로드 완료:', result.publicUrl)
      return result.publicUrl
    } catch (error) {
      clientLogger.error('Image upload failed:', error)
      throw error
    }
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let imageUrl: string | null = null
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToStorage(selectedImage)
        } catch (uploadError) {
          clientLogger.error('Image upload error:', uploadError)
          const errorMessage = uploadError instanceof Error
            ? uploadError.message
            : '이미지 업로드 중 오류가 발생했습니다.'
          showError(t('common.error'), errorMessage)
          return // 이미지 업로드 실패 시 폼 제출 중단
        }
      }

      const payload = {
        disposal_date: formData.disposal_date,
        quantity: formData.quantity,
        weight_kg: formData.weight_kg,
        inspector: formData.inspector,
        reviewer: formData.reviewer,
        notes: formData.notes,
        image_url: imageUrl
      }

      const response = await fetch('/api/endmill-disposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '폐기 기록 등록에 실패했습니다.')
      }

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
      clientLogger.error('Error adding disposal:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : t('endmillDisposal.registerError')
      showError(t('common.error'), errorMessage)
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
      let imageUrl: string | undefined = undefined
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToStorage(selectedImage)
        } catch (uploadError) {
          clientLogger.error('Image upload error:', uploadError)
          const errorMessage = uploadError instanceof Error
            ? uploadError.message
            : '이미지 업로드 중 오류가 발생했습니다.'
          showError(t('common.error'), errorMessage)
          return // 이미지 업로드 실패 시 폼 제출 중단
        }
      }

      const updatePayload: any = {
        disposal_date: formData.disposal_date,
        quantity: formData.quantity,
        weight_kg: formData.weight_kg,
        inspector: formData.inspector,
        reviewer: formData.reviewer,
        notes: formData.notes
      }

      if (imageUrl !== undefined) {
        updatePayload.image_url = imageUrl
      }

      const response = await fetch(`/api/endmill-disposals?id=${editingDisposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '폐기 기록 수정에 실패했습니다.')
      }

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
      clientLogger.error('Error updating disposal:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : t('endmillDisposal.updateError')
      showError(t('common.error'), errorMessage)
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
        clientLogger.error('Error deleting disposal:', error)
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
        {canCreate && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? t('endmillDisposal.cancel') : `+ ${t('endmillDisposal.addRecord')}`}
          </button>
        )}
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
                <label htmlFor="disposal_date" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.disposalDate')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="date"
                  id="disposal_date"
                  value={formData.disposal_date}
                  onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.quantityPcs')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50"
                  required
                />
              </div>

              <div>
                <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.weightKg')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  id="weight_kg"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2.5"
                  required
                />
              </div>

              <div>
                <label htmlFor="inspector" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.inspector')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  id="inspector"
                  value={formData.inspector}
                  onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.inspectorName')}
                  required
                />
              </div>

              <div>
                <label htmlFor="reviewer" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.reviewer')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  id="reviewer"
                  value={formData.reviewer}
                  onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.reviewerName')}
                  required
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.imageAttachment')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  id="image"
                  onChange={handleImageSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.notes')}
                </label>
                <textarea
                  id="notes"
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
                  <div className="relative w-48 h-48">
                    <NextImage
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover rounded-lg border"
                    />
                  </div>
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
                <label htmlFor="edit_disposal_date" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.disposalDate')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="date"
                  id="edit_disposal_date"
                  value={formData.disposal_date}
                  onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.quantityPcs')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  id="edit_quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 50"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.weightKg')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  id="edit_weight_kg"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 2.5"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_inspector" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.inspector')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  id="edit_inspector"
                  value={formData.inspector}
                  onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.inspectorName')}
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_reviewer" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.reviewer')} <span className="text-red-500">{t('endmillDisposal.required')}</span>
                </label>
                <input
                  type="text"
                  id="edit_reviewer"
                  value={formData.reviewer}
                  onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('endmillDisposal.reviewerName')}
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_image" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.imageAttachment')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  id="edit_image"
                  onChange={handleImageSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="edit_notes" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endmillDisposal.notes')}
                </label>
                <textarea
                  id="edit_notes"
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
                  <div className="relative w-48 h-48">
                    <NextImage
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover rounded-lg border"
                    />
                  </div>
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
            <label htmlFor="filter_start" className="text-sm font-medium text-gray-700">{t('endmillDisposal.startDate')}:</label>
            <input
              type="date"
              id="filter_start"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter_end" className="text-sm font-medium text-gray-700">{t('endmillDisposal.endDate')}:</label>
            <input
              type="date"
              id="filter_end"
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
          <p className="text-sm text-gray-500">
            {t('endmillDisposal.totalRecords')} {sortedDisposals.length}{t('endmillDisposal.recordsCount')}
            {totalPages > 1 && (
              <> • {t('equipment.page')} {currentPage} {t('equipment.ofTotal')} {totalPages}</>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">{t('endmillDisposal.loading')}</p>
          </div>
        ) : sortedDisposals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('endmillDisposal.noRecords')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('disposal_date')}
                  >
                    <div className="flex items-center">
                      {t('endmillDisposal.disposalDate')}
                      <span className="ml-1">
                        {sortField === 'disposal_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center">
                      {t('endmillDisposal.quantityPcs').replace(' (개)', '')}
                      <span className="ml-1">
                        {sortField === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('weight_kg')}
                  >
                    <div className="flex items-center">
                      {t('endmillDisposal.weightKg')}
                      <span className="ml-1">
                        {sortField === 'weight_kg' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('inspector')}
                  >
                    <div className="flex items-center">
                      {t('endmillDisposal.inspector')}
                      <span className="ml-1">
                        {sortField === 'inspector' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('reviewer')}
                  >
                    <div className="flex items-center">
                      {t('endmillDisposal.reviewer')}
                      <span className="ml-1">
                        {sortField === 'reviewer' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
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
                {currentDisposals.map((disposal) => (
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
                        {canUpdate && (
                          <button
                            onClick={() => handleEdit(disposal)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {t('endmillDisposal.edit')}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(disposal)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            {t('endmillDisposal.delete')}
                          </button>
                        )}
                        {!canUpdate && !canDelete && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="bg-white px-6 py-3 flex items-center justify-between border-t">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('equipment.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('equipment.next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('equipment.showing')} <span className="font-medium">{sortedDisposals.length}</span>{t('equipment.ofItems')}{' '}
                  <span className="font-medium">{startIndex + 1}</span>
                  {t('equipment.to')}
                  <span className="font-medium">{Math.min(endIndex, sortedDisposals.length)}</span>{t('equipment.itemsDisplay')}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>

                  {/* 페이지 번호들 */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </nav>
              </div>
            </div>
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
