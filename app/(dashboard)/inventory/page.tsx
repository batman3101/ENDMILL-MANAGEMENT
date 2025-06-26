export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">재고 관리</h1>
        <p className="text-gray-600">앤드밀 재고 현황 및 입출고 관리</p>
      </div>

      {/* 재고 현황 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                📦
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 재고</p>
              <p className="text-2xl font-bold text-gray-900">1,247</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                ⚠️
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">부족</p>
              <p className="text-2xl font-bold text-red-600">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                📋
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">발주 대기</p>
              <p className="text-2xl font-bold text-yellow-600">5</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                💰
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 가치</p>
              <p className="text-2xl font-bold text-green-600">₩52M</p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="앤드밀 코드 또는 설명 검색..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">모든 카테고리</option>
              <option value="FLAT">FLAT</option>
              <option value="BALL">BALL</option>
              <option value="T-CUT">T-CUT</option>
              <option value="C-CUT">C-CUT</option>
              <option value="REAMER">REAMER</option>
              <option value="DRILL">DRILL</option>
            </select>
          </div>
          <div>
            <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">재고 상태</option>
              <option value="sufficient">충분</option>
              <option value="low">부족</option>
              <option value="critical">위험</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            + 신규 입고
          </button>
        </div>
      </div>

      {/* 재고 목록 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">재고 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  앤드밀 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  현재고/최소재고
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  단가
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* 샘플 데이터 */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">AT001</div>
                    <div className="text-sm text-gray-500">FLAT 12mm 4날</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">25 / 20</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '80%'}}></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    충분
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  A구역-01
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₩45,000
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-blue-600 hover:text-blue-800 mr-3">입출고</button>
                  <button className="text-gray-600 hover:text-gray-800">QR생성</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">AT002</div>
                    <div className="text-sm text-gray-500">BALL 6mm 2날</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">5 / 15</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-red-600 h-2 rounded-full" style={{width: '33%'}}></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    위험
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  A구역-02
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₩38,000
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-red-600 hover:text-red-800 mr-3">긴급발주</button>
                  <button className="text-blue-600 hover:text-blue-800">입출고</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">AT003</div>
                    <div className="text-sm text-gray-500">T-CUT 8mm 3날</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">12 / 10</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    부족
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  B구역-01
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₩52,000
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-yellow-600 hover:text-yellow-800 mr-3">발주</button>
                  <button className="text-blue-600 hover:text-blue-800">입출고</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 