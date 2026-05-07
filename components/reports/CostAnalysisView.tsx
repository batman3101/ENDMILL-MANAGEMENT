'use client'

import { useState, useMemo } from 'react'
import { CostAnalysisData } from '../../lib/types/reports'
import { formatCurrency } from '../../lib/utils/reportCalculations'

interface CostAnalysisViewProps {
  data: CostAnalysisData
}

type SortField = 'period' | 'cost' | 'changeCount' | 'averageCost' | 'model' | 'totalCost' | 'costPercentage' |
  'category' | 'toolCode' | 'toolName' | 'unitCost' | 'averageLife' | 'costPerLife' | 'efficiencyRating'
type SortOrder = 'asc' | 'desc'

export default function CostAnalysisView({ data }: CostAnalysisViewProps) {
  const { summary, costByPeriod, costByModel, costByCategory, costEfficiency } = data

  // 기간별 정렬 상태
  const [periodSortField, setPeriodSortField] = useState<SortField>('period')
  const [periodSortOrder, setPeriodSortOrder] = useState<SortOrder>('asc')

  // 모델별 정렬 상태
  const [modelSortField,] = useState<SortField>('totalCost')
  const [modelSortOrder,] = useState<SortOrder>('desc')

  // 카테고리별 정렬 상태
  const [categorySortField,] = useState<SortField>('totalCost')
  const [categorySortOrder,] = useState<SortOrder>('desc')

  // 효율성 정렬 상태
  const [efficiencySortField, setEfficiencySortField] = useState<SortField>('costPerLife')
  const [efficiencySortOrder, setEfficiencySortOrder] = useState<SortOrder>('asc')

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
  const sortedPeriodData = useMemo(() => {
    return [...costByPeriod].sort((a, b) => {
      const aValue = a[periodSortField as keyof typeof a]
      const bValue = b[periodSortField as keyof typeof b]
      if (aValue < bValue) return periodSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return periodSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [costByPeriod, periodSortField, periodSortOrder])

  const sortedModelData = useMemo(() => {
    return [...costByModel].sort((a, b) => {
      const aValue = a[modelSortField as keyof typeof a]
      const bValue = b[modelSortField as keyof typeof b]
      if (aValue < bValue) return modelSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return modelSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [costByModel, modelSortField, modelSortOrder])

  const sortedCategoryData = useMemo(() => {
    return [...costByCategory].sort((a, b) => {
      const aValue = a[categorySortField as keyof typeof a]
      const bValue = b[categorySortField as keyof typeof b]
      if (aValue < bValue) return categorySortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return categorySortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [costByCategory, categorySortField, categorySortOrder])

  const sortedEfficiencyData = useMemo(() => {
    return [...costEfficiency].sort((a, b) => {
      const aValue = a[efficiencySortField as keyof typeof a]
      const bValue = b[efficiencySortField as keyof typeof b]
      if (aValue < bValue) return efficiencySortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return efficiencySortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [costEfficiency, efficiencySortField, efficiencySortOrder])

  // 정렬 아이콘
  const SortIcon = ({ field, currentField, currentOrder }: { field: SortField; currentField: SortField; currentOrder: SortOrder }) => (
    <span className="ml-1">
      {currentField === field && (currentOrder === 'asc' ? '↑' : '↓')}
    </span>
  )

  // 트렌드 아이콘 및 색상
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return { icon: '📈', text: '증가 추세', color: 'text-signal-stop-strong bg-red-50' }
      case 'decreasing':
        return { icon: '📉', text: '감소 추세', color: 'text-signal-go-strong bg-green-50' }
      default:
        return { icon: '➡️', text: '안정적', color: 'text-gauge-cobalt-strong bg-blue-50' }
    }
  }

  const trendDisplay = getTrendDisplay(summary.costTrend)

  // 효율성 등급 색상
  const getEfficiencyColor = (rating: number) => {
    if (rating >= 80) return 'text-signal-go-strong bg-signal-go-soft'
    if (rating >= 60) return 'text-gauge-cobalt-strong bg-gauge-cobalt-soft'
    if (rating >= 40) return 'text-signal-watch-strong bg-signal-watch-soft'
    return 'text-signal-stop-strong bg-signal-stop-soft'
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-md p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gauge-cobalt-strong">총 비용</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {formatCurrency(summary.totalCost)}
          </div>
          <div className="text-sm text-blue-700 mt-1">
            교체당 평균: {formatCurrency(summary.averageCostPerChange)}
          </div>
        </div>

        <div className="bg-white rounded-md p-6 border border-divider">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-soft">비용 트렌드</span>
            <span className="text-2xl">{trendDisplay.icon}</span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${trendDisplay.color}`}>
            {trendDisplay.text}
          </div>
          <div className="text-xs text-ink-soft mt-3">
            최고: {summary.highestCostPeriod} / 최저: {summary.lowestCostPeriod}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-md p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-signal-go-strong">기간별 분석</span>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {costByPeriod.length} 기간
          </div>
          <div className="text-sm text-green-700 mt-1">
            총 {costByPeriod.reduce((sum, p) => sum + p.changeCount, 0)}건 교체
          </div>
        </div>
      </div>

      {/* 기간별 비용 */}
      <div className="rounded-md border border-divider bg-paper-warm border-divider overflow-hidden">
        <div className="px-6 py-4 border-b bg-paper">
          <h3 className="text-lg font-semibold text-ink">기간별 비용 분석</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-paper">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('period', periodSortField, periodSortOrder, setPeriodSortField, setPeriodSortOrder)}
                >
                  <div className="flex items-center">
                    기간
                    <SortIcon field="period" currentField={periodSortField} currentOrder={periodSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('cost', periodSortField, periodSortOrder, setPeriodSortField, setPeriodSortOrder)}
                >
                  <div className="flex items-center">
                    총 비용
                    <SortIcon field="cost" currentField={periodSortField} currentOrder={periodSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('changeCount', periodSortField, periodSortOrder, setPeriodSortField, setPeriodSortOrder)}
                >
                  <div className="flex items-center">
                    교체 건수
                    <SortIcon field="changeCount" currentField={periodSortField} currentOrder={periodSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('averageCost', periodSortField, periodSortOrder, setPeriodSortField, setPeriodSortOrder)}
                >
                  <div className="flex items-center">
                    평균 비용
                    <SortIcon field="averageCost" currentField={periodSortField} currentOrder={periodSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-divider">
              {sortedPeriodData.map((item, index) => (
                <tr key={index} className="hover:bg-paper">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink">
                    {item.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                    {formatCurrency(item.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                    {item.changeCount}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                    {formatCurrency(item.averageCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모델별 & 카테고리별 비용 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 모델별 비용 */}
        <div className="rounded-md border border-divider bg-paper-warm border-divider overflow-hidden">
          <div className="px-6 py-4 border-b bg-paper">
            <h3 className="text-lg font-semibold text-ink">모델별 비용</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {sortedModelData.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-ink-soft">
                      {item.model}
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {formatCurrency(item.totalCost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.costPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-soft w-12 text-right">
                      {item.costPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1">
                    {item.changeCount}건 · 평균 {formatCurrency(item.averageCost)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 카테고리별 비용 */}
        <div className="rounded-md border border-divider bg-paper-warm border-divider overflow-hidden">
          <div className="px-6 py-4 border-b bg-paper">
            <h3 className="text-lg font-semibold text-ink">카테고리별 비용</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {sortedCategoryData.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-ink-soft">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {formatCurrency(item.totalCost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${item.costPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-soft w-12 text-right">
                      {item.costPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1">
                    {item.changeCount}건 · 평균 {formatCurrency(item.averageCost)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 비용 효율성 분석 */}
      <div className="rounded-md border border-divider bg-paper-warm border-divider overflow-hidden">
        <div className="px-6 py-4 border-b bg-paper">
          <h3 className="text-lg font-semibold text-ink">공구별 비용 효율성</h3>
          <p className="text-sm text-ink-soft mt-1">수명당 비용 기준 정렬 (낮을수록 효율적)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-paper">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('toolName', efficiencySortField, efficiencySortOrder, setEfficiencySortField, setEfficiencySortOrder)}
                >
                  <div className="flex items-center">
                    공구
                    <SortIcon field="toolName" currentField={efficiencySortField} currentOrder={efficiencySortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('unitCost', efficiencySortField, efficiencySortOrder, setEfficiencySortField, setEfficiencySortOrder)}
                >
                  <div className="flex items-center">
                    단가
                    <SortIcon field="unitCost" currentField={efficiencySortField} currentOrder={efficiencySortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('averageLife', efficiencySortField, efficiencySortOrder, setEfficiencySortField, setEfficiencySortOrder)}
                >
                  <div className="flex items-center">
                    평균 수명
                    <SortIcon field="averageLife" currentField={efficiencySortField} currentOrder={efficiencySortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('costPerLife', efficiencySortField, efficiencySortOrder, setEfficiencySortField, setEfficiencySortOrder)}
                >
                  <div className="flex items-center">
                    수명당 비용
                    <SortIcon field="costPerLife" currentField={efficiencySortField} currentOrder={efficiencySortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-paper-warm"
                  onClick={() => handleSort('efficiencyRating', efficiencySortField, efficiencySortOrder, setEfficiencySortField, setEfficiencySortOrder)}
                >
                  <div className="flex items-center">
                    효율성
                    <SortIcon field="efficiencyRating" currentField={efficiencySortField} currentOrder={efficiencySortOrder} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-soft uppercase tracking-wider">
                  권장사항
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-divider">
              {sortedEfficiencyData.map((item, index) => (
                <tr key={index} className="hover:bg-paper">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-ink">{item.toolName}</div>
                    <div className="text-xs text-ink-soft">{item.toolCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                    {formatCurrency(item.unitCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                    {item.averageLife.toFixed(0)}
                    {item.standardLife > 0 && (
                      <span className="text-xs text-ink-mute ml-1">/ {item.standardLife}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink">
                    {formatCurrency(item.costPerLife)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEfficiencyColor(item.efficiencyRating)}`}>
                      {item.efficiencyRating}점
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft max-w-xs">
                    {item.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
