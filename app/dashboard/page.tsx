'use client'

import { usePathname } from 'next/navigation'
import LandingStatusCard from '../../components/features/LandingStatusCard'
import DonutChart from '../../components/features/DonutChart'

export default function DashboardPage() {
  const pathname = usePathname()
  
  console.log('📍 대시보드 페이지 로드됨, pathname:', pathname)

  return (
    <div className="space-y-6">
      {/* 디버깅 정보 */}
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <p className="font-bold">🔧 디버깅 모드</p>
        <p>현재 경로: {pathname}</p>
        <p>페이지 로드 시간: {new Date().toLocaleTimeString()}</p>
      </div>

      {/* 상태 카드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <LandingStatusCard />
      </div>

      {/* 차트 및 통계 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Life 분석 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tool Life 현황</h3>
          <div className="flex items-center justify-center">
            <DonutChart value={75} max={100} color="#10b981" size={120}>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">75%</div>
                <div className="text-sm text-gray-500">평균 효율</div>
              </div>
            </DonutChart>
          </div>
        </div>

        {/* 설비 가동률 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">설비 가동률</h3>
          <div className="flex items-center justify-center">
            <DonutChart value={680} max={800} color="#3b82f6" size={120}>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">680</div>
                <div className="text-sm text-gray-500">/ 800대</div>
              </div>
            </DonutChart>
          </div>
        </div>
      </div>

      {/* 알림 및 이벤트 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">최근 알림</h3>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-red-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">긴급 교체 필요</p>
                <p className="text-sm text-gray-500">C045 설비 T12 앤드밀 수명 종료</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">재고 부족</p>
                <p className="text-sm text-gray-500">EM-001 앤드밀 재고가 최소 수준 이하</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">정기 점검</p>
                <p className="text-sm text-gray-500">A동 설비 정기 점검 완료</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 