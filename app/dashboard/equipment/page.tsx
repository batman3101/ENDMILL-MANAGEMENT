'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import {
  Plus,
  Upload,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import { clientLogger } from '../../../lib/utils/logger'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation } from '../../../lib/hooks/useConfirmation'
import { useToast } from '../../../components/shared/Toast'
import StatusChangeDropdown from '../../../components/shared/StatusChangeDropdown'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useEquipment, useEquipmentStatus, Equipment } from '../../../lib/hooks/useEquipment'
import PageLoadingIndicator, {
  SkeletonCard,
  SkeletonTableRow,
} from '../../../components/shared/PageLoadingIndicator'
import { supabase } from '../../../lib/supabase/client'
import { NoBreak } from '@/components/ui/no-break'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/status-badge'
import {
  EquipmentListCard,
  type EquipmentListCardItem,
} from '@/components/features/equipment/equipment-list-card'

const EquipmentExcelUploader = dynamic(
  () => import('../../../components/features/EquipmentExcelUploader'),
  { ssr: false }
)

type SortField = 'equipment_number' | 'location' | 'status' | 'current_model' | 'process'
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

function statusVariant(status: string | null | undefined): StatusBadgeVariant {
  if (status === '가동중') return 'go'
  if (status === '점검중') return 'stop'
  if (status === '셋업중') return 'watch'
  return 'neutral'
}

// formatEquipmentNumber 와 statusUsageColor 는 컴포넌트 내부로 이동했습니다 —
// settings(numberFormat / toolChanges.lifeThresholds)에 closure로 접근하기 위함.

interface AddFormData {
  equipmentNumber: string
  location: string
  status: string
  currentModel: string
  process: string
}

