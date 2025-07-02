import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 상단 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 총 CNC 설비 */}
        <Link href="/dashboard/equipment" className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-blue-600 text-lg">🏭</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">총 CNC 설비</p>
                <p className="text-xs text-blue-600 hover:text-blue-800">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">800대</p>
            <p className="text-xs text-gray-500">742대 가동중</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">16,800개</span>
            <span className="text-gray-500">93%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{width: '93%'}}></div>
          </div>
        </Link>



        {/* 재고 부족 알림 */}
        <Link href="/dashboard/inventory" className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-orange-600 text-lg">📦</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">재고 부족</p>
                <p className="text-xs text-orange-600 hover:text-orange-800">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-orange-600">23개</p>
            <p className="text-xs text-gray-500">타입 부족</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">8<span className="text-xs">개 위험</span></span>
            <span className="text-gray-500">15<span className="text-xs">개 부족</span></span>
          </div>
          <div className="mt-2 w-16 h-16 mx-auto">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-full bg-gray-200"></div>
              <div className="absolute inset-0 rounded-full bg-orange-500" style={{clipPath: 'polygon(50% 0%, 100% 0%, 100% 30%, 50% 100%)'}}></div>
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">23</span>
              </div>
            </div>
          </div>
        </Link>

        {/* 오늘 교체 완료 */}
        <Link href="/dashboard/tool-changes" className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600 text-lg">🔧</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">오늘 교체</p>
                <p className="text-xs text-green-600 hover:text-green-800">자세히 보기 →</p>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-gray-900">67<span className="text-sm text-gray-500">개</span></p>
            <p className="text-xs text-gray-500">완료</p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">목표 50<span className="text-xs">개</span></span>
            <span className="text-gray-500">134<span className="text-xs">%</span></span>
          </div>
          <div className="mt-2 w-16 h-16 mx-auto">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 rounded-full bg-gray-200"></div>
              <div className="absolute inset-0 rounded-full bg-green-500" style={{clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'}}></div>
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900">67</span>
              </div>
            </div>
          </div>
        </Link>




      </div>

      {/* 메인 대시보드 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 설비 가동 현황 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">🏭 설비 가동 현황</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">93%</p>
              <p className="text-sm text-gray-500">설비 가동률</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">🔄 미가동 사유</p>
              <p className="text-sm text-gray-500 mt-1">모델 교체중</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">🔧 미가동 사유</p>
              <p className="text-sm text-gray-500 mt-1">설비 점검중</p>
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

        {/* 재고 부족 현황 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">📦 재고 부족 현황</h2>
            <Link href="/dashboard/inventory" className="text-xs text-blue-600 hover:text-blue-800">자세히 보기 →</Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">AT002 BALL 6mm</p>
                  <p className="text-xs text-gray-500">현재고 5개 / 최소재고 15개</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">AT003 T-CUT 8mm</p>
                  <p className="text-xs text-gray-500">현재고 8개 / 최소재고 20개</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-gray-900 mb-3">재고 부족 현황</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">부족 타입</span>
                  <span className="font-medium text-red-600">23개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">긴급 발주</span>
                  <span className="font-medium text-orange-600">8개</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div className="bg-red-500 h-2 rounded-full" style={{width: '35%'}}></div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-900 mb-2">📦 AT002 BALL 6mm 재고 부족</p>
              <p className="text-xs text-gray-500">현재고 5개 / 최소재고 15개</p>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 위젯 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* 앤드밀 재고 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📦 앤드밀 재고</h2>
            <Link href="/dashboard/inventory" className="text-xs text-blue-600 hover:text-blue-800">자세히 보기 →</Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">총 재고량</span>
              <span className="text-sm font-medium">1,247개</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">부족 타입</span>
              <span className="text-sm font-medium text-red-600">23개</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">발주 대기</span>
              <span className="text-sm font-medium text-orange-600">8개</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-gray-600">AT002 BALL 6mm 재고부족</span>
            </div>
            <div className="flex items-center text-sm mt-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-gray-600">AT003 T-CUT 8mm 재고부족</span>
            </div>
          </div>
        </div>

        {/* 교체 작업 현황 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🔧 교체 작업</h2>
            <Link href="/dashboard/tool-changes" className="text-xs text-blue-600 hover:text-blue-800">자세히 보기 →</Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">오늘 완료</span>
              <span className="text-sm font-medium text-green-600">67개</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">예정 교체</span>
              <span className="text-sm font-medium text-orange-600">156개</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">달성률</span>
              <span className="text-sm font-medium">134%</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex space-x-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-2 h-12 bg-gray-200 rounded-sm">
                  <div 
                    className="bg-green-600 rounded-sm w-full" 
                    style={{height: `${60 + Math.random() * 40}%`}}
                  ></div>
                </div>
              ))}
            </div>
          </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">설비 교체 작업 완료</span>
              </div>
              <div className="flex items-center text-sm mt-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-600">오늘 목표 달성</span>
              </div>
            </div>
        </div>

        {/* CNC 설비 현황 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🏭 CNC 설비</h2>
            <Link href="/dashboard/equipment" className="text-xs text-blue-600 hover:text-blue-800">자세히 보기 →</Link>
          </div>
          
          <div className="text-center mb-4">
            <div className="w-20 h-20 mx-auto mb-3 relative">
              <div className="absolute inset-0 rounded-full bg-gray-200"></div>
              <div className="absolute inset-0 rounded-full bg-blue-600" style={{clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'}}></div>
              <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">93%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">800대</p>
            <p className="text-sm text-gray-500">총 CNC 설비</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">가동 중</span>
              <span className="font-medium text-green-600">742대</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">가동률</span>
              <span className="font-medium">93%</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">C001 가동 중</span>
            </div>
            <div className="flex items-center text-sm mt-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-gray-600">C156 대기상태</span>
            </div>
          </div>
        </div>

        {/* 실시간 알림 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🔔 실시간 알림</h2>
            <Link href="/dashboard/reports" className="text-xs text-blue-600 hover:text-blue-800">전체 보기 →</Link>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-red-50 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">C156 설비 점검 필요</p>
                <p className="text-xs text-gray-500">2분 전</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-orange-50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">AT002 재고 부족</p>
                <p className="text-xs text-gray-500">12분 전</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">C001 정상 가동 중</p>
                <p className="text-xs text-gray-500">23분 전</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <Link href="/dashboard/reports" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                알림 히스토리 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 