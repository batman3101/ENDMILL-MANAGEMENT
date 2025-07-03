import { useSettings } from '../../../lib/hooks/useSettings'

export default function ReportsPage() {
  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const equipmentModels = settings.equipment.models
  const endmillCategories = settings.inventory.categories

  return (
    <div className="space-y-6">
      {/* 보고서 타입 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">월간 리포트</h3>
            <p className="text-sm text-gray-600">월별 교체 현황 및 비용 분석</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">비용 분석</h3>
            <p className="text-sm text-gray-600">공구별 비용 효율성 분석</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">⏱️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Tool Life 분석</h3>
            <p className="text-sm text-gray-600">공구 수명 패턴 분석</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">리포트 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">기간</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="today">오늘</option>
              <option value="week">이번 주</option>
              <option value="month">이번 달</option>
              <option value="quarter">분기</option>
              <option value="year">올해</option>
              <option value="custom">사용자 정의</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">설비 모델</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">전체</option>
              {equipmentModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 타입</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">전체</option>
              {endmillCategories.map(category => (
                <option key={category} value={category.toLowerCase()}>{category}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              리포트 생성
            </button>
          </div>
        </div>
      </div>

      {/* 최근 생성된 리포트 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">최근 생성된 리포트</h2>
        </div>
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                📊
              </div>
              <div>
                <p className="font-medium text-gray-900">2024년 1월 월간 리포트</p>
                <p className="text-sm text-gray-500">2024-02-01 생성 • 총 156건의 교체 기록</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">다운로드</button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">보기</button>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                💰
              </div>
              <div>
                <p className="font-medium text-gray-900">PA1 모델 비용 분석 리포트</p>
                <p className="text-sm text-gray-500">2024-01-28 생성 • 절약된 비용: 2,350,000 VND</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">다운로드</button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">보기</button>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                ⏱️
              </div>
              <div>
                <p className="font-medium text-gray-900">Tool Life 성능 분석</p>
                <p className="text-sm text-gray-500">2024-01-25 생성 • 평균 수명: 2,340회</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">다운로드</button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 