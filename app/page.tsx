import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
        {/* 상단 로고 섹션 */}
        <div className="text-center mb-12">
          <div className="flex flex-col items-center mb-8">
            {/* 심볼과 ALMUS TECH 로고를 한 줄로 배치 (순서 변경) */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Image
                src="/images/symbols/symbol BLUE.png"
                alt="ALMUS Symbol"
                width={100}
                height={100}
                className="h-20 w-auto object-contain"
                priority
              />
              <Image
                src="/images/logos/ALMUS TECH BLUE.png"
                alt="ALMUS TECH"
                width={220}
                height={60}
                className="h-11 w-auto object-contain"
                priority
              />
            </div>
            
            {/* 시스템 제목 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              CNC 엔드밀 관리 시스템
            </h1>
            
            {/* 로그인 버튼 */}
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              시스템 접속
            </Link>
          </div>
        </div>

        {/* 시스템 현황 카드 - 그림자 효과 추가 */}
        <div className="bg-white rounded-lg shadow-lg border p-6 w-full max-w-4xl mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">시스템 현황</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CNC 설비 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">800</div>
              <div className="text-sm text-gray-600">CNC 설비</div>
            </div>
            
            {/* 공구 위치 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">16,800</div>
              <div className="text-sm text-gray-600">공구 위치</div>
            </div>
            
            {/* 가동 설비 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">742</div>
              <div className="text-sm text-gray-600">가동 설비</div>
            </div>
          </div>
        </div>

        {/* 하단 저작권 */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2024 ALMUS TECH. All rights reserved.</p>
          <p className="mt-1">CNC Endmill Management System v1.0</p>
        </div>
      </div>
    </div>
  );
} 