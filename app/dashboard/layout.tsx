'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import DevMockDataManager from '../../components/dev/MockDataManager'

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
      description: '실시간 CNC 앤드밀 관리 현황',
      active: pathname === '/dashboard'
    },
    {
      href: '/dashboard/equipment',
      icon: '🏭',
      label: '설비 관리',
      description: '800대 CNC 설비 현황 및 관리',
      active: pathname === '/dashboard/equipment'
    },
    {
      href: '/dashboard/endmill',
      icon: '🔧',
      label: '앤드밀 관리',
      description: '앤드밀별 Tool Life 추적 및 교체 알림 관리',
      active: pathname === '/dashboard/endmill'
    },
    {
      href: '/dashboard/tool-changes',
      icon: '🔄',
      label: '교체 실적',
      description: '앤드밀 교체 이력 및 실적 관리',
      active: pathname === '/dashboard/tool-changes'
    },
    {
      href: '/dashboard/cam-sheets',
      icon: '📋',
      label: 'CAM SHEET 관리',
      description: 'CAM 버전별 앤드밀 정보 및 Tool Life 설정',
      active: pathname === '/dashboard/cam-sheets'
    },
    {
      href: '/dashboard/inventory',
      icon: '📦',
      label: '재고 관리',
      description: 'QR 스캔 기반 앤드밀 입고/출고 및 재고 현황',
      active: pathname === '/dashboard/inventory' || pathname.startsWith('/dashboard/inventory/')
    },
    {
      href: '/dashboard/reports',
      icon: '📊',
      label: '분석 & 리포트',
      description: '생산성 분석 및 통계 리포트',
      active: pathname === '/dashboard/reports'
    },
    {
      href: '/dashboard/users',
      icon: '👥',
      label: '사용자 관리',
      description: '시스템 사용자 및 권한 관리',
      active: pathname === '/dashboard/users'
    },
    {
      href: '/dashboard/settings',
      icon: '⚙️',
      label: '설정',
      description: '시스템 환경 설정 및 구성',
      active: pathname === '/dashboard/settings'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 바 */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 로고 및 제목 */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-800 text-lg font-bold">🏭</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">CNC 앤드밀 관리 시스템</h1>
                <p className="text-blue-200 text-sm">실시간 모니터링 및 관리</p>
              </div>
            </div>

            {/* 우측 영역 - 언어선택, 알림, 로그아웃 */}
            <div className="flex items-center space-x-6">
              {/* 언어 선택 */}
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

              {/* 사용자 정보 */}
              <div className="text-right">
                <p className="text-sm text-blue-100">마지막 업데이트: 2025. 6. 26. 오후 6:17:26</p>
                <p className="text-xs text-blue-200">관리자</p>
              </div>

              {/* 알림 및 로그아웃 */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-blue-100 hover:bg-blue-700 rounded-lg">
                  🔔
                </button>
                <button className="text-sm text-blue-100 hover:text-white px-3 py-1 rounded-lg hover:bg-blue-700">
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="border-t border-blue-700">
          <div className="px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-3 whitespace-nowrap transition-colors ${
                    item.active
                      ? 'bg-blue-600 text-white border-b-2 border-white'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="p-6">
        {/* 페이지 제목 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {menuItems.find(item => item.active)?.label || '대시보드'}
          </h1>
          <p className="text-gray-600 text-sm">
            {menuItems.find(item => item.active)?.description || '실시간 CNC 앤드밀 관리 현황'}
          </p>
        </div>

        {/* 페이지 콘텐츠 */}
        <div className="bg-gray-50">
          {children}
        </div>
      </main>

      {/* 개발자 도구 */}
      <DevMockDataManager />
    </div>
  )
} 