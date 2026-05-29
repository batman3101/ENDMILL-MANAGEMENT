'use client'

import { useState, useEffect, useMemo } from 'react'
import NextImage from 'next/image'
import { Plus, X, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import { useTranslations } from '@/lib/hooks/useTranslations'
import { useTranslation } from 'react-i18next'
import ConfirmationModal from '@/components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation } from '@/lib/hooks/useConfirmation'
import { clientLogger } from '@/lib/utils/logger'
import { useAuth } from '@/lib/hooks/useAuth'
import { useFactory } from '@/lib/hooks/useFactory'
import {
  DisposalRecordCard,
  type DisposalRecordCardItem,
} from '@/components/features/endmill-disposal/disposal-record-card'
import {
  DailyTrendChart,
  type DailyTrendPoint,
} from '@/components/features/endmill-disposal/daily-trend-chart'

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

function resolveDateLocale(language: string | undefined): string {
  if (!language) return 'ko-KR'
  if (language.toLowerCase().startsWith('vi')) return 'vi-VN'
  return 'ko-KR'
}

function formatDateForLocale(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

const initialFormState = {
  disposal_date: new Date().toISOString().split('T')[0],
  quantity: '',
  weight_kg: '',
  inspector: '',
  reviewer: '',
  notes: '',
}

export default function EndmillDisposalPage() {
  const { t } = useTranslations()
  const { i18n } = useTranslation()
  const dateLocale = resolveDateLocale(i18n.language)
  const { hasPermission } = useAuth()
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  const [disposals, setDisposals] = useState<EndmillDisposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingDisposal, setEditingDisposal] = useState<EndmillDisposal | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()
  const confirmation = useConfirmation()

  const canCreate = hasPermission('endmill_disposals', 'create')
  const canUpdate = hasPermission('endmill_disposals', 'update')
  const canDelete = hasPermission('endmill_disposals', 'delete')

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('disposal_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const itemsPerPage = 20

  const [formData, setFormData] = useState(initialFormState)

  const loadDisposals = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/endmill-disposals?start=${dateRange.start}&end=${dateRange.end}${
          factoryId ? `&factoryId=${factoryId}` : ''
        }`
      )
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
  }, [dateRange, factoryId])

  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedDisposals = useMemo(() => {
    const sorted = [...disposals].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]
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

  const totalPages = Math.ceil(sortedDisposals.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDisposals = sortedDisposals.slice(startIndex, endIndex)

  // Page guard — totalPages 변경 시 currentPage clamp
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // 인사이트 (4개 stat strip 메트릭)
  const insights = useMemo(() => {
    const totalQuantity = disposals.reduce((sum, d) => sum + d.quantity, 0)
    const totalWeight = disposals.reduce((sum, d) => sum + d.weight_kg, 0)
    const days = disposals.length
    const avgQuantityPerDay = days > 0 ? Math.round(totalQuantity / days) : 0
    const avgWeightPerDay = days > 0 ? totalWeight / days : 0
    return {
      totalQuantity,
      totalWeight,
      avgQuantityPerDay,
      avgWeightPerDay,
    }
  }, [disposals])

  // 일별 트렌드 (range 안의 모든 날짜를 채워 누락된 날 0 표시)
  const trendPoints = useMemo<DailyTrendPoint[]>(() => {
    const aggregate: Record<string, number> = {}
    disposals.forEach(d => {
      const key = d.disposal_date.split('T')[0]
      aggregate[key] = (aggregate[key] || 0) + d.quantity
    })

    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return []
    }
    const points: DailyTrendPoint[] = []
    const cursor = new Date(start)
    let safetyCounter = 0
    while (cursor <= end && safetyCounter < 366) {
      const key = cursor.toISOString().split('T')[0]
      points.push({
        date: key,
        quantity: aggregate[key] || 0,
      })
      cursor.setDate(cursor.getDate() + 1)
      safetyCounter++
    }
    return points
  }, [disposals, dateRange.start, dateRange.end])

  // 이미지 압축
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
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
          canvas.toBlob(
            blob => {
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const MAX_FILE_SIZE = 20 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        showError(t('common.error'), '이미지 크기가 20MB를 초과합니다. 더 작은 이미지를 선택해주세요.')
        e.target.value = ''
        return
      }
      try {
        if (!file.type.startsWith('image/')) {
          showError(t('common.error'), '이미지 파일만 업로드 가능합니다.')
          e.target.value = ''
          return
        }
        let processedFile = file
        if (file.size > 5 * 1024 * 1024) {
          clientLogger.log('이미지가 5MB 이상입니다. 압축을 시작합니다...')
          processedFile = await compressImage(file)
        }
        setSelectedImage(processedFile)
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

  const uploadImageToStorage = async (file: File): Promise<string> => {
    try {
      clientLogger.log(`업로드 시작: ${file.name}, 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          fileName,
          fileExt,
          bucket: 'endmill-images',
          folder: 'disposal-images',
        }),
      })

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
        if (response.status === 401) {
          throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
        }
        if (response.status === 413) {
          throw new Error('이미지 파일이 너무 큽니다. 더 작은 이미지를 선택해주세요.')
        }
        throw new Error(result.error || '이미지 업로드에 실패했습니다.')
      }
      return result.publicUrl
    } catch (error) {
      clientLogger.error('Image upload failed:', error)
      throw error
    }
  }

  const resetForm = () => {
    setFormData(initialFormState)
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let imageUrl: string | null = null
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToStorage(selectedImage)
        } catch (uploadError) {
          const errorMessage =
            uploadError instanceof Error
              ? uploadError.message
              : '이미지 업로드 중 오류가 발생했습니다.'
          showError(t('common.error'), errorMessage)
          return
        }
      }
      const payload = {
        disposal_date: formData.disposal_date,
        quantity: formData.quantity,
        weight_kg: formData.weight_kg,
        inspector: formData.inspector,
        reviewer: formData.reviewer,
        notes: formData.notes,
        image_url: imageUrl,
        factory_id: factoryId,
      }
      const response = await fetch('/api/endmill-disposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '폐기 기록 등록에 실패했습니다.')
      }
      showSuccess(t('common.success'), t('endmillDisposal.registerSuccess'))
      setShowAddForm(false)
      resetForm()
      loadDisposals()
    } catch (error) {
      clientLogger.error('Error adding disposal:', error)
      const errorMessage =
        error instanceof Error ? error.message : t('endmillDisposal.registerError')
      showError(t('common.error'), errorMessage)
    }
  }

  const handleEdit = (disposal: EndmillDisposal) => {
    setEditingDisposal(disposal)
    setFormData({
      disposal_date: disposal.disposal_date,
      quantity: disposal.quantity.toString(),
      weight_kg: disposal.weight_kg.toString(),
      inspector: disposal.inspector,
      reviewer: disposal.reviewer,
      notes: disposal.notes || '',
    })
    setImagePreview(disposal.image_url)
    setShowEditForm(true)
    setShowAddForm(false)
  }

  const handleEditById = (id: string) => {
    const disposal = disposals.find(d => d.id === id)
    if (disposal) handleEdit(disposal)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDisposal) return
    try {
      let imageUrl: string | undefined = undefined
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToStorage(selectedImage)
        } catch (uploadError) {
          const errorMessage =
            uploadError instanceof Error
              ? uploadError.message
              : '이미지 업로드 중 오류가 발생했습니다.'
          showError(t('common.error'), errorMessage)
          return
        }
      }
      const updatePayload: any = {
        disposal_date: formData.disposal_date,
        quantity: formData.quantity,
        weight_kg: formData.weight_kg,
        inspector: formData.inspector,
        reviewer: formData.reviewer,
        notes: formData.notes,
        factory_id: factoryId,
      }
      if (imageUrl !== undefined) {
        updatePayload.image_url = imageUrl
      }
      const response = await fetch(
        `/api/endmill-disposals?id=${editingDisposal.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        }
      )
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '폐기 기록 수정에 실패했습니다.')
      }
      showSuccess(t('common.success'), t('endmillDisposal.updateSuccess'))
      setShowEditForm(false)
      setEditingDisposal(null)
      resetForm()
      loadDisposals()
    } catch (error) {
      clientLogger.error('Error updating disposal:', error)
      const errorMessage =
        error instanceof Error ? error.message : t('endmillDisposal.updateError')
      showError(t('common.error'), errorMessage)
    }
  }

  const handleDelete = async (disposal: EndmillDisposal) => {
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(
        `${formatDateForLocale(disposal.disposal_date, dateLocale)} ${t(
          'endmillDisposal.recordList'
        )}`,
        t
      )
    )
    if (confirmed) {
      try {
        const response = await fetch(`/api/endmill-disposals?id=${disposal.id}`, {
          method: 'DELETE',
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

  const handleDeleteById = (id: string) => {
    const disposal = disposals.find(d => d.id === id)
    if (disposal) handleDelete(disposal)
  }

  const cardLabels = {
    quantity: t('endmillDisposal.quantityPcs').replace(/\s*\(.*?\)/, ''),
    quantityUnit: t('endmillDisposal.quantityUnit'),
    weight: t('endmillDisposal.weightKg').replace(/\s*\(.*?\)/, ''),
    weightUnit: t('endmillDisposal.weightUnit'),
    inspector: t('endmillDisposal.inspector'),
    reviewer: t('endmillDisposal.reviewer'),
    notes: t('endmillDisposal.notes'),
    thumbnailAlt: t('endmillDisposal.thumbnailAlt'),
    edit: t('endmillDisposal.edit'),
    delete: t('endmillDisposal.delete'),
  }

  const toCardItem = (d: EndmillDisposal): DisposalRecordCardItem => ({
    id: d.id,
    disposalDate: d.disposal_date,
    quantity: d.quantity,
    weightKg: d.weight_kg,
    inspector: d.inspector,
    reviewer: d.reviewer,
    imageUrl: d.image_url,
    notes: d.notes,
  })

  return (
    <div className="space-y-6">
      {/* === 헤더 액션 === */}
      {canCreate && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              if (showAddForm) {
                resetForm()
              }
              setShowAddForm(!showAddForm)
              setShowEditForm(false)
            }}
            className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4" />
                {t('endmillDisposal.cancel')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t('endmillDisposal.addRecord')}
              </>
            )}
          </button>
        </div>
      )}

      {/* === Stat Strip === */}
      <section className="rounded-md border border-divider bg-paper-warm">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-divider lg:divide-y-0 lg:divide-x lg:divide-divider">
          <StatCell
            label={t('endmillDisposal.totalQuantity')}
            value={insights.totalQuantity.toLocaleString()}
            unit={t('endmillDisposal.quantityUnit')}
          />
          <StatCell
            label={t('endmillDisposal.totalWeight')}
            value={insights.totalWeight.toFixed(2)}
            unit={t('endmillDisposal.weightUnit')}
          />
          <StatCell
            label={t('endmillDisposal.avgQuantityPerDay')}
            value={insights.avgQuantityPerDay.toLocaleString()}
            unit={`${t('endmillDisposal.quantityUnit')}${t('endmillDisposal.perDay')}`}
          />
          <StatCell
            label={t('endmillDisposal.avgWeightPerDay')}
            value={insights.avgWeightPerDay.toFixed(2)}
            unit={`${t('endmillDisposal.weightUnit')}${t('endmillDisposal.perDay')}`}
          />
        </div>
      </section>

      {/* === 일별 트렌드 차트 === */}
      <DailyTrendChart
        title={t('endmillDisposal.dailyTrend')}
        caption={t('endmillDisposal.dailyTrendCaption')}
        emptyMessage={t('endmillDisposal.noTrendData')}
        peakLabel={t('endmillDisposal.peakDay')}
        unit={t('endmillDisposal.quantityUnit')}
        points={trendPoints}
      />

      {/* === 추가 폼 === */}
      {showAddForm && (
        <DisposalForm
          mode="create"
          formData={formData}
          setFormData={setFormData}
          imagePreview={imagePreview}
          onImageSelect={handleImageSelect}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowAddForm(false)
            resetForm()
          }}
          t={t}
        />
      )}

      {/* === 수정 폼 === */}
      {showEditForm && editingDisposal && (
        <DisposalForm
          mode="edit"
          formData={formData}
          setFormData={setFormData}
          imagePreview={imagePreview}
          onImageSelect={handleImageSelect}
          onSubmit={handleUpdate}
          onCancel={() => {
            setShowEditForm(false)
            setEditingDisposal(null)
            resetForm()
          }}
          t={t}
        />
      )}

      {/* === 기간 필터 바 === */}
      <section className="rounded-md border border-divider bg-paper-warm p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 sm:flex-1">
            <DateField
              id="filter_start"
              label={t('endmillDisposal.startDate')}
              value={dateRange.start}
              onChange={value => setDateRange({ ...dateRange, start: value })}
            />
            <DateField
              id="filter_end"
              label={t('endmillDisposal.endDate')}
              value={dateRange.end}
              onChange={value => setDateRange({ ...dateRange, end: value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickRangeButton
              label={t('endmillDisposal.last7Days')}
              onClick={() => applyQuickRange(7, setDateRange)}
            />
            <QuickRangeButton
              label={t('endmillDisposal.last30Days')}
              onClick={() => applyQuickRange(30, setDateRange)}
            />
            <QuickRangeButton
              label={t('endmillDisposal.last3Months')}
              onClick={() => applyQuickRangeMonths(3, setDateRange)}
            />
          </div>
        </div>
      </section>

      {/* === 기록 목록 (헤더 + 듀얼 렌더링) === */}
      <section className="space-y-3">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-title font-semibold text-ink no-break">
            {t('endmillDisposal.recordList')}
          </h2>
          <p className="text-caption text-ink-soft tabular">
            {t('endmillDisposal.totalRecords')}{' '}
            <span className="font-medium text-ink">{sortedDisposals.length}</span>
            {t('endmillDisposal.recordsCount')}
          </p>
        </header>

        {isLoading ? (
          <div className="rounded-md border border-divider bg-paper-warm p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gauge-cobalt" />
            <p className="mt-2 text-base text-ink-soft">{t('endmillDisposal.loading')}</p>
          </div>
        ) : sortedDisposals.length === 0 ? (
          <div className="rounded-md border border-divider bg-paper-warm px-4 py-12 text-center">
            <p className="text-base text-ink-soft">{t('endmillDisposal.noRecords')}</p>
          </div>
        ) : (
          <>
            {/* 모바일 카드 리스트 */}
            <div className="lg:hidden space-y-3">
              {currentDisposals.map(d => (
                <DisposalRecordCard
                  key={d.id}
                  item={toCardItem(d)}
                  labels={cardLabels}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={handleEditById}
                  onDelete={handleDeleteById}
                />
              ))}
            </div>

            {/* 데스크톱 표 */}
            <div className="hidden lg:block rounded-md border border-divider bg-paper-warm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-paper border-b border-divider">
                    <tr>
                      <SortHeader
                        label={t('endmillDisposal.disposalDate')}
                        field="disposal_date"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('endmillDisposal.quantityPcs').replace(/\s*\(.*?\)/, '')}
                        field="quantity"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('endmillDisposal.weightKg').replace(/\s*\(.*?\)/, '')}
                        field="weight_kg"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('endmillDisposal.inspector')}
                        field="inspector"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('endmillDisposal.reviewer')}
                        field="reviewer"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-label font-medium text-ink-soft no-break">
                        {t('endmillDisposal.imageAttachment').replace(/\s*첨부\s*$/, '').replace(/\s*Đính kèm\s*$/, '')}
                      </th>
                      <th className="px-4 py-3 text-left text-label font-medium text-ink-soft no-break">
                        {t('endmillDisposal.notes')}
                      </th>
                      {(canUpdate || canDelete) && (
                        <th className="px-4 py-3 text-right text-label font-medium text-ink-soft no-break">
                          {t('endmillDisposal.actions')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {currentDisposals.map(disposal => (
                      <tr key={disposal.id} className="transition-colors hover:bg-paper">
                        <td className="px-4 py-3 text-base text-ink tabular no-break">
                          {formatDateForLocale(disposal.disposal_date, dateLocale)}
                        </td>
                        <td className="px-4 py-3 text-base font-medium text-ink tabular">
                          {disposal.quantity.toLocaleString()}
                          <span className="ml-1 text-caption font-normal text-ink-soft">
                            {t('endmillDisposal.quantityUnit')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-base font-medium text-ink tabular">
                          {disposal.weight_kg.toFixed(2)}
                          <span className="ml-1 text-caption font-normal text-ink-soft">
                            {t('endmillDisposal.weightUnit')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-base text-ink">{disposal.inspector}</td>
                        <td className="px-4 py-3 text-base text-ink">{disposal.reviewer}</td>
                        <td className="px-4 py-3">
                          {disposal.image_url ? (
                            <a
                              href={disposal.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 w-10 overflow-hidden rounded-sm border border-divider transition-shadow hover:shadow-hover-lift"
                              aria-label={t('endmillDisposal.thumbnailAlt')}
                            >
                              <NextImage
                                src={disposal.image_url}
                                alt={t('endmillDisposal.thumbnailAlt')}
                                width={40}
                                height={40}
                                className="h-10 w-10 object-cover"
                              />
                            </a>
                          ) : (
                            <span className="text-caption text-ink-mute">
                              {t('endmillDisposal.noImage')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-base text-ink-soft">
                          {disposal.notes || '—'}
                        </td>
                        {(canUpdate || canDelete) && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-3">
                              {canUpdate && (
                                <button
                                  type="button"
                                  onClick={() => handleEdit(disposal)}
                                  className="inline-flex items-center gap-1 text-label font-medium text-ink-soft transition-colors hover:text-ink"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {t('endmillDisposal.edit')}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(disposal)}
                                  className="inline-flex items-center gap-1 text-label font-medium text-signal-stop transition-colors hover:text-signal-stop-strong"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t('endmillDisposal.delete')}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* === 페이지네이션 === */}
        {totalPages > 1 && (
          <div className="rounded-md border border-divider bg-paper-warm px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-ink-soft tabular">
                {t('endmillDisposal.showing')}{' '}
                <span className="font-medium text-ink">{sortedDisposals.length}</span>
                {t('endmillDisposal.of')}{' '}
                <span className="font-medium text-ink">{startIndex + 1}</span>
                –
                <span className="font-medium text-ink">
                  {Math.min(endIndex, sortedDisposals.length)}
                </span>
                {t('endmillDisposal.displayed')}
              </p>
              <nav
                className="inline-flex items-center gap-1 self-end sm:self-auto"
                aria-label={t('endmillDisposal.page')}
              >
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label={t('endmillDisposal.previous')}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  const isActive = currentPage === pageNum
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-gauge-cobalt bg-gauge-cobalt px-3 text-label font-medium text-paper tabular'
                          : 'inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft tabular transition-colors hover:bg-paper-warm hover:text-ink'
                      }
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  aria-label={t('endmillDisposal.next')}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                >
                  ›
                </button>
              </nav>
            </div>
          </div>
        )}
      </section>

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

// ===== Sub components =====

interface StatCellProps {
  label: string
  value: string
  unit?: string
}

function StatCell({ label, value, unit }: StatCellProps) {
  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-caption text-ink-soft no-break">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <p className="text-headline font-semibold text-ink tabular">{value}</p>
        {unit && <p className="text-caption text-ink-soft no-break">{unit}</p>}
      </div>
    </div>
  )
}

interface DateFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

function DateField({ id, label, value, onChange }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-1">
      <label htmlFor={id} className="text-caption text-ink-soft no-break">
        {label}
      </label>
      <input
        type="date"
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="min-h-touch rounded-sm border border-divider bg-paper px-3 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
      />
    </div>
  )
}

function QuickRangeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
    >
      {label}
    </button>
  )
}

function applyQuickRange(
  days: number,
  setDateRange: (range: { start: string; end: string }) => void
) {
  setDateRange({
    start: new Date(new Date().setDate(new Date().getDate() - days))
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
}

function applyQuickRangeMonths(
  months: number,
  setDateRange: (range: { start: string; end: string }) => void
) {
  setDateRange({
    start: new Date(new Date().setMonth(new Date().getMonth() - months))
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
}

interface SortHeaderProps {
  label: string
  field: SortField
  sortField: SortField
  sortOrder: 'asc' | 'desc'
  onSort: (field: SortField) => void
}

function SortHeader({ label, field, sortField, sortOrder, onSort }: SortHeaderProps) {
  const isActive = sortField === field
  return (
    <th
      className="px-4 py-3 text-left text-label font-medium text-ink-soft cursor-pointer transition-colors hover:bg-paper-warm hover:text-ink no-break"
      onClick={() => onSort(field)}
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {isActive &&
          (sortOrder === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
          ))}
      </div>
    </th>
  )
}

interface DisposalFormProps {
  mode: 'create' | 'edit'
  formData: typeof initialFormState
  setFormData: React.Dispatch<React.SetStateAction<typeof initialFormState>>
  imagePreview: string | null
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  t: (key: string) => string
}

function DisposalForm({
  mode,
  formData,
  setFormData,
  imagePreview,
  onImageSelect,
  onSubmit,
  onCancel,
  t,
}: DisposalFormProps) {
  const title = mode === 'create' ? t('endmillDisposal.newRecord') : t('endmillDisposal.editRecord')
  const submitLabel =
    mode === 'create' ? t('endmillDisposal.register') : t('endmillDisposal.update')
  const idPrefix = mode === 'create' ? '' : 'edit_'

  return (
    <section className="rounded-md border border-divider bg-paper-warm p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-title font-semibold text-ink no-break">{title}</h2>
      </header>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id={`${idPrefix}disposal_date`}
            label={t('endmillDisposal.disposalDate')}
            required
            requiredMark={t('endmillDisposal.required')}
          >
            <input
              type="date"
              id={`${idPrefix}disposal_date`}
              value={formData.disposal_date}
              onChange={e => setFormData({ ...formData, disposal_date: e.target.value })}
              required
              className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
            />
          </FormField>

          <FormField
            id={`${idPrefix}quantity`}
            label={t('endmillDisposal.quantityPcs')}
            required
            requiredMark={t('endmillDisposal.required')}
          >
            <input
              type="number"
              min="1"
              id={`${idPrefix}quantity`}
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              required
              placeholder="50"
              className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute tabular transition-colors focus:border-gauge-cobalt focus:outline-none"
            />
          </FormField>

          <FormField
            id={`${idPrefix}weight_kg`}
            label={t('endmillDisposal.weightKg')}
            required
            requiredMark={t('endmillDisposal.required')}
          >
            <input
              type="number"
              step="0.01"
              min="0.01"
              id={`${idPrefix}weight_kg`}
              value={formData.weight_kg}
              onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
              required
              placeholder="2.5"
              className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute tabular transition-colors focus:border-gauge-cobalt focus:outline-none"
            />
          </FormField>

          <FormField
            id={`${idPrefix}inspector`}
            label={t('endmillDisposal.inspector')}
            required
            requiredMark={t('endmillDisposal.required')}
          >
            <input
              type="text"
              id={`${idPrefix}inspector`}
              value={formData.inspector}
              onChange={e => setFormData({ ...formData, inspector: e.target.value })}
              required
              placeholder={t('endmillDisposal.inspectorName')}
              className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none"
            />
          </FormField>

          <FormField
            id={`${idPrefix}reviewer`}
            label={t('endmillDisposal.reviewer')}
            required
            requiredMark={t('endmillDisposal.required')}
          >
            <input
              type="text"
              id={`${idPrefix}reviewer`}
              value={formData.reviewer}
              onChange={e => setFormData({ ...formData, reviewer: e.target.value })}
              required
              placeholder={t('endmillDisposal.reviewerName')}
              className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none"
            />
          </FormField>

          <FormField id={`${idPrefix}image`} label={t('endmillDisposal.imageAttachment')}>
            <input
              type="file"
              accept="image/*"
              id={`${idPrefix}image`}
              onChange={onImageSelect}
              className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 py-2 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none file:mr-3 file:rounded-sm file:border-0 file:bg-paper-warm file:px-3 file:py-1.5 file:text-label file:font-medium file:text-ink-soft hover:file:bg-paper"
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField id={`${idPrefix}notes`} label={t('endmillDisposal.notes')}>
              <textarea
                id={`${idPrefix}notes`}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder={t('endmillDisposal.additionalNotes')}
                className="w-full rounded-sm border border-divider bg-paper px-3 py-2 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none"
              />
            </FormField>
          </div>

          {imagePreview && (
            <div className="md:col-span-2">
              <p className="text-caption text-ink-soft mb-2 no-break">
                {t('endmillDisposal.preview')}
              </p>
              <div className="relative w-48 h-48 rounded-sm border border-divider overflow-hidden">
                <NextImage
                  src={imagePreview}
                  alt={t('endmillDisposal.thumbnailAlt')}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
          >
            {t('endmillDisposal.cancel')}
          </button>
          <button
            type="submit"
            className="inline-flex min-h-touch items-center justify-center rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  requiredMark?: string
  children: React.ReactNode
}

function FormField({ id, label, required, requiredMark, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label font-medium text-ink no-break">
        {label}
        {required && requiredMark && (
          <span className="ml-1 text-signal-stop">{requiredMark}</span>
        )}
      </label>
      {children}
    </div>
  )
}
