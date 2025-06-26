'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [language, setLanguage] = useState<'ko' | 'vi'>('ko')

  const menuItems = [
    {
      href: '/dashboard',
      icon: '🏠',
      label: '대시보드',
      active: pathname === '/dashboard'
    },
    {
      href: '/dashboard/equipment',
      icon: '🔧',
      label: '앤드밀 관리',
      active: pathname === '/dashboard/equipment'
    },
    {
      href: '/dashboard/inventory',
      icon: '📦',
      label: '재고 관리',
      active: pathname === '/dashboard/inventory'
    },
    {
      href: '/dashboard/qr-scan',
      icon: '📱',
      label: 'QR 스캔',
      active: pathname === '/dashboard/qr-scan'
    },
    {
      href: '/dashboard/reports',
      icon: '📊',
      label: '분석 & 리포트',
      active: pathname === '/dashboard/reports'
    },
    {
      href: '/dashboard/users',
      icon: '👥',
      label: '사용자 관리',
      active: pathname === '/dashboard/users'
    },
    {
      href: '/dashboard/settings',
      icon: '⚙️',
      label: '설정',
      active: pathname === '/dashboard/settings'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <div className="w-64 bg-blue-800 text-white flex flex-col">
        {/* 로고 및 제목 */}
        <div className="p-6 border-b border-blue-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-800 text-lg font-bold">🏭</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">CNC Manager</h1>
              <p className="text-blue-200 text-sm">앤드밀 관리 시스템</p>
            </div>
          </div>
        </div>

        {/* 언어 선택 */}
        <div className="px-4 py-3 border-b border-blue-700">
          <div className="flex space-x-1">
            <button
              onClick={() => setLanguage('ko')}
              className={`px-3 py-1 text-sm rounded ${
                language === 'ko' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-blue-200 hover:bg-blue-700'
              }`}
            >
              한국어
            </button>
            <button
              onClick={() => setLanguage('vi')}
              className={`px-3 py-1 text-sm rounded ${
                language === 'vi' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-blue-200 hover:bg-blue-700'
              }`}
            >
              Tiếng Việt
            </button>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                    item.active
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 상단 헤더 */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {menuItems.find(item => item.active)?.label || '대시보드'}
              </h1>
              <p className="text-gray-600 text-sm">
                실시간 CNC 앤드밀 관리 현황
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">마지막 업데이트: 2025. 6. 26. 오후 6:17:26</p>
                <p className="text-xs text-gray-500">관리자</p>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  🔔
                </button>
                <button className="text-sm text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50">
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
} 