export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600">CNC 앤드밀 관리 시스템 현황</p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                🏭
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 설비 수</p>
              <p className="text-2xl font-bold text-gray-900">800</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                ✅
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">가동 중</p>
              <p className="text-2xl font-bold text-green-600">752</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                ⚠️
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">교체 필요</p>
              <p className="text-2xl font-bold text-yellow-600">23</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                🔧
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">점검 중</p>
              <p className="text-2xl font-bold text-red-600">25</p>
            </div>
          </div>
        </div>
      </div>

      {/* 알림 및 작업 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🚨 긴급 알림</h2>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-red-50 rounded-lg">
              <div className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full"></div>
              <p className="ml-3 text-sm text-red-800">CNC#15 T03 위치 Tool Life 임계치 도달</p>
            </div>
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <div className="flex-shrink-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
              <p className="ml-3 text-sm text-yellow-800">AT001 앤드밀 재고 부족 (현재: 5개)</p>
            </div>
            <div className="flex items-center p-3 bg-orange-50 rounded-lg">
              <div className="flex-shrink-0 w-2 h-2 bg-orange-400 rounded-full"></div>
              <p className="ml-3 text-sm text-orange-800">PA1 설비 점검 일정 도래</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 오늘의 작업</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">공구 교체 작업</p>
                <p className="text-xs text-gray-600">A조 - 23건 완료</p>
              </div>
              <span className="text-sm text-green-600 font-medium">완료</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">재고 입고 처리</p>
                <p className="text-xs text-gray-600">B조 - 진행 중</p>
              </div>
              <span className="text-sm text-blue-600 font-medium">진행중</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">CAM Sheet 업데이트</p>
                <p className="text-xs text-gray-600">C조 - 대기</p>
              </div>
              <span className="text-sm text-gray-600 font-medium">대기</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 