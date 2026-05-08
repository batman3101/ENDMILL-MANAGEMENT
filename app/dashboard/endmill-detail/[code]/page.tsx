'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Edit3,
  FileSpreadsheet,
  Package,
  Truck,
  Wrench,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CircleAlert,
} from 'lucide-react'

import { useToast } from '../../../../components/shared/Toast'
import { useTranslations } from '../../../../lib/hooks/useTranslations'
import { NoBreak } from '@/components/ui/no-break'
import EndmillSupplierPrices from '../../../../components/features/EndmillSupplierPrices'
import { clientLogger } from '@/lib/utils/logger'

const EndmillMasterUploader = dynamic(
  () => import('../../../../components/features/EndmillMasterUploader'),
  { ssr: false }
)

type SortField = 'equipmentModel' | 'equipmentProcess' | 'specToolLife' | 'equipmentNumber'
type SortOrder = 'asc' | 'desc'

const ITEMS_PER_PAGE = 10

export default function EndmillDetailPage() {
  const params = useParams()
  const router = useRouter()
  const endmillCode = params.code as string
  const { showSuccess, showError } = useToast()
  const { t } = useTranslations()

  const [endmillData, setEndmillData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExcelUploader, setShowExcelUploader] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('equipmentNumber')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  useEffect(() => {
    const fetchEndmillData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/endmill?code=${endmillCode}`)
        const result = await response.json()
        if (result.success && result.data.length > 0) {
          setEndmillData(result.data[0])
        } else {
          setEndmillData(null)
        }
      } catch (error) {
        clientLogger.error('앤드밀 데이터 로딩 오류:', error)
        showError(t('endmill.dataLoadError'), t('endmill.dataLoadErrorMessage'))
        setEndmillData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchEndmillData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endmillCode])

  const handleEdit = () => setShowEditModal(true)
  const handleExcelUpload = () => setShowExcelUploader(true)

  const handleInventoryManagement = () => {
    router.push('/dashboard/inventory')
    showSuccess(
      t('endmill.inventoryNavigateSuccess'),
      `${endmillCode} ${t('endmill.inventoryNavigateMessage')}`
    )
  }

  const handleSaveEdit = () => {
    setShowEditModal(false)
    showSuccess(
      t('endmill.editCompleteTitle'),
      `${endmillCode} ${t('endmill.editCompleteMessage')}`
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedCurrentUsage = useMemo(() => {
    if (!endmillData?.currentUsage) return []
    return [...endmillData.currentUsage].sort((a: any, b: any) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]
      if (sortField === 'specToolLife') {
        aValue = aValue || 0
        bValue = bValue || 0
      }
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [endmillData?.currentUsage, sortField, sortOrder])

  const totalPages = Math.ceil(sortedCurrentUsage.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentUsageItems = sortedCurrentUsage.slice(startIndex, endIndex)

  // 정렬 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1)
  }, [sortField, sortOrder])

  // page guard: 함수형 업데이트로 currentPage를 deps에서 제거 — R18 strict/concurrent 친화
  useEffect(() => {
    setCurrentPage((prev) =>
      totalPages > 0 && prev > totalPages ? totalPages : prev
    )
  }, [totalPages])

  const handleMasterDataUpdate = (data: any[]) => {
    showSuccess(
      t('endmill.masterDataUpdateComplete'),
      `${data.length}${t('endmill.masterDataUpdateMessage')}`
    )
    setShowExcelUploader(false)
    window.location.reload()
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-paper-warm">
            <Wrench className="h-8 w-8 text-ink-soft" aria-hidden="true" />
          </div>
          <p className="text-body text-ink-soft">{t('endmill.loadingInfo')}</p>
        </div>
      </div>
    )
  }

  // 데이터 없음
  if (!endmillData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-signal-stop-soft">
            <CircleAlert className="h-8 w-8 text-signal-stop-strong" aria-hidden="true" />
          </div>
          <h2 className="text-title font-semibold text-ink">{t('endmill.notFound')}</h2>
          <p className="mt-1 text-caption text-ink-soft">
            {t('common.code')} &apos;{endmillCode}&apos;{t('endmill.notFoundMessage')}
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/endmill')}
            className="mt-4 inline-flex items-center gap-2 rounded-sm border border-divider bg-paper px-4 py-2 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('equipment.backButton')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 액션 바 (뒤로가기 + 코드 + 3개 액션) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/endmill')}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
            aria-label={t('equipment.backButton')}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('equipment.backButton')}</NoBreak>
          </button>
          <h2 className="text-title font-semibold text-gauge-cobalt-strong tabular no-break">
            <NoBreak>{endmillCode}</NoBreak>
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-gauge-cobalt px-4 py-2 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('endmill.editButton')}</NoBreak>
          </button>
          <button
            type="button"
            onClick={handleExcelUpload}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm border border-divider bg-paper px-4 py-2 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('endmill.excelUploadButton')}</NoBreak>
          </button>
          <button
            type="button"
            onClick={handleInventoryManagement}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm border border-divider bg-paper px-4 py-2 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('endmill.inventoryManageButton')}</NoBreak>
          </button>
        </div>
      </div>

      {/* 통계 strip (4-카드 → 단일 stat strip 4셀) */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-divider bg-divider lg:grid-cols-4">
        <StatCell
          label={t('endmill.currentStock')}
          value={endmillData.inventory?.current_stock ?? 0}
        />
        <StatCell
          label={t('endmill.minStock')}
          value={endmillData.inventory?.min_stock ?? 0}
          accent="watch"
        />
        <StatCell
          label={t('endmill.inUseCount')}
          value={endmillData.currentUsage?.length ?? 0}
          accent="go"
        />
        <StatCell label={t('endmill.totalUsageCount')} value={endmillData.totalUsageCount ?? 0} />
      </div>

      {/* 메인 그리드 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 기본 정보 */}
        <section className="rounded-md border border-divider bg-paper-warm p-5">
          <h3 className="mb-4 text-title font-semibold text-ink no-break">
            {t('endmill.basicInfoSection')}
          </h3>

          <div className="space-y-5">
            <SubSection title={t('endmill.identificationInfo')}>
              <FieldRow label={t('endmill.endmillCode')}>
                <p className="font-mono text-title font-bold text-gauge-cobalt-strong tabular">
                  <NoBreak>{endmillData.code}</NoBreak>
                </p>
              </FieldRow>
              <FieldRow label={t('endmill.category')}>
                <span className="inline-flex items-center rounded-sm border border-divider bg-paper px-2 py-0.5 text-caption font-medium text-ink-soft no-break">
                  <NoBreak>{endmillData.categoryName || endmillData.category}</NoBreak>
                </span>
              </FieldRow>
              <FieldRow label={t('endmill.endmillName')}>
                <p className="text-label text-ink">{endmillData.name}</p>
              </FieldRow>
              {endmillData.qualityGrade && (
                <FieldRow label={t('endmill.qualityGrade')}>
                  <QualityBadge grade={endmillData.qualityGrade} />
                </FieldRow>
              )}
            </SubSection>

            {(endmillData.diameter ||
              endmillData.flutes ||
              endmillData.coating ||
              endmillData.material ||
              endmillData.tolerance ||
              endmillData.helix) && (
              <SubSection title={t('endmill.technicalSpecs')}>
                {endmillData.diameter && (
                  <FieldRow label={t('endmill.diameter')}>
                    <p className="text-label text-ink tabular">{endmillData.diameter}mm</p>
                  </FieldRow>
                )}
                {endmillData.flutes && (
                  <FieldRow label={t('endmill.flutes')}>
                    <p className="text-label text-ink tabular">
                      {endmillData.flutes}
                      {t('endmill.flutesSuffix')}
                    </p>
                  </FieldRow>
                )}
                {endmillData.coating && (
                  <FieldRow label={t('endmill.coating')}>
                    <p className="text-label text-ink">{endmillData.coating}</p>
                  </FieldRow>
                )}
                {endmillData.material && (
                  <FieldRow label={t('endmill.material')}>
                    <p className="text-label text-ink">{endmillData.material}</p>
                  </FieldRow>
                )}
                {endmillData.tolerance && (
                  <FieldRow label={t('endmill.tolerance')}>
                    <p className="text-label text-ink">{endmillData.tolerance}</p>
                  </FieldRow>
                )}
                {endmillData.helix && (
                  <FieldRow label={t('endmill.helix')}>
                    <p className="text-label text-ink">{endmillData.helix}</p>
                  </FieldRow>
                )}
              </SubSection>
            )}

            {(endmillData.performanceRating ||
              endmillData.standardLife ||
              endmillData.costEfficiency ||
              endmillData.defectRate !== undefined ||
              endmillData.replacementFrequency ||
              endmillData.averageLifespan) && (
              <SubSection title={t('endmill.performanceMetrics')}>
                {endmillData.performanceRating && (
                  <FieldRow label={t('endmill.performanceRating')}>
                    <RatingBar value={endmillData.performanceRating} />
                  </FieldRow>
                )}
                {endmillData.costEfficiency && (
                  <FieldRow label={t('endmill.costEfficiency')}>
                    <RatingBar value={endmillData.costEfficiency} flat />
                  </FieldRow>
                )}
                {endmillData.defectRate !== undefined && (
                  <FieldRow label={t('endmill.defectRate')}>
                    <span
                      className={
                        endmillData.defectRate < 1
                          ? 'text-label font-semibold text-signal-go-strong tabular'
                          : endmillData.defectRate < 3
                            ? 'text-label font-semibold text-signal-watch-strong tabular'
                            : 'text-label font-semibold text-signal-stop-strong tabular'
                      }
                    >
                      {endmillData.defectRate.toFixed(2)}%
                    </span>
                  </FieldRow>
                )}
                {endmillData.replacementFrequency && (
                  <FieldRow label={t('endmill.replacementFrequency')}>
                    <p className="text-label text-ink tabular">
                      {endmillData.replacementFrequency}
                      {t('endmill.replacementFrequencySuffix')}
                    </p>
                  </FieldRow>
                )}
                {endmillData.averageLifespan && (
                  <FieldRow label={t('endmill.averageLifespan')}>
                    <p className="text-label text-ink tabular">
                      {endmillData.averageLifespan.toLocaleString()}
                      {t('endmill.timesSuffix')}
                    </p>
                  </FieldRow>
                )}
                {endmillData.standardLife && (
                  <FieldRow label={t('endmill.standardLife')}>
                    <p className="text-label text-ink tabular">
                      {endmillData.standardLife.toLocaleString()}
                      {t('endmill.timesSuffix')}
                    </p>
                  </FieldRow>
                )}
              </SubSection>
            )}
          </div>

          {endmillData.tags && endmillData.tags.length > 0 && (
            <div className="mt-5 border-t border-divider pt-4">
              <p className="mb-2 text-caption text-ink-soft">{t('endmill.tags')}</p>
              <div className="flex flex-wrap gap-1.5">
                {endmillData.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-sm border border-divider bg-paper px-2 py-0.5 text-caption text-ink-soft"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 공급업체 정보 (요약 표) */}
        <section className="rounded-md border border-divider bg-paper-warm p-5">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-ink-soft" aria-hidden="true" />
            <h3 className="text-title font-semibold text-ink no-break">
              {t('endmill.supplierInfoTable')}
            </h3>
          </div>

          {endmillData.suppliers && endmillData.suppliers.length > 0 ? (
            <div className="overflow-hidden rounded-sm border border-divider">
              <table className="min-w-full divide-y divide-divider">
                <thead className="bg-paper">
                  <tr>
                    <th className="px-3 py-2 text-left text-caption font-medium uppercase tracking-wider text-ink-soft">
                      {t('endmill.supplierName')}
                    </th>
                    <th className="px-3 py-2 text-right text-caption font-medium uppercase tracking-wider text-ink-soft">
                      {t('endmill.unitPrice')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider bg-paper-warm">
                  {endmillData.suppliers.map((supplier: any, index: number) => (
                    <tr key={index} className="transition-colors hover:bg-paper">
                      <td className="whitespace-nowrap px-3 py-2 text-label font-medium text-ink no-break">
                        {supplier.code || supplier.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-label text-ink tabular">
                        {(supplier.unitPrice ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-caption text-ink-soft">—</p>
          )}

          {(endmillData.predictedNextChange || endmillData.recommendedStock) && (
            <div className="mt-5 rounded-sm border border-divider bg-paper p-3">
              <p className="mb-2 text-caption font-medium text-ink-soft">
                {t('endmill.predictionInfo')}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {endmillData.predictedNextChange && (
                  <div>
                    <p className="text-caption text-ink-soft">{t('endmill.nextChangeDate')}</p>
                    <p className="text-label font-medium text-gauge-cobalt-strong tabular">
                      {endmillData.predictedNextChange}
                    </p>
                  </div>
                )}
                {endmillData.recommendedStock && (
                  <div>
                    <p className="text-caption text-ink-soft">
                      {t('endmill.recommendedStockLabel')}
                    </p>
                    <p className="text-label font-medium text-signal-go-strong tabular">
                      {endmillData.recommendedStock}
                      {t('endmill.unit')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 공급업체별 가격 정보 (전체 너비) */}
        {endmillData.id && (
          <section className="rounded-md border border-divider bg-paper-warm p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4 text-ink-soft" aria-hidden="true" />
              <h3 className="text-title font-semibold text-ink no-break">
                {t('endmill.supplierInfoSection')}
              </h3>
            </div>
            <EndmillSupplierPrices
              endmillId={endmillData.id}
              endmillCode={endmillData.code}
            />
          </section>
        )}

        {/* 등록된 CAM Sheet 사양 */}
        <section className="rounded-md border border-divider bg-paper-warm p-5 lg:col-span-2">
          <h3 className="mb-4 text-title font-semibold text-ink no-break">
            {t('endmill.camSheetSection')}
          </h3>
          {endmillData.camSheets && endmillData.camSheets.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {endmillData.camSheets.map((cam: any, index: number) => (
                <div
                  key={index}
                  className="rounded-sm border border-divider bg-paper p-3"
                >
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="text-label font-semibold text-ink no-break">
                      <NoBreak>{cam.model}</NoBreak>
                    </span>
                    <span className="text-caption text-ink-mute">·</span>
                    <span className="text-caption text-ink-soft">{cam.process}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-caption">
                    <div>
                      <span className="text-ink-soft">{t('endmill.camTNumber')}: </span>
                      <span className="font-medium text-gauge-cobalt-strong tabular">
                        T{cam.tNumber?.toString().padStart(2, '0') || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-soft">{t('endmill.camToolLife')}: </span>
                      <span className="font-medium text-ink tabular">
                        {cam.toolLife?.toLocaleString() || 'N/A'}
                        {t('endmill.timesSuffix')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-caption text-ink-soft">
              {t('endmill.noCAMSheets')}
            </p>
          )}
        </section>

        {/* 실시간 사용 현황 (전체 너비) */}
        <section className="rounded-md border border-divider bg-paper-warm p-5 lg:col-span-2">
          <h3 className="mb-4 text-title font-semibold text-ink no-break">
            {t('endmill.realtimeUsageSection')}
          </h3>
          {sortedCurrentUsage.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-sm border border-divider">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-divider">
                    <thead className="bg-paper">
                      <tr>
                        <SortHeader
                          label={t('endmill.equipmentModel')}
                          field="equipmentModel"
                          currentField={sortField}
                          order={sortOrder}
                          onSort={handleSort}
                        />
                        <SortHeader
                          label={t('endmill.equipmentProcess')}
                          field="equipmentProcess"
                          currentField={sortField}
                          order={sortOrder}
                          onSort={handleSort}
                        />
                        <SortHeader
                          label={t('endmill.camToolLifeLabel')}
                          field="specToolLife"
                          currentField={sortField}
                          order={sortOrder}
                          onSort={handleSort}
                        />
                        <th className="px-3 py-2 text-left text-caption font-medium uppercase tracking-wider text-ink-soft">
                          {t('endmill.actualAverageLife')}
                        </th>
                        <SortHeader
                          label={t('endmill.usedEquipmentLabel')}
                          field="equipmentNumber"
                          currentField={sortField}
                          order={sortOrder}
                          onSort={handleSort}
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider bg-paper-warm">
                      {currentUsageItems.map((usage: any, index: number) => (
                        <tr key={index} className="transition-colors hover:bg-paper">
                          <td className="whitespace-nowrap px-3 py-2 text-label font-medium text-ink no-break">
                            {usage.equipmentModel || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-label text-ink no-break">
                            {usage.equipmentProcess || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-label font-medium text-gauge-cobalt-strong tabular">
                            {usage.specToolLife
                              ? `${usage.specToolLife.toLocaleString()}${t('endmill.timesSuffix')}`
                              : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-label text-ink tabular">
                            {usage.averageActualLife ? (
                              `${usage.averageActualLife.toLocaleString()}${t('endmill.timesSuffix')}`
                            ) : (
                              <span className="text-ink-mute">{t('endmill.noDataAvailable')}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-label font-medium text-ink tabular no-break">
                                {usage.equipmentNumber?.toString().startsWith('C')
                                  ? usage.equipmentNumber
                                  : `C${usage.equipmentNumber?.toString().padStart(3, '0')}`}
                              </span>
                              <span className="text-caption text-ink-soft tabular">
                                T{usage.positionNumber?.toString().padStart(2, '0')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-3 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-caption text-ink-soft tabular">
                    {t('endmill.total')}{' '}
                    <span className="font-medium text-ink">{sortedCurrentUsage.length}</span>
                    {t('endmill.of')}{' '}
                    <span className="font-medium text-ink">{startIndex + 1}</span>
                    {' '}~{' '}
                    <span className="font-medium text-ink">
                      {Math.min(endIndex, sortedCurrentUsage.length)}
                    </span>{' '}
                    {t('endmill.display')}
                  </p>
                  <nav className="inline-flex items-center gap-1" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-divider bg-paper text-ink-soft transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={t('endmill.previous')}
                    >
                      ‹
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) pageNum = i + 1
                      else if (currentPage <= 3) pageNum = i + 1
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                      else pageNum = currentPage - 2 + i
                      const isActive = currentPage === pageNum
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={
                            isActive
                              ? 'inline-flex h-9 min-w-9 items-center justify-center rounded-sm bg-gauge-cobalt px-3 text-caption font-semibold text-paper tabular'
                              : 'inline-flex h-9 min-w-9 items-center justify-center rounded-sm border border-divider bg-paper px-3 text-caption font-medium text-ink-soft transition-colors hover:bg-paper-warm tabular'
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
                      className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-divider bg-paper text-ink-soft transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={t('endmill.next')}
                    >
                      ›
                    </button>
                  </nav>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-paper">
                <Wrench className="h-6 w-6 text-ink-mute" aria-hidden="true" />
              </div>
              <p className="text-caption text-ink-soft">{t('endmill.noEquipmentInUse')}</p>
            </div>
          )}
        </section>

        {/* 최근 교체 이력 (전체 너비) */}
        <section className="rounded-md border border-divider bg-paper-warm p-5 lg:col-span-2">
          <h3 className="mb-4 text-title font-semibold text-ink no-break">
            {t('endmill.recentChangesSection')}
          </h3>
          {endmillData.recentChanges && endmillData.recentChanges.length > 0 ? (
            <div className="space-y-2">
              {endmillData.recentChanges.slice(0, 8).map((change: any, index: number) => (
                <div
                  key={index}
                  className="border-l-2 border-gauge-cobalt-soft pl-3 py-1.5"
                >
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <span className="text-label font-medium text-ink tabular no-break">
                      {change.equipmentNumber}
                    </span>
                    <span className="text-caption text-ink-soft tabular">{change.changeDate}</span>
                  </div>
                  <p className="mb-0.5 text-caption text-ink-soft">
                    T{change.tNumber?.toString().padStart(2, '0')} - {change.changeReason}
                  </p>
                  <p className="text-caption text-ink-mute tabular">
                    {t('endmill.changedBy')}: {change.changedBy} | {t('endmill.previousLifeLabel')}:{' '}
                    {change.previousLife?.toLocaleString()}
                    {t('endmill.timesSuffix')}
                  </p>
                </div>
              ))}
              {endmillData.recentChanges.length > 8 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    className="text-caption font-medium text-gauge-cobalt-strong transition-colors hover:text-gauge-cobalt"
                  >
                    {t('endmill.viewAllHistory')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-center text-caption text-ink-soft">—</p>
          )}
        </section>
      </div>

      {/* 수정 모달 */}
      {showEditModal && endmillData && (
        <div
          className="mobile-modal-container"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="mobile-modal-content md:max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('endmill.editInfoTitle')} {endmillData.code}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mobile-modal-body space-y-5">
              {/* 기본 정보 (수정불가) */}
              <div>
                <h4 className="mb-3 text-label font-semibold text-ink">
                  {t('endmill.basicInfoEdit')}
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <ReadonlyField
                    label={t('endmill.endmillCode')}
                    value={endmillData.code}
                  />
                  <ReadonlyField
                    label={t('endmill.category')}
                    value={endmillData.categoryName || endmillData.category}
                  />
                  <ReadonlyField
                    label={t('endmill.endmillName')}
                    value={endmillData.name || ''}
                  />
                </div>
              </div>

              {/* 재고 관리 (수정 가능) */}
              <div>
                <h4 className="mb-3 text-label font-semibold text-ink">
                  {t('endmill.inventoryManagement')}
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <EditableField
                    label={t('endmill.minStock')}
                    defaultValue={endmillData.inventory?.min_stock || ''}
                  />
                  <EditableField
                    label={t('inventory.maxStockLabel')}
                    defaultValue={endmillData.inventory?.max_stock || ''}
                  />
                  <EditableField
                    label={t('endmill.recommendedStock')}
                    defaultValue={endmillData.recommendedStock || ''}
                  />
                </div>
              </div>
            </div>
            <div className="mobile-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm sm:w-auto"
              >
                {t('endmill.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="inline-flex min-h-touch items-center justify-center rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong sm:w-auto"
              >
                {t('inventory.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로더 */}
      {showExcelUploader && (
        <EndmillMasterUploader
          onDataParsed={handleMasterDataUpdate}
          onClose={() => setShowExcelUploader(false)}
        />
      )}
    </div>
  )
}

// === 서브 컴포넌트 ===

interface StatCellProps {
  label: string
  value: number | string
  accent?: 'go' | 'watch'
}

function StatCell({ label, value, accent }: StatCellProps) {
  const valueClass =
    accent === 'go'
      ? 'text-headline font-semibold text-signal-go-strong tabular'
      : accent === 'watch'
        ? 'text-headline font-semibold text-signal-watch-strong tabular'
        : 'text-headline font-semibold text-ink tabular'
  return (
    <div className="bg-paper-warm px-4 py-4">
      <p className="text-caption text-ink-soft no-break">{label}</p>
      <p className={`mt-1 ${valueClass}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

interface SubSectionProps {
  title: string
  children: React.ReactNode
}

function SubSection({ title, children }: SubSectionProps) {
  return (
    <div>
      <h4 className="mb-2 border-b border-divider pb-1 text-label font-semibold text-ink no-break">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface FieldRowProps {
  label: string
  children: React.ReactNode
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-caption text-ink-soft">{label}</p>
      <div>{children}</div>
    </div>
  )
}

function QualityBadge({ grade }: { grade: string }) {
  const variant =
    grade === 'A+' || grade === 'A'
      ? 'bg-signal-go-soft text-signal-go-strong'
      : grade === 'B+' || grade === 'B'
        ? 'bg-signal-watch-soft text-signal-watch-strong'
        : 'bg-signal-stop-soft text-signal-stop-strong'
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-semibold ${variant}`}
    >
      {grade}
    </span>
  )
}

interface RatingBarProps {
  value: number
  flat?: boolean
}

function RatingBar({ value, flat }: RatingBarProps) {
  const colorClass = flat
    ? 'bg-gauge-cobalt'
    : value >= 90
      ? 'bg-signal-go-strong'
      : value >= 80
        ? 'bg-gauge-cobalt'
        : value >= 70
          ? 'bg-signal-watch-strong'
          : 'bg-signal-stop-strong'
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-paper">
        <div
          className={`h-1.5 rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-caption font-medium text-ink tabular">{value}</span>
    </div>
  )
}

interface SortHeaderProps {
  label: string
  field: SortField
  currentField: SortField
  order: SortOrder
  onSort: (field: SortField) => void
}

function SortHeader({ label, field, currentField, order, onSort }: SortHeaderProps) {
  const isActive = currentField === field
  const Icon = !isActive ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      className="cursor-pointer px-3 py-2 text-left text-caption font-medium uppercase tracking-wider text-ink-soft transition-colors hover:bg-paper-warm"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <Icon className="h-3 w-3" aria-hidden="true" />
      </div>
    </th>
  )
}

interface ReadonlyFieldProps {
  label: string
  value: string | number
}

function ReadonlyField({ label, value }: ReadonlyFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-caption font-medium text-ink-soft">{label}</label>
      <input
        type="text"
        value={value}
        disabled
        className="w-full cursor-not-allowed rounded-sm border border-divider bg-paper-warm px-3 py-2 text-label text-ink-soft"
      />
    </div>
  )
}

interface EditableFieldProps {
  label: string
  defaultValue: string | number
}

function EditableField({ label, defaultValue }: EditableFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-caption font-medium text-ink-soft">{label}</label>
      <input
        type="number"
        defaultValue={defaultValue}
        className="w-full rounded-sm border border-divider bg-paper px-3 py-2 text-label text-ink focus:border-gauge-cobalt focus:outline-none focus:ring-1 focus:ring-gauge-cobalt"
      />
    </div>
  )
}
