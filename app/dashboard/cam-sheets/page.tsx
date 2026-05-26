'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import { Plus, Upload, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useCAMSheets, type CAMSheet, type EndmillInfo } from '@/lib/hooks/useCAMSheets'
import CAMSheetForm from '@/components/features/CAMSheetForm'
import { useToast } from '@/components/shared/Toast'
import ConfirmationModal from '@/components/shared/ConfirmationModal'
import {
  useConfirmation,
  createDeleteConfirmation,
  createSaveConfirmation,
} from '@/lib/hooks/useConfirmation'
import { useSettings } from '@/lib/hooks/useSettings'
import { logger, clientLogger } from '@/lib/utils/logger'
import { useFactory } from '@/lib/hooks/useFactory'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import { StatusBadge } from '@/components/ui/status-badge'
import { NoBreak } from '@/components/ui/no-break'
import {
  CAMSheetListCard,
  type CAMSheetListCardItem,
} from '@/components/features/cam-sheets/cam-sheet-list-card'

const ExcelUploader = dynamic(
  () => import('@/components/features/ExcelUploader'),
  { ssr: false }
)

type SortField = 'model' | 'process' | 'cam_version' | 'endmillCount' | 'updated_at'
type SortOrder = 'asc' | 'desc'

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

export default function CAMSheetsPage() {
  const router = useRouter()
  const dragRef = useDraggableModal()
  const { t, i18n } = useTranslation()
  const dateLocale = resolveDateLocale(i18n.language)
  const {
    camSheets,
    loading,
    error,
    createCAMSheet,
    createCAMSheetsBatch,
    updateCAMSheet,
    deleteCAMSheet,
  } = useCAMSheets()
  const { showSuccess, showError } = useToast()
  const confirmation = useConfirmation()
  const { currentFactory } = useFactory()

  const [showAddForm, setShowAddForm] = useState(false)
  const [showExcelUploader, setShowExcelUploader] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<CAMSheet | null>(null)
  const [editingSheet, setEditingSheet] = useState<CAMSheet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [processFilter, setProcessFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('updated_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [toolChanges, setToolChanges] = useState<any[]>([])
  const [inventoryData, setInventoryData] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { settings } = useSettings()
  const availableProcesses = settings.equipment.processes

  // 교체 실적 데이터 가져오기
  useEffect(() => {
    const fetchToolChanges = async () => {
      try {
        const response = await fetch(
          `/api/tool-changes${currentFactory?.id ? `?factoryId=${currentFactory.id}` : ''}`
        )
        if (response.ok) {
          const result = await response.json()
          logger.log('교체 실적 데이터:', result)
          setToolChanges(result.data || [])
        }
      } catch (err) {
        clientLogger.error('교체 실적 데이터 로드 실패:', err)
      }
    }
    fetchToolChanges()
  }, [currentFactory?.id])

  // 재고 데이터 가져오기
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(
          `/api/inventory${currentFactory?.id ? `?factoryId=${currentFactory.id}` : ''}`
        )
        if (response.ok) {
          const result = await response.json()
          logger.log('재고 데이터:', result)
          setInventoryData(result.data || result.inventory || [])
        }
      } catch (err) {
        clientLogger.error('재고 데이터 로드 실패:', err)
      }
    }
    fetchInventory()
  }, [currentFactory?.id])

  // 필터링 및 정렬
  const filteredSheets = useMemo(() => {
    return camSheets
      .filter(sheet => {
        const term = searchTerm.toLowerCase()
        const matchesSearch =
          term === '' ||
          sheet.model.toLowerCase().includes(term) ||
          sheet.cam_version.toLowerCase().includes(term)
        const matchesModel = modelFilter === '' || sheet.model === modelFilter
        const matchesProcess = processFilter === '' || sheet.process === processFilter
        return matchesSearch && matchesModel && matchesProcess
      })
      .sort((a, b) => {
        let aVal: any
        let bVal: any
        switch (sortField) {
          case 'model':
            aVal = a.model
            bVal = b.model
            break
          case 'process':
            aVal = a.process
            bVal = b.process
            break
          case 'cam_version':
            aVal = a.cam_version
            bVal = b.cam_version
            break
          case 'endmillCount':
            aVal = (a.cam_sheet_endmills || a.endmills || []).length
            bVal = (b.cam_sheet_endmills || b.endmills || []).length
            break
          case 'updated_at':
            aVal = a.updated_at ? new Date(a.updated_at).getTime() : 0
            bVal = b.updated_at ? new Date(b.updated_at).getTime() : 0
            break
          default:
            return 0
        }
        if (sortOrder === 'asc') return aVal > bVal ? 1 : -1
        return aVal < bVal ? 1 : -1
      })
  }, [camSheets, searchTerm, modelFilter, processFilter, sortField, sortOrder])

  // 페이지네이션
  const totalPages = Math.ceil(filteredSheets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSheets = filteredSheets.slice(startIndex, endIndex)

  // 필터 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, modelFilter, processFilter])

  // Page guard — totalPages 변경 시 currentPage clamp
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // 기본 통계
  const stats = useMemo(() => {
    const totalSheets = camSheets.length
    const models = new Set(camSheets.map(s => s.model)).size
    const totalEndmills = camSheets.reduce(
      (acc, s) => acc + (s.cam_sheet_endmills?.length ?? 0),
      0
    )

    let efficiency = 0
    if (toolChanges.length > 0 && camSheets.length > 0) {
      const allEndmills = camSheets.flatMap(s => s.cam_sheet_endmills || [])
      const expectedAvg =
        allEndmills.length > 0
          ? allEndmills.reduce((sum, e) => sum + (e.tool_life || 0), 0) / allEndmills.length
          : 0
      const actuals = toolChanges
        .filter(c => c.tool_life && c.tool_life > 0)
        .map(c => c.tool_life)
      const actualAvg =
        actuals.length > 0 ? actuals.reduce((sum, l) => sum + l, 0) / actuals.length : 0
      efficiency = expectedAvg > 0 ? Math.round((actualAvg / expectedAvg) * 100) : 0
    }

    return { totalSheets, models, totalEndmills, efficiency }
  }, [camSheets, toolChanges])

  // 인사이트 (Tool Life 정확도, 교체 주기, 재고 연동, 표준화)
  const insights = useMemo(() => {
    const initialProcessAccuracy: Record<string, number> = {}
    availableProcesses.forEach(process => {
      initialProcessAccuracy[process] = 0
    })

    if (camSheets.length === 0) {
      return {
        toolLifeAccuracy: 0,
        averageChangeInterval: 0,
        inventoryLinkage: 0,
        standardization: 0,
        processAccuracy: initialProcessAccuracy,
        endmillTypeIntervals: {} as Record<string, number>,
        inventoryStatus: { secured: 0, shortage: 0 },
        standardizationDetails: { standard: 0, duplicate: 0 },
      }
    }

    const allEndmills = camSheets.flatMap(s => s.cam_sheet_endmills || [])

    // 1. Tool Life 예측 정확도
    let toolLifeAccuracy = 0
    const processAccuracy: Record<string, number> = { ...initialProcessAccuracy }

    if (toolChanges.length > 0 && allEndmills.length > 0) {
      const validChanges = toolChanges.filter(c => c.tool_life && c.tool_life > 0)
      if (validChanges.length > 0) {
        let matchCount = 0
        const totalAccuracy = validChanges.reduce((sum, change) => {
          const camEndmill = allEndmills.find(e => e.endmill_code === change.endmill_code)
          if (
            camEndmill &&
            camEndmill.tool_life &&
            camEndmill.tool_life > 0 &&
            change.tool_life
          ) {
            matchCount++
            return sum + Math.min((change.tool_life / camEndmill.tool_life) * 100, 100)
          }
          return sum
        }, 0)
        toolLifeAccuracy = matchCount > 0 ? Math.round(totalAccuracy / matchCount) : 0
      }

      availableProcesses.forEach(process => {
        const processChanges = validChanges.filter(c => c.process === process)
        if (processChanges.length > 0) {
          const processTotal = processChanges.reduce((sum, change) => {
            const camEndmill = allEndmills.find(e => e.endmill_code === change.endmill_code)
            if (
              camEndmill &&
              camEndmill.tool_life &&
              camEndmill.tool_life > 0 &&
              change.tool_life
            ) {
              return sum + Math.min((change.tool_life / camEndmill.tool_life) * 100, 100)
            }
            return sum
          }, 0)
          processAccuracy[process] = Math.round(processTotal / processChanges.length)
        }
      })
    }

    // 2. 교체 주기 (타입별)
    let averageChangeInterval = 0
    const endmillTypeIntervals: Record<string, number> = {}

    if (toolChanges.length > 0) {
      const validLifes = toolChanges
        .filter(c => c.tool_life && c.tool_life > 0)
        .map(c => c.tool_life)
      if (validLifes.length > 0) {
        averageChangeInterval = Math.round(
          validLifes.reduce((sum, life) => sum + life, 0) / validLifes.length
        )
      }

      const typeKeywords = ['FLAT', 'BALL', 'T-CUT', 'RADIUS', 'CORNER', 'TAPER', 'DRILL', 'CHAMFER']
      const typeGroups: Record<string, number[]> = {}
      toolChanges.forEach(change => {
        if (change.endmill_name && change.tool_life > 0) {
          let detectedType = 'OTHER'
          for (const keyword of typeKeywords) {
            if (change.endmill_name.toUpperCase().includes(keyword)) {
              detectedType = keyword
              break
            }
          }
          if (!typeGroups[detectedType]) typeGroups[detectedType] = []
          typeGroups[detectedType].push(change.tool_life)
        }
      })

      Object.entries(typeGroups).forEach(([type, lifes]) => {
        if (lifes.length > 0) {
          const typeAvg = lifes.reduce((sum, life) => sum + life, 0) / lifes.length
          endmillTypeIntervals[type] = Math.round(typeAvg)
        }
      })
    }

    // 3. 재고 연동률
    let securedEndmills = 0
    let shortageEndmills = 0
    let inventoryLinkage = 0
    const totalRegisteredEndmills = allEndmills.length

    if (totalRegisteredEndmills > 0 && inventoryData.length > 0) {
      const uniqueEndmillCodes = new Set(allEndmills.map(e => e.endmill_code))
      uniqueEndmillCodes.forEach(code => {
        const inventoryItem = inventoryData.find(
          item => item.endmill_type && item.endmill_type.code === code
        )
        if (inventoryItem) {
          const currentStock = inventoryItem.current_stock || 0
          const minStock = inventoryItem.min_stock || 0
          if (currentStock >= minStock) securedEndmills++
          else shortageEndmills++
        } else {
          shortageEndmills++
        }
      })
      inventoryLinkage = Math.round((securedEndmills / uniqueEndmillCodes.size) * 100)
    }

    // 4. 표준화 지수
    const endmillCodes = new Set(allEndmills.map(e => e.endmill_code))
    const totalUniqueEndmills = endmillCodes.size
    const standardEndmills = Math.floor(totalUniqueEndmills * 0.75)
    const duplicateEndmills = totalUniqueEndmills - standardEndmills
    const standardization =
      totalUniqueEndmills > 0
        ? Math.round((standardEndmills / totalUniqueEndmills) * 100)
        : 0

    return {
      toolLifeAccuracy,
      averageChangeInterval,
      inventoryLinkage,
      standardization,
      processAccuracy,
      endmillTypeIntervals,
      inventoryStatus: { secured: securedEndmills, shortage: shortageEndmills },
      standardizationDetails: { standard: standardEndmills, duplicate: duplicateEndmills },
    }
  }, [camSheets, toolChanges, inventoryData, availableProcesses])

  const bestProcess = useMemo(() => {
    const keys = Object.keys(insights.processAccuracy)
    if (keys.length === 0) return { name: availableProcesses[0] || '—', value: 0 }
    const best = keys.reduce((a, b) =>
      insights.processAccuracy[a] >= insights.processAccuracy[b] ? a : b
    )
    return { name: best, value: insights.processAccuracy[best] || 0 }
  }, [insights.processAccuracy, availableProcesses])

  const sortedTypeIntervals = useMemo(() => {
    return Object.entries(insights.endmillTypeIntervals)
      .filter(([_, interval]) => interval > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
  }, [insights.endmillTypeIntervals])

  const handleSort = (field: string) => {
    const validField = field as SortField
    if (sortField === validField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(validField)
      setSortOrder('asc')
    }
  }

  const handleCreateCAMSheet = async (data: any) => {
    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(`${data.model} - ${data.process} CAM Sheet`)
    )
    if (confirmed) {
      createCAMSheet(data)
      setShowAddForm(false)
      showSuccess(t('camSheets.createComplete'), t('camSheets.createSuccess'))
    }
  }

  const handleBulkImport = async (sheets: Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const confirmed = await confirmation.showConfirmation({
      type: 'create',
      title: t('camSheets.bulkImportConfirm'),
      message: `${sheets.length}${t('camSheets.bulkImportMessage')}`,
      confirmText: t('camSheets.bulkImport'),
      cancelText: t('camSheets.cancel'),
    })
    if (confirmed) {
      confirmation.setLoading(true)
      try {
        createCAMSheetsBatch({
          batch: true,
          data: sheets.map(sheet => ({
            model: sheet.model,
            process: sheet.process,
            cam_version: sheet.cam_version,
            version_date: sheet.version_date,
            endmills: sheet.cam_sheet_endmills || [],
          })),
        })
        setShowExcelUploader(false)
        showSuccess(
          t('camSheets.bulkImportComplete'),
          `${sheets.length}${t('camSheets.bulkImportSuccess')}`
        )
      } catch (_error) {
        showError(t('camSheets.bulkImportError'), t('common.error'))
      } finally {
        confirmation.setLoading(false)
      }
    }
  }

  const handleUpdateCAMSheet = async (data: any) => {
    if (!editingSheet) return
    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(`${data.model} - ${data.process} CAM Sheet`)
    )
    if (confirmed) {
      updateCAMSheet({
        id: editingSheet.id,
        model: data.model,
        process: data.process,
        cam_version: data.camVersion || data.cam_version,
        version_date: data.versionDate || data.version_date,
        endmills: data.endmills,
      })
      setEditingSheet(null)
      showSuccess(t('camSheets.updateComplete'), t('camSheets.editSuccess'))
    }
  }

  const handleDelete = async (id: string) => {
    const target = camSheets.find(s => s.id === id)
    if (!target) return
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`${target.model} - ${target.process} CAM Sheet`)
    )
    if (confirmed) {
      deleteCAMSheet(id)
      showSuccess(t('camSheets.deleteComplete'), t('camSheets.deleteSuccess'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gauge-cobalt" />
        <span className="ml-4 text-ink-soft">{t('camSheets.loading')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-divider bg-signal-stop-soft p-4 sm:p-6">
        <p className="text-title font-semibold text-signal-stop-strong">
          {t('common.error')}
        </p>
        <p className="mt-1 text-ink">{error}</p>
      </div>
    )
  }

  const cardLabels = {
    process: t('camSheets.process'),
    endmillCount: t('camSheets.endmillCount'),
    tNumberRange: t('camSheets.tNumberRange'),
    lastModified: t('camSheets.lastModified'),
    detail: t('camSheets.detail'),
    edit: t('camSheets.edit'),
    delete: t('camSheets.delete'),
    itemsUnit: t('camSheets.items'),
  }

  const toCardItem = (sheet: CAMSheet): CAMSheetListCardItem => {
    const endmills = sheet.cam_sheet_endmills || sheet.endmills || []
    const tNumbers = endmills.map(e => e.t_number)
    return {
      id: sheet.id,
      model: sheet.model,
      process: sheet.process,
      camVersion: sheet.cam_version,
      versionDate: sheet.version_date,
      endmillCount: endmills.length,
      tNumberMin: tNumbers.length > 0 ? Math.min(...tNumbers) : null,
      tNumberMax: tNumbers.length > 0 ? Math.max(...tNumbers) : null,
      updatedAt: sheet.updated_at,
    }
  }

  return (
    <div className="space-y-6">
      {/* === Stat Strip — 단일 행 측정기 미감 === */}
      <section className="rounded-md border border-divider bg-paper-warm">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-divider lg:divide-y-0 lg:divide-x lg:divide-divider">
          <StatCell
            label={t('camSheets.totalSheets')}
            value={stats.totalSheets.toLocaleString()}
            unit={t('camSheets.items')}
          />
          <StatCell
            label={t('camSheets.registeredModel')}
            value={stats.models.toLocaleString()}
            unit={t('dashboard.equipmentCount')}
          />
          <StatCell
            label={t('camSheets.registeredEndmills')}
            value={stats.totalEndmills.toLocaleString()}
            unit={t('camSheets.items')}
          />
          <StatCell
            label={t('camSheets.efficiencyIndex')}
            value={`${stats.efficiency}`}
            unit="%"
            tone={
              stats.efficiency >= 80
                ? 'go'
                : stats.efficiency >= 50
                  ? 'watch'
                  : stats.efficiency > 0
                    ? 'stop'
                    : 'mute'
            }
          />
        </div>
      </section>

      {/* === Insight Grid — 4개 메트릭, 4개 다른 시각 형태 === */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Tool Life 정확도 — 도넛 링 */}
        <article className="rounded-md border border-divider bg-paper-warm p-5">
          <h3 className="text-caption text-ink-soft no-break">
            {t('camSheets.toolLifeAccuracy')}
          </h3>
          <div className="mt-3 flex items-center gap-4">
            <DonutGauge value={insights.toolLifeAccuracy} />
            <div className="min-w-0 flex-1">
              <p className="text-caption text-ink-mute">{t('camSheets.bestProcessLabel')}</p>
              <p className="mt-0.5 text-body font-medium text-ink no-break">
                <NoBreak>{bestProcess.name}</NoBreak>
              </p>
              <p className="mt-0.5 text-caption text-ink-soft tabular">
                {bestProcess.value}%
              </p>
            </div>
          </div>
        </article>

        {/* 2. 교체 주기 — Top-3 순위 막대 */}
        <article className="rounded-md border border-divider bg-paper-warm p-5">
          <h3 className="text-caption text-ink-soft no-break">
            {t('camSheets.replacementCycle')}
          </h3>
          <div className="mt-3 flex items-baseline gap-1">
            <p className="text-headline font-semibold text-ink tabular">
              {insights.averageChangeInterval.toLocaleString()}
            </p>
            <p className="text-caption text-ink-soft">{t('camSheets.times')}</p>
          </div>
          <p className="text-caption text-ink-mute">{t('camSheets.averageCycle')}</p>
          <div className="mt-3 space-y-2">
            {sortedTypeIntervals.length === 0 ? (
              <p className="text-caption text-ink-mute py-2">{t('common.noData')}</p>
            ) : (
              <>
                <p className="text-caption text-ink-mute no-break">
                  {t('camSheets.cycleByType')}
                </p>
                {sortedTypeIntervals.map(([type, value], idx) => {
                  const max = sortedTypeIntervals[0][1] || 1
                  const width = Math.round((value / max) * 100)
                  return (
                    <div key={type}>
                      <div className="flex items-baseline justify-between text-caption">
                        <span className="text-ink-soft no-break">
                          <NoBreak>{type}</NoBreak>
                        </span>
                        <span className="font-medium text-ink tabular">
                          {value.toLocaleString()}
                          <span className="ml-0.5 text-ink-soft">{t('camSheets.times')}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-paper">
                        <div
                          className={
                            idx === 0
                              ? 'h-1 rounded-full bg-gauge-cobalt'
                              : 'h-1 rounded-full bg-gauge-cobalt-soft'
                          }
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </article>

        {/* 3. 재고 연동률 — 분할 스택 게이지 */}
        <article className="rounded-md border border-divider bg-paper-warm p-5">
          <h3 className="text-caption text-ink-soft no-break">
            {t('camSheets.inventoryLink')}
          </h3>
          <div className="mt-3 flex items-baseline gap-1">
            <p className="text-headline font-semibold text-ink tabular">
              {insights.inventoryLinkage}
            </p>
            <p className="text-caption text-ink-soft">%</p>
          </div>
          <p className="text-caption text-ink-mute">{t('camSheets.registeredEndmill')}</p>
          <SplitGauge
            secured={insights.inventoryStatus.secured}
            shortage={insights.inventoryStatus.shortage}
          />
          <dl className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between text-caption">
              <dt className="text-ink-soft no-break">
                <NoBreak>{t('camSheets.secured')}</NoBreak>
              </dt>
              <dd className="font-medium text-signal-go-strong tabular">
                {insights.inventoryStatus.secured.toLocaleString()}
                <span className="ml-0.5 text-ink-soft">{t('camSheets.items')}</span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between text-caption">
              <dt className="text-ink-soft no-break">
                <NoBreak>{t('camSheets.shortage')}</NoBreak>
              </dt>
              <dd className="font-medium text-signal-stop-strong tabular">
                {insights.inventoryStatus.shortage.toLocaleString()}
                <span className="ml-0.5 text-ink-soft">{t('camSheets.items')}</span>
              </dd>
            </div>
          </dl>
          <div className="mt-3 pt-3 border-t border-divider">
            <RiskBadge linkage={insights.inventoryLinkage} t={t} />
          </div>
        </article>

        {/* 4. 표준화 지수 — 반원호 게이지 */}
        <article className="rounded-md border border-divider bg-paper-warm p-5">
          <h3 className="text-caption text-ink-soft no-break">
            {t('camSheets.standardization')}
          </h3>
          <div className="mt-3 flex justify-center">
            <SemicircleGauge value={insights.standardization} />
          </div>
          <p className="text-caption text-ink-mute text-center -mt-1">
            {t('camSheets.endmillStandardization')}
          </p>
          <dl className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between text-caption">
              <dt className="text-ink-soft no-break">
                <NoBreak>{t('camSheets.standardType')}</NoBreak>
              </dt>
              <dd className="font-medium text-ink tabular">
                {insights.standardizationDetails.standard.toLocaleString()}
                <span className="ml-0.5 text-ink-soft">{t('camSheets.items')}</span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between text-caption">
              <dt className="text-ink-soft no-break">
                <NoBreak>{t('camSheets.duplicateType')}</NoBreak>
              </dt>
              <dd className="font-medium text-signal-watch-strong tabular">
                {insights.standardizationDetails.duplicate.toLocaleString()}
                <span className="ml-0.5 text-ink-soft">{t('camSheets.items')}</span>
              </dd>
            </div>
          </dl>
        </article>
      </section>

      {/* === Filter + Action Bar === */}
      <section className="rounded-md border border-divider bg-paper-warm p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-1 sm:gap-2">
            <input
              type="text"
              placeholder={t('camSheets.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="min-h-touch flex-1 rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none"
            />
            <select
              value={modelFilter}
              onChange={e => setModelFilter(e.target.value)}
              className="min-h-touch rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
            >
              <option value="">{t('camSheets.allModel')}</option>
              {Array.from(new Set(camSheets.map(s => s.model))).map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <select
              value={processFilter}
              onChange={e => setProcessFilter(e.target.value)}
              className="min-h-touch rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
            >
              <option value="">{t('camSheets.allProcess')}</option>
              {availableProcesses.map(process => (
                <option key={process} value={process}>
                  {process}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <button
              type="button"
              onClick={() => setShowExcelUploader(true)}
              className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
            >
              <Upload className="h-4 w-4" />
              {t('camSheets.bulkRegister')}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
            >
              <Plus className="h-4 w-4" />
              {t('camSheets.individualRegister')}
            </button>
          </div>
        </div>
      </section>

      {/* === List section (header + dual rendering) === */}
      <section className="space-y-3">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-title font-semibold text-ink no-break">
            {t('camSheets.sheetList')}
          </h2>
          <p className="text-caption text-ink-soft tabular">
            {t('camSheets.totalCount')}{' '}
            <span className="font-medium text-ink">{filteredSheets.length}</span>
            {t('camSheets.items')}
          </p>
        </header>

        {/* 모바일 카드 리스트 */}
        <div className="lg:hidden space-y-3">
          {paginatedSheets.length === 0 ? (
            <EmptyState message={t('camSheets.noMatching')} />
          ) : (
            paginatedSheets.map(sheet => (
              <CAMSheetListCard
                key={sheet.id}
                item={toCardItem(sheet)}
                labels={cardLabels}
                onDetail={() => setSelectedSheet(sheet)}
                onEdit={() => setEditingSheet(sheet)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* 데스크톱 표 */}
        <div className="hidden lg:block rounded-md border border-divider bg-paper-warm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-paper border-b border-divider">
                <tr>
                  <SortHeader
                    label={t('camSheets.model')}
                    field="model"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label={t('camSheets.process')}
                    field="process"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label={t('camSheets.version')}
                    field="cam_version"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label={t('camSheets.endmillCount')}
                    field="endmillCount"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label={t('camSheets.lastModified')}
                    field="updated_at"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-right text-label font-medium text-ink-soft no-break">
                    {t('camSheets.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {paginatedSheets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-base text-ink-soft">
                      {t('camSheets.noMatching')}
                    </td>
                  </tr>
                ) : (
                  paginatedSheets.map(sheet => {
                    const endmills = sheet.cam_sheet_endmills || sheet.endmills || []
                    const tNumbers = endmills.map(e => e.t_number)
                    const tRange =
                      tNumbers.length > 0
                        ? `T${String(Math.min(...tNumbers)).padStart(2, '0')}–T${String(
                            Math.max(...tNumbers)
                          ).padStart(2, '0')}`
                        : '—'
                    return (
                      <tr key={sheet.id} className="transition-colors hover:bg-paper">
                        <td className="px-4 py-3 text-base font-medium text-ink no-break">
                          <NoBreak>{sheet.model}</NoBreak>
                        </td>
                        <td className="px-4 py-3 text-base text-ink-soft no-break">
                          <NoBreak>{sheet.process}</NoBreak>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-base font-medium text-ink no-break">
                            <NoBreak>{sheet.cam_version}</NoBreak>
                          </p>
                          {sheet.version_date && (
                            <p className="text-caption text-ink-soft tabular">
                              {sheet.version_date}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-base font-medium text-ink tabular">
                            {endmills.length}
                            <span className="ml-1 text-caption font-normal text-ink-soft">
                              {t('camSheets.items')}
                            </span>
                          </p>
                          <p className="text-caption text-ink-soft tabular no-break">
                            <NoBreak>{tRange}</NoBreak>
                          </p>
                        </td>
                        <td className="px-4 py-3 text-base text-ink-soft tabular">
                          {formatDateForLocale(sheet.updated_at, dateLocale)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedSheet(sheet)}
                              className="text-label font-medium text-ink-soft transition-colors hover:text-ink"
                            >
                              {t('camSheets.detail')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSheet(sheet)}
                              className="text-label font-medium text-ink-soft transition-colors hover:text-ink"
                            >
                              {t('camSheets.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(sheet.id)}
                              className="text-label font-medium text-signal-stop transition-colors hover:text-signal-stop-strong"
                            >
                              {t('camSheets.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* === 페이지네이션 (모바일/데스크톱 공통) === */}
        {totalPages > 1 && (
          <div className="rounded-md border border-divider bg-paper-warm px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-ink-soft tabular">
                {t('camSheets.showing')}{' '}
                <span className="font-medium text-ink">{filteredSheets.length}</span>
                {t('camSheets.of')}{' '}
                <span className="font-medium text-ink">{startIndex + 1}</span>
                –
                <span className="font-medium text-ink">
                  {Math.min(endIndex, filteredSheets.length)}
                </span>
                {t('camSheets.displayed')}
              </p>
              <nav
                className="inline-flex items-center gap-1 self-end sm:self-auto"
                aria-label={t('camSheets.page')}
              >
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label={t('camSheets.previous')}
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
                  aria-label={t('camSheets.next')}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                >
                  ›
                </button>
              </nav>
            </div>
          </div>
        )}
      </section>

      {/* === CAM Sheet 상세 모달 === */}
      {selectedSheet && (
        <div className="mobile-modal-container" onClick={() => setSelectedSheet(null)}>
          <div
            ref={dragRef} className="mobile-modal-content md:max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('camSheets.camSheetDetail')}
                <span className="mx-2 text-ink-mute">·</span>
                <NoBreak>{selectedSheet.model}</NoBreak>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSheet(null)}
                aria-label={t('common.close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mobile-modal-body">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <DetailField label={t('camSheets.model')} value={selectedSheet.model} />
                <DetailField label={t('camSheets.process')} value={selectedSheet.process} />
                <DetailField label={t('camSheets.version')} value={selectedSheet.cam_version} />
                <DetailField
                  label={t('camSheets.versionDate')}
                  value={selectedSheet.version_date || '—'}
                />
              </dl>

              <h4 className="text-title font-semibold text-ink mb-3 no-break">
                {t('camSheets.registered')}
              </h4>
              <div className="rounded-md border border-divider bg-paper overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-paper-warm border-b border-divider">
                      <tr>
                        <th className="px-4 py-2 text-left text-label font-medium text-ink-soft no-break">
                          {t('camSheets.tNumber')}
                        </th>
                        <th className="px-4 py-2 text-left text-label font-medium text-ink-soft no-break">
                          {t('camSheets.endmillCode')}
                        </th>
                        <th className="px-4 py-2 text-left text-label font-medium text-ink-soft no-break">
                          {t('camSheets.endmillName')}
                        </th>
                        <th className="px-4 py-2 text-left text-label font-medium text-ink-soft no-break">
                          {t('camSheets.usageStatus')}
                        </th>
                        <th className="px-4 py-2 text-left text-label font-medium text-ink-soft no-break">
                          {t('camSheets.toolLife')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {(selectedSheet.cam_sheet_endmills || [])
                        .sort((a, b) => a.t_number - b.t_number)
                        .map((endmill: EndmillInfo) => (
                          <tr key={endmill.t_number} className="hover:bg-paper-warm">
                            <td className="px-4 py-2 text-base font-medium text-ink tabular no-break">
                              <NoBreak>
                                T{endmill.t_number.toString().padStart(2, '0')}
                              </NoBreak>
                            </td>
                            <td className="px-4 py-2 text-base">
                              <button
                                type="button"
                                onClick={() => {
                                  const url = `/dashboard/endmill?search=${encodeURIComponent(
                                    endmill.endmill_code || ''
                                  )}`
                                  router.push(url)
                                }}
                                className="text-gauge-cobalt-strong transition-colors hover:underline no-break"
                              >
                                <NoBreak>{endmill.endmill_code}</NoBreak>
                              </button>
                            </td>
                            <td className="px-4 py-2 text-base text-ink">
                              {endmill.endmill_name}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <StatusBadge variant="go" label={t('camSheets.active')} />
                                <span className="text-caption text-ink-mute no-break">
                                  <NoBreak>{selectedSheet.model}</NoBreak>
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-base font-medium text-ink tabular">
                                {endmill.tool_life ? endmill.tool_life.toLocaleString() : '0'}
                                <span className="ml-1 text-caption font-normal text-ink-soft">
                                  {t('camSheets.times')}
                                </span>
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="mobile-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedSheet(null)}
                className="w-full inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로더 */}
      {showExcelUploader && (
        <ExcelUploader
          onDataParsed={handleBulkImport}
          onClose={() => setShowExcelUploader(false)}
        />
      )}

      {/* CAM Sheet 등록 폼 */}
      {showAddForm && (
        <CAMSheetForm
          onSubmit={handleCreateCAMSheet}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* CAM Sheet 수정 폼 */}
      {editingSheet && (
        <CAMSheetForm
          onSubmit={handleUpdateCAMSheet}
          onCancel={() => setEditingSheet(null)}
          initialData={{
            model: editingSheet.model,
            process: editingSheet.process,
            camVersion: editingSheet.cam_version,
            versionDate: editingSheet.version_date,
            endmills: (
              editingSheet.cam_sheet_endmills ||
              editingSheet.endmills ||
              []
            ).map((endmill: any) => ({
              tNumber: endmill.t_number,
              endmillCode: endmill.endmill_code,
              endmillName: endmill.endmill_name,
              specifications: endmill.specifications || '',
              toolLife: endmill.tool_life,
            })),
          }}
        />
      )}

      {/* 승인 모달 */}
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
  tone?: 'go' | 'watch' | 'stop' | 'mute' | 'default'
}

function StatCell({ label, value, unit, tone = 'default' }: StatCellProps) {
  const valueColor =
    tone === 'go'
      ? 'text-signal-go-strong'
      : tone === 'watch'
        ? 'text-signal-watch-strong'
        : tone === 'stop'
          ? 'text-signal-stop-strong'
          : tone === 'mute'
            ? 'text-ink-mute'
            : 'text-ink'

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-caption text-ink-soft no-break">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <p className={`text-headline font-semibold tabular ${valueColor}`}>{value}</p>
        {unit && <p className="text-caption text-ink-soft no-break">{unit}</p>}
      </div>
    </div>
  )
}

interface DonutGaugeProps {
  value: number
}

function DonutGauge({ value }: DonutGaugeProps) {
  const radius = 32
  const stroke = 6
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const dashOffset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference

  return (
    <div className="relative h-20 w-20 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={normalizedRadius}
          fill="none"
          stroke="currentColor"
          className="text-paper"
          strokeWidth={stroke}
        />
        <circle
          cx="32"
          cy="32"
          r={normalizedRadius}
          fill="none"
          stroke="currentColor"
          className="text-gauge-cobalt"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-title font-semibold text-ink tabular">
          {value}
          <span className="ml-0.5 text-caption font-normal text-ink-soft">%</span>
        </p>
      </div>
    </div>
  )
}

interface SplitGaugeProps {
  secured: number
  shortage: number
}

function SplitGauge({ secured, shortage }: SplitGaugeProps) {
  const total = secured + shortage
  const securedPct = total > 0 ? (secured / total) * 100 : 0
  const shortagePct = total > 0 ? (shortage / total) * 100 : 0

  return (
    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-paper">
      {securedPct > 0 && (
        <div
          className="h-2 bg-signal-go"
          style={{ width: `${securedPct}%` }}
          aria-hidden="true"
        />
      )}
      {shortagePct > 0 && (
        <div
          className="h-2 bg-signal-stop"
          style={{ width: `${shortagePct}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

interface SemicircleGaugeProps {
  value: number
}

function SemicircleGauge({ value }: SemicircleGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value))
  // 반원 호: 180도 시작 → 0도 끝 (좌→우)
  // SVG: arc from (10, 50) to (90, 50) via top
  const radius = 40
  const cx = 50
  const cy = 50
  const startAngle = 180
  const endAngle = 180 - (clamped / 100) * 180

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    }
  }

  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(endAngle)
  const largeArc = startAngle - endAngle > 180 ? 1 : 0
  const fullEnd = polarToCartesian(0)

  return (
    <div className="relative h-16 w-32">
      <svg viewBox="0 0 100 60" className="h-16 w-32" aria-hidden="true">
        {/* 배경 호 */}
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${fullEnd.x} ${fullEnd.y}`}
          fill="none"
          stroke="currentColor"
          className="text-paper"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* 진행 호 */}
        {clamped > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke="currentColor"
            className="text-gauge-cobalt"
            strokeWidth="6"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <p className="text-title font-semibold text-ink tabular">
          {clamped}
          <span className="ml-0.5 text-caption font-normal text-ink-soft">%</span>
        </p>
      </div>
    </div>
  )
}

interface RiskBadgeProps {
  linkage: number
  t: (key: string) => string
}

function RiskBadge({ linkage, t }: RiskBadgeProps) {
  const variant: 'go' | 'watch' | 'stop' =
    linkage >= 90 ? 'go' : linkage >= 80 ? 'watch' : 'stop'
  const level =
    linkage >= 90
      ? t('camSheets.low')
      : linkage >= 80
        ? t('camSheets.medium')
        : t('camSheets.high')
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-caption text-ink-soft no-break">
        <NoBreak>{t('camSheets.riskLevel')}</NoBreak>
      </span>
      <StatusBadge variant={variant} label={level} />
    </div>
  )
}

interface SortHeaderProps {
  label: string
  field: SortField
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: string) => void
}

function SortHeader({ label, field, sortField, sortOrder, onSort }: SortHeaderProps) {
  const isActive = sortField === field
  return (
    <th
      className="px-4 py-3 text-left text-label font-medium text-ink-soft cursor-pointer transition-colors hover:bg-paper-warm hover:text-ink no-break"
      onClick={() => onSort(field)}
    >
      <div className="inline-flex items-center gap-1">
        <NoBreak>{label}</NoBreak>
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

interface DetailFieldProps {
  label: string
  value: string
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div>
      <dt className="text-caption text-ink-soft no-break">{label}</dt>
      <dd className="mt-0.5 text-title font-semibold text-ink no-break">
        <NoBreak>{value}</NoBreak>
      </dd>
    </div>
  )
}

interface EmptyStateProps {
  message: string
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-divider bg-paper-warm px-4 py-12 text-center">
      <p className="text-base text-ink-soft">{message}</p>
    </div>
  )
}
