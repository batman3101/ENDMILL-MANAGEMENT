'use client'

import { useState, useEffect } from 'react'
import LandingStatusCard from '../../components/features/LandingStatusCard'
import DonutChart from '../../components/features/DonutChart'
import { useSettings } from '../../lib/hooks/useSettings'

export default function DashboardPage() {
  const { getSetting } = useSettings()
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('ko-KR'))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // 설정에서 값 가져오기
  const totalEquipments = getSetting('equipment', 'totalCount')
  const toolPositions = getSetting('equipment', 'toolPositionCount')

  return (
    <div className="space-y-8">
      {/* 상단 실시간 정보 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {/* 총 CNC 설비 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">총 CNC 설비</p>
              <p className="text-3xl font-bold">{totalEquipments}</p>
              <p className="text-blue-200 text-xs mt-1">대</p>
            </div>
            <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏭</span>
            </div>
          </div>
        </div>

        {/* 공구 위치 */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">공구 위치</p>
              <p className="text-3xl font-bold">{(totalEquipments * toolPositions).toLocaleString()}</p>
              <p className="text-green-200 text-xs mt-1">개소</p>
            </div>
            <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📍</span>
            </div>
          </div>
        </div>

        {/* 가동 설비 */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">가동 설비</p>
              <p className="text-3xl font-bold">680</p>
              <p className="text-emerald-200 text-xs mt-1">대 가동중</p>
            </div>
            <div className="w-12 h-12 bg-emerald-400 rounded-lg flex items-center justify-center">
              <span className="text-2xl">▶️</span>
            </div>
          </div>
        </div>

        {/* 점검중 설비 */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">점검중</p>
              <p className="text-3xl font-bold">85</p>
              <p className="text-amber-200 text-xs mt-1">대 점검중</p>
            </div>
            <div className="w-12 h-12 bg-amber-400 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
          </div>
        </div>

        {/* 셋업중 설비 */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">셋업중</p>
              <p className="text-3xl font-bold">35</p>
              <p className="text-purple-200 text-xs mt-1">대 셋업중</p>
            </div>
            <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
          </div>
        </div>

        {/* 실시간 시계 */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">현재 시간</p>
              <p className="text-xl font-bold">{currentTime || '로딩 중...'}</p>
              <p className="text-gray-400 text-xs mt-1">{new Date().toLocaleDateString('ko-KR')}</p>
            </div>
            <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 차트 및 통계 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool Life 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Tool Life 현황</h3>
            <span className="text-sm text-gray-500">실시간</span>
          </div>
          <div className="flex items-center justify-center">
            <DonutChart value={75} max={100} color="#10b981" size={140}>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">75%</div>
                <div className="text-sm text-gray-500">평균 효율</div>
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
            <DonutChart value={680} max={800} color="#3b82f6" size={140}>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">680</div>
                <div className="text-sm text-gray-500">/ 800대</div>
                <div className="text-xs text-blue-600 mt-1">85% 가동</div>
              </div>
            </DonutChart>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">가동중</p>
              <p className="text-sm font-semibold text-blue-600">680대</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">점검중</p>
              <p className="text-sm font-semibold text-amber-600">85대</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">셋업중</p>
              <p className="text-sm font-semibold text-purple-600">35대</p>
            </div>
          </div>
        </div>

        {/* 재고 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">재고 현황</h3>
            <span className="text-sm text-gray-500">실시간</span>
          </div>
          <div className="space-y-4">
            {/* 정상 재고 */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">정상</span>
              </div>
              <span className="text-lg font-bold text-green-600">145개</span>
            </div>
            
            {/* 부족 재고 */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">부족</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">28개</span>
            </div>
            
            {/* 위험 재고 */}
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">위험</span>
              </div>
              <span className="text-lg font-bold text-red-600">12개</span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 4개 위젯 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 오늘의 교체 실적 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-800">오늘의 교체</h4>
            <span className="text-2xl">🔄</span>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">127</p>
            <p className="text-sm text-gray-500">개 교체 완료</p>
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-green-600">▲ 전일 대비 +8</span>
              <span className="text-gray-500">목표: 130개</span>
            </div>
          </div>
        </div>

        {/* 이번 주 품질 지표 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-800">품질 지표</h4>
            <span className="text-2xl">⭐</span>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">99.2%</p>
            <p className="text-sm text-gray-500">품질 달성률</p>
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-green-600">▲ 0.3%</span>
              <span className="text-gray-500">목표: 99.0%</span>
            </div>
          </div>
        </div>

        {/* 금주 비용 절감 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-800">비용 절감</h4>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">₩2.8M</p>
            <p className="text-sm text-gray-500">이번 주 절감액</p>
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-green-600">▲ ₩400K</span>
              <span className="text-gray-500">월 목표: ₩12M</span>
            </div>
          </div>
        </div>

        {/* 시스템 상태 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-800">시스템 상태</h4>
            <span className="text-2xl">📡</span>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm font-semibold text-green-600">정상 운영</p>
            <p className="text-xs text-gray-500">99.8% 업타임</p>
          </div>
        </div>
      </div>

      {/* 알림 및 이벤트 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">실시간 알림</h3>
          <span className="text-sm text-gray-500">최근 업데이트: {currentTime || '로딩 중...'}</span>
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