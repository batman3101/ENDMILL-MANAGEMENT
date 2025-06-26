export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 총 설비 수 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">총 설비 수</p>
              <p className="text-3xl font-bold text-gray-900">800</p>
              <p className="text-xs text-gray-500">대</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏭</span>
            </div>
          </div>
        </div>

        {/* 활성 작업 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">활성 작업</p>
              <p className="text-3xl font-bold text-green-600">156</p>
              <p className="text-xs text-gray-500">개 공정</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
          </div>
        </div>

        {/* 재고 부족 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">재고 부족</p>
              <p className="text-3xl font-bold text-orange-600">12</p>
              <p className="text-xs text-gray-500">종류</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>

        {/* 오늘 교체 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">오늘 교체</p>
              <p className="text-3xl font-bold text-blue-600">43</p>
              <p className="text-xs text-gray-500">개</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🔧</span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 주요 교체 인사이트 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              💡 주요 교체 인사이트
            </h2>
          </div>
          <div className="space-y-4">
            {/* 최대 교체 모델 */}
            <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-red-600 font-bold">📈</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">최다 교체 모델</p>
                    <p className="text-sm text-gray-600">PA1</p>
                  </div>
                  <p className="text-sm text-red-600 font-medium">총 125회 교체</p>
                </div>
              </div>
            </div>

            {/* 최다 교체 공정 */}
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-yellow-600 font-bold">🔧</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">최다 교체 공정</p>
                    <p className="text-sm text-gray-600">CNC #2 (PA1 모델)</p>
                  </div>
                  <p className="text-sm text-yellow-600 font-medium">총 78회 교체</p>
                </div>
              </div>
            </div>

            {/* 최다 교체 앤드밀 */}
            <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-blue-600 font-bold">📦</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">최다 교체 앤드밀</p>
                    <p className="text-sm text-gray-600">AT003 (Ø6 Flat)</p>
                  </div>
                  <p className="text-sm text-blue-600 font-medium">총 210회 교체</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              ⚠️ 최근 활동
            </h2>
          </div>
          <div className="space-y-4">
            {/* 앤드밀 교체 완료 */}
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">AT001 앤드밀 교체 완료</p>
                    <p className="text-xs text-gray-500">A조 김철수</p>
                  </div>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">5분 전</span>
                </div>
              </div>
            </div>

            {/* CAM Sheet 업데이트 */}
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">PA1 모델 CAM Sheet 업...</p>
                    <p className="text-xs text-gray-500">관리자</p>
                  </div>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">15분 전</span>
                </div>
              </div>
            </div>

            {/* T-CUT 앤드밀 재고 부족 */}
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">T-CUT 앤드밀 재고 부족...</p>
                    <p className="text-xs text-gray-500">시스템</p>
                  </div>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">30분 전</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 작업 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          ⚡ 빠른 작업
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            <span className="text-2xl mb-2">🔧</span>
            <span className="font-medium">앤드밀 교체</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
            <span className="text-2xl mb-2">📦</span>
            <span className="font-medium">재고 입력</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
            <span className="text-2xl mb-2">📈</span>
            <span className="font-medium">성능 분석</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
            <span className="text-2xl mb-2">💰</span>
            <span className="font-medium">비용 리포트</span>
          </button>
        </div>
      </div>
    </div>
  )
} 