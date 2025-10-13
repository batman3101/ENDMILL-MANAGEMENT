'use client'

import { useState, useMemo } from 'react'
import { ToolLifeAnalysisData } from '../../lib/types/reports'

interface ToolLifeAnalysisViewProps {
  data: ToolLifeAnalysisData
}

type SortField = 'toolName' | 'toolCode' | 'category' | 'averageLife' | 'standardLife' | 'achievementRate' | 'minLife' | 'maxLife' | 'changeCount' | 'reason' | 'percentage' | 'count' | 'range' | 'period' | 'failureCount' | 'averageLifeAtFailure' | 'mainReason'
type SortOrder = 'asc' | 'desc'

export default function ToolLifeAnalysisView({ data }: ToolLifeAnalysisViewProps) {
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

  // 달성률 색상
  const getAchievementColor = (rate: number) => {
    if (rate >= 100) return 'text-green-600 bg-green-100'
    if (rate >= 80) return 'text-blue-600 bg-blue-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    if (rate >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">평균 수명</span>
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {summary.averageLife.toLocaleString()}
          </div>
          <div className="text-sm text-blue-700 mt-1">
            총 {summary.totalChanges}건 교체
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">표준 수명 달성률</span>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-green-900">
            {summary.standardLifeAchievement.toFixed(1)}%
          </div>
          <div className="text-sm text-green-700 mt-1">
            전체 평균 달성률
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-800">조기 파손</span>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-3xl font-bold text-red-900">
            {summary.prematureFailures}건
          </div>
          <div className="text-sm text-red-700 mt-1">
            표준 수명 50% 미만
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">성능 범위</span>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-green-600">⬆</span>
              <span className="truncate">{summary.topPerformingTool}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600">⬇</span>
              <span className="truncate">{summary.worstPerformingTool}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 공구별 수명 분석 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">공구별 수명 분석</h3>
          <p className="text-sm text-gray-600 mt-1">표준 수명 달성률 기준 정렬</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('toolName', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    공구
                    <SortIcon field="toolName" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    카테고리
                    <SortIcon field="category" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageLife', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    평균 수명
                    <SortIcon field="averageLife" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('standardLife', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    표준 수명
                    <SortIcon field="standardLife" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('achievementRate', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    달성률
                    <SortIcon field="achievementRate" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('minLife', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    범위
                    <SortIcon field="minLife" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('changeCount', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    교체 횟수
                    <SortIcon field="changeCount" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedToolData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.toolName}</div>
                    <div className="text-xs text-gray-500">{item.toolCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.averageLife.toFixed(0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.standardLife > 0 ? item.standardLife : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAchievementColor(item.achievementRate)}`}>
                      {item.achievementRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.minLife} - {item.maxLife}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.changeCount}건
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">교체 사유별 평균 수명</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {lifeByReason.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.reason}</span>
                    <span className="text-sm font-bold text-gray-900">{item.averageLife.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.count}건
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 수명 분포 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">수명 분포</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {lifeDistribution.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.range}</span>
                    <span className="text-sm font-bold text-gray-900">{item.count}건</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">시간별 수명 트렌드</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('period', trendSortField, trendSortOrder, setTrendSortField, setTrendSortOrder)}
                >
                  <div className="flex items-center">
                    기간
                    <SortIcon field="period" currentField={trendSortField} currentOrder={trendSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('changeCount', trendSortField, trendSortOrder, setTrendSortField, setTrendSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    교체 건수
                    <SortIcon field="changeCount" currentField={trendSortField} currentOrder={trendSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageLife', trendSortField, trendSortOrder, setTrendSortField, setTrendSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    평균 수명
                    <SortIcon field="averageLife" currentField={trendSortField} currentOrder={trendSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTrendData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {item.changeCount}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className="text-lg font-bold text-blue-600">{item.averageLife.toFixed(0)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 조기 파손 분석 */}
      {prematureFailureAnalysis.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b bg-red-50">
            <h3 className="text-lg font-semibold text-red-900">조기 파손 분석</h3>
            <p className="text-sm text-red-700 mt-1">표준 수명의 50% 미만으로 교체된 공구</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('toolName', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      공구
                      <SortIcon field="toolName" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('failureCount', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      파손 건수
                      <SortIcon field="failureCount" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('averageLifeAtFailure', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      평균 수명
                      <SortIcon field="averageLifeAtFailure" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('standardLife', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      표준 수명
                      <SortIcon field="standardLife" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('achievementRate', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      달성률
                      <SortIcon field="achievementRate" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('mainReason', failureSortField, failureSortOrder, setFailureSortField, setFailureSortOrder)}
                  >
                    <div className="flex items-center">
                      주요 원인
                      <SortIcon field="mainReason" currentField={failureSortField} currentOrder={failureSortOrder} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFailureData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.toolName}</div>
                      <div className="text-xs text-gray-500">{item.toolCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.failureCount}건
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.averageLifeAtFailure.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.standardLife}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.achievementRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.mainReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 권장사항 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400 text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">개선 권장사항</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                {summary.prematureFailures > 0 && (
                  <li>조기 파손이 {summary.prematureFailures}건 발생했습니다. 가공 조건 및 공구 품질을 검토하세요.</li>
                )}
                {summary.standardLifeAchievement < 70 && (
                  <li>표준 수명 달성률이 {summary.standardLifeAchievement.toFixed(1)}%로 낮습니다. 공구 사용 방법을 개선하세요.</li>
                )}
                {lifeByTool.length > 0 && lifeByTool[lifeByTool.length - 1].achievementRate < 50 && (
                  <li>일부 공구의 성능이 매우 저조합니다. 대체 공구를 검토하세요.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
