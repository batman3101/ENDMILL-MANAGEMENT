'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import {
  Plus,
  FileDown,
  FileSpreadsheet,
  Upload,
  Wrench,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { useToast } from '../../../components/shared/Toast'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useFactory } from '@/lib/hooks/useFactory'
import { supabase } from '../../../lib/supabase/client'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/status-badge'
import { NoBreak } from '@/components/ui/no-break'
import {
  EndmillListCard,
  type EndmillListCardLabels,
} from '@/components/features/endmill/endmill-list-card'
import EndmillForm from '../../../components/features/EndmillForm'
import { clientLogger } from '@/lib/utils/logger'

const EndmillExcelUploader = dynamic(
  () => import('../../../components/features/EndmillExcelUploader'),
  { ssr: false }
)

interface EndmillInstance {
  id: string
  code: string
  name: string
  category: string
  equipment: string
  location: string
  process: string
  position: string
  currentLife: number
  totalLife: number
  status: 'new' | 'active' | 'warning' | 'critical'
  installDate: string
  lastMaintenance: string
  camSheets?: Array<{
    model: string
    process: string
    toolLife: number
    tNumber: number
  }>
}

function statusVariant(status: EndmillInstance['status']): StatusBadgeVariant {
  switch (status) {
    case 'active':
      return 'go'
    case 'warning':
      return 'watch'
    case 'critical':
      return 'stop'
    case 'new':
    default:
      return 'neutral'
  }
}

function statusLabelKey(status: EndmillInstance['status']): string {
  switch (status) {
    case 'new':
      return 'endmill.new'
    case 'active':
      return 'endmill.inUse'
    case 'warning':
      return 'endmill.warning'
    case 'critical':
      return 'endmill.danger'
    default:
      return 'endmill.statusUnknown'
  }
}

