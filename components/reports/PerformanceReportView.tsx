'use client'

import { useState, useMemo } from 'react'
import { PerformanceReportData } from '../../lib/types/reports'
import { formatCurrency } from '../../lib/utils/reportCalculations'

interface PerformanceReportViewProps {
  data: PerformanceReportData
}

type SortField = 'ranking' | 'equipmentNumber' | 'model' | 'location' | 'totalChanges' | 'totalCost' | 'averageToolLife' | 'standardLifeAchievement' | 'prematureFailures' | 'efficiencyScore' | 'equipmentCount' | 'averageChanges' | 'averageCost' | 'averageLife' | 'process' | 'changeCount' | 'cost' | 'period'
type SortOrder = 'asc' | 'desc'

export default function PerformanceReportView({ data }: PerformanceReportViewProps) {
  const {
    summary,
    equipmentPerformance,
    modelComparison,
    locationComparison,
    processEfficiency,
    timeBasedAnalysis
  } = data

  // 정렬 상태
  const [equipmentSortField, setEquipmentSortField] = useState<SortField>('efficiencyScore')
  const [equipmentSortOrder, setEquipmentSortOrder] = useState<SortOrder>('desc')

  const [modelSortField, setModelSortField] = useState<SortField>('efficiencyScore')
  const [modelSortOrder, setModelSortOrder] = useState<SortOrder>('desc')

  const [locationSortField, setLocationSortField] = useState<SortField>('efficiencyScore')
  const [locationSortOrder, setLocationSortOrder] = useState<SortOrder>('desc')

  const [processSortField, setProcessSortField] = useState<SortField>('efficiencyScore')
  const [processSortOrder, setProcessSortOrder] = useState<SortOrder>('desc')

  const [timeSortField, setTimeSortField] = useState<SortField>('period')
  const [timeSortOrder, setTimeSortOrder] = useState<SortOrder>('asc')

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
  const sortedEquipmentData = useMemo(() => {
    return [...equipmentPerformance].sort((a, b) => {
      const aValue = a[equipmentSortField as keyof typeof a]
      const bValue = b[equipmentSortField as keyof typeof b]
      if (aValue < bValue) return equipmentSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return equipmentSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [equipmentPerformance, equipmentSortField, equipmentSortOrder])

  const sortedModelData = useMemo(() => {
    return [...modelComparison].sort((a, b) => {
      const aValue = a[modelSortField as keyof typeof a]
      const bValue = b[modelSortField as keyof typeof b]
      if (aValue < bValue) return modelSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return modelSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [modelComparison, modelSortField, modelSortOrder])

  const sortedLocationData = useMemo(() => {
    return [...locationComparison].sort((a, b) => {
      const aValue = a[locationSortField as keyof typeof a]
      const bValue = b[locationSortField as keyof typeof b]
      if (aValue < bValue) return locationSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return locationSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [locationComparison, locationSortField, locationSortOrder])

  const sortedProcessData = useMemo(() => {
    return [...processEfficiency].sort((a, b) => {
      const aValue = a[processSortField as keyof typeof a]
      const bValue = b[processSortField as keyof typeof b]
      if (aValue < bValue) return processSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return processSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [processEfficiency, processSortField, processSortOrder])

  const sortedTimeData = useMemo(() => {
    return [...timeBasedAnalysis].sort((a, b) => {
      const aValue = a[timeSortField as keyof typeof a]
      const bValue = b[timeSortField as keyof typeof b]
      if (aValue < bValue) return timeSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return timeSortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [timeBasedAnalysis, timeSortField, timeSortOrder])

  // 정렬 아이콘 표시
  const SortIcon = ({ field, currentField, currentOrder }: { field: SortField; currentField: SortField; currentOrder: SortOrder }) => (
    <span className="ml-1">
      {currentField === field && (currentOrder === 'asc' ? '↑' : '↓')}
    </span>
  )

  // 효율성 점수 색상
  const getEfficiencyColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 80) return 'text-blue-600 bg-blue-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    if (score >= 60) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  // 랭킹 배지 색상
  const getRankingColor = (ranking: number) => {
    if (ranking === 1) return 'bg-yellow-500 text-white'
    if (ranking === 2) return 'bg-gray-400 text-white'
    if (ranking === 3) return 'bg-amber-600 text-white'
    return 'bg-gray-200 text-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">총 설비 수</span>
            <span className="text-2xl">🏭</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {summary.totalEquipment}대
          </div>
          <div className="text-sm text-blue-700 mt-1">
            설비당 평균 {summary.averageChangesPerEquipment}건 교체
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">전체 효율성</span>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-green-900">
            {summary.overallEfficiency.toFixed(1)}%
          </div>
          <div className="text-sm text-green-700 mt-1">
            평균 표준 수명 달성률
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">최고 성능</span>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {summary.topPerformer}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Top Performer
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">최저 성능</span>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {summary.worstPerformer}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Needs Improvement
          </div>
        </div>
      </div>

      {/* 설비별 성능 분석 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">설비별 성능 분석</h3>
          <p className="text-sm text-gray-600 mt-1">효율성 점수 기준 정렬</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ranking', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    순위
                    <SortIcon field="ranking" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('equipmentNumber', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    설비
                    <SortIcon field="equipmentNumber" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('model', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    모델
                    <SortIcon field="model" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('location', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    위치
                    <SortIcon field="location" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalChanges', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    교체 건수
                    <SortIcon field="totalChanges" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalCost', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    총 비용
                    <SortIcon field="totalCost" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageToolLife', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    평균 수명
                    <SortIcon field="averageToolLife" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('standardLifeAchievement', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    수명 달성률
                    <SortIcon field="standardLifeAchievement" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prematureFailures', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    조기 파손
                    <SortIcon field="prematureFailures" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('efficiencyScore', equipmentSortField, equipmentSortOrder, setEquipmentSortField, setEquipmentSortOrder)}
                >
                  <div className="flex items-center">
                    효율성
                    <SortIcon field="efficiencyScore" currentField={equipmentSortField} currentOrder={equipmentSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEquipmentData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${getRankingColor(item.ranking)}`}>
                      {item.ranking}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.equipmentNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.model}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.totalChanges}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.averageToolLife.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.standardLifeAchievement.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.prematureFailures > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.prematureFailures}건
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEfficiencyColor(item.efficiencyScore)}`}>
                      {item.efficiencyScore}점
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모델별 & 위치별 비교 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 모델별 비교 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">모델별 비교</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('model', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                  >
                    <div className="flex items-center">
                      모델
                      <SortIcon field="model" currentField={modelSortField} currentOrder={modelSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('equipmentCount', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                  >
                    <div className="flex items-center justify-end">
                      설비 수
                      <SortIcon field="equipmentCount" currentField={modelSortField} currentOrder={modelSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('averageChanges', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                  >
                    <div className="flex items-center justify-end">
                      평균 교체
                      <SortIcon field="averageChanges" currentField={modelSortField} currentOrder={modelSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('efficiencyScore', modelSortField, modelSortOrder, setModelSortField, setModelSortOrder)}
                  >
                    <div className="flex items-center justify-end">
                      효율성
                      <SortIcon field="efficiencyScore" currentField={modelSortField} currentOrder={modelSortOrder} />
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {item.equipmentCount}대
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.averageChanges}건
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEfficiencyColor(item.efficiencyScore)}`}>
                        {item.efficiencyScore}점
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 위치별 비교 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">위치별 비교</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('location', locationSortField, locationSortOrder, setLocationSortField, setLocationSortOrder)}
                  >
                    <div className="flex items-center">
                      위치
                      <SortIcon field="location" currentField={locationSortField} currentOrder={locationSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('equipmentCount', locationSortField, locationSortOrder, setLocationSortField, setLocationSortOrder)}
                  >
                    <div className="flex items-center justify-end">
                      설비 수
                      <SortIcon field="equipmentCount" currentField={locationSortField} currentOrder={locationSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalChanges', locationSortField, locationSortOrder, setLocationSortField, setLocationSortOrder)}
                  >
                    <div className="flex items-center justify-end">
                      총 교체
                      <SortIcon field="totalChanges" currentField={locationSortField} currentOrder={locationSortOrder} />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('efficiencyScore', locationSortField, locationSortOrder, setLocationSortField, setLocationSortOrder)}
                  >
                    <div className="flex items-center justify-end">
                      효율성
                      <SortIcon field="efficiencyScore" currentField={locationSortField} currentOrder={locationSortOrder} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedLocationData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {item.equipmentCount}대
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.totalChanges}건
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEfficiencyColor(item.efficiencyScore)}`}>
                        {item.efficiencyScore}점
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 공정별 효율성 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">공정별 효율성 분석</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('process', processSortField, processSortOrder, setProcessSortField, setProcessSortOrder)}
                >
                  <div className="flex items-center">
                    공정
                    <SortIcon field="process" currentField={processSortField} currentOrder={processSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('changeCount', processSortField, processSortOrder, setProcessSortField, setProcessSortOrder)}
                >
                  <div className="flex items-center">
                    교체 건수
                    <SortIcon field="changeCount" currentField={processSortField} currentOrder={processSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageLife', processSortField, processSortOrder, setProcessSortField, setProcessSortOrder)}
                >
                  <div className="flex items-center">
                    평균 수명
                    <SortIcon field="averageLife" currentField={processSortField} currentOrder={processSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cost', processSortField, processSortOrder, setProcessSortField, setProcessSortOrder)}
                >
                  <div className="flex items-center">
                    비용
                    <SortIcon field="cost" currentField={processSortField} currentOrder={processSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('efficiencyScore', processSortField, processSortOrder, setProcessSortField, setProcessSortOrder)}
                >
                  <div className="flex items-center">
                    효율성 점수
                    <SortIcon field="efficiencyScore" currentField={processSortField} currentOrder={processSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProcessData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.process}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.changeCount}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.averageLife.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEfficiencyColor(item.efficiencyScore)}`}>
                      {item.efficiencyScore}점
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 시간별 분석 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">시간별 성능 추이</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('period', timeSortField, timeSortOrder, setTimeSortField, setTimeSortOrder)}
                >
                  <div className="flex items-center">
                    기간
                    <SortIcon field="period" currentField={timeSortField} currentOrder={timeSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('changeCount', timeSortField, timeSortOrder, setTimeSortField, setTimeSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    교체 건수
                    <SortIcon field="changeCount" currentField={timeSortField} currentOrder={timeSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('cost', timeSortField, timeSortOrder, setTimeSortField, setTimeSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    비용
                    <SortIcon field="cost" currentField={timeSortField} currentOrder={timeSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageLife', timeSortField, timeSortOrder, setTimeSortField, setTimeSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    평균 수명
                    <SortIcon field="averageLife" currentField={timeSortField} currentOrder={timeSortOrder} />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('efficiencyScore', timeSortField, timeSortOrder, setTimeSortField, setTimeSortOrder)}
                >
                  <div className="flex items-center justify-end">
                    효율성 점수
                    <SortIcon field="efficiencyScore" currentField={timeSortField} currentOrder={timeSortOrder} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTimeData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {item.changeCount}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(item.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {item.averageLife.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getEfficiencyColor(item.efficiencyScore)}`}>
                      {item.efficiencyScore}점
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 개선 권장사항 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400 text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">성능 개선 권장사항</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                {summary.overallEfficiency < 70 && (
                  <li>전체 효율성이 {summary.overallEfficiency.toFixed(1)}%로 낮습니다. 전반적인 공구 관리 프로세스를 개선하세요.</li>
                )}
                {equipmentPerformance.length > 0 && equipmentPerformance[equipmentPerformance.length - 1].efficiencyScore < 60 && (
                  <li>일부 설비의 성능이 매우 저조합니다. 해당 설비의 가동 조건 및 공구 선택을 재검토하세요.</li>
                )}
                {equipmentPerformance.some(e => e.prematureFailures > 0) && (
                  <li>조기 파손이 발생한 설비가 있습니다. 가공 조건과 공구 품질을 점검하세요.</li>
                )}
                {modelComparison.length > 1 && (
                  <li>모델별 성능 차이가 있습니다. 최고 성능 모델의 관리 방법을 다른 모델에도 적용하세요.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
