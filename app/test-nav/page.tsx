'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function TestNavPage() {
  const router = useRouter()
  const pathname = usePathname()

  console.log('🧪 테스트 페이지 로드됨, pathname:', pathname)

  const handleButtonClick = () => {
    console.log('🔥 버튼 클릭! 프로그램적 네비게이션 시도...')
    router.push('/dashboard')
  }

  const handleLinkClick = () => {
    console.log('🔗 Link 클릭!')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">🧪 네비게이션 테스트 페이지</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded">
            <p><strong>현재 경로:</strong> {pathname}</p>
            <p><strong>시간:</strong> {new Date().toLocaleTimeString()}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Link 컴포넌트 테스트</h2>
            <Link 
              href="/dashboard" 
              onClick={handleLinkClick}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              대시보드로 이동 (Link)
            </Link>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">router.push 테스트</h2>
            <button 
              onClick={handleButtonClick}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              대시보드로 이동 (router.push)
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">기타 페이지 링크</h2>
            <div className="space-x-2">
              <Link href="/dashboard/equipment" className="inline-block px-3 py-1 bg-gray-600 text-white rounded text-sm">
                설비 관리
              </Link>
              <Link href="/dashboard/inventory" className="inline-block px-3 py-1 bg-gray-600 text-white rounded text-sm">
                재고 관리
              </Link>
              <Link href="/dashboard/settings" className="inline-block px-3 py-1 bg-gray-600 text-white rounded text-sm">
                설정
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">일반 링크 테스트</h2>
            <a 
              href="/dashboard" 
              className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              대시보드로 이동 (일반 a 태그)
            </a>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded">
            <p className="text-sm text-gray-700">
              브라우저 콘솔을 열고 각 버튼/링크를 클릭하여 로그 메시지와 페이지 이동을 확인하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 