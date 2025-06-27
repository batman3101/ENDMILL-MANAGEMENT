export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 상단 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* 공정 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-blue-600 text-lg">🔧</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">공정 관리</p>
                <p className="text-xs text-gray-500">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">2개</p>
            <p className="text-xs text-gray-500">신규 공정 생성</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">3분</span>
            <span className="text-gray-500">88%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{width: '88%'}}></div>
          </div>
        </div>

        {/* 작업 지시 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600 text-lg">📋</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">작업 지시</p>
                <p className="text-xs text-gray-500">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">150<span className="text-sm text-gray-500">LOT</span></p>
            <p className="text-xs text-gray-500">95<span className="text-xs">LOT</span></p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">공정 작업</span>
            <span className="text-gray-500">63%</span>
          </div>
          <div className="mt-2">
            <div className="flex space-x-1">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 bg-gray-200 rounded-sm h-6">
                  <div 
                    className="bg-green-600 rounded-sm h-full" 
                    style={{width: `${Math.random() * 100}%`}}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 품질 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-teal-600 text-lg">✅</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">품질 관리</p>
                <p className="text-xs text-gray-500">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">98.5%</p>
            <p className="text-xs text-gray-500">양품률</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">3<span className="text-xs">EA</span></span>
            <span className="text-gray-500">12<span className="text-xs">EA</span></span>
          </div>
          <div className="mt-2 w-16 h-16 mx-auto">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-full bg-gray-200"></div>
              <div className="absolute inset-0 rounded-full bg-teal-500" style={{clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'}}></div>
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">98%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 자재 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-orange-600 text-lg">📦</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">자재 관리</p>
                <p className="text-xs text-gray-500">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">2,450<span className="text-sm text-gray-500">EA</span></p>
            <p className="text-xs text-gray-500">총 수량</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">5<span className="text-xs">품목</span></span>
            <span className="text-gray-500">8<span className="text-xs">건</span></span>
          </div>
          <div className="mt-2 w-16 h-16 mx-auto">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-full bg-gray-200"></div>
              <div className="absolute inset-0 rounded-full bg-orange-500" style={{clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'}}></div>
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 출하 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-purple-600 text-lg">🚚</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">출하 관리</p>
                <p className="text-xs text-gray-500">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">85<span className="text-sm text-gray-500">건</span></p>
            <p className="text-xs text-gray-500">출하 요청</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">32<span className="text-xs">건</span></span>
            <span className="text-gray-500">95%</span>
          </div>
          <div className="mt-2">
            <div className="flex space-x-1 mb-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-2 h-8 bg-gray-200 rounded-sm">
                  <div 
                    className="bg-purple-600 rounded-sm w-full" 
                    style={{height: `${Math.random() * 100}%`}}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 설비 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-gray-600 text-lg">🏭</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">설비 관리</p>
                <p className="text-xs text-gray-500">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">810<span className="text-sm text-gray-500">건</span></p>
            <p className="text-xs text-gray-500">총 설비</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">568<span className="text-xs">건</span></span>
            <span className="text-gray-500">70%</span>
          </div>
          <div className="mt-2 w-16 h-16 mx-auto">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-full bg-gray-200"></div>
              <div className="absolute inset-0 rounded-full bg-gray-600" style={{clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'}}></div>
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">70%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 대시보드 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 앤드밀 사용 현황 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">🔧 앤드밀 사용 현황</h2>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-600 px-3 py-1 border border-blue-200 rounded hover:bg-blue-50">
                WO-2023-001 작업 완료
              </button>
              <button className="text-sm text-yellow-600 px-3 py-1 border border-yellow-200 rounded hover:bg-yellow-50">
                WO-2023-003 시료 부족
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">88%</p>
              <p className="text-sm text-gray-500">앤드밀 가동율</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">⚠️ TRI 공정 비가동 상태</p>
              <p className="text-sm text-gray-500 mt-1">DEBURRING 공정 신규 예약</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">❌ CNC 2공정 시료 불량 발생</p>
              <p className="text-sm text-gray-500 mt-1">자기 분석 정리 예약</p>
            </div>
          </div>

          {/* 시간별 차트 */}
          <div className="flex items-end space-x-2 h-32 mb-4">
            {[75, 85, 92, 88, 95, 78, 82, 90, 85, 88, 92, 87, 85, 89].map((height, index) => (
              <div key={index} className="flex-1 bg-gray-200 rounded-sm relative">
                <div 
                  className="bg-blue-500 rounded-sm w-full absolute bottom-0" 
                  style={{height: `${height}%`}}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>9시</span>
            <span>10시</span>
            <span>11시</span>
            <span>12시</span>
            <span>13시</span>
            <span>14시</span>
            <span>15시</span>
          </div>
        </div>

        {/* 재고 부족 알림 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">📦 재고 부족 알림</h2>
            <span className="text-xs text-gray-500">자세히 보기 →</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">WO-2023-100 출하 완료</p>
                  <p className="text-xs text-gray-500">AL6061-T6 제고 부족</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">WO-2023-102 출하 지연</p>
                  <p className="text-xs text-gray-500">전기 분석 검사 예약</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-gray-900 mb-3">출하 관리 현황</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">출하 대기</span>
                  <span className="font-medium">32건</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">진행률</span>
                  <span className="font-medium">95%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: '95%'}}></div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-900 mb-2">❌ CNC 2공정 시료 불량 발생</p>
              <p className="text-xs text-gray-500">자기 분석 검사 예약</p>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 위젯 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* 자재 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📦 자재 관리</h2>
            <span className="text-xs text-gray-500">자세히 보기 →</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">총 재고량</span>
              <span className="text-sm font-medium">2,450EA</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">부족 품목</span>
              <span className="text-sm font-medium text-red-600">5품목</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">신규 대기</span>
              <span className="text-sm font-medium">8건</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-gray-600">AL6061-T6 제고 부족</span>
            </div>
            <div className="flex items-center text-sm mt-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">원자 재고 상태 매개</span>
            </div>
          </div>
        </div>

        {/* 출하 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🚚 출하 관리</h2>
            <span className="text-xs text-gray-500">자세히 보기 →</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">출하 요청</span>
              <span className="text-sm font-medium">85건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">완료율</span>
              <span className="text-sm font-medium text-green-600">32건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">진행률</span>
              <span className="text-sm font-medium">95%</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex space-x-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-2 h-12 bg-gray-200 rounded-sm">
                  <div 
                    className="bg-purple-600 rounded-sm w-full" 
                    style={{height: `${Math.random() * 100}%`}}
                  ></div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">WO-2023-100 출하 완료</span>
            </div>
            <div className="flex items-center text-sm mt-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-600">WO-2023-102 출하 지연</span>
            </div>
          </div>
        </div>

        {/* 설비 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🏭 설비 관리</h2>
            <span className="text-xs text-gray-500">자세히 보기 →</span>
          </div>
          
          <div className="text-center mb-4">
            <div className="w-20 h-20 mx-auto mb-3 relative">
              <div className="absolute inset-0 rounded-full bg-gray-200"></div>
              <div className="absolute inset-0 rounded-full bg-gray-600" style={{clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'}}></div>
              <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">70%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">810건</p>
            <p className="text-sm text-gray-500">총 설비</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">가동 중</span>
              <span className="font-medium text-green-600">568건</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">가동률</span>
              <span className="font-medium">70%</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-600">CNC 2공정 시료 불량 발생</span>
            </div>
            <div className="flex items-center text-sm mt-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">설비 분석 검사 예약</span>
            </div>
          </div>
        </div>

        {/* 알림 및 공지 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🔔 알림 센터</h2>
            <span className="text-xs text-gray-500">전체 보기 →</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-red-50 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">CNC 2공정 시료 불량</p>
                <p className="text-xs text-gray-500">5분 전</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">AT003 재고 부족</p>
                <p className="text-xs text-gray-500">15분 전</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">신규 작업 지시</p>
                <p className="text-xs text-gray-500">30분 전</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                전체 알림 관리
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 