export default function EquipmentPage() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const dateLocale = resolveDateLocale(i18n.language)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('equipment_number')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editEquipment, setEditEquipment] = useState<any>(null)
  const lastRefreshTimeRef = useRef<number>(0)

  const confirmation = useConfirmation()
  const { showSuccess, showError } = useToast()

  const {
    equipments,
    loading: isLoading,
    error: dataError,
    refetch,
    createEquipment,
    updateEquipment,
    getEquipmentStats,
    getAvailableModels,
    getAvailableProcesses,
    getAvailableLocations,
  } = useEquipment()

  const { changeStatus } = useEquipmentStatus()

  const { settings } = useSettings()
  const itemsPerPage = 20
  const equipmentLocations = getAvailableLocations()
  const equipmentStatuses = settings.equipment.statuses
  const settingsProcesses = settings.equipment.processes
  const settingsModels = settings.equipment.models

  // 사용자 설정의 numberFormat 패턴(`C{number:3}`) 적용
  const formatEquipmentNumber = useCallback(
    (num: number | null | undefined): string => {
      if (num == null) return '—'
      const format = settings.equipment?.numberFormat ?? 'C{number:3}'
      return format.replace(/\{number:(\d+)\}/, (_, w: string) =>
        String(num).padStart(parseInt(w, 10), '0')
      )
    },
    [settings.equipment?.numberFormat]
  )

  // 사용자 설정의 lifeThresholds(% 단위) 적용 — 사용률이 critical 이상이면 stop, warning 이상이면 watch
  const statusUsageColor = useCallback(
    (percent: number): string => {
      const warning = settings.toolChanges?.lifeThresholds?.warning ?? 80
      const critical = settings.toolChanges?.lifeThresholds?.critical ?? 95
      if (percent >= critical) return 'bg-signal-stop'
      if (percent >= warning) return 'bg-signal-watch'
      return 'bg-signal-go'
    },
    [settings.toolChanges?.lifeThresholds]
  )

  const throttledRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshTimeRef.current > 3000) {
      lastRefreshTimeRef.current = now
      refetch()
    }
  }, [refetch])

  useEffect(() => {
    const equipmentChannel = supabase
      .channel('equipment_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipment' },
        payload => {
          clientLogger.log('설비 변경:', payload)
          throttledRefresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tool_positions' },
        payload => {
          clientLogger.log('공구 포지션 변경:', payload)
          throttledRefresh()
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          clientLogger.log('설비 실시간 연결됨')
        } else if (status === 'CHANNEL_ERROR') {
          clientLogger.log('설비 실시간 연결 실패')
        }
      })

    return () => {
      supabase.removeChannel(equipmentChannel)
    }
  }, [throttledRefresh])

  const [addFormData, setAddFormData] = useState<AddFormData>({
    equipmentNumber: 'C000',
    location: 'A동',
    status: '가동중',
    currentModel: '',
    process: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { getAvailableModels: getCamSheetModels, getAvailableProcesses: getCamSheetProcesses } =
    useCAMSheets()
  const availableModels = getCamSheetModels
  const availableProcesses = getCamSheetProcesses
  const equipmentAvailableModels = getAvailableModels()
  const equipmentAvailableProcesses = getAvailableProcesses()

  const filteredEquipments = useMemo(() => {
    const filtered = equipments.filter(equipment => {
      const formattedNumber = formatEquipmentNumber(equipment.equipment_number)
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        term === '' ||
        formattedNumber.toLowerCase().includes(term) ||
        equipment.current_model?.toLowerCase().includes(term) ||
        equipment.location?.toLowerCase().includes(term) ||
        equipment.process?.toLowerCase().includes(term) ||
        equipment.status?.toLowerCase().includes(term)
      const matchesStatus = statusFilter === '' || equipment.status === statusFilter
      const matchesModel = modelFilter === '' || equipment.current_model === modelFilter
      return matchesSearch && matchesStatus && matchesModel
    })

    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]
      if (sortField === 'equipment_number') {
        aValue = parseInt(a.equipment_number?.toString() || '0')
        bValue = parseInt(b.equipment_number?.toString() || '0')
      }
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [equipments, searchTerm, statusFilter, modelFilter, sortField, sortOrder])

  const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEquipments = filteredEquipments.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, modelFilter, sortField, sortOrder])

  // Page guard
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const translateStatus = (status: string) => {
    if (status === '가동중') return t('equipment.operating')
    if (status === '점검중') return t('equipment.maintenance')
    if (status === '셋업중') return t('equipment.setup')
    return status
  }

  const handleStatusChange = async (equipmentId: string, newStatus: string) => {
    const equipment = equipments.find(eq => eq.id === equipmentId)
    if (!equipment) return

    const confirmed = await confirmation.showConfirmation({
      type: 'update',
      title: t('equipment.statusChangeConfirmTitle'),
      message: `${formatEquipmentNumber(equipment.equipment_number)}${t(
        'equipment.statusChangeConfirmMessage'
      )}\n\n${t('equipment.currentStatus')}: ${translateStatus(
        equipment.status || ''
      )}\n${t('equipment.changeStatus')}: ${translateStatus(newStatus)}`,
      confirmText: t('equipment.confirmChange'),
      cancelText: t('common.cancel'),
    })

    if (confirmed) {
      changeStatus(equipmentId, newStatus)
      showSuccess(
        t('equipment.statusChangeComplete'),
        `${formatEquipmentNumber(equipment.equipment_number)} → ${translateStatus(newStatus)}`
      )
    }
  }

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addFormData.equipmentNumber.trim()) {
      showError(t('common.error'), t('equipment.equipmentNumberRequired'))
      return
    }
    if (!addFormData.currentModel) {
      showError(t('common.error'), t('equipment.modelRequired'))
      return
    }
    if (!addFormData.process) {
      showError(t('common.error'), t('equipment.processRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const equipmentNumberInt = parseInt(addFormData.equipmentNumber.replace(/^C/i, '')) || 0
      createEquipment({
        equipment_number: equipmentNumberInt,
        model_code: addFormData.currentModel,
        location: addFormData.location,
        status: addFormData.status,
        current_model: addFormData.currentModel,
        process: addFormData.process,
      })
      setAddFormData({
        equipmentNumber: 'C000',
        location: 'A동',
        status: '가동중',
        currentModel: '',
        process: '',
      })
      setShowAddModal(false)
      showSuccess(
        t('equipment.equipmentAddedTitle'),
        `${addFormData.equipmentNumber} ${t('equipment.addSuccess')}`
      )
    } catch (error) {
      clientLogger.error('설비 추가 에러:', error)
      showError(
        t('equipment.addFailedTitle'),
        error instanceof Error ? error.message : t('equipment.addError')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateNextEquipmentNumber = () => {
    const existingNumbers = equipments
      .map(eq => {
        const numStr = eq.equipment_number?.toString() || '0'
        return parseInt(numStr.replace(/^C/i, ''))
      })
      .filter(num => !isNaN(num))
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
    return `C${(maxNumber + 1).toString().padStart(3, '0')}`
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEquipment) return
    const originalEquipment = equipments.find(eq => eq.id === editEquipment.id)
    if (!originalEquipment) return

    const modelOrProcessChanged =
      originalEquipment.current_model !== editEquipment.current_model ||
      originalEquipment.process !== editEquipment.process

    try {
      setIsSubmitting(true)
      if (modelOrProcessChanged) {
        const response = await fetch(`/api/equipment/${editEquipment.id}/assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentModel: editEquipment.current_model,
            process: editEquipment.process,
          }),
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || t('equipment.assignError'))
        }
        if (
          originalEquipment.location !== editEquipment.location ||
          originalEquipment.status !== editEquipment.status
        ) {
          updateEquipment({
            id: editEquipment.id,
            location: editEquipment.location,
            status: editEquipment.status,
            current_model: editEquipment.current_model,
            process: editEquipment.process,
          })
        }
        const { createdAndInstalledPositions, installedPositions } = result.data.updateResults
        const totalInstalled = (createdAndInstalledPositions || 0) + (installedPositions || 0)
        setShowEditModal(false)
        showSuccess(
          t('equipment.editComplete'),
          `${editEquipment.equipmentNumber} — ${totalInstalled}${t(
            'equipment.endmillsAutoInstalled'
          )}`
        )
        refetch()
      } else {
        updateEquipment({
          id: editEquipment.id,
          location: editEquipment.location,
          status: editEquipment.status,
          current_model: editEquipment.current_model,
          process: editEquipment.process,
        })
        setShowEditModal(false)
        showSuccess(t('equipment.editComplete'), `${editEquipment.equipmentNumber}`)
      }
    } catch (error) {
      clientLogger.error('설비 수정 에러:', error)
      showError(
        t('equipment.editFailed'),
        error instanceof Error ? error.message : t('equipment.editError')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditModal = (equipment: any) => {
    setEditEquipment({
      ...equipment,
      equipmentNumber: formatEquipmentNumber(equipment.equipment_number),
    })
    setShowEditModal(true)
  }

  const handleEditById = (id: string) => {
    const equipment = equipments.find(eq => eq.id === id)
    if (equipment) handleOpenEditModal(equipment)
  }

  const handleOpenAddModal = () => {
    const defaultStatus =
      equipmentStatuses && equipmentStatuses.length > 0
        ? (equipmentStatuses[0]?.code || equipmentStatuses[0]?.name || equipmentStatuses[0] || '가동중')
        : '가동중'
    setAddFormData(prev => ({
      ...prev,
      equipmentNumber: generateNextEquipmentNumber(),
      location: equipmentLocations && equipmentLocations.length > 0 ? equipmentLocations[0] : 'A동',
      status: defaultStatus as string,
      currentModel: availableModels[0] || '',
      process: availableProcesses[0] || '',
    }))
    setShowAddModal(true)
  }

  // 에러 상태
  if (dataError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-md border border-divider bg-signal-stop-soft p-6 text-center max-w-md">
          <AlertTriangle className="h-8 w-8 text-signal-stop-strong mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-title font-semibold text-signal-stop-strong">
            {t('equipment.loadError')}
          </h3>
          <p className="mt-2 text-base text-ink-soft">{dataError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex min-h-touch items-center justify-center rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
          >
            {t('equipment.retry')}
          </button>
        </div>
      </div>
    )
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} className="p-4">
              <div className="h-3 bg-paper rounded mb-2 w-16"></div>
              <div className="h-5 bg-paper rounded w-12"></div>
            </SkeletonCard>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <SkeletonCard key={i} className="p-6">
              <div className="h-5 bg-paper rounded mb-4 w-32"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between p-3 bg-paper rounded-md"
                  >
                    <div className="h-4 bg-paper-warm rounded w-32"></div>
                    <div className="h-5 bg-paper-warm rounded w-8"></div>
                  </div>
                ))}
              </div>
            </SkeletonCard>
          ))}
        </div>
        <SkeletonCard className="overflow-hidden">
          <div className="px-6 py-4 border-b border-divider animate-pulse">
            <div className="h-5 bg-paper rounded w-32 mb-1"></div>
            <div className="h-3 bg-paper rounded w-48"></div>
          </div>
          <div className="p-6">
            {[...Array(5)].map((_, i) => (
              <SkeletonTableRow key={i} columns={7} />
            ))}
          </div>
        </SkeletonCard>
        <PageLoadingIndicator
          message={t('equipment.loadingData')}
          subMessage={t('equipment.pleaseWait')}
          size="md"
        />
      </div>
    )
  }

  const equipmentStats = getEquipmentStats()
  const isEmpty = equipments.length === 0

  // 모델/공정 배치 데이터 (실제 등록된 모델·공정만)
  const modelDistribution = (availableModels.length > 0 ? availableModels : settingsModels)
    .map(model => {
      const modelEquipments = equipments.filter(eq => eq.current_model === model)
      const aCount = modelEquipments.filter(eq => eq.location === 'A동').length
      const bCount = modelEquipments.filter(eq => eq.location === 'B동').length
      return { model, aCount, bCount, total: modelEquipments.length }
    })
    .filter(item => item.total > 0)

  const processDistribution = (availableProcesses.length > 0 ? availableProcesses : settingsProcesses)
    .map(process => {
      const processEquipments = equipments.filter(eq => eq.process === process)
      const aCount = processEquipments.filter(eq => eq.location === 'A동').length
      const bCount = processEquipments.filter(eq => eq.location === 'B동').length
      const activeCount = processEquipments.filter(eq => eq.status === '가동중').length
      return { process, aCount, bCount, total: processEquipments.length, activeCount }
    })
    .filter(item => item.total > 0)

  const cardLabels = {
    location: t('equipment.location'),
    model: t('equipment.model'),
    process: t('equipment.process'),
    endmillUsage: t('equipment.endmillUsage'),
    edit: t('equipment.edit') || t('common.edit'),
    statusOperating: t('equipment.operating'),
    statusMaintenance: t('equipment.maintenance'),
    statusSetup: t('equipment.setup'),
  }

  const toCardItem = (eq: Equipment): EquipmentListCardItem => ({
    id: eq.id,
    equipmentLabel: formatEquipmentNumber(eq.equipment_number),
    location: eq.location,
    status: eq.status,
    currentModel: eq.current_model,
    process: eq.process,
    usedToolPositions: eq.used_tool_positions || 0,
    totalToolPositions: eq.total_tool_positions || eq.tool_position_count || 21,
    toolUsagePercentage: eq.tool_usage_percentage || 0,
  })

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* === Stat Strip === */}
      <section className="rounded-md border border-divider bg-paper-warm">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-divider lg:divide-y-0 lg:divide-x lg:divide-divider">
          <StatCell
            label={t('equipment.totalEquipment')}
            value={equipmentStats.total.toLocaleString()}
            unit={t('equipment.unit')}
          />
          <StatCell
            label={t('equipment.operatingEquipment')}
            value={equipmentStats.active.toLocaleString()}
            unit={t('equipment.unit')}
            tone="go"
          />
          <StatCell
            label={t('equipment.maintenance')}
            value={equipmentStats.maintenance.toLocaleString()}
            unit={t('equipment.unit')}
            tone="stop"
          />
          <StatCell
            label={t('equipment.setup')}
            value={equipmentStats.setup.toLocaleString()}
            unit={t('equipment.unit')}
            tone="watch"
          />
        </div>
      </section>

      {/* === 모델·공정 배치 현황 === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DistributionCard
          title={t('equipment.modelDistribution')}
          emptyMessage={t('equipment.noDeployedEquipment')}
          items={modelDistribution.map(item => ({
            key: item.model,
            label: item.model,
            suffix: t('equipment.modelModel'),
            meta: `${t('equipment.locationA')} ${item.aCount}${t('equipment.unit')} · ${t(
              'equipment.locationB'
            )} ${item.bCount}${t('equipment.unit')}`,
            total: item.total,
            unit: t('equipment.unit'),
          }))}
        />
        <DistributionCard
          title={t('equipment.processDistribution')}
          emptyMessage={t('equipment.noDeployedEquipment')}
          items={processDistribution.map(item => ({
            key: item.process,
            label: item.process,
            suffix: t('equipment.processProcess'),
            meta: `${t('equipment.locationA')} ${item.aCount}${t('equipment.unit')} · ${t(
              'equipment.locationB'
            )} ${item.bCount}${t('equipment.unit')} · ${t('equipment.operatingStatus')} ${
              item.activeCount
            }${t('equipment.unit')}`,
            total: item.total,
            unit: t('equipment.unit'),
          }))}
        />
      </div>

      {/* === 빈 상태 (설비 자체가 0건) === */}
      {isEmpty ? (
        <section className="rounded-md border border-divider bg-paper-warm px-4 py-12">
          <div className="text-center max-w-md mx-auto">
            <h3 className="text-title font-semibold text-ink no-break">
              {t('equipment.noEquipment')}
            </h3>
            <p className="mt-2 text-base text-ink-soft">
              {t('equipment.noEquipmentMessage')}
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(true)}
                className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
              >
                <Upload className="h-4 w-4" />
                {t('equipment.bulkUpload')}
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
              >
                <Plus className="h-4 w-4" />
                {t('equipment.individualAdd')}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* === 필터 + 액션 바 === */}
          <section className="rounded-md border border-divider bg-paper-warm p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-1 sm:gap-2">
                <input
                  type="text"
                  placeholder={t('equipment.searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="min-h-touch flex-1 rounded-sm border border-divider bg-paper px-3 text-base text-ink placeholder-ink-mute transition-colors focus:border-gauge-cobalt focus:outline-none"
                />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="min-h-touch rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                >
                  <option value="">{t('equipment.allStatus')}</option>
                  <option value="가동중">{t('equipment.operating')}</option>
                  <option value="점검중">{t('equipment.maintenance')}</option>
                  <option value="셋업중">{t('equipment.setup')}</option>
                </select>
                <select
                  value={modelFilter}
                  onChange={e => setModelFilter(e.target.value)}
                  className="min-h-touch rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                >
                  <option value="">{t('equipment.allModel')}</option>
                  {(availableModels.length > 0 ? availableModels : equipmentAvailableModels).map(
                    model => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkUploadModal(true)}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm"
                >
                  <Upload className="h-4 w-4" />
                  {t('equipment.bulkAdd')}
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong"
                >
                  <Plus className="h-4 w-4" />
                  {t('equipment.addEquipment')}
                </button>
              </div>
            </div>
          </section>

          {/* === 설비 목록 (헤더 + 듀얼 렌더링) === */}
          <section className="space-y-3">
            <header className="flex items-center justify-between gap-3">
              <h2 className="text-title font-semibold text-ink no-break">
                {t('equipment.equipmentList')}
              </h2>
              <p className="text-caption text-ink-soft tabular">
                {t('equipment.totalCount') || ''}{' '}
                <span className="font-medium text-ink">{filteredEquipments.length}</span>
                {t('equipment.items')}
              </p>
            </header>

            {/* 모바일 카드 리스트 */}
            <div className="lg:hidden space-y-3">
              {currentEquipments.length === 0 ? (
                <EmptyFilterState
                  message={t('equipment.noMatchingEquipment')}
                  resetLabel={t('equipment.filterReset')}
                  onReset={() => {
                    setSearchTerm('')
                    setStatusFilter('')
                    setModelFilter('')
                    setCurrentPage(1)
                  }}
                />
              ) : (
                currentEquipments.map(equipment => (
                  <EquipmentListCard
                    key={equipment.id}
                    item={toCardItem(equipment)}
                    labels={cardLabels}
                    onOpen={id => {
                      const eq = equipments.find(e => e.id === id)
                      if (eq) {
                        router.push(`/dashboard/equipment/${eq.equipment_number}`)
                      }
                    }}
                    onEdit={handleEditById}
                    statusDropdown={
                      <StatusChangeDropdown
                        currentStatus={equipment.status || ''}
                        equipmentId={equipment.id}
                        equipmentNumber={formatEquipmentNumber(equipment.equipment_number)}
                        onStatusChange={handleStatusChange}
                      />
                    }
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
                        label={t('equipment.equipmentNumber')}
                        field="equipment_number"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('equipment.site')}
                        field="location"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('equipment.status')}
                        field="status"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('equipment.model')}
                        field="current_model"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label={t('equipment.process')}
                        field="process"
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-label font-medium text-ink-soft no-break">
                        {t('equipment.endmillUsage')}
                      </th>
                      <th className="px-4 py-3 text-right text-label font-medium text-ink-soft no-break">
                        {t('equipment.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {currentEquipments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <p className="text-base text-ink-soft">
                            {t('equipment.noMatchingEquipment')}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('')
                              setStatusFilter('')
                              setModelFilter('')
                              setCurrentPage(1)
                            }}
                            className="mt-2 inline-flex items-center text-label font-medium text-gauge-cobalt-strong transition-colors hover:underline"
                          >
                            {t('equipment.filterReset')}
                          </button>
                        </td>
                      </tr>
                    ) : (
                      currentEquipments.map(equipment => {
                        const used = equipment.used_tool_positions || 0
                        const total =
                          equipment.total_tool_positions || equipment.tool_position_count || 21
                        const pct = Math.max(
                          0,
                          Math.min(100, equipment.tool_usage_percentage || 0)
                        )
                        return (
                          <tr
                            key={equipment.id}
                            className="transition-colors hover:bg-paper"
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/equipment/${equipment.equipment_number}`
                                  )
                                }
                                className="text-base font-medium text-gauge-cobalt-strong tabular no-break transition-colors hover:underline"
                              >
                                <NoBreak>
                                  {formatEquipmentNumber(equipment.equipment_number)}
                                </NoBreak>
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              {equipment.location ? (
                                <span className="inline-flex items-center rounded-sm border border-divider bg-paper px-2 py-0.5 text-caption font-medium text-ink-soft no-break">
                                  <NoBreak>{equipment.location}</NoBreak>
                                </span>
                              ) : (
                                <span className="text-ink-mute">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                variant={statusVariant(equipment.status)}
                                label={translateStatus(equipment.status || '')}
                              />
                            </td>
                            <td className="px-4 py-3 text-base font-medium text-ink no-break">
                              <NoBreak>{equipment.current_model || '—'}</NoBreak>
                            </td>
                            <td className="px-4 py-3 text-base text-ink no-break">
                              <NoBreak>{equipment.process || '—'}</NoBreak>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 rounded-full bg-paper">
                                  <div
                                    className={`h-1.5 rounded-full ${statusUsageColor(pct)}`}
                                    style={{ width: `${pct}%` }}
                                    aria-hidden="true"
                                  />
                                </div>
                                <span className="text-base text-ink tabular no-break">
                                  <NoBreak>
                                    {used} / {total}
                                  </NoBreak>
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <StatusChangeDropdown
                                  currentStatus={equipment.status || ''}
                                  equipmentId={equipment.id}
                                  equipmentNumber={formatEquipmentNumber(
                                    equipment.equipment_number
                                  )}
                                  onStatusChange={handleStatusChange}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(equipment)}
                                  aria-label={t('equipment.edit') || t('common.edit')}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
                                >
                                  <Pencil className="h-4 w-4" />
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

            {/* === 페이지네이션 === */}
            {totalPages > 1 && (
              <div className="rounded-md border border-divider bg-paper-warm px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-caption text-ink-soft tabular">
                    {t('equipment.showing')}{' '}
                    <span className="font-medium text-ink">{filteredEquipments.length}</span>
                    {t('equipment.ofItems')}{' '}
                    <span className="font-medium text-ink">{startIndex + 1}</span>
                    {t('equipment.to')}
                    <span className="font-medium text-ink">
                      {Math.min(endIndex, filteredEquipments.length)}
                    </span>
                    {t('equipment.itemsDisplay')}
                  </p>
                  <nav
                    className="inline-flex items-center gap-1 self-end sm:self-auto"
                    aria-label={t('equipment.page')}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      aria-label={t('equipment.previous')}
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
                      aria-label={t('equipment.next')}
                      className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                    >
                      ›
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* === 설비 추가 모달 (단일, 빈 상태/일반 공용) === */}
      {showAddModal && (
        <div
          className="mobile-modal-container"
          onClick={() => !isSubmitting && setShowAddModal(false)}
        >
          <div
            className="mobile-modal-content md:max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('equipment.newEquipment')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label={t('common.close')}
                disabled={isSubmitting}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body space-y-4">
                <FormField
                  id="equipment_number"
                  label={t('equipment.equipmentNumber')}
                  required
                >
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-medium text-ink-soft">
                      C
                    </span>
                    <input
                      type="text"
                      id="equipment_number"
                      value={addFormData.equipmentNumber.replace(/^C/i, '')}
                      onChange={e => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setAddFormData(prev => ({
                          ...prev,
                          equipmentNumber: value
                            ? `C${value.padStart(3, '0')}`
                            : 'C000',
                        }))
                      }}
                      disabled={isSubmitting}
                      required
                      placeholder="001"
                      maxLength={3}
                      pattern="[0-9]{3}"
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper pl-8 pr-3 text-base text-ink placeholder-ink-mute tabular transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                    />
                  </div>
                  <p className="mt-1 text-caption text-ink-mute">
                    {t('equipment.numberFormat')}
                  </p>
                </FormField>

                <FormField id="add_location" label={t('equipment.location')} required>
                  <select
                    id="add_location"
                    value={addFormData.location}
                    onChange={e =>
                      setAddFormData(prev => ({ ...prev, location: e.target.value }))
                    }
                    disabled={isSubmitting}
                    required
                    className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                  >
                    {equipmentLocations && equipmentLocations.length > 0
                      ? equipmentLocations.map(location => (
                          <option key={location} value={location}>
                            {location === 'A동'
                              ? t('equipment.locationA')
                              : location === 'B동'
                                ? t('equipment.locationB')
                                : location}
                          </option>
                        ))
                      : [
                          <option key="A동" value="A동">
                            {t('equipment.locationA')}
                          </option>,
                          <option key="B동" value="B동">
                            {t('equipment.locationB')}
                          </option>,
                        ]}
                  </select>
                </FormField>

                <FormField id="add_status" label={t('equipment.initialStatus')} required>
                  <select
                    id="add_status"
                    value={addFormData.status}
                    onChange={e =>
                      setAddFormData(prev => ({ ...prev, status: e.target.value }))
                    }
                    disabled={isSubmitting}
                    required
                    className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                  >
                    {equipmentStatuses && equipmentStatuses.length > 0
                      ? equipmentStatuses.map((status: any, index: number) => {
                          const statusValue = String(status.code || status.name || status)
                          return (
                            <option
                              key={String(status.code || status.name || status || index)}
                              value={statusValue}
                            >
                              {translateStatus(statusValue)}
                            </option>
                          )
                        })
                      : [
                          <option key="가동중" value="가동중">
                            {t('equipment.operating')}
                          </option>,
                          <option key="점검중" value="점검중">
                            {t('equipment.maintenance')}
                          </option>,
                          <option key="셋업중" value="셋업중">
                            {t('equipment.setup')}
                          </option>,
                        ]}
                  </select>
                </FormField>

                <FormField
                  id="add_currentModel"
                  label={t('equipment.productionModel')}
                  required
                >
                  <select
                    id="add_currentModel"
                    value={addFormData.currentModel}
                    onChange={e =>
                      setAddFormData(prev => ({ ...prev, currentModel: e.target.value }))
                    }
                    disabled={isSubmitting}
                    required
                    className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                  >
                    <option value="">{t('equipment.selectModel')}</option>
                    {(availableModels.length > 0
                      ? availableModels
                      : equipmentAvailableModels
                    ).map(model => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="add_process" label={t('equipment.process')} required>
                  <select
                    id="add_process"
                    value={addFormData.process}
                    onChange={e =>
                      setAddFormData(prev => ({ ...prev, process: e.target.value }))
                    }
                    disabled={isSubmitting}
                    required
                    className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none disabled:bg-paper-warm"
                  >
                    <option value="">{t('equipment.selectProcess')}</option>
                    {(availableProcesses.length > 0
                      ? availableProcesses
                      : equipmentAvailableProcesses
                    ).map(process => (
                      <option key={process} value={process}>
                        {process}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:opacity-40"
                >
                  {t('equipment.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:opacity-40"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  )}
                  {isSubmitting ? t('equipment.adding') : t('equipment.addEquipment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === 설비 수정 모달 === */}
      {showEditModal && editEquipment && (
        <div
          className="mobile-modal-container"
          onClick={() => !isSubmitting && setShowEditModal(false)}
        >
          <div
            className="mobile-modal-content md:max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink no-break">
                {t('equipment.equipmentDetail')}
                <span className="mx-2 text-ink-mute">·</span>
                <NoBreak>{editEquipment.equipmentNumber}</NoBreak>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                aria-label={t('common.close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEquipment} className="flex flex-col flex-1 overflow-hidden">
              <div className="mobile-modal-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="edit_equipment_number" label={t('equipment.equipmentNumber')}>
                    <input
                      type="text"
                      id="edit_equipment_number"
                      value={editEquipment.equipmentNumber}
                      disabled
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper-warm px-3 text-base text-ink-soft tabular cursor-not-allowed"
                    />
                  </FormField>

                  <FormField id="edit_location" label={t('equipment.location')}>
                    <select
                      id="edit_location"
                      value={editEquipment.location || ''}
                      onChange={e =>
                        setEditEquipment({ ...editEquipment, location: e.target.value })
                      }
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                    >
                      <option value="A동">{t('equipment.locationA')}</option>
                      <option value="B동">{t('equipment.locationB')}</option>
                    </select>
                  </FormField>

                  <FormField id="edit_status" label={t('equipment.status')}>
                    <select
                      id="edit_status"
                      value={editEquipment.status || ''}
                      onChange={e =>
                        setEditEquipment({ ...editEquipment, status: e.target.value })
                      }
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                    >
                      <option value="가동중">{t('equipment.operating')}</option>
                      <option value="점검중">{t('equipment.maintenance')}</option>
                      <option value="셋업중">{t('equipment.setup')}</option>
                    </select>
                  </FormField>

                  <FormField id="edit_currentModel" label={t('equipment.productionModel')}>
                    <select
                      id="edit_currentModel"
                      value={editEquipment.current_model || ''}
                      onChange={e =>
                        setEditEquipment({
                          ...editEquipment,
                          current_model: e.target.value,
                        })
                      }
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                    >
                      <option value="">{t('equipment.selectModel')}</option>
                      {(availableModels.length > 0
                        ? availableModels
                        : equipmentAvailableModels
                      ).map(model => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField id="edit_process" label={t('equipment.process')}>
                    <select
                      id="edit_process"
                      value={editEquipment.process || ''}
                      onChange={e =>
                        setEditEquipment({ ...editEquipment, process: e.target.value })
                      }
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                    >
                      <option value="">{t('equipment.selectProcess')}</option>
                      {(availableProcesses.length > 0
                        ? availableProcesses
                        : equipmentAvailableProcesses
                      ).map(process => (
                        <option key={process} value={process}>
                          {process}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField id="edit_toolPositions" label={t('equipment.toolPositionCount')}>
                    <input
                      type="text"
                      id="edit_toolPositions"
                      value={editEquipment.tool_position_count || 21}
                      disabled
                      className="min-h-touch w-full rounded-sm border border-divider bg-paper-warm px-3 text-base text-ink-soft tabular cursor-not-allowed"
                    />
                  </FormField>
                </div>

                {(editEquipment.created_at || editEquipment.updated_at) && (
                  <dl className="mt-6 pt-6 border-t border-divider grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
                    {editEquipment.created_at && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-caption text-ink-soft no-break">
                          {t('equipment.registeredDate')}
                        </dt>
                        <dd className="text-ink tabular">
                          {formatDateForLocale(editEquipment.created_at, dateLocale)}
                        </dd>
                      </div>
                    )}
                    {editEquipment.updated_at && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-caption text-ink-soft no-break">
                          {t('equipment.modifiedDate')}
                        </dt>
                        <dd className="text-ink tabular">
                          {formatDateForLocale(editEquipment.updated_at, dateLocale)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>

              <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:opacity-40"
                >
                  {t('equipment.close')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:opacity-40"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  )}
                  {isSubmitting ? t('equipment.saving') || t('common.save') : t('equipment.saveEdit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일괄 업로드 모달 */}
      {showBulkUploadModal && (
        <EquipmentExcelUploader
          onUploadSuccess={() => {
            setShowBulkUploadModal(false)
            refetch()
          }}
          onCancel={() => setShowBulkUploadModal(false)}
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
  tone?: 'go' | 'watch' | 'stop' | 'default'
}

function StatCell({ label, value, unit, tone = 'default' }: StatCellProps) {
  const valueColor =
    tone === 'go'
      ? 'text-signal-go-strong'
      : tone === 'watch'
        ? 'text-signal-watch-strong'
        : tone === 'stop'
          ? 'text-signal-stop-strong'
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

interface DistributionItem {
  key: string
  label: string
  suffix: string
  meta: string
  total: number
  unit: string
}

interface DistributionCardProps {
  title: string
  emptyMessage: string
  items: DistributionItem[]
}

function DistributionCard({ title, emptyMessage, items }: DistributionCardProps) {
  return (
    <section className="rounded-md border border-divider bg-paper-warm p-4 sm:p-5">
      <h3 className="text-title font-semibold text-ink no-break">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-base text-ink-soft">{emptyMessage}</p>
        ) : (
          items.map(item => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-sm border border-divider bg-paper px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-ink no-break">
                  <NoBreak>{item.label}</NoBreak>
                  <span className="ml-1 text-ink-soft">{item.suffix}</span>
                </p>
                <p className="mt-0.5 text-caption text-ink-soft tabular">{item.meta}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-headline font-semibold text-ink tabular">
                  {item.total.toLocaleString()}
                </p>
                <p className="text-caption text-ink-mute no-break">{item.unit}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

interface SortHeaderProps {
  label: string
  field: SortField
  sortField: SortField
  sortOrder: SortOrder
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

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}

function FormField({ id, label, required, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-label font-medium text-ink mb-1.5 no-break">
        {label}
        {required && <span className="ml-1 text-signal-stop">*</span>}
      </label>
      {children}
    </div>
  )
}

interface EmptyFilterStateProps {
  message: string
  resetLabel: string
  onReset: () => void
}

function EmptyFilterState({ message, resetLabel, onReset }: EmptyFilterStateProps) {
  return (
    <div className="rounded-md border border-divider bg-paper-warm px-4 py-12 text-center">
      <p className="text-base text-ink-soft">{message}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 inline-flex items-center text-label font-medium text-gauge-cobalt-strong transition-colors hover:underline"
      >
        {resetLabel}
      </button>
    </div>
  )
}
