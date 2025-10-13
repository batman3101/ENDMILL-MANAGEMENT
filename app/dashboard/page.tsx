'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientLogger } from '../../lib/utils/logger'
import LandingStatusCard from '../../components/features/LandingStatusCard'
import DonutChart from '../../components/features/DonutChart'
import { useSettings } from '../../lib/hooks/useSettings'
import { usePermissions } from '../../lib/hooks/usePermissions'
import { PermissionGuard } from '../../components/auth/PermissionGuard'
import { useRealtime, useMultiTableRealtime } from '../../lib/hooks/useRealtime'
import {
  useDashboard,
  formatVND,
  formatNumber,
  getTrendIcon,
  getTrendColor
} from '../../lib/hooks/useDashboard'

export default function DashboardPage() {
  const { t } = useTranslation()
  // 권한 확인
  const { canAccessPage } = usePermissions()
  const { getSetting } = useSettings()
  const { data, isLoading, error, refreshData, lastRefresh } = useDashboard(60000) // 60초마다 업데이트

  // 실시간 연동 설정 (throttled refresh)
  const [realtimeData, setRealtimeData] = useState<any>(null)
  const lastRefreshTimeRef = useRef<number>(0)

  // Throttled refresh function to prevent excessive API calls
  const throttledRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshTimeRef.current > 5000) { // 최소 5초 간격
      lastRefreshTimeRef.current = now
      refreshData()
    }
  }, [refreshData])

  // Memoize the callbacks to prevent dependency changes
  const realtimeCallbacks = useMemo(() => ({
    tool_changes: {
      onInsert: (payload: any) => {
        clientLogger.log('🔧 새로운 공구 교체:', payload)
        throttledRefresh() // 제한된 새로고침
      },
      onUpdate: (payload: any) => {
        clientLogger.log('🔧 공구 교체 업데이트:', payload)
        throttledRefresh()
      }
    },
    inventory_transactions: {
      onInsert: (payload: any) => {
        clientLogger.log('📦 새로운 재고 거래:', payload)
        throttledRefresh()
      }
    },
    notifications: {
      onInsert: (payload: any) => {
        clientLogger.log('🔔 새로운 알림:', payload)
        // 실시간 알림 표시 로직 추가 가능
      }
    },
    activity_logs: {
      onInsert: (payload: any) => {
        clientLogger.log('📋 새로운 활동 로그:', payload)
      }
    }
  }), [throttledRefresh])

  const { connections, errors, isAllConnected } = useMultiTableRealtime(
    ['tool_changes', 'inventory_transactions', 'notifications', 'activity_logs'],
    realtimeCallbacks
  )

  // 대시보드 접근 권한 확인
  if (!canAccessPage('/dashboard')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('common.error')}</h2>
          <p className="text-gray-600">{t('common.loadError')}</p>
        </div>
      </div>
    )
  }

  // 설정에서 값 가져오기
  const totalEquipments = getSetting('equipment', 'totalCount')
  const toolPositions = getSetting('equipment', 'toolPositionCount')

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t('common.loadError')}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('equipment.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 상단 4개 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {isLoading && (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-pulse hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-5 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="text-center">
                      <div className="h-3 bg-gray-200 rounded mb-1 w-8 mx-auto"></div>
                      <div className="h-4 bg-gray-200 rounded w-10 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {!isLoading && (
          <>

        {/* 엔드밀 사용 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">{t('dashboard.endmillUsageStatus')}</h3>
            <span className="text-sm text-gray-500">{t('endmill.realtimeConnected')}</span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart
              value={data?.endmillUsage?.usageRate || 0}
              max={100}
              color="#10b981"
              size={120}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data?.endmillUsage?.usageRate || 0}%
                </div>
                <div className="text-xs text-gray-500">{t('dashboard.usageRate')}</div>
              </div>
            </DonutChart>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">{t('endmill.normal')}</p>
              <p className="text-sm font-semibold text-green-600">
                {data?.endmillUsage?.normal || 0}{t('dashboard.pieceCount')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('endmill.warning')}</p>
              <p className="text-sm font-semibold text-yellow-600">
                {data?.endmillUsage?.warning || 0}{t('dashboard.pieceCount')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('endmill.critical')}</p>
              <p className="text-sm font-semibold text-red-600">
                {data?.endmillUsage?.critical || 0}{t('dashboard.pieceCount')}
              </p>
            </div>
          </div>
        </div>

        {/* 설비 가동률 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">{t('dashboard.equipmentStatus')}</h3>
            <span className="text-sm text-gray-500">{t('endmill.realtimeConnected')}</span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart
              value={data?.equipment?.active || 0}
              max={data?.equipment?.total || 1}
              color="#3b82f6"
              size={120}
            >
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {data?.equipment?.active || 0}
                </div>
                <div className="text-[10px] text-gray-500">
                  / {data?.equipment?.total || 0}{t('dashboard.equipmentCount')}
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">
                  {data?.equipment?.operatingRate || 0}% {t('dashboard.operatingRate')}
                </div>
              </div>
            </DonutChart>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">{t('equipment.operating')}</p>
              <p className="text-sm font-semibold text-blue-600">
                {data?.equipment?.active || 0}{t('dashboard.equipmentCount')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('equipment.maintenance')}</p>
              <p className="text-sm font-semibold text-amber-600">
                {data?.equipment?.maintenance || 0}{t('dashboard.equipmentCount')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('equipment.setup')}</p>
              <p className="text-sm font-semibold text-purple-600">
                {data?.equipment?.setup || 0}{t('dashboard.equipmentCount')}
              </p>
            </div>
          </div>
        </div>

        {/* 재고 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">{t('inventory.stockStatus')}</h3>
            <span className="text-sm text-gray-500">{t('endmill.realtimeConnected')}</span>
          </div>
          <div className="space-y-3">
            {/* 정상 재고 */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">{t('inventory.sufficient')}</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {data?.inventory?.sufficient || 0}{t('dashboard.pieceCount')}
              </span>
            </div>

            {/* 부족 재고 */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">{t('inventory.low')}</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {data?.inventory?.low || 0}{t('dashboard.pieceCount')}
              </span>
            </div>

            {/* 위험 재고 */}
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">{t('inventory.critical')}</span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {data?.inventory?.critical || 0}{t('dashboard.pieceCount')}
              </span>
            </div>
          </div>
        </div>

        {/* 공구 사용 비용 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('reports.costAnalysis')}</h4>
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
                {t('reports.monthlyReport')} ({t('dashboard.previous')}): {formatVND(data?.costAnalysis?.lastMonth || 0)}
              </div>
              <div className="text-xs text-gray-500">
                {t('reports.monthlyReport')} ({t('dashboard.current')}): {formatVND(data?.costAnalysis?.currentMonth || 0)}
              </div>
              <div className={`text-sm font-semibold ${
                (data?.costAnalysis?.savings || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {t('dashboard.savings')}: {formatVND(data?.costAnalysis?.savings || 0)}
                ({data?.costAnalysis?.savingsPercent || 0}%)
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded">
                <div
                  className="h-2 bg-blue-500 rounded transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.abs((data?.costAnalysis?.currentMonth || 0) / (data?.costAnalysis?.lastMonth || 1) * 100))}%`
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* 하단 4개 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 설비별 교체 빈도 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('equipment.model')} {t('toolChanges.changeReason')}</h4>
            <span className="text-2xl">⚡</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (data?.frequencyAnalysis || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.frequencyAnalysis || []).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.series} 시리즈:</span>
                  <div className="text-right">
                    <div className="font-semibold">{item.count}회</div>
                    <div className="text-xs text-gray-500">{item.avgInterval}일/회</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-gray-400">
              <div className="text-center">
                <div className="text-sm">{t('common.noData')}</div>
                <div className="text-xs mt-1">{t('common.noResults')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 엔드밀 평균 사용 수명 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('dashboard.avgLifespan')}</h4>
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
              {(data?.lifespanAnalysis || []).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.category} {t('common.type')}:</span>
                  <div className="text-right">
                    <div className="font-semibold">{t('common.avgCount')}: {item.avgLife}{t('dashboard.pieces')}</div>
                    <div className="text-xs text-gray-500">±{item.variance}{t('dashboard.pieces')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 설비 모델별 비용 분석 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('equipment.model')} {t('reports.monthlyReport')}</h4>
            <span className="text-2xl">🏭</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (data?.modelCostAnalysis || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.modelCostAnalysis || []).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.series} 시리즈:</span>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600">{formatVND(item.cost)}</div>
                    <div className="text-xs text-gray-500">({item.percentage}%)</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-gray-400">
              <div className="text-center">
                <div className="text-sm">{t('common.noData')}</div>
                <div className="text-xs mt-1">{t('common.noResults')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 오늘의 교체 실적 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('dashboard.todayChanges')}</h4>
            <span className="text-2xl">🔄</span>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {data?.toolChanges?.today || 0}
            </p>
            <p className="text-sm text-gray-500">{t('dashboard.pieceCount')} {t('common.success')}</p>
            <div className="mt-3 flex justify-between text-xs">
              <span className={`${getTrendColor(data?.toolChanges?.trend || '+8')}`}>
                {getTrendIcon(data?.toolChanges?.trend || '0')} {t('dashboard.vsPreviousDay')} {data?.toolChanges?.trend || '0'}
              </span>
              <span className="text-gray-500">{t('dashboard.target')}: {data?.toolChanges?.target || 0}{t('dashboard.pieceCount')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 4.1: 새로운 3개 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 코드별 장착 설비수 Top5 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('common.code')}별 장착 {t('equipment.title')}{t('common.count')} Top5</h4>
            <span className="text-2xl">🔧</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (data?.endmillByEquipmentCount || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.endmillByEquipmentCount || []).slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{item.endmillCode}</span>
                    <div className="text-xs text-gray-500 truncate">{item.endmillName}</div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="font-bold text-blue-600">{item.equipmentCount}{t('equipment.title')}</div>
                    <div className="text-xs text-gray-500">{item.totalPositions}{t('dashboard.positions')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <div className="text-sm">{t('common.noData')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 모델별 사용 앤드밀 분포 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('equipment.model')}별 사용 {t('endmill.title')} 분포</h4>
            <span className="text-2xl">📊</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (data?.modelEndmillUsage || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.modelEndmillUsage || []).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                  <span className="font-medium text-gray-900">{item.model}</span>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {item.endmillCount}{t('endmill.title')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.equipmentCount}{t('equipment.title')} (평균 {item.avgEndmillPerEquipment}/대)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <div className="text-sm">{t('common.noData')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 앤드밀 소진율 높은 설비 Top5 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">{t('endmill.title')} {t('dashboard.lifeConsumption')} 높은 {t('equipment.title')} Top5</h4>
            <span className="text-2xl">⚙️</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ) : (data?.equipmentLifeConsumption || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.equipmentLifeConsumption || []).slice(0, 5).map((item, index) => (
                <div key={index} className="space-y-1 p-2 bg-gray-50 rounded">
                  <div className="flex justify-between items-start text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.toolCount}{t('endmill.title')} {t('dashboard.management')} / {item.model} / ({(item as any).process || t('common.unknown')})
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        C{String(item.equipmentNumber).padStart(3, '0')} - {(item as any).changeCount}{t('dashboard.changeCount')}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <span className={`font-bold text-lg ${
                        (item as any).changeCount >= 20 ? 'text-red-600' :
                        (item as any).changeCount >= 10 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {(item as any).changeCount}
                      </span>
                      <div className="text-[10px] text-gray-500">{t('dashboard.times')}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        (item as any).changeCount >= 20 ? 'bg-red-500' :
                        (item as any).changeCount >= 10 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, ((item as any).changeCount / 30) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <div className="text-sm">{t('common.noData')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 최근 활동 현황 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{t('dashboard.recentActivity')}</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isAllConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className={`text-xs font-medium ${isAllConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isAllConnected ? t('endmill.realtimeConnected') : t('endmill.connecting')}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {t('common.lastUpdate')}: {lastRefresh ? lastRefresh.toLocaleTimeString('ko-KR') : t('common.loading')} ({new Date().toLocaleDateString('ko-KR')})
            </span>
          </div>
        </div>
        <div className="px-6 py-4">
          {data?.recentAlerts && data.recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {data.recentAlerts.map((alert: any, index: number) => {
                // 제목과 메시지 생성
                let title = ''
                let message = ''

                if (alert.type === 'abnormal_wear') {
                  title = t('dashboard.abnormalWear')
                  message = `${alert.equipmentNumber || 'Unknown'} ${t('equipment.title')} T${alert.tNumber} - ${t('dashboard.wearMessage')} (${alert.actualLife}${t('dashboard.productionAfter')}, ${t('dashboard.standard')}: ${alert.standardLife}${t('dashboard.pieceCount')})`
                } else if (alert.type === 'abnormal_damage') {
                  title = t('dashboard.abnormalDamage')
                  message = `${alert.equipmentNumber || 'Unknown'} ${t('equipment.title')} T${alert.tNumber} - ${t('dashboard.damageMessage')}`
                } else if (alert.type === 'low_stock') {
                  title = `${t('inventory.critical')} ${t('common.warning')}`
                  message = `${alert.endmillCode || 'Unknown'} ${alert.endmillName || ''} - ${t('inventory.stockStatus')} ${alert.currentStock}${t('dashboard.pieceCount')} (${t('dashboard.minStock')} ${alert.minStock}${t('dashboard.pieceCount')})`
                } else if (alert.type === 'trend_increase') {
                  title = t('dashboard.trendIncrease')
                  message = `${t('dashboard.trendMessage')} - ${t('dashboard.recentDays')} ${alert.recentCount}${t('dashboard.cases')} (${t('dashboard.vsLastWeek')} +${alert.increase}%)`
                }

                const timeText = alert.minutesAgo < 60
                  ? `${alert.minutesAgo}${t('dashboard.minute')} ${t('dashboard.ago')}`
                  : `${Math.floor(alert.minutesAgo / 60)}${t('dashboard.hour')} ${t('dashboard.ago')}`

                return (
                  <div key={index} className={`flex items-start p-4 bg-${alert.color}-50 rounded-lg border border-${alert.color}-200`}>
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-3 h-3 bg-${alert.color}-400 rounded-full ${alert.severity === 'high' || alert.severity === 'warning' ? 'animate-pulse' : ''}`}></div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{title}</p>
                        <span className={`text-xs text-${alert.color}-600 font-medium`}>
                          {alert.severity === 'high' ? t('camSheets.high') : alert.severity === 'warning' ? t('common.warning') : alert.severity === 'medium' ? t('camSheets.medium') : t('common.info')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{timeText}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <p className="text-sm">{t('common.noData')}</p>
                <p className="text-xs mt-1">{t('dashboard.noAlerts')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}