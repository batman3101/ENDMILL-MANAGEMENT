'use client'

import { useState, useEffect } from 'react'
import LandingStatusCard from '../../components/features/LandingStatusCard'
import DonutChart from '../../components/features/DonutChart'
import { useSettings } from '../../lib/hooks/useSettings'
import { 
  useDashboard, 
  formatVND, 
  formatNumber, 
  getTrendIcon, 
  getTrendColor 
} from '../../lib/hooks/useDashboard'

export default function DashboardPage() {
  const { getSetting } = useSettings()
  const { data, isLoading, error, refreshData, lastRefresh } = useDashboard(30000) // 30초마다 업데이트

  // 설정에서 값 가져오기
  const totalEquipments = getSetting('equipment', 'totalCount')
  const toolPositions = getSetting('equipment', 'toolPositionCount')

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">데이터를 불러오는데 실패했습니다</p>
          <button 
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 상단 4개 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tool Life 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Tool Life 현황</h3>
            <span className="text-sm text-gray-500">실시간</span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart 
              value={data?.equipment?.toolLifeEfficiency || 75} 
              max={100} 
              color="#10b981" 
              size={120}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.equipment?.toolLifeEfficiency || 75}%
                </div>
                <div className="text-xs text-gray-500">평균 효율</div>
              </div>
            </DonutChart>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">우수</p>
              <p className="text-sm font-semibold text-green-600">420개</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">주의</p>
              <p className="text-sm font-semibold text-yellow-600">180개</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">교체</p>
              <p className="text-sm font-semibold text-red-600">80개</p>
            </div>
          </div>
        </div>

        {/* 설비 가동률 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">설비 가동률</h3>
            <span className="text-sm text-gray-500">실시간</span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart 
              value={data?.equipment?.active || 680} 
              max={data?.equipment?.total || 800} 
              color="#3b82f6" 
              size={120}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.equipment?.active || 680}
                </div>
                <div className="text-xs text-gray-500">
                  / {data?.equipment?.total || 800}대
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {data?.equipment?.operatingRate || 85}% 가동
                </div>
              </div>
            </DonutChart>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">가동중</p>
              <p className="text-sm font-semibold text-blue-600">
                {data?.equipment?.active || 680}대
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">점검중</p>
              <p className="text-sm font-semibold text-amber-600">
                {data?.equipment?.maintenance || 85}대
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">셋업중</p>
              <p className="text-sm font-semibold text-purple-600">
                {data?.equipment?.setup || 35}대
              </p>
            </div>
          </div>
        </div>

        {/* 재고 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">재고 현황</h3>
            <span className="text-sm text-gray-500">실시간</span>
          </div>
          <div className="space-y-3">
            {/* 정상 재고 */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">정상</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {data?.inventory?.sufficient || 145}개
              </span>
            </div>
            
            {/* 부족 재고 */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">부족</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {data?.inventory?.low || 28}개
              </span>
            </div>
            
            {/* 위험 재고 */}
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">위험</span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {data?.inventory?.critical || 12}개
              </span>
            </div>
          </div>
        </div>

        {/* 공구 사용 비용 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">공구 사용 비용</h4>
            <span className="text-2xl">📊</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                전달 (5월): {formatVND(data?.costAnalysis?.lastMonth || 125680000)}
              </div>
              <div className="text-xs text-gray-500">
                이번달 (6월 1-27일): {formatVND(data?.costAnalysis?.currentMonth || 98450000)}
              </div>
              <div className={`text-sm font-semibold ${
                (data?.costAnalysis?.savings || -27230000) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                절감액: {formatVND(data?.costAnalysis?.savings || -27230000)} 
                ({data?.costAnalysis?.savingsPercent || -21.7}%)
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded">
                <div 
                  className="h-2 bg-blue-500 rounded transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, Math.abs((data?.costAnalysis?.currentMonth || 98450000) / (data?.costAnalysis?.lastMonth || 125680000) * 100))}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 4개 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 설비별 교체 빈도 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">설비별 교체 빈도</h4>
            <span className="text-2xl">⚡</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.frequencyAnalysis || [
                { series: 'PA', count: 45, avgInterval: 2.1 },
                { series: 'PS', count: 38, avgInterval: 1.8 },
                { series: 'B7', count: 52, avgInterval: 2.5 },
                { series: 'Q7', count: 29, avgInterval: 1.6 }
              ]).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.series} 시리즈:</span>
                  <div className="text-right">
                    <div className="font-semibold">{item.count}회</div>
                    <div className="text-xs text-gray-500">{item.avgInterval}일/회</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 공구별 수명 분석 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">공구별 수명 분석</h4>
            <span className="text-2xl">🔬</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.lifespanAnalysis || [
                { category: 'FLAT', avgLife: 850, variance: 120 },
                { category: 'BALL', avgLife: 720, variance: 95 },
                { category: 'T-CUT', avgLife: 680, variance: 140 },
                { category: 'DRILL', avgLife: 450, variance: 80 }
              ]).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.category}:</span>
                  <div className="text-right">
                    <div className="font-semibold">{item.avgLife}시간</div>
                    <div className="text-xs text-gray-500">±{item.variance}시간</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 설비 모델별 비용 분석 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">모델별 월간 비용</h4>
            <span className="text-2xl">🏭</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.modelCostAnalysis || [
                { series: 'PA', cost: 35680000, percentage: 36 },
                { series: 'PS', cost: 28420000, percentage: 29 },
                { series: 'B7', cost: 22150000, percentage: 22 },
                { series: 'Q7', cost: 12200000, percentage: 13 }
              ]).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.series} 시리즈:</span>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600">{formatVND(item.cost)}</div>
                    <div className="text-xs text-gray-500">({item.percentage}%)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오늘의 교체 실적 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">오늘의 교체</h4>
            <span className="text-2xl">🔄</span>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {data?.toolChanges?.today || 127}
            </p>
            <p className="text-sm text-gray-500">개 교체 완료</p>
            <div className="mt-3 flex justify-between text-xs">
              <span className={`${getTrendColor(data?.toolChanges?.trend || '+8')}`}>
                {getTrendIcon(data?.toolChanges?.trend || '+8')} 전일 대비 {data?.toolChanges?.trend || '+8'}
              </span>
              <span className="text-gray-500">목표: {data?.toolChanges?.target || 130}개</span>
            </div>
          </div>
        </div>
      </div>

      {/* 알림 및 이벤트 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">실시간 알림</h3>
          <span className="text-sm text-gray-500">
            최근 업데이트: {lastRefresh ? lastRefresh.toLocaleTimeString('ko-KR') : '로딩 중...'} ({new Date().toLocaleDateString('ko-KR')})
          </span>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-3">
            <div className="flex items-start p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">긴급 교체 필요</p>
                  <span className="text-xs text-red-600 font-medium">HIGH</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">C045 설비 T12 앤드밀 수명 종료 - 즉시 교체 필요</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">2분 전</span>
                  <button className="text-xs text-red-600 hover:text-red-800 font-medium">처리하기 →</button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">재고 부족 경고</p>
                  <span className="text-xs text-yellow-600 font-medium">MED</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">EM-001 앤드밀 재고가 최소 수준 이하 (현재: 5개)</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">15분 전</span>
                  <button className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">주문하기 →</button>
                </div>
              </div>
            </div>
            
            <div className="flex items-start p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">정기 점검 완료</p>
                  <span className="text-xs text-blue-600 font-medium">INFO</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">A동 15번 라인 정기 점검 완료 - 모든 설비 정상</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">1시간 전</span>
                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">보고서 보기 →</button>
                </div>
              </div>
            </div>

            <div className="flex items-start p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">생산 목표 달성</p>
                  <span className="text-xs text-green-600 font-medium">SUCCESS</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">오늘 생산 목표 103% 달성 - 우수한 성과</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">2시간 전</span>
                  <button className="text-xs text-green-600 hover:text-green-800 font-medium">상세 보기 →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 