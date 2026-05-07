'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientLogger } from '../../lib/utils/logger'
import DonutChart from '../../components/features/DonutChart'
import { useSettings } from '../../lib/hooks/useSettings'
import { usePermissions } from '../../lib/hooks/usePermissions'
import { useMultiTableRealtime } from '../../lib/hooks/useRealtime'
import { StatusBadge } from '../../components/ui/status-badge'
import {
  useDashboard,
  formatVND,
  getTrendIcon,
  getTrendColor
} from '../../lib/hooks/useDashboard'

export default function DashboardPage() {
  const { t } = useTranslation()
  // 권한 확인
  const { canAccessPage } = usePermissions()
  const { getSetting } = useSettings()
  const { data, isLoading, error, refreshData, lastRefresh } = useDashboard() // 기본값 300초(5분) 사용 - Disk IO 절감

  // 실시간 연동 설정 (throttled refresh)
  // const [realtimeData, setRealtimeData] = useState<any>(null) // 미사용 (향후 사용 예정)
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

  const { isAllConnected } = useMultiTableRealtime(
    ['tool_changes', 'inventory_transactions', 'notifications', 'activity_logs'],
    realtimeCallbacks
  )

  // 대시보드 접근 권한 확인
  if (!canAccessPage('/dashboard')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-title font-semibold text-ink mb-2">{t('common.error')}</h2>
          <p className="text-ink-soft">{t('common.loadError')}</p>
        </div>
      </div>
    )
  }

  // 설정에서 값 가져오기 (향후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _totalEquipments = getSetting('equipment', 'totalCount')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _toolPositions = getSetting('equipment', 'toolPositionCount')

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-signal-stop-strong mb-4">{t('common.loadError')}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-gauge-cobalt text-paper rounded-md hover:bg-gauge-cobalt-strong"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading && (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider animate-pulse">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-5 bg-paper-warm rounded w-24"></div>
                  <div className="h-4 bg-paper-warm rounded w-12"></div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 bg-paper-warm rounded-full"></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="text-center">
                      <div className="h-3 bg-paper-warm rounded mb-1 w-8 mx-auto"></div>
                      <div className="h-4 bg-paper-warm rounded w-10 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {!isLoading && (
          <>

        {/* 교체 사유 분석 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-title font-semibold text-ink-soft">{t('dashboard.changeReasonAnalysis')}</h3>
            <span className="text-label text-ink-mute">{t('dashboard.lastMonth')}</span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart
              value={data?.endmillUsage?.brokenRate || 0}
              max={100}
              color={
                (data?.endmillUsage?.brokenRate || 0) >= 15 ? "#ef4444" :
                (data?.endmillUsage?.brokenRate || 0) >= 10 ? "#f59e0b" :
                "#10b981"
              }
              size={120}
            >
              <div className="text-center">
                <div className="text-headline font-semibold text-ink tabular-nums">
                  {data?.endmillUsage?.brokenRate || 0}%
                </div>
                <div className="text-caption text-ink-mute">{t('dashboard.brokenRate')}</div>
              </div>
            </DonutChart>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-caption text-ink-mute">{t('dashboard.normalLife')}</p>
              <p className="text-base font-semibold text-signal-go-strong tabular-nums">
                {data?.endmillUsage?.normalLife || 0}{t('dashboard.cases')}
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-mute">{t('dashboard.broken')}</p>
              <p className="text-base font-semibold text-signal-stop-strong tabular-nums">
                {data?.endmillUsage?.broken || 0}{t('dashboard.cases')}
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-mute">{t('dashboard.premature')}</p>
              <p className="text-base font-semibold text-signal-watch-strong tabular-nums">
                {data?.endmillUsage?.premature || 0}{t('dashboard.cases')}
              </p>
            </div>
          </div>
          {(data?.endmillUsage?.brokenRate || 0) >= 10 && (
            <div className="mt-3 p-2 bg-signal-watch-soft border border-signal-watch rounded-md">
              <p className="text-caption text-signal-watch-strong text-center">
                ⚠️ {t('dashboard.highBrokenRateWarning')}
              </p>
            </div>
          )}
        </div>

        {/* 설비 가동률 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-title font-semibold text-ink-soft">{t('dashboard.equipmentStatus')}</h3>
            <span className="text-label text-ink-mute">{t('endmill.realtimeConnected')}</span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart
              value={data?.equipment?.active || 0}
              max={data?.equipment?.total || 1}
              color="#3b82f6"
              size={120}
            >
              <div className="text-center">
                <div className="text-headline font-semibold text-ink tabular-nums">
                  {data?.equipment?.active || 0}
                </div>
                <div className="text-caption text-ink-mute">
                  / {data?.equipment?.total || 0}{t('dashboard.equipmentCount')}
                </div>
                <div className="text-caption text-gauge-cobalt-strong mt-0.5 tabular-nums">
                  {data?.equipment?.operatingRate || 0}% {t('dashboard.operatingRate')}
                </div>
              </div>
            </DonutChart>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-caption text-ink-mute">{t('equipment.operating')}</p>
              <p className="text-base font-semibold text-gauge-cobalt-strong tabular-nums">
                {data?.equipment?.active || 0}{t('dashboard.equipmentCount')}
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-mute">{t('equipment.maintenance')}</p>
              <p className="text-base font-semibold text-amber-600 tabular-nums">
                {data?.equipment?.maintenance || 0}{t('dashboard.equipmentCount')}
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-mute">{t('equipment.setup')}</p>
              <p className="text-base font-semibold text-purple-600 tabular-nums">
                {data?.equipment?.setup || 0}{t('dashboard.equipmentCount')}
              </p>
            </div>
          </div>
        </div>

        {/* 재고 현황 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-title font-semibold text-ink-soft">{t('inventory.stockStatus')}</h3>
            <span className="text-label text-ink-mute">{t('endmill.realtimeConnected')}</span>
          </div>
          <div className="space-y-3">
            {/* 정상 재고 */}
            <div className="flex items-center justify-between p-3 bg-signal-go-soft rounded-md">
              <StatusBadge variant="go" label={t('inventory.sufficient')} />
              <span className="text-base font-bold text-signal-go-strong tabular-nums">
                {data?.inventory?.sufficient || 0}{t('dashboard.pieceCount')}
              </span>
            </div>

            {/* 부족 재고 */}
            <div className="flex items-center justify-between p-3 bg-signal-watch-soft rounded-md">
              <StatusBadge variant="watch" label={t('inventory.low')} />
              <span className="text-base font-bold text-signal-watch-strong tabular-nums">
                {data?.inventory?.low || 0}{t('dashboard.pieceCount')}
              </span>
            </div>

            {/* 위험 재고 */}
            <div className="flex items-center justify-between p-3 bg-signal-stop-soft rounded-md">
              <StatusBadge variant="stop" label={t('inventory.critical')} />
              <span className="text-base font-bold text-signal-stop-strong tabular-nums">
                {data?.inventory?.critical || 0}{t('dashboard.pieceCount')}
              </span>
            </div>
          </div>
        </div>

        {/* 공구 사용 비용 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-title font-semibold text-ink-soft">{t('reports.costAnalysis')}</h4>
            <span className="text-headline">📊</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-paper-warm rounded mb-2"></div>
              <div className="h-8 bg-paper-warm rounded mb-2"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-caption text-ink-mute">
                {t('reports.monthlyReport')} ({t('dashboard.previous')}): {formatVND(data?.costAnalysis?.lastMonth || 0)}
              </div>
              <div className="text-caption text-ink-mute">
                {t('reports.monthlyReport')} ({t('dashboard.current')}): {formatVND(data?.costAnalysis?.currentMonth || 0)}
              </div>
              <div className={`text-base font-semibold tabular-nums ${
                (data?.costAnalysis?.savings || 0) >= 0 ? 'text-signal-go-strong' : 'text-signal-stop-strong'
              }`}>
                {t('dashboard.savings')}: {formatVND(data?.costAnalysis?.savings || 0)}
                ({data?.costAnalysis?.savingsPercent || 0}%)
              </div>
              <div className="mt-3 h-2 bg-paper-warm rounded border border-divider">
                <div
                  className="h-2 bg-gauge-cobalt rounded transition-all duration-300"
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
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h4 className="text-title font-semibold text-ink-soft">{t('equipment.model')} {t('toolChanges.changeReason')}</h4>
              <span className="text-headline">⚡</span>
            </div>
            <span className="text-label text-ink-mute">{t('dashboard.lastMonth')}</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
            </div>
          ) : (data?.frequencyAnalysis || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.frequencyAnalysis || []).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-base">
                  <span className="text-ink-soft">{item.series}:</span>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{item.count}회</div>
                    <div className="text-caption text-ink-mute tabular-nums">{item.avgInterval}일/회</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-ink-mute">
              <div className="text-center">
                <div className="text-base">{t('common.noData')}</div>
                <div className="text-caption mt-1">{t('common.noResults')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 최다 파손 교체 엔드밀 Top 3 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h4 className="text-title font-semibold text-ink-soft">{t('dashboard.topBrokenEndmillsTitle')}</h4>
              <span className="text-headline">🔨</span>
            </div>
            <span className="text-label text-ink-mute">{t('dashboard.lastMonth')}</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
            </div>
          ) : (data?.topBrokenEndmills || []).length > 0 ? (
            <div className="space-y-3">
              {(data?.topBrokenEndmills || []).map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-base p-2 bg-paper-warm rounded-md border border-divider">
                  <span className="font-medium text-ink-soft">{index + 1}{t('dashboard.rank')}: {item.code}</span>
                  <span className="font-bold text-signal-stop-strong tabular-nums">{item.count}{t('dashboard.times')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-ink-mute">
              <div className="text-center">
                <div className="text-base">{t('common.noData')}</div>
                <div className="text-caption mt-1">{t('dashboard.noBrokenEndmillsRecent')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 설비 모델별 비용 분석 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-title font-semibold text-ink-soft">{t('equipment.model')} {t('reports.monthlyReport')}</h4>
            <span className="text-headline">🏭</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
            </div>
          ) : (data?.modelCostAnalysis || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.modelCostAnalysis || []).slice(0, 4).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-base">
                  <span className="text-ink-soft">{item.series}:</span>
                  <div className="text-right">
                    <div className="font-semibold text-gauge-cobalt-strong tabular-nums">{formatVND(item.cost)}</div>
                    <div className="text-caption text-ink-mute tabular-nums">({item.percentage}%)</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-ink-mute">
              <div className="text-center">
                <div className="text-base">{t('common.noData')}</div>
                <div className="text-caption mt-1">{t('common.noResults')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 오늘의 교체 실적 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-title font-semibold text-ink-soft">{t('dashboard.todayChanges')}</h4>
            <span className="text-headline">🔄</span>
          </div>
          <div className="text-center">
            <p className="text-headline font-semibold text-gauge-cobalt-strong tabular-nums" style={{ fontSize: '1.875rem' }}>
              {data?.toolChanges?.today || 0}
            </p>
            <p className="text-base text-ink-mute">{t('dashboard.pieceCount')} {t('common.success')}</p>
            <div className="mt-3 flex justify-between text-caption">
              <span className={`tabular-nums ${getTrendColor(data?.toolChanges?.trend || '+8')}`}>
                {getTrendIcon(data?.toolChanges?.trend || '0')} {t('dashboard.vsPreviousDay')} {data?.toolChanges?.trend || '0'}
              </span>
              <span className="text-ink-mute tabular-nums">{t('dashboard.target')}: {data?.toolChanges?.target || 0}{t('dashboard.pieceCount')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 4.1: 새로운 3개 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 코드별 장착 설비수 Top5 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-title font-semibold text-ink-soft">{t('common.code')}{t('dashboard.per')} {t('dashboard.mounted')} {t('dashboard.equipment')}{t('common.count')} Top5</h4>
            <span className="text-headline">🔧</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
            </div>
          ) : (data?.endmillByEquipmentCount || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.endmillByEquipmentCount || []).slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-base p-2 bg-paper-warm rounded-md border border-divider">
                  <div className="flex-1">
                    <span className="font-medium text-ink">{item.endmillCode}</span>
                    <div className="text-caption text-ink-mute truncate">{item.endmillName}</div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="font-bold text-gauge-cobalt-strong tabular-nums">{item.equipmentCount}{t('dashboard.equipmentCount')}</div>
                    <div className="text-caption text-ink-mute tabular-nums">{item.totalPositions}{t('dashboard.positions')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-ink-mute">
              <div className="text-center">
                <div className="text-base">{t('common.noData')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 모델별 사용 앤드밀 분포 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-title font-semibold text-ink-soft">{t('equipment.model')}{t('dashboard.per')} {t('dashboard.usage')} {t('dashboard.endmill')} {t('dashboard.distribution')}</h4>
            <span className="text-headline">📊</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
            </div>
          ) : (data?.modelEndmillUsage || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.modelEndmillUsage || []).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-base p-2 bg-paper-warm rounded-md border border-divider">
                  <span className="font-medium text-ink">{item.model}</span>
                  <div className="text-right">
                    <div className="font-bold text-signal-go-strong tabular-nums">
                      {item.endmillCount}{t('dashboard.endmill')}
                    </div>
                    <div className="text-caption text-ink-mute tabular-nums">
                      {item.equipmentCount}{t('dashboard.equipment')} ({t('dashboard.average')} {item.avgEndmillPerEquipment}{t('dashboard.perUnit')})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-ink-mute">
              <div className="text-center">
                <div className="text-base">{t('common.noData')}</div>
              </div>
            </div>
          )}
        </div>

        {/* 앤드밀 소진율 높은 설비 Top5 */}
        <div className="bg-paper-warm rounded-md p-4 sm:p-6 border border-divider transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h4 className="text-title font-semibold text-ink-soft">{t('dashboard.endmill')} {t('dashboard.lifeConsumption')} {t('common.high')} {t('dashboard.equipment')} Top5</h4>
              <span className="text-headline">⚙️</span>
            </div>
            <span className="text-label text-ink-mute">{t('dashboard.lastMonth')}</span>
          </div>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
              <div className="h-4 bg-paper-warm rounded"></div>
            </div>
          ) : (data?.equipmentLifeConsumption || []).length > 0 ? (
            <div className="space-y-2">
              {(data?.equipmentLifeConsumption || []).slice(0, 5).map((item, index) => (
                <div key={index} className="space-y-1 p-2 bg-paper-warm rounded-md border border-divider">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-semibold text-base text-ink">
                        C{String(item.equipmentNumber).padStart(3, '0')} / {item.model} / ({(item as any).process || t('common.unknown')})
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <span className={`font-bold tabular-nums ${
                        (item as any).changeCount >= 20 ? 'text-signal-stop-strong' :
                        (item as any).changeCount >= 10 ? 'text-signal-watch-strong' :
                        'text-signal-go-strong'
                      }`} style={{ fontSize: '1.5rem' }}>
                        {(item as any).changeCount}
                      </span>
                      <div className="text-caption text-ink-mute mt-0.5">{t('dashboard.changeCount')}</div>
                    </div>
                  </div>
                  <div className="w-full bg-paper-warm rounded-full h-1.5 border border-divider">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        (item as any).changeCount >= 20 ? 'bg-signal-stop-strong' :
                        (item as any).changeCount >= 10 ? 'bg-signal-watch-strong' :
                        'bg-signal-go-strong'
                      }`}
                      style={{ width: `${Math.min(100, ((item as any).changeCount / 30) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-ink-mute">
              <div className="text-center">
                <div className="text-base">{t('common.noData')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 최근 활동 현황 */}
      <div className="bg-paper-warm rounded-md border border-divider">
        <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
          <h3 className="text-title font-semibold text-ink-soft">{t('dashboard.recentActivity')}</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isAllConnected ? 'bg-signal-go-strong animate-pulse' : 'bg-signal-stop-strong'}`}></div>
              <span className={`text-caption font-medium ${isAllConnected ? 'text-signal-go-strong' : 'text-signal-stop-strong'}`}>
                {isAllConnected ? t('endmill.realtimeConnected') : t('endmill.connecting')}
              </span>
            </div>
            <span className="text-label text-ink-mute">
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
                  message = `${alert.equipmentNumber || 'Unknown'} ${t('equipment.title')} - ${t('dashboard.recentDays')} ${alert.recentCount}${t('dashboard.cases')} (${t('dashboard.vsLastWeek')} +${alert.increase}%)`
                }

                // 추세 분석은 실시간이 아니므로 "최근 7일" 표시
                const timeText = alert.type === 'trend_increase'
                  ? t('dashboard.last7Days') || '최근 7일'
                  : alert.minutesAgo < 60
                    ? `${alert.minutesAgo}${t('dashboard.minute')} ${t('dashboard.ago')}`
                    : `${Math.floor(alert.minutesAgo / 60)}${t('dashboard.hour')} ${t('dashboard.ago')}`

                // alert.color 기반 신호 토큰 매핑
                const alertColorMap: Record<string, { bg: string; border: string; text: string }> = {
                  red: { bg: 'bg-signal-stop-soft', border: 'border-signal-stop', text: 'text-signal-stop-strong' },
                  yellow: { bg: 'bg-signal-watch-soft', border: 'border-signal-watch', text: 'text-signal-watch-strong' },
                  green: { bg: 'bg-signal-go-soft', border: 'border-signal-go', text: 'text-signal-go-strong' },
                }
                const alertTokens = alertColorMap[alert.color] ?? { bg: 'bg-paper-warm', border: 'border-divider', text: 'text-ink-mute' }

                return (
                  <div key={index} className={`flex items-start p-4 ${alertTokens.bg} rounded-md border ${alertTokens.border}`}>
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-3 h-3 rounded-full ${alertTokens.text.replace('text-', 'bg-')} ${alert.severity === 'high' || alert.severity === 'warning' ? 'animate-pulse' : ''}`}></div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold text-ink">{title}</p>
                        <span className={`text-caption ${alertTokens.text} font-medium`}>
                          {alert.severity === 'high' ? t('camSheets.high') : alert.severity === 'warning' ? t('common.warning') : alert.severity === 'medium' ? t('camSheets.medium') : t('common.info')}
                        </span>
                      </div>
                      <p className="text-base text-ink-soft mt-1">{message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-caption text-ink-mute">{timeText}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-ink-mute">
              <div className="text-center">
                <p className="text-base">{t('common.noData')}</p>
                <p className="text-caption mt-1">{t('dashboard.noAlerts')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
