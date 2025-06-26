import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* 헤더 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            CNC 앤드밀 관리 시스템
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            800대 CNC 설비를 위한 포괄적인 공구 관리 플랫폼
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="btn btn-primary px-8 py-3 text-lg"
            >
              시스템 접속
            </Link>
            <Link
              href="/dashboard"
              className="btn bg-white text-blue-600 border border-blue-600 hover:bg-gray-50 px-8 py-3 text-lg"
            >
              대시보드 보기
            </Link>
          </div>
        </div>

        {/* 주요 기능 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏭</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">설비 관리</h3>
            <p className="text-gray-600">
              800대 CNC 설비의 실시간 상태 모니터링과 24개 공구 위치 관리
            </p>
          </div>
          
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔧</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">앤드밀 관리</h3>
            <p className="text-gray-600">
              Tool Life 추적, 교체 알림, 이력 관리로 생산성 향상
            </p>
          </div>
          
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">재고 관리</h3>
            <p className="text-gray-600">
              자동 발주, 최소 재고 알림으로 효율적인 재고 운영
            </p>
          </div>
        </div>

        {/* 통계 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">시스템 현황</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">800</div>
              <div className="text-gray-600">CNC 설비</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">19,200</div>
              <div className="text-gray-600">공구 위치</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">742</div>
              <div className="text-gray-600">활성 설비</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">156</div>
              <div className="text-gray-600">교체 예정</div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <footer className="text-center mt-16 text-gray-500">
          <p>&copy; 2025 CNC 앤드밀 관리 시스템. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
} 