export default function EndmillPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  const [endmills, setEndmills] = useState<EndmillInstance[]>([])
  const [equipments, setEquipments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showExcelUploader, setShowExcelUploader] = useState(false)
  const [showEndmillForm, setShowEndmillForm] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  const lastRefreshTimeRef = useRef<number>(0)
  const { showSuccess, showError } = useToast()
  const { settings } = useSettings()
  const itemsPerPage = settings.system.itemsPerPage

  // 동적 카테고리 추출
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    endmills.forEach((endmill) => {
      if (endmill.category) uniqueCategories.add(endmill.category)
    })
    return Array.from(uniqueCategories).sort()
  }, [endmills])

  const throttledRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshTimeRef.current > 3000) {
      lastRefreshTimeRef.current = now
      loadEndmillData()
      loadEquipmentData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 데이터 로드 + 실시간 구독
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const searchParam = urlParams.get('search')
    if (searchParam) {
      setSearchTerm(searchParam)
      window.history.replaceState({}, '', window.location.pathname)
    }

    loadEndmillData()
    loadEquipmentData()

    const endmillChannel = supabase
      .channel('endmill_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'endmill_types' }, throttledRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'endmill_categories' }, throttledRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, throttledRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cam_sheet_endmills' }, throttledRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'endmill_supplier_prices' }, throttledRefresh)
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED')
      })

    const equipmentChannel = supabase
      .channel('equipment_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, throttledRefresh)
      .subscribe()

    return () => {
      supabase.removeChannel(endmillChannel)
      supabase.removeChannel(equipmentChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factoryId])

  const loadEndmillData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        '/api/endmill?' + new URLSearchParams({ ...(factoryId && { factoryId }) })
      )
      if (!response.ok) throw new Error('endmill data load failed')
      const result = await response.json()
      if (result.success) {
        const transformedData: EndmillInstance[] = result.data.map((item: any) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.categoryName || item.category || 'N/A',
          equipment:
            Array.from(new Set(item.camSheets?.map((cs: any) => cs.model) || [])).join(', ') || 'N/A',
          location: item.inventory?.location || 'N/A',
          process:
            Array.from(new Set(item.camSheets?.map((cs: any) => cs.process) || [])).join(', ') || 'N/A',
          position:
            Array.from(new Set(item.camSheets?.map((cs: any) => `T${cs.tNumber}`) || [])).join(', ') ||
            'N/A',
          currentLife: 0,
          totalLife: item.camSheets?.[0]?.toolLife || item.standardLife || 1000,
          status: item.inventory?.status || 'new',
          installDate: new Date().toISOString().split('T')[0],
          lastMaintenance: new Date().toISOString().split('T')[0],
          camSheets: item.camSheets || [],
        }))
        setEndmills(transformedData)
      } else {
        showError(t('endmill.loadDataFailed'), t('endmill.loadDataFailedMessage'))
      }
    } catch (error) {
      clientLogger.error('엔드밀 데이터 로드 오류:', error)
      showError(t('endmill.loadDataError'), t('endmill.loadDataErrorMessage'))
    } finally {
      setIsLoading(false)
    }
  }

  const loadEquipmentData = async () => {
    try {
      const response = await fetch(
        '/api/equipment?' + new URLSearchParams({ ...(factoryId && { factoryId }) })
      )
      if (!response.ok) throw new Error('equipment data load failed')
      const result = await response.json()
      if (result.success) {
        setEquipments(result.data)
      }
    } catch (error) {
      clientLogger.error('설비 데이터 로드 오류:', error)
    }
  }

  // 필터링
  const filteredEndmills = useMemo(() => {
    return endmills.filter((item) => {
      const matchesSearch =
        searchTerm === '' ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === '' || item.status === statusFilter
      const matchesType =
        typeFilter === '' || item.category.toLowerCase() === typeFilter.toLowerCase()
      return matchesSearch && matchesStatus && matchesType
    })
  }, [endmills, searchTerm, statusFilter, typeFilter])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedEndmills = useMemo(() => {
    const arr = [...filteredEndmills]
    if (!sortColumn) return arr
    return arr.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof EndmillInstance]
      let bValue: any = b[sortColumn as keyof EndmillInstance]
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      aValue = aValue?.toString() || ''
      bValue = bValue?.toString() || ''
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    })
  }, [filteredEndmills, sortColumn, sortDirection])

  const totalPages = Math.ceil(sortedEndmills.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEndmills = sortedEndmills.slice(startIndex, endIndex)

  // 필터 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter])

  // page guard: 결과가 줄어 현재 페이지가 범위를 벗어나면 마지막 페이지로
  // 함수형 업데이트로 currentPage를 deps에서 제거 — R18 strict/concurrent 친화
  useEffect(() => {
    setCurrentPage((prev) =>
      totalPages > 0 && prev > totalPages ? totalPages : prev
    )
  }, [totalPages])

  // 사용 설비 수 (실제 설비 데이터 기반)
  const getEndmillUsageCount = useCallback(
    (code: string): number => {
      const endmillData = endmills.find((e) => e.code === code)
      if (!endmillData?.camSheets) return 0
      const modelProcessPairs = endmillData.camSheets.map((cs: any) => ({
        model: cs.model,
        process: cs.process,
      }))
      return equipments.filter((eq) =>
        modelProcessPairs.some(
          (pair) => eq.current_model === pair.model && eq.process === pair.process
        )
      ).length
    },
    [endmills, equipments]
  )

  // 이름 정리: prefix(타입명) 제거
  const cleanedName = useCallback(
    (name: string) => name.replace(/^(FLAT|BALL|T-CUT|C-CUT|REAMER|DRILL)\s*/i, ''),
    []
  )

  const handleViewDetail = (item: { code: string }) => {
    router.push(`/dashboard/endmill-detail/${item.code}`)
  }

  const handleDownloadTemplate = async () => {
    const { downloadEndmillTemplate } = await import('../../../lib/utils/endmillExcelTemplate')
    const result = await downloadEndmillTemplate()
    if (result.success) {
      showSuccess(
        t('endmill.templateDownloadTitle'),
        t('endmill.templateDownloadMessage', { fileName: result.fileName })
      )
    } else {
      showError(
        t('endmill.downloadFailed'),
        result.error || t('endmill.downloadError')
      )
    }
  }

  const handleDownloadSupplierPriceList = async () => {
    try {
      const response = await fetch('/api/endmill/supplier-price-list')
      if (!response.ok) throw new Error('price list download failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `supplier_price_list_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess(t('endmill.downloadSupplierPriceList'), t('endmill.supplierPriceListDownloaded'))
    } catch (error) {
      clientLogger.error('단가표 다운로드 오류:', error)
      showError(t('endmill.downloadPriceListFailed'), t('endmill.downloadPriceListError'))
    }
  }

  const handleUploadSuccess = () => {
    showSuccess(t('endmill.uploadComplete'), t('endmill.uploadCompleteMessage'))
    queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    loadEndmillData()
  }

  const handleCreateSuccess = () => {
    showSuccess(t('endmill.registerComplete'), t('endmill.registerCompleteMessage'))
    queryClient.invalidateQueries({ queryKey: ['cam-sheets'] })
    loadEndmillData()
  }

  // 카드 라벨 (i18n 키 부모 주입)
  const cardLabels: EndmillListCardLabels = useMemo(
    () => ({
      category: t('endmill.categoryLabel'),
      name: t('endmill.nameLabel'),
      usedEquipment: t('endmill.usageCountLabel'),
      detailView: t('endmill.detailViewButton'),
      statusNew: t('endmill.new'),
      statusActive: t('endmill.inUse'),
      statusWarning: t('endmill.warning'),
      statusCritical: t('endmill.danger'),
      statusUnknown: t('endmill.statusUnknown'),
    }),
    [t]
  )

  // 로딩
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-paper-warm">
              <Wrench className="h-8 w-8 text-ink-soft" aria-hidden="true" />
            </div>
            <p className="text-body text-ink-soft">{t('endmill.loadingData')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 액션 바 (실시간 상태 + 4개 액션) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {isRealtimeConnected ? (
            <Wifi className="h-3.5 w-3.5 text-signal-go-strong" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-signal-stop-strong" aria-hidden="true" />
          )}
          <span
            className={
              isRealtimeConnected
                ? 'text-caption font-medium text-signal-go-strong'
                : 'text-caption font-medium text-signal-stop-strong'
            }
          >
            {isRealtimeConnected ? t('endmill.realtimeConnected') : t('endmill.connecting')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowEndmillForm(true)}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-gauge-cobalt px-4 py-2 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('endmill.newEndmillRegister')}</NoBreak>
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm border border-divider bg-paper px-4 py-2 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('endmill.excelTemplateDownload')}</NoBreak>
          </button>
          <button
            type="button"
            onClick={handleDownloadSupplierPriceList}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm border border-divider bg-paper px-4 py-2 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
            title={t('endmill.supplierPriceListTooltip')}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('endmill.supplierPriceList')}</NoBreak>
          </button>
          <button
            type="button"
            onClick={() => setShowExcelUploader(true)}
            className="inline-flex min-h-touch items-center gap-2 rounded-sm border border-divider bg-paper px-4 py-2 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <NoBreak>{t('endmill.endmillBulkRegister')}</NoBreak>
          </button>
        </div>
      </div>

      {/* 필터 / 검색 */}
      <div className="rounded-md border border-divider bg-paper-warm p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('endmill.searchPlaceholderEndmill')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-touch rounded-sm border border-divider bg-paper px-3 py-2 text-body text-ink placeholder:text-ink-mute focus:border-gauge-cobalt focus:outline-none focus:ring-1 focus:ring-gauge-cobalt"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-touch rounded-sm border border-divider bg-paper px-3 py-2 pr-8 text-body text-ink focus:border-gauge-cobalt focus:outline-none focus:ring-1 focus:ring-gauge-cobalt"
          >
            <option value="">{t('endmill.allStatus')}</option>
            <option value="new">{t('endmill.new')}</option>
            <option value="active">{t('endmill.inUse')}</option>
            <option value="warning">{t('endmill.warning')}</option>
            <option value="critical">{t('endmill.danger')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-h-touch rounded-sm border border-divider bg-paper px-3 py-2 pr-8 text-body text-ink focus:border-gauge-cobalt focus:outline-none focus:ring-1 focus:ring-gauge-cobalt"
          >
            <option value="">{t('endmill.allType')}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        {(searchTerm || statusFilter || typeFilter) && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
                setCurrentPage(1)
              }}
              className="text-caption font-medium text-gauge-cobalt-strong transition-colors hover:text-gauge-cobalt"
            >
              {t('endmill.filterReset')}
            </button>
          </div>
        )}
      </div>

      {/* 목록 카운트 헤더 */}
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold text-ink no-break">
          {t('endmill.endmillStatusList')} ({sortedEndmills.length}
          {t('endmill.count')})
        </h2>
        <p className="text-caption text-ink-soft tabular">
          {t('endmill.page')} {currentPage} / {Math.max(totalPages, 1)} ({t('endmill.perPage')}{' '}
          {itemsPerPage}
          {t('endmill.items')})
        </p>
      </div>

      {/* 모바일 카드 (lg 미만) */}
      <div className="space-y-3 lg:hidden">
        {currentEndmills.map((item) => (
          <EndmillListCard
            key={item.id}
            item={{
              id: item.id,
              code: item.code,
              category: item.category,
              name: cleanedName(item.name),
              usedEquipmentCount: getEndmillUsageCount(item.code),
              status: item.status,
            }}
            labels={cardLabels}
            onOpen={() => handleViewDetail(item)}
          />
        ))}
      </div>

      {/* 데스크톱 표 (lg 이상) */}
      <div className="hidden overflow-hidden rounded-md border border-divider bg-paper-warm lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-paper-warm">
              <tr>
                <SortableTableHeader
                  label={t('endmill.endmillCodeLabel')}
                  field="code"
                  currentSortField={sortColumn}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('endmill.categoryLabel')}
                  field="category"
                  currentSortField={sortColumn}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('endmill.nameLabel')}
                  field="name"
                  currentSortField={sortColumn}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 text-left text-caption font-medium uppercase tracking-wider text-ink-soft">
                  {t('endmill.usageCountLabel')}
                </th>
                <th className="px-4 py-3 text-left text-caption font-medium uppercase tracking-wider text-ink-soft">
                  {t('endmill.statusLabel')}
                </th>
                <th className="px-4 py-3 text-left text-caption font-medium uppercase tracking-wider text-ink-soft">
                  {t('endmill.actionsLabel')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-paper">
              {currentEndmills.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-paper-warm">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-label font-medium text-gauge-cobalt-strong tabular no-break">
                      <NoBreak>{item.code}</NoBreak>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-label text-ink no-break">{item.category}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-label text-ink">{cleanedName(item.name)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-label font-medium text-ink tabular">
                      {getEndmillUsageCount(item.code)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge
                      variant={statusVariant(item.status)}
                      label={t(statusLabelKey(item.status))}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleViewDetail(item)}
                      className="text-caption font-medium text-gauge-cobalt-strong transition-colors hover:text-gauge-cobalt"
                    >
                      {t('endmill.detailViewButton')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-md border border-divider bg-paper-warm px-4 py-3 sm:flex-row">
          <p className="text-caption text-ink-soft tabular">
            {t('endmill.total')}{' '}
            <span className="font-medium text-ink">{sortedEndmills.length}</span>
            {t('endmill.of')}{' '}
            <span className="font-medium text-ink">{startIndex + 1}</span>-
            <span className="font-medium text-ink">
              {Math.min(endIndex, sortedEndmills.length)}
            </span>
            {t('endmill.display')}
          </p>
          <nav className="inline-flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-divider bg-paper text-ink-soft transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t('endmill.previousButton')}
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
              aria-label={t('endmill.nextButton')}
            >
              ›
            </button>
          </nav>
        </div>
      )}

      {/* 빈 상태 */}
      {endmills.length === 0 && !isLoading && (
        <div className="rounded-md border border-divider bg-paper-warm py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-paper">
            <Wrench className="h-8 w-8 text-ink-mute" aria-hidden="true" />
          </div>
          <p className="text-title font-medium text-ink">{t('endmill.noEndmillData')}</p>
          <p className="mt-1 text-caption text-ink-soft">{t('endmill.noEndmillMessage')}</p>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {endmills.length > 0 && sortedEndmills.length === 0 && (
        <div className="rounded-md border border-divider bg-paper-warm py-8 text-center">
          <p className="text-caption text-ink-soft">{t('endmill.noSearchResults')}</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('')
              setTypeFilter('')
              setCurrentPage(1)
            }}
            className="mt-2 text-caption font-medium text-gauge-cobalt-strong transition-colors hover:text-gauge-cobalt"
          >
            {t('endmill.filterReset')}
          </button>
        </div>
      )}

      {/* 개별 등록 모달 */}
      {showEndmillForm && (
        <EndmillForm
          onSuccess={handleCreateSuccess}
          onClose={() => setShowEndmillForm(false)}
        />
      )}

      {/* 엑셀 업로더 모달 */}
      {showExcelUploader && (
        <EndmillExcelUploader
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowExcelUploader(false)}
        />
      )}
    </div>
  )
}
