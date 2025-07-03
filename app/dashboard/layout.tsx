'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import DevMockDataManager from '../../components/dev/MockDataManager'
import { useTranslations } from '../../lib/hooks/useTranslations'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { currentLanguage, changeLanguage, t } = useTranslations()

  const menuItems = [
    {
      href: '/dashboard',
      icon: '🏠',
      label: t('navigation', 'dashboard'),
      description: t('dashboard', 'subtitle'),
      active: pathname === '/dashboard'
    },
    {
      href: '/dashboard/equipment',
      icon: '🏭',
      label: t('navigation', 'equipment'),
      description: t('equipment', 'subtitle'),
      active: pathname === '/dashboard/equipment'
    },
    {
      href: '/dashboard/endmill',
      icon: '🔧',
      label: t('navigation', 'endmill'),
      description: t('endmill', 'subtitle'),
      active: pathname === '/dashboard/endmill'
    },
    {
      href: '/dashboard/tool-changes',
      icon: '🔄',
      label: t('navigation', 'toolChanges'),
      description: t('toolChanges', 'subtitle'),
      active: pathname === '/dashboard/tool-changes'
    },
    {
      href: '/dashboard/cam-sheets',
      icon: '📋',
      label: t('navigation', 'camSheets'),
      description: t('camSheets', 'subtitle'),
      active: pathname === '/dashboard/cam-sheets'
    },
    {
      href: '/dashboard/inventory',
      icon: '📦',
      label: t('navigation', 'inventory'),
      description: t('inventory', 'subtitle'),
      active: pathname === '/dashboard/inventory' || pathname.startsWith('/dashboard/inventory/')
    },
    {
      href: '/dashboard/reports',
      icon: '📊',
      label: t('navigation', 'reports'),
      description: t('reports', 'subtitle'),
      active: pathname === '/dashboard/reports'
    },
    {
      href: '/dashboard/users',
      icon: '👥',
      label: t('navigation', 'users'),
      description: t('users', 'subtitle'),
      active: pathname === '/dashboard/users'
    },
    {
      href: '/dashboard/settings',
      icon: '⚙️',
      label: t('navigation', 'settings'),
      description: t('settings', 'subtitle'),
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
                <h1 className="text-xl font-bold">{t('auth', 'loginTitle')}</h1>
                <p className="text-blue-200 text-sm">{t('dashboard', 'subtitle')}</p>
              </div>
            </div>

            {/* 우측 영역 - 언어선택, 알림, 로그아웃 */}
            <div className="flex items-center space-x-6">
              {/* 언어 선택 */}
              <div className="flex space-x-1">
                <button
                  onClick={() => changeLanguage('ko')}
                  className={`px-3 py-1 text-sm rounded ${
                    currentLanguage === 'ko' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-blue-200 hover:bg-blue-700'
                  }`}
                >
                  🇰🇷 한국어
                </button>
                <button
                  onClick={() => changeLanguage('vi')}
                  className={`px-3 py-1 text-sm rounded ${
                    currentLanguage === 'vi' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-blue-200 hover:bg-blue-700'
                  }`}
                >
                  🇻🇳 Tiếng Việt
                </button>
              </div>

              {/* 사용자 정보 */}
              <div className="text-right">
                <p className="text-sm text-blue-100">{t('common', 'lastUpdate')}: 2025. 6. 26. 오후 6:17:26</p>
                <p className="text-xs text-blue-200">{t('common', 'admin')}</p>
              </div>

              {/* 알림 및 로그아웃 */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-blue-100 hover:bg-blue-700 rounded-lg">
                  🔔
                </button>
                <button className="text-sm text-blue-100 hover:text-white px-3 py-1 rounded-lg hover:bg-blue-700">
                  {t('auth', 'logout')}
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
            {menuItems.find(item => item.active)?.label || t('navigation', 'dashboard')}
          </h1>
          <p className="text-gray-600 text-sm">
            {menuItems.find(item => item.active)?.description || t('dashboard', 'subtitle')}
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