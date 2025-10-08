'use client'

import { useState } from 'react'
import { useSettings } from '../../../lib/hooks/useSettings'
import { useReports } from '../../../lib/hooks/useReports'
import { ReportType, ReportFilter, ReportPeriod } from '../../../lib/types/reports'
import MonthlyReportView from '../../../components/reports/MonthlyReportView'
import CostAnalysisView from '../../../components/reports/CostAnalysisView'
import ToolLifeAnalysisView from '../../../components/reports/ToolLifeAnalysisView'
import PerformanceReportView from '../../../components/reports/PerformanceReportView'
import { useToast } from '../../../components/shared/Toast'
import { clientLogger } from '@/lib/utils/logger'

export default function ReportsPage() {
  const { settings } = useSettings()
  const { generateReport, generatedReport, setGeneratedReport, isGenerating, error } = useReports()
  const { showSuccess, showError } = useToast()

  const equipmentModels = settings.equipment.models
  const endmillCategories = settings.inventory.categories

  // 선택된 리포트 타입
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null)

  // 필터 상태
  const [filter, setFilter] = useState<ReportFilter>({
    period: 'month',
    equipmentModel: '',
    endmillCategory: ''
  })

  // 리포트 타입 카드 클릭 핸들러
  const handleReportTypeClick = (type: ReportType) => {
    setSelectedReportType(type)
    setGeneratedReport(null)
  }

  // 리포트 생성 핸들러
  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      showError('리포트 타입을 선택하세요')
      return
    }

    try {
      await generateReport(selectedReportType, filter)
      showSuccess('리포트가 생성되었습니다')
    } catch (err) {
      showError('리포트 생성에 실패했습니다')
      clientLogger.error('리포트 생성 오류:', err)
    }
  }

  // 리포트 타입에 따른 제목 반환
  const getReportTypeTitle = (type: ReportType) => {
    switch (type) {
      case 'monthly': return '월간 리포트'
      case 'cost': return '비용 분석'
      case 'tool-life': return 'Tool Life 분석'
      case 'performance': return '성능 리포트'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* 보고서 타입 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          onClick={() => handleReportTypeClick('monthly')}
          className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ${
            selectedReportType === 'monthly' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
          }`}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">월간 리포트</h3>
            <p className="text-sm text-gray-600">월별 교체 현황 및 비용 분석</p>
          </div>
        </div>

        <div
          onClick={() => handleReportTypeClick('cost')}
          className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ${
            selectedReportType === 'cost' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100'
          }`}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">비용 분석</h3>
            <p className="text-sm text-gray-600">공구별 비용 효율성 분석</p>
          </div>
        </div>

        <div
          onClick={() => handleReportTypeClick('tool-life')}
          className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ${
            selectedReportType === 'tool-life' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100'
          }`}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">⏱️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Tool Life 분석</h3>
            <p className="text-sm text-gray-600">공구 수명 패턴 분석</p>
          </div>
        </div>

        <div
          onClick={() => handleReportTypeClick('performance')}
          className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ${
            selectedReportType === 'performance' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-100'
          }`}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">성능 리포트</h3>
            <p className="text-sm text-gray-600">설비별 성능 효율성</p>
          </div>
        </div>
      </div>

      {/* 필터 및 설정 */}
      {selectedReportType && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            리포트 설정 - {getReportTypeTitle(selectedReportType)}
          </h2>
          <div className="space-y-4">
            {/* 첫 번째 줄: 기간 선택 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">기간</label>
                <select
                  value={filter.period}
                  onChange={(e) => {
                    const newPeriod = e.target.value as ReportPeriod
                    setFilter({
                      ...filter,
                      period: newPeriod,
                      startDate: newPeriod === 'custom' ? filter.startDate : undefined,
                      endDate: newPeriod === 'custom' ? filter.endDate : undefined
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="today">오늘</option>
                  <option value="week">이번 주</option>
                  <option value="month">이번 달</option>
                  <option value="quarter">분기</option>
                  <option value="year">올해</option>
                  <option value="custom">사용자 지정</option>
                </select>
              </div>

              {/* 사용자 지정 날짜 선택 */}
              {filter.period === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                    <input
                      type="date"
                      value={filter.startDate || ''}
                      onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                    <input
                      type="date"
                      value={filter.endDate || ''}
                      onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* 두 번째 줄: 필터 및 생성 버튼 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">생산 모델</label>
                <select
                  value={filter.equipmentModel}
                  onChange={(e) => setFilter({ ...filter, equipmentModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  {equipmentModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 타입</label>
                <select
                  value={filter.endmillCategory}
                  onChange={(e) => setFilter({ ...filter, endmillCategory: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  {endmillCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || (filter.period === 'custom' && (!filter.startDate || !filter.endDate))}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      생성 중...
                    </>
                  ) : (
                    '리포트 생성'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 생성된 리포트 표시 */}
      {generatedReport ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getReportTypeTitle(generatedReport.metadata.type)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                생성 시간: {new Date(generatedReport.metadata.generatedAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <button
              onClick={() => setGeneratedReport(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
          <div className="p-6">
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
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">생성된 리포트</h2>
          </div>
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-lg text-gray-600 mb-2">생성된 리포트가 없습니다</p>
            <p className="text-sm text-gray-500">
              위에서 리포트 타입을 선택하고 설정 후 '리포트 생성' 버튼을 클릭하여 새 리포트를 생성하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 