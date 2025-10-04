'use client'

import { useState, useMemo } from 'react'
import { MonthlyReportData } from '../../lib/types/reports'
import { formatCurrency, formatNumber } from '../../lib/utils/reportCalculations'

interface MonthlyReportViewProps {
  data: MonthlyReportData
}

type SortField = 'model' | 'count' | 'cost' | 'percentage' | 'category' | 'reason' | 'code' | 'name' | 'changeCount' | 'totalCost' | 'averageLife'
type SortOrder = 'asc' | 'desc'

export default function MonthlyReportView({ data }: MonthlyReportViewProps) {
  // 모델별 정렬 상태
  const [modelSortField, setModelSortField] = useState<SortField>('count')
  const [modelSortOrder, setModelSortOrder] = useState<SortOrder>('desc')

  // 카테고리별 정렬 상태
  const [categorySortField, setCategorySortField] = useState<SortField>('count')
  const [categorySortOrder, setCategorySortOrder] = useState<SortOrder>('desc')

  // 사유별 정렬 상태
  const [reasonSortField, setReasonSortField] = useState<SortField>('count')
  const [reasonSortOrder, setReasonSortOrder] = useState<SortOrder>('desc')

  // 상위 공구 정렬 상태
  const [toolSortField, setToolSortField] = useState<SortField>('changeCount')
  const [toolSortOrder, setToolSortOrder] = useState<SortOrder>('desc')

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
  const sortedModelData = useMemo(() => {
    return [...data.changesByModel].sort((a, b) => {
      const aValue = a[modelSortField as keyof typeof a]
      const bValue = b[modelSortField as keyof typeof b]
      if (aValue < bValue) return modelSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return modelSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [data.changesByModel, modelSortField, modelSortOrder])

  const sortedCategoryData = useMemo(() => {
    return [...data.changesByCategory].sort((a, b) => {
      const aValue = a[categorySortField as keyof typeof a]
      const bValue = b[categorySortField as keyof typeof b]
      if (aValue < bValue) return categorySortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return categorySortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [data.changesByCategory, categorySortField, categorySortOrder])

  const sortedReasonData = useMemo(() => {
    return [...data.changesByReason].sort((a, b) => {
      const aValue = a[reasonSortField as keyof typeof a]
      const bValue = b[reasonSortField as keyof typeof b]
      if (aValue < bValue) return reasonSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return reasonSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [data.changesByReason, reasonSortField, reasonSortOrder])

  const sortedToolData = useMemo(() => {
    return [...data.topTools].sort((a, b) => {
      const aValue = a[toolSortField as keyof typeof a]
      const bValue = b[toolSortField as keyof typeof b]
      if (aValue < bValue) return toolSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return toolSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [data.topTools, toolSortField, toolSortOrder])

  // 정렬 아이콘 표시
  const SortIcon = ({ field, currentField, currentOrder }: { field: SortField; currentField: SortField; currentOrder: SortOrder }) => (
    <span className="ml-1">
      {currentField === field && (currentOrder === 'asc' ? '↑' : '↓')}
    </span>
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">총 교체 건수</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(data.summary.totalChanges)}건
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">총 비용</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(data.summary.totalCost)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">평균 공구 수명</div>
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(data.summary.averageToolLife)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">최다 교체 공구</div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {data.summary.mostChangedTool}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">최고 비용 공구</div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {data.summary.mostExpensiveTool}
          </div>
        </div>
      </div>

      {/* 모델별 교체 현황 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">모델별 교체 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('model', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                >
                  <div className="flex items-center">
                    모델
                    <SortIcon field="model" currentField={modelSortField} currentOrder={modelSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('count', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    교체 건수
                    <SortIcon field="count" currentField={modelSortField} currentOrder={modelSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cost', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    비용
                    <SortIcon field="cost" currentField={modelSortField} currentOrder={modelSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('percentage', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    비율
                    <SortIcon field="percentage" currentField={modelSortField} currentOrder={modelSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedModelData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatNumber(item.count)}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(item.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 카테고리별 교체 현황 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">카테고리별 교체 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category', categorySortField, categorySortOrder, setCategorySortField, setCategorySortOrder)}
                >
                  <div className="flex items-center">
                    카테고리
                    <SortIcon field="category" currentField={categorySortField} currentOrder={categorySortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('count', categorySortField, categorySortOrder, setCategorySortField, setCategorySortOrder)}
                >
                  <div className="flex items-center justify-end">
                    교체 건수
                    <SortIcon field="count" currentField={categorySortField} currentOrder={categorySortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cost', categorySortField, categorySortOrder, setCategorySortField, setCategorySortOrder)}
                >
                  <div className="flex items-center justify-end">
                    비용
                    <SortIcon field="cost" currentField={categorySortField} currentOrder={categorySortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('percentage', categorySortField, categorySortOrder, setCategorySortField, setCategorySortOrder)}
                >
                  <div className="flex items-center justify-end">
                    비율
                    <SortIcon field="percentage" currentField={categorySortField} currentOrder={categorySortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCategoryData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatNumber(item.count)}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(item.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 교체 사유별 현황 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">교체 사유별 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('reason', reasonSortField, reasonSortOrder, setReasonSortField, setReasonSortOrder)}
                >
                  <div className="flex items-center">
                    사유
                    <SortIcon field="reason" currentField={reasonSortField} currentOrder={reasonSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('count', reasonSortField, reasonSortOrder, setReasonSortField, setReasonSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    건수
                    <SortIcon field="count" currentField={reasonSortField} currentOrder={reasonSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('percentage', reasonSortField, reasonSortOrder, setReasonSortField, setReasonSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    비율
                    <SortIcon field="percentage" currentField={reasonSortField} currentOrder={reasonSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedReasonData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatNumber(item.count)}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상위 공구 목록 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">상위 10개 공구</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('code', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    코드
                    <SortIcon field="code" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center">
                    이름
                    <SortIcon field="name" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('changeCount', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    교체 건수
                    <SortIcon field="changeCount" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalCost', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    총 비용
                    <SortIcon field="totalCost" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageLife', toolSortField, toolSortOrder, setToolSortField, setToolSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    평균 수명
                    <SortIcon field="averageLife" currentField={toolSortField} currentOrder={toolSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedToolData.map((tool, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tool.code}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {tool.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatNumber(tool.changeCount)}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(tool.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatNumber(tool.averageLife)}
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
