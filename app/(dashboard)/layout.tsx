import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                🏭 CNC 앤드밀 관리 시스템
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">관리자</span>
              <button className="text-sm text-red-600 hover:text-red-800">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 사이드바 */}
        <nav className="w-64 bg-white shadow-sm h-[calc(100vh-4rem)] border-r">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/dashboard" 
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  📊 대시보드
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/equipment" 
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  🏭 설비 관리
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/endmill" 
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  🔧 앤드밀 관리
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/inventory" 
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  📦 재고 관리
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/qr-scan" 
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  📱 QR 스캔
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/reports" 
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  📈 보고서
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 