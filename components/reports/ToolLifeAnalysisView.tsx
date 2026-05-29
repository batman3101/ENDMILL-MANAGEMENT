'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import { ToolLifeAnalysisData } from '../../lib/types/reports'
import { getToolChangeReasonLabel } from '../../lib/utils/toolChangeReasonLabels'

interface ToolLifeAnalysisViewProps {
  data: ToolLifeAnalysisData
}

type SortField = 'toolName' | 'toolCode' | 'category' | 'averageLife' | 'standardLife' | 'achievementRate' | 'minLife' | 'maxLife' | 'changeCount' | 'reason' | 'percentage' | 'count' | 'range' | 'period' | 'failureCount' | 'averageLifeAtFailure' | 'mainReason'
type SortOrder = 'asc' | 'desc'

export default function ToolLifeAnalysisView({ data }: ToolLifeAnalysisViewProps) {
  const { t } = useTranslation()
  const { summary, lifeByTool, lifeByReason, lifeTrend, lifeDistribution, prematureFailureAnalysis } = data

  // 정렬 상태
  const [toolSortField, setToolSortField] = useState<SortField>('achievementRate')
  const [toolSortOrder, setToolSortOrder] = useState<SortOrder>('desc')

  const [reasonSortField,] = useState<SortField>('percentage')
  const [reasonSortOrder,] = useState<SortOrder>('desc')

  const [trendSortField, setTrendSortField] = useState<SortField>('period')
  const [trendSortOrder, setTrendSortOrder] = useState<SortOrder>('asc')

  const [distributionSortField,] = useState<SortField>('percentage')
  const [distributionSortOrder,] = useState<SortOrder>('desc')

  const [failureSortField, setFailureSortField] = useState<SortField>('failureCount')
  const [failureSortOrder, setFailureSortOrder] = useState<SortOrder>('desc')

  // 정렬 핸들러
  const handleSort = (
    field: SortField,
    currentField: SortField,
    currentOrder: SortOrder,
    setField: (field: SortField) => void,
    setOrder: (order: SortOrder) => void
  ) => {
    if (currentField === field) {
      setOrder(currentOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setField(field)
      setOrder('desc')
    }
  }

  // 정렬된 데이터
  const sortedToolData = useMemo(() => {
    return [...lifeByTool].sort((a, b) => {
      const aValue = a[toolSortField as keyof typeof a]
      const bValue = b[toolSortField as keyof typeof b]
      if (aValue < bValue) return toolSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return toolSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [lifeByTool, toolSortField, toolSortOrder])

  // Reason data sorted - not used in UI
  useMemo(() => {
    return [...lifeByReason].sort((a, b) => {
      const aValue = a[reasonSortField as keyof typeof a]
      const bValue = b[reasonSortField as keyof typeof b]
      if (aValue < bValue) return reasonSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return reasonSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [lifeByReason, reasonSortField, reasonSortOrder])

  const sortedTrendData = useMemo(() => {
    return [...lifeTrend].sort((a, b) => {
      const aValue = a[trendSortField as keyof typeof a]
      const bValue = b[trendSortField as keyof typeof b]
      if (aValue < bValue) return trendSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return trendSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [lifeTrend, trendSortField, trendSortOrder])

  // Distribution data sorted - not used in UI
  useMemo(() => {
    return [...lifeDistribution].sort((a, b) => {
      const aValue = a[distributionSortField as keyof typeof a]
      const bValue = b[distributionSortField as keyof typeof b]
      if (aValue < bValue) return distributionSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return distributionSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [lifeDistribution, distributionSortField, distributionSortOrder])

  const sortedFailureData = useMemo(() => {
    return [...prematureFailureAnalysis].sort((a, b) => {
      const aValue = a[failureSortField as keyof typeof a]
      const bValue = b[failureSortField as keyof typeof b]
      if (aValue < bValue) return failureSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return failureSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [prematureFailureAnalysis, failureSortField, failureSortOrder])

  // 정렬 아이콘 표시
  const SortIcon = ({ field, currentField, currentOrder }: { field: SortField; currentField: SortField; currentOrder: SortOrder }) => (
    <span className="ml-1">
      {currentField === field && (currentOrder === 'asc' ? '↑' : '↓')}
    </span>
  )

  // 달성률 색상 (3단계로 통합 — DESIGN.md signal 토큰 시스템 정합)
  const getAchievementColor = (rate: number) => {
    if (rate >= 100) return 'text-signal-go-strong bg-signal-go-soft'
    if (rate >= 80) return 'text-gauge-cobalt-strong bg-gauge-cobalt-soft'
    if (rate >= 50) return 'text-signal-watch-strong bg-signal-watch-soft'
    return 'text-signal-stop-strong bg-signal-stop-soft'
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-paper-warm rounded-md p-6 border border-divider">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gauge-cobalt-strong">{t('reports.averageLife')}</span>
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="text-3xl font-bold text-gauge-cobalt-strong">
            {summary.averageLife.toLocaleString()}
          </div>
          <div className="text-sm text-gauge-cobalt-strong mt-1">
            {t('reports.totalChangesCount', { count: summary.totalChanges })}
          </div>
        </div>

        <div className="bg-paper-warm rounded-md p-6 border border-divider">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-signal-go-strong">{t('reports.standardLifeAchievement')}</span>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-signal-go-strong">
            {summary.standardLifeAchievement.toFixed(1)}%
          </div>
          <div className="text-sm text-signal-go-strong mt-1">
            {t('reports.overallAchievementRate')}
          </div>
        </div>

        <div className="bg-paper-warm rounded-md p-6 border border-divider">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-signal-stop-strong">{t('reports.prematureFailure')}</span>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-3xl font-bold text-signal-stop-strong">
            {summary.prematureFailures}{t('toolChanges.cases')}
          </div>
          <div className="text-sm text-signal-stop-strong mt-1">
            {t('reports.standardLifeBelow50')}
          </div>
        </div>

        <div className="bg-paper rounded-md p-6 border border-divider">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-soft">{t('reports.performanceRange')}</span>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-xs text-ink-soft mt-1">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-signal-go-strong">⬆</span>
              <span className="truncate">{summary.topPerformingTool}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-signal-stop-strong">⬇</span>
              <span className="truncate">{summary.worstPerformingTool}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 공구별 수명 분석 */}
      <div className="rounded-md border border-divider bg-paper-warm overflow-hidden">
        <div className="px-6 py-4 border-b bg-paper">
          <h3 className="text-lg font-semibold text-ink">{t('reports.toolByToolAnalysis')}</h3>
          <p className="text-sm text-ink-soft mt-1">{t('reports.sortByAchievementRate')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-paper">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('toolName', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.tool')}
                    <SortIcon field="toolName" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('category', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.category')}
                    <SortIcon field="category" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('averageLife', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.averageLife')}
                    <SortIcon field="averageLife" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('standardLife', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.standardLife')}
                    <SortIcon field="standardLife" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('achievementRate', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.achievementRate')}
                    <SortIcon field="achievementRate" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('minLife', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.range')}
                    <SortIcon field="minLife" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('changeCount', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.changeCount')}
                    <SortIcon field="changeCount" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-paper divide-y divide-divider">
              {sortedToolData.map((item, index) => (
                <tr key={index} className="hover:bg-paper">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-ink">{item.toolName}</div>
                    <div className="text-xs text-ink-soft">{item.toolCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-paper-warm text-ink">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink">
                    {item.averageLife.toFixed(0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                    {item.standardLife > 0 ? item.standardLife : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAchievementColor(item.achievementRate)}`}>
                      {item.achievementRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                    {item.minLife} - {item.maxLife}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                    {item.changeCount}{t('toolChanges.cases')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 교체 사유별 & 수명 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 교체 사유별 수명 */}
        <div className="rounded-md border border-divider bg-paper-warm overflow-hidden">
          <div className="px-6 py-4 border-b bg-paper">
            <h3 className="text-lg font-semibold text-ink">{t('reports.averageLifeByChangeReason')}</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {lifeByReason.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink-soft">{getToolChangeReasonLabel(item.reason, t)}</span>
                    <span className="text-sm font-bold text-ink">{item.averageLife.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-paper-warm rounded-full h-2">
                      <div
                        className="bg-gauge-cobalt h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-soft w-12 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1">
                    {item.count}{t('toolChanges.cases')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 수명 분포 */}
        <div className="rounded-md border border-divider bg-paper-warm overflow-hidden">
          <div className="px-6 py-4 border-b bg-paper">
            <h3 className="text-lg font-semibold text-ink">{t('reports.lifeDistribution')}</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {lifeDistribution.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink-soft">{item.range}</span>
                    <span className="text-sm font-bold text-ink">{item.count}{t('toolChanges.cases')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-paper-warm rounded-full h-2">
                      <div
                        className="bg-signal-go-strong h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-soft w-12 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 시간별 수명 트렌드 */}
      <div className="rounded-md border border-divider bg-paper-warm overflow-hidden">
        <div className="px-6 py-4 border-b bg-paper">
          <h3 className="text-lg font-semibold text-ink">{t('reports.lifeTrend')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-paper">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('period', trendSortField, trendSortOrder, setTrendSortField, setTrendSortOrder)}
                >
                  <div className="flex items-center">
                    {t('reports.period')}
                    <SortIcon field="period" currentField={trendSortField} currentOrder={trendSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('changeCount', trendSortField, trendSortOrder, setTrendSortField, setTrendSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    {t('reports.changeCount')}
                    <SortIcon field="changeCount" currentField={trendSortField} currentOrder={trendSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('averageLife', trendSortField, trendSortOrder, setTrendSortField, setTrendSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    {t('reports.averageLife')}
                    <SortIcon field="averageLife" currentField={trendSortField} currentOrder={trendSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-paper divide-y divide-divider">
              {sortedTrendData.map((item, index) => (
                <tr key={index} className="hover:bg-paper">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink">
                    {item.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-ink-soft">
                    {item.changeCount}{t('toolChanges.cases')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className="text-lg font-bold text-gauge-cobalt-strong">{item.averageLife.toFixed(0)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 조기 파손 분석 */}
      {prematureFailureAnalysis.length > 0 && (
        <div className="rounded-md border border-divider bg-paper-warm overflow-hidden">
          <div className="px-6 py-4 border-b bg-paper-warm">
            <h3 className="text-lg font-semibold text-signal-stop-strong">{t('reports.prematureFailureAnalysis')}</h3>
            <p className="text-sm text-signal-stop-strong mt-1">{t('reports.standardLifeBelow50Desc')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-divider">
              <thead className="bg-paper">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                    onClick={() => handleSort('toolName', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      {t('reports.tool')}
                      <SortIcon field="toolName" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                    onClick={() => handleSort('failureCount', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      {t('reports.failureCount')}
                      <SortIcon field="failureCount" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                    onClick={() => handleSort('averageLifeAtFailure', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      {t('reports.averageLife')}
                      <SortIcon field="averageLifeAtFailure" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                    onClick={() => handleSort('standardLife', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      {t('reports.standardLife')}
                      <SortIcon field="standardLife" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                    onClick={() => handleSort('achievementRate', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      {t('reports.achievementRate')}
                      <SortIcon field="achievementRate" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase cursor-pointer hover:bg-paper-warm"
                    onClick={() => handleSort('mainReason', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      {t('reports.mainReason')}
                      <SortIcon field="mainReason" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-paper divide-y divide-divider">
                {sortedFailureData.map((item, index) => (
                  <tr key={index} className="hover:bg-paper">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink">{item.toolName}</div>
                      <div className="text-xs text-ink-soft">{item.toolCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-signal-stop-soft text-signal-stop-strong">
                        {item.failureCount}{t('toolChanges.cases')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                      {item.averageLifeAtFailure.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                      {item.standardLife}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-signal-stop-soft text-signal-stop-strong">
                        {item.achievementRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                      {getToolChangeReasonLabel(item.mainReason, t)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 권장사항 */}
      <div className="bg-paper-warm border border-divider rounded-md p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-gauge-cobalt-strong" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gauge-cobalt-strong">{t('reports.improvementRecommendations')}</h3>
            <div className="mt-2 text-sm text-gauge-cobalt-strong">
              <ul className="list-disc list-inside space-y-1">
                {summary.prematureFailures > 0 && (
                  <li>{t('reports.prematureFailureRecommendation', { count: summary.prematureFailures })}</li>
                )}
                {summary.standardLifeAchievement < 70 && (
                  <li>{t('reports.lowAchievementWarning', { rate: summary.standardLifeAchievement.toFixed(1) })}</li>
                )}
                {lifeByTool.length > 0 && lifeByTool[lifeByTool.length - 1].achievementRate < 50 && (
                  <li>{t('reports.poorPerformingToolWarning')}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
