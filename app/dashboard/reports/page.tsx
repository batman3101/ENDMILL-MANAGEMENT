'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, BarChart3, DollarSign, Clock, TrendingUp, X, FileBarChart } from 'lucide-react'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useReports } from '../../../lib/hooks/useReports'
import { ReportType, ReportFilter, ReportPeriod } from '../../../lib/types/reports'
import MonthlyReportView from '../../../components/reports/MonthlyReportView'
import CostAnalysisView from '../../../components/reports/CostAnalysisView'
import ToolLifeAnalysisView from '../../../components/reports/ToolLifeAnalysisView'
import PerformanceReportView from '../../../components/reports/PerformanceReportView'
import { useToast } from '../../../components/shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

function resolveDateLocale(language: string | undefined): string {
  if (!language) return 'ko-KR'
  if (language.toLowerCase().startsWith('vi')) return 'vi-VN'
  return 'ko-KR'
}

interface ReportTypeOption {
  type: ReportType
  titleKey: string
  descriptionKey: string
  Icon: React.ComponentType<{ className?: string }>
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    type: 'monthly',
    titleKey: 'reports.monthlyReport',
    descriptionKey: 'reports.monthlyDescription',
    Icon: BarChart3,
  },
  {
    type: 'cost',
    titleKey: 'reports.costAnalysis',
    descriptionKey: 'reports.costDescription',
    Icon: DollarSign,
  },
  {
    type: 'tool-life',
    titleKey: 'reports.toolLifeAnalysis',
    descriptionKey: 'reports.toolLifeDescription',
    Icon: Clock,
  },
  {
    type: 'performance',
    titleKey: 'reports.performanceReport',
    descriptionKey: 'reports.performanceDescription',
    Icon: TrendingUp,
  },
]

export default function ReportsPage() {
  const { t, i18n } = useTranslation()
  const dateLocale = resolveDateLocale(i18n.language)
  const { settings } = useSettings()
  const {
    generateReport,
    generatedReport,
    setGeneratedReport,
    isGenerating,
    error: _error,
  } = useReports()
  const { showSuccess, showError } = useToast()

  const equipmentModels = settings.equipment.models
  const endmillCategories = settings.inventory.categories

  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({
    period: 'month',
    equipmentModel: '',
    endmillCategory: '',
  })

  const handleReportTypeClick = (type: ReportType) => {
    setSelectedReportType(type)
    setGeneratedReport(null)
  }

  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      showError(t('reports.selectType'))
      return
    }
    try {
      await generateReport(selectedReportType, filter)
      showSuccess(t('reports.generateSuccess'))
    } catch (err) {
      showError(t('reports.generateError'))
      clientLogger.error('리포트 생성 오류:', err)
    }
  }

  const getReportTypeTitleKey = (type: ReportType): string => {
    const opt = REPORT_TYPES.find(r => r.type === type)
    return opt ? opt.titleKey : ''
  }

  const formatGeneratedAt = (value: string): string => {
    try {
      return new Date(value).toLocaleString(dateLocale)
    } catch {
      return value
    }
  }

  return (
    <div className="space-y-6">
      {/* === 4-카드 리포트 타입 선택기 (cobalt 통일, 선택 카드만 강조) === */}
      <section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        role="tablist"
        aria-label={t('reports.selectType')}
      >
        {REPORT_TYPES.map(({ type, titleKey, descriptionKey, Icon }) => {
          const isSelected = selectedReportType === type
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleReportTypeClick(type)}
              className={
                isSelected
                  ? 'rounded-md border border-gauge-cobalt bg-gauge-cobalt-soft p-5 text-left ring-2 ring-gauge-cobalt-soft transition-colors'
                  : 'rounded-md border border-divider bg-paper-warm p-5 text-left transition-colors hover:border-gauge-cobalt-soft hover:bg-paper'
              }
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={
                    isSelected
                      ? 'h-5 w-5 flex-shrink-0 text-gauge-cobalt-strong'
                      : 'h-5 w-5 flex-shrink-0 text-ink-soft'
                  }
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h3
                    className={
                      isSelected
                        ? 'text-title font-semibold text-gauge-cobalt-strong no-break'
                        : 'text-title font-semibold text-ink no-break'
                    }
                  >
                    {t(titleKey)}
                  </h3>
                  <p className="mt-1 text-base text-ink-soft">{t(descriptionKey)}</p>
                </div>
              </div>
            </button>
          )
        })}
      </section>

      {/* === 필터 / 설정 === */}
      {selectedReportType && (
        <section className="rounded-md border border-divider bg-paper-warm p-5">
          <h2 className="text-title font-semibold text-ink no-break">
            {t('reports.reportSettings')}
            <span className="mx-2 text-ink-mute">·</span>
            {t(getReportTypeTitleKey(selectedReportType))}
          </h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterField label={t('reports.period')}>
              <select
                value={filter.period}
                onChange={e => {
                  const newPeriod = e.target.value as ReportPeriod
                  setFilter({
                    ...filter,
                    period: newPeriod,
                    startDate: newPeriod === 'custom' ? filter.startDate : undefined,
                    endDate: newPeriod === 'custom' ? filter.endDate : undefined,
                  })
                }}
                className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
              >
                <option value="today">{t('reports.today')}</option>
                <option value="week">{t('reports.thisWeek')}</option>
                <option value="month">{t('reports.thisMonth')}</option>
                <option value="quarter">{t('reports.quarter')}</option>
                <option value="year">{t('reports.thisYear')}</option>
                <option value="custom">{t('reports.custom')}</option>
              </select>
            </FilterField>

            {filter.period === 'custom' && (
              <>
                <FilterField label={t('reports.startDate')}>
                  <input
                    type="date"
                    value={filter.startDate || ''}
                    onChange={e => setFilter({ ...filter, startDate: e.target.value })}
                    className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                  />
                </FilterField>
                <FilterField label={t('reports.endDate')}>
                  <input
                    type="date"
                    value={filter.endDate || ''}
                    onChange={e => setFilter({ ...filter, endDate: e.target.value })}
                    className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
                  />
                </FilterField>
              </>
            )}

            <FilterField label={t('reports.equipmentModel')}>
              <select
                value={filter.equipmentModel}
                onChange={e => setFilter({ ...filter, equipmentModel: e.target.value })}
                className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
              >
                <option value="">{t('reports.all')}</option>
                {equipmentModels.map(model => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label={t('reports.endmillType')}>
              <select
                value={filter.endmillCategory}
                onChange={e => setFilter({ ...filter, endmillCategory: e.target.value })}
                className="min-h-touch w-full rounded-sm border border-divider bg-paper px-3 pr-8 text-base text-ink transition-colors focus:border-gauge-cobalt focus:outline-none"
              >
                <option value="">{t('reports.all')}</option>
                {endmillCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FilterField>

            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={
                  isGenerating ||
                  (filter.period === 'custom' && (!filter.startDate || !filter.endDate))
                }
                className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm bg-gauge-cobalt px-6 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t('reports.generating')}
                  </>
                ) : (
                  t('reports.generateReport')
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* === 생성된 리포트 / 빈 상태 === */}
      {generatedReport ? (
        <section className="rounded-md border border-divider bg-paper-warm overflow-hidden">
          <header className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-title font-semibold text-ink no-break">
                {t(getReportTypeTitleKey(generatedReport.metadata.type))}
              </h2>
              <p className="mt-1 text-caption text-ink-soft tabular">
                {t('reports.generatedAt')}{' '}
                {formatGeneratedAt(generatedReport.metadata.generatedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGeneratedReport(null)}
              aria-label={t('common.close')}
              className="inline-flex min-h-touch items-center gap-1 rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
            >
              <X className="h-4 w-4" />
              {t('common.close')}
            </button>
          </header>
          <div className="p-5">
            {generatedReport.metadata.type === 'monthly' && (
              <MonthlyReportView data={generatedReport} />
            )}
            {generatedReport.metadata.type === 'cost' && (
              <CostAnalysisView data={generatedReport} />
            )}
            {generatedReport.metadata.type === 'tool-life' && (
              <ToolLifeAnalysisView data={generatedReport} />
            )}
            {generatedReport.metadata.type === 'performance' && (
              <PerformanceReportView data={generatedReport} />
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-md border border-divider bg-paper-warm overflow-hidden">
          <header className="border-b border-divider px-5 py-4">
            <h2 className="text-title font-semibold text-ink no-break">
              {t('reports.generatedReport')}
            </h2>
          </header>
          <div className="px-5 py-12 text-center">
            <FileBarChart
              className="h-10 w-10 text-ink-mute mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-base text-ink-soft">{t('reports.noReport')}</p>
            <p className="mt-1 text-caption text-ink-mute">{t('reports.noReportMessage')}</p>
          </div>
        </section>
      )}
    </div>
  )
}

interface FilterFieldProps {
  label: string
  children: React.ReactNode
}

function FilterField({ label, children }: FilterFieldProps) {
  return (
    <div>
      <label className="block text-label font-medium text-ink mb-1.5 no-break">
        {label}
      </label>
      {children}
    </div>
  )
}
