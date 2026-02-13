export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 상단 4개 카드 스켈레톤 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
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
      </div>
      {/* 하단 4개 카드 스켈레톤 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* 최근 활동 스켈레톤 */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
