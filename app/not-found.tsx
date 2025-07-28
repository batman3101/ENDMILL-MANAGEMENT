import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 로고 */}
        <div className="mb-8">
          <Image
            src="/images/logos/ALMUS.png"
            alt="엔드밀 관리 시스템"
            width={120}
            height={120}
            className="mx-auto"
            priority
          />
        </div>

        {/* 404 메시지 */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            홈으로 돌아가기
          </Link>
          
          <Link
            href="/dashboard"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            대시보드로 이동
          </Link>
        </div>

        {/* 추가 도움말 */}
        <div className="mt-8 text-sm text-gray-500">
          <p>문제가 지속되면 시스템 관리자에게 문의하세요.</p>
        </div>
      </div>
    </div>
  )
}