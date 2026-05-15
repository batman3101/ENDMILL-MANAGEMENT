'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../../components/shared/Toast'
import { useCAMSheets } from '../../../lib/hooks/useCAMSheets'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation } from '../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useToolChanges, useToolChangeStats, type ToolChange, type ToolChangeFilters } from '../../../lib/hooks/useToolChanges'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'
import { ToolChangeListCard } from '@/components/features/tool-changes/tool-change-list-card'
import { clientLogger } from '@/lib/utils/logger'
import { useFactory } from '@/lib/hooks/useFactory'
import { getToolChangeReasonLabel } from '@/lib/utils/toolChangeReasonLabels'
import type { ToolChangeExcelData } from '@/lib/utils/toolChangesExcelTemplate'
// toolChangesExcelTemplate functions are dynamically imported when needed

export default function ToolChangesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const { camSheets, getAvailableModels } = useCAMSheets()
  const confirmation = useConfirmation()
  const { currentFactory } = useFactory()

  // 필터 상태
  const [filters, setFilters] = useState<ToolChangeFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('')
  const [selectedEndmillType, setSelectedEndmillType] = useState<string>('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // 실제 Supabase 데이터 훅 사용
  const {
    toolChanges,
    isLoading,
    error: toolChangesError,
    refreshData,
    hasMore,
    totalCount
  } = useToolChanges(filters)

  // 통계 데이터 훅 사용 (오늘 날짜 기준, 실시간 업데이트 활성화)
  const {
    stats,
    isLoading: isStatsLoading,
    error: statsError
  } = useToolChangeStats(undefined, true)

  // 삭제 처리 중인 항목 ID
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  // CAM Sheet 기반 사용 가능 모델 목록 (bulk upload 템플릿에 사용)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Excel 일괄 입력 상태
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelData, setExcelData] = useState<ToolChangeExcelData[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDataValid, setIsDataValid] = useState(false)

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const toolChangesReasons = settings.toolChanges.reasons
  const availableProcessesFromSettings = settings.equipment.processes

  // 교체사유 번역 매핑 함수
  const getReasonTranslation = (reason: string) => {
    return getToolChangeReasonLabel(reason, t)
  }

  // 필터 업데이트 함수들
  const updateFilters = useCallback(() => {
    const newFilters: ToolChangeFilters = {
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      sortField,
      sortDirection
    }

    if (searchTerm.trim()) {
      newFilters.searchTerm = searchTerm.trim()
    }

    if (selectedEquipment) {
      newFilters.equipmentNumber = parseInt(selectedEquipment)
    }

    if (selectedEndmillType) {
      newFilters.endmillType = selectedEndmillType
    }

    if (dateRange.start) {
      newFilters.startDate = dateRange.start
    }

    if (dateRange.end) {
      newFilters.endDate = dateRange.end
    }

    setFilters(newFilters)
  }, [searchTerm, selectedEquipment, selectedEndmillType, dateRange, currentPage, sortField, sortDirection, itemsPerPage])

  // 정렬 처리
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // 같은 필드 클릭시 방향 변경
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // 다른 필드 클릭시 새 필드로 오름차순 시작
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // 정렬 변경시 첫 페이지로
  }, [sortField])


  // 필터 초기화
  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedEquipment('')
    setSelectedEndmillType('')
    setDateRange({ start: '', end: '' })
    setCurrentPage(1)
    setSortField('created_at')
    setSortDirection('desc')
    setFilters({ limit: itemsPerPage })
  }, [])

  // 필터 변경시 페이지 리셋 (currentPage 제외)
  useEffect(() => {
    setCurrentPage(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedEquipment, selectedEndmillType, dateRange.start, dateRange.end, sortField, sortDirection])

  // 필터 업데이트 (currentPage 포함)
  useEffect(() => {
    updateFilters()
  }, [updateFilters])

  // CAM SHEET에서 사용 가능한 모델 목록 로드 (bulk upload 템플릿용)
  useEffect(() => {
    setAvailableModels(getAvailableModels)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camSheets])


  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case '정기교체':
        return 'bg-gauge-cobalt-soft text-gauge-cobalt-strong'
      case '파손':
        return 'bg-signal-stop-soft text-signal-stop-strong'
      case '마모':
        return 'bg-signal-watch-soft text-signal-watch-strong'
      case '모델변경':
        return 'bg-gauge-cobalt-soft text-gauge-cobalt-strong'
      case '품질불량':
        return 'bg-signal-watch-soft text-signal-watch-strong'
      case '기타':
        return 'bg-paper-warm text-ink-soft'
      // Legacy support for old reason names
      case 'Tool Life 종료':
        return 'bg-gauge-cobalt-soft text-gauge-cobalt-strong'
      case '모델 변경':
        return 'bg-gauge-cobalt-soft text-gauge-cobalt-strong'
      case '예방':
        return 'bg-signal-go-soft text-signal-go-strong'
      default:
        return 'bg-paper-warm text-ink-soft'
    }
  }

  const getToolLifeStatus = (toolLife: number) => {
    if (toolLife < 1000) return { color: 'text-signal-stop-strong', status: t('toolChanges.toolLifeShort') }
    if (toolLife < 2000) return { color: 'text-signal-watch-strong', status: t('toolChanges.toolLifeNormal') }
    return { color: 'text-signal-go-strong', status: t('toolChanges.toolLifeGood') }
  }

  // 수정 모달 열기
  const handleEdit = (item: ToolChange) => {
    // 풀스크린 라우트로 이동. sessionStorage로 데이터 핸드오프
    try {
      window.sessionStorage.setItem(
        `tool-change-edit::${item.id}`,
        JSON.stringify(item)
      )
    } catch {
      // sessionStorage 사용 불가 — [id] 페이지의 fallback 메시지가 처리
    }
    router.push(`/dashboard/tool-changes/${item.id}`)
  }

  // 삭제 처리
  const handleDelete = async (item: ToolChange) => {
    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`${item.equipment_number ? `C${item.equipment_number.toString().padStart(3, '0')}` : '설비'} T${item.t_number?.toString().padStart(2, '0') || '??'} 교체 실적 (${item.endmill_code} ${item.endmill_name})`)
    )

    if (confirmed) {
      try {
        setDeletingItemId(item.id)

        // API 호출하여 삭제 처리
        const response = await fetch(`/api/tool-changes?id=${item.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '교체 실적 삭제에 실패했습니다.')
        }

        if (result.success) {
          // 데이터 새로고침
          await refreshData()
          showSuccess(
            '삭제 완료',
            `${item.equipment_number ? `C${item.equipment_number.toString().padStart(3, '0')}` : '설비'} T${item.t_number?.toString().padStart(2, '0') || '??'} 교체 실적이 성공적으로 삭제되었습니다.`
          )
        }
      } catch (error) {
        clientLogger.error('삭제 오류:', error)
        showError(
          '삭제 실패',
          error instanceof Error ? error.message : '교체 실적 삭제 중 오류가 발생했습니다.'
        )
      } finally {
        setDeletingItemId(null)
      }
    }
  }

  // Excel 템플릿 다운로드
  const handleDownloadTemplate = async () => {
    try {
      const { downloadToolChangesTemplate } = await import('@/lib/utils/toolChangesExcelTemplate')
      await downloadToolChangesTemplate(
        availableModels,
        availableProcessesFromSettings,
        toolChangesReasons
      )
      showSuccess('템플릿 다운로드', 'Excel 템플릿이 다운로드되었습니다.')
    } catch (error) {
      clientLogger.error('템플릿 다운로드 오류:', error)
      showError('다운로드 실패', '템플릿 다운로드에 실패했습니다.')
    }
  }

  // Excel 파일 선택
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelFile(file)
    setValidationErrors([])
    setIsDataValid(false)
    setIsValidating(true)

    try {
      // 파일 파싱
      const { parseToolChangesExcel, validateToolChangesData } = await import('@/lib/utils/toolChangesExcelTemplate')
      const parsedData = await parseToolChangesExcel(file)
      setExcelData(parsedData)

      // 기본 유효성 검증
      const validation = validateToolChangesData(parsedData, toolChangesReasons)

      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        setIsDataValid(false)
        showError('검증 실패', `${validation.errors.length}개의 오류가 발견되었습니다.`)
      } else {
        setValidationErrors([])
        setIsDataValid(true)
        showSuccess('검증 완료', `${parsedData.length}건의 데이터가 검증되었습니다.`)
      }
    } catch (error) {
      clientLogger.error('파일 파싱 오류:', error)
      showError('파일 오류', error instanceof Error ? error.message : '파일을 읽을 수 없습니다.')
      setExcelFile(null)
    } finally {
      setIsValidating(false)
    }
  }

  // Excel 일괄 업로드
  const handleBulkUpload = async () => {
    if (!isDataValid || excelData.length === 0) {
      showError('업로드 불가', '검증된 데이터가 없습니다.')
      return
    }

    const confirmed = await confirmation.showConfirmation({
      type: 'save',
      title: t('toolChanges.bulkInsertConfirmTitle'),
      message: t('toolChanges.bulkInsertConfirmMessage', { count: excelData.length }),
      confirmText: t('toolChanges.bulkInsert'),
      cancelText: t('common.cancel')
    })

    if (!confirmed) return

    setIsUploading(true)

    try {
      const response = await fetch('/api/tool-changes/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: excelData, factory_id: currentFactory?.id })
      })

      const result = await response.json()

      if (!response.ok) {
        // 검증 오류가 있는 경우
        if (result.validationErrors) {
          const errorMessages = result.validationErrors.map(
            (err: any) => `행 ${err.row}: ${err.message}`
          )
          setValidationErrors(errorMessages)
          showError('검증 실패', `${errorMessages.length}개의 오류가 발견되었습니다.`)
        } else {
          throw new Error(result.error || '일괄 업로드에 실패했습니다.')
        }
        return
      }

      if (result.success) {
        // 성공
        await refreshData()
        setShowBulkUploadModal(false)
        setExcelFile(null)
        setExcelData([])
        setValidationErrors([])
        setIsDataValid(false)

        showSuccess(
          '일괄 입력 완료',
          `${result.insertedCount}건의 교체 실적이 성공적으로 등록되었습니다.`
        )
      }
    } catch (error) {
      clientLogger.error('일괄 업로드 오류:', error)
      showError(
        '업로드 실패',
        error instanceof Error ? error.message : '일괄 업로드 중 오류가 발생했습니다.'
      )
    } finally {
      setIsUploading(false)
    }
  }

  // Excel 업로드 모달 닫기
  const handleCloseBulkUploadModal = () => {
    setShowBulkUploadModal(false)
    setExcelFile(null)
    setExcelData([])
    setValidationErrors([])
    setIsDataValid(false)
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gauge-cobalt-soft rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.todayChanges')}</p>
              <p className="text-xl font-bold text-gauge-cobalt-strong">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.todayTotal || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-signal-go-soft rounded-lg flex items-center justify-center mr-3">
              ⏱️
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.regularReplacement')}</p>
              <p className="text-xl font-bold text-signal-go-strong">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.regularReplacement || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-signal-stop-soft rounded-lg flex items-center justify-center mr-3">
              💥
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.broken')}</p>
              <p className="text-xl font-bold text-signal-stop-strong">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.broken || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-signal-watch-soft rounded-lg flex items-center justify-center mr-3">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.wear')}</p>
              <p className="text-xl font-bold text-signal-watch-strong">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.wear || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gauge-cobalt-soft rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.modelChange')}</p>
              <p className="text-xl font-bold text-gauge-cobalt-strong">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.modelChange || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-signal-watch-soft rounded-lg flex items-center justify-center mr-3">
              🛡️
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.qualityDefect')}</p>
              <p className="text-xl font-bold text-signal-watch-strong">
                {isStatsLoading ? (
                  <span className="text-sm">...</span>
                ) : (
                  stats?.qualityDefect || 0
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gauge-cobalt-soft rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.topModelToday')}</p>
              {isStatsLoading ? (
                <p className="text-lg font-bold text-gauge-cobalt-strong">...</p>
              ) : (
                <>
                  <p className="text-lg font-bold text-gauge-cobalt-strong">{stats?.topModelToday.name || t('toolChanges.none')}</p>
                  <p className="text-xs text-ink-mute">{stats?.topModelToday.count || 0} {t('toolChanges.cases')}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-paper-warm rounded-lg shadow-sm border border-divider p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-signal-go-soft rounded-lg flex items-center justify-center mr-3">
              ⚙️
            </div>
            <div>
              <p className="text-xs font-medium text-ink-soft">{t('toolChanges.topProcessToday')}</p>
              {isStatsLoading ? (
                <p className="text-lg font-bold text-signal-go-strong">...</p>
              ) : (
                <>
                  <p className="text-lg font-bold text-signal-go-strong">{stats?.topProcessToday.name || t('toolChanges.none')}</p>
                  <p className="text-xs text-ink-mute">{stats?.topProcessToday.count || 0} {t('toolChanges.cases')}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 및 필터 */}
      <div className="bg-paper-warm rounded-md border border-divider p-4">
        <div className="flex flex-col gap-4">
          {/* 첫 번째 줄: 검색, 액션 버튼 */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-1 min-w-0">
              <input
                type="text"
                placeholder={t('toolChanges.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-11 px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-gauge-cobalt transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={resetFilters}
                className="h-11 px-4 py-2 text-label font-medium text-ink bg-paper border border-divider rounded-sm hover:bg-paper-warm transition-colors"
              >
                {t('toolChanges.resetFilters')}
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                title="Excel 일괄 입력은 데스크톱 전용입니다"
                className="hidden md:flex px-4 py-2 bg-signal-go-strong text-paper rounded-sm hover:bg-signal-go transition-colors items-center gap-2 text-label font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {t('toolChanges.bulkUpload')}
              </button>
              <Link
                href="/dashboard/tool-changes/new"
                className="hidden md:inline-flex items-center justify-center px-4 py-2 bg-gauge-cobalt text-paper rounded-sm hover:bg-gauge-cobalt-strong transition-colors text-label font-medium"
              >
                {t('toolChanges.addChangeRecord')}
              </Link>
            </div>
          </div>

          {/* 두 번째 줄: 날짜 필터 */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="text-label font-medium text-ink-soft no-break shrink-0">
              {t('toolChanges.period')}:
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1 min-w-0 sm:flex-none sm:w-auto h-11 px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-gauge-cobalt transition-colors"
            />
            <span className="text-ink-soft shrink-0">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1 min-w-0 sm:flex-none sm:w-auto h-11 px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-gauge-cobalt transition-colors"
            />

            {/* 에러 및 로딩 상태 표시 */}
            {toolChangesError && (
              <div className="text-signal-stop-strong text-caption w-full sm:w-auto">
                {t('toolChanges.error')}: {toolChangesError}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center text-gauge-cobalt-strong text-caption w-full sm:w-auto">
                <div className="w-4 h-4 border-2 border-divider border-t-gauge-cobalt rounded-full animate-spin mr-2"></div>
                {t('toolChanges.loading')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 교체 실적 목록 */}
      {/* 통계 에러 배너 — 통계 fetch 실패 시 사용자가 직접 볼 수 있도록 */}
      {statsError && (
        <div
          role="alert"
          className="rounded-md border border-signal-stop bg-signal-stop-soft px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-signal-stop-strong mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-label font-semibold text-signal-stop-strong">
                통계 불러오기 실패
              </p>
              <p className="mt-1 text-caption text-signal-stop-strong/80 break-all">
                {statsError}
              </p>
              <p className="mt-2 text-caption text-ink-soft">
                URL에 <code className="font-mono">?debug=1</code> 추가 후 우하단 ⚙️ 버튼으로 콘솔/네트워크 확인 가능
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 모바일 카드 리스트 (md 미만) */}
      <div className="md:hidden">
        <h2 className="text-title font-semibold text-ink mb-3">{t('toolChanges.changeHistoryList')}</h2>
        {toolChanges.length > 0 ? (
          <div className="space-y-3">
            {toolChanges.map((change) => (
              <ToolChangeListCard
                key={change.id}
                change={change}
                labels={{
                  model: t('toolChanges.productionModel'),
                  process: t('toolChanges.process'),
                  tNumber: t('toolChanges.tNumber'),
                  operator: t('toolChanges.replacedBy'),
                  endmill: t('toolChanges.endmillCode'),
                  toolLife: t('toolChanges.toolLife'),
                  toolLifeUnit: t('toolChanges.times'),
                  edit: t('toolChanges.edit'),
                  delete: t('toolChanges.delete'),
                  deleteConfirm: t('toolChanges.confirmDelete'),
                }}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDeleting={deletingItemId === change.id}
                reasonLabel={getReasonTranslation}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-divider bg-paper-warm px-4 py-8 text-center text-ink-soft">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-divider border-t-gauge-cobalt"></div>
                <span>{t('toolChanges.loadingData')}</span>
              </div>
            ) : (
              <span>{t('toolChanges.noData')}</span>
            )}
          </div>
        )}
      </div>

      {/* 데스크톱 테이블 (md 이상) */}
      <div className="hidden md:block bg-paper-warm rounded-lg shadow-sm border border-divider overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b border-divider">
          <h2 className="text-lg font-semibold text-ink">{t('toolChanges.changeHistoryList')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-paper">
              <tr>
                <SortableTableHeader
                  label={t('toolChanges.changeDateTime')}
                  field="change_date"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.equipmentNumber')}
                  field="equipment_number"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.productionModel')}
                  field="production_model"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.process')}
                  field="process"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.tNumber')}
                  field="t_number"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider">
                  {t('toolChanges.endmillCode')}
                </th>
                <SortableTableHeader
                  label={t('toolChanges.endmillName')}
                  field="endmill_name"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider">
                  {t('toolChanges.replacedBy')}
                </th>
                <SortableTableHeader
                  label={t('toolChanges.changeReason')}
                  field="change_reason"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('toolChanges.toolLife')}
                  field="tool_life"
                  currentSortField={sortField}
                  currentSortOrder={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider">
                  {t('toolChanges.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-paper-warm divide-y divide-divider">
              {toolChanges.length > 0 ? toolChanges.map((change) => {
                const toolLifeStatus = getToolLifeStatus(change.tool_life || 0)
                // Format date properly - change_date is just a date string, not datetime
                const formattedDateTime = change.created_at ? new Date(change.created_at).toLocaleString('ko-KR') : change.change_date

                return (
                  <tr key={change.id} className="hover:bg-paper transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">{formattedDateTime}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink">
                        {change.equipment?.name || (change.equipment_number ? `C${change.equipment_number.toString().padStart(3, '0')}` : '-')}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">{change.production_model || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">{change.process || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink">
                        {change.t_number ? `T${change.t_number.toString().padStart(2, '0')}` : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink">{change.endmill_code || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">
                        {change.endmill_name || change.endmill_type?.name || change.endmill_type?.code || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">{change.user?.name || '-'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReasonBadge(change.change_reason || change.reason || '')}`}>
                        {getReasonTranslation(change.change_reason || change.reason || '-')}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${toolLifeStatus.color}`}>
                        {(change.tool_life || change.old_life_hours || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-ink-mute">{toolLifeStatus.status}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(change)}
                        className="text-gauge-cobalt-strong hover:underline mr-3 transition-colors"
                      >
                        {t('toolChanges.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(change)}
                        className={
                          deletingItemId === change.id
                            ? 'text-paper bg-signal-stop hover:bg-signal-stop-strong px-2 py-1 rounded font-medium transition-colors'
                            : 'text-signal-stop-strong hover:underline transition-colors'
                        }
                      >
                        {deletingItemId === change.id ? t('toolChanges.confirmDelete') : t('toolChanges.delete')}
                      </button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-ink-soft">
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-divider border-t-gauge-cobalt rounded-full animate-spin mr-2"></div>
                        {t('toolChanges.loadingData')}
                      </div>
                    ) : (
                      t('toolChanges.noData')
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {toolChanges.length > 0 && (
          <div className="px-6 py-4 border-t border-divider bg-paper">
            <div className="flex items-center justify-between">
              <div className="text-sm text-ink-soft">
                {t('toolChanges.showing', {
                  total: totalCount || toolChanges.length,
                  from: ((currentPage - 1) * itemsPerPage) + 1,
                  to: Math.min(currentPage * itemsPerPage, totalCount || toolChanges.length)
                })}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-3 py-1 text-sm font-medium text-ink bg-paper-warm border border-divider rounded-md hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('toolChanges.previous')}
                </button>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const totalPages = Math.ceil((totalCount || toolChanges.length) / itemsPerPage)
                    const pageNumbers = []
                    const maxVisiblePages = 5

                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1)
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          disabled={isLoading}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            currentPage === i
                              ? 'bg-gauge-cobalt text-paper'
                              : 'text-ink bg-paper-warm border border-divider hover:bg-paper'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {i}
                        </button>
                      )
                    }

                    return pageNumbers
                  })()}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => {
                    const totalPages = Math.ceil((totalCount || toolChanges.length) / itemsPerPage)
                    return Math.min(prev + 1, totalPages)
                  })}
                  disabled={!hasMore || isLoading}
                  className="px-3 py-1 text-sm font-medium text-ink bg-paper-warm border border-divider rounded-md hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('toolChanges.next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Excel 일괄 입력 모달 */}
      {showBulkUploadModal && (
        <div className="mobile-modal-container" onClick={handleCloseBulkUploadModal}>
          <div className="mobile-modal-content md:max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium text-ink">{t('toolChanges.bulkUploadTitle')}</h3>
              <button
                onClick={handleCloseBulkUploadModal}
                className="p-2 text-ink-mute hover:text-ink hover:bg-paper-warm rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="mobile-modal-body">
              {/* 템플릿 다운로드 */}
              <div className="mb-6">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-gauge-cobalt text-paper rounded-md hover:bg-gauge-cobalt-strong transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('toolChanges.downloadTemplate')}
                </button>
              </div>

              {/* 파일 업로드 영역 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink mb-2">
                  {t('toolChanges.uploadFile')}
                </label>
                <div className="border-2 border-dashed border-divider rounded-lg p-6 text-center hover:border-gauge-cobalt transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="excel-file-input"
                    disabled={isValidating || isUploading}
                  />
                  <label
                    htmlFor="excel-file-input"
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-ink-mute mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-ink-soft mb-1">
                        {excelFile ? excelFile.name : t('toolChanges.dragDropFile')}
                      </p>
                      <p className="text-xs text-ink-mute">
                        {excelFile ? t('toolChanges.fileSelected') : 'Excel 파일 (.xlsx, .xls)'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 검증 진행 중 */}
              {isValidating && (
                <div className="mb-6 p-4 bg-gauge-cobalt-soft border border-divider rounded-md">
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-divider border-t-gauge-cobalt rounded-full animate-spin mr-3"></div>
                    <p className="text-sm text-gauge-cobalt-strong">{t('toolChanges.validationInProgress')}</p>
                  </div>
                </div>
              )}

              {/* 검증 성공 */}
              {isDataValid && excelData.length > 0 && !isValidating && (
                <div className="mb-6 p-4 bg-signal-go-soft border border-signal-go rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-signal-go-strong">{t('toolChanges.validationSuccess')}</p>
                      <p className="text-xs text-signal-go-strong/80 mt-1">{t('toolChanges.readyToInsert', { count: excelData.length })}</p>
                    </div>
                    <svg className="w-6 h-6 text-signal-go-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* 검증 오류 */}
              {validationErrors.length > 0 && (
                <div className="mb-6">
                  <div className="p-4 bg-signal-stop-soft border border-signal-stop rounded-md">
                    <p className="text-sm font-medium text-signal-stop-strong mb-2">{t('toolChanges.validationFailed')}</p>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="text-xs text-signal-stop-strong/80 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseBulkUploadModal}
                className="w-full sm:w-auto px-4 py-2 bg-paper-warm text-ink border border-divider rounded-md hover:bg-paper transition-colors"
                disabled={isUploading}
              >
                {t('toolChanges.closeModal')}
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={!isDataValid || isUploading || excelData.length === 0}
                className="w-full sm:w-auto px-4 py-2 bg-signal-go-strong text-paper rounded-md hover:bg-signal-go transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin"></div>
                    {t('toolChanges.processingUpload')}
                  </>
                ) : (
                  t('toolChanges.bulkInsert')
                )}
              </button>
            </div>
          </div>
        </div>
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

      {/* 모바일 FAB: /new 라우트로 진입 (1차 액션, 엄지 영역).
          하단 네비게이션 바(64px) 위에 위치하도록 bottom-20 + safe-area */}
      <Link
        href="/dashboard/tool-changes/new"
        aria-label={t('toolChanges.addChangeRecord')}
        className="md:hidden fixed right-4 z-40 inline-flex items-center justify-center min-h-action min-w-action rounded-md bg-gauge-cobalt text-paper shadow-modal hover:bg-gauge-cobalt-strong transition-colors"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
} 
