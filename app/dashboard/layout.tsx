'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslation } from '../../lib/hooks/useTranslations'
import { useAuth } from '../../lib/hooks/useAuth'
import { usePermissions } from '../../lib/hooks/usePermissions'
import Breadcrumb from '../../components/shared/Breadcrumb'
import { clientLogger } from '@/lib/utils/logger'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, currentLanguage, changeLanguage } = useTranslation()
  const { user, signOut, loading } = useAuth()
  const { canAccessPage, isAdmin } = usePermissions()
  const [currentTime, setCurrentTime] = useState<string>('')


  // 실시간 시계
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('ko-KR'))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // 언어 변경 핸들러
  const handleLanguageChange = (language: 'ko' | 'vi') => {
    changeLanguage(language)
  }

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      clientLogger.error('Logout error:', error)
    }
  }

  // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트 (현재 경로 유지)
  useEffect(() => {
    if (!loading && !user) {
      const currentPath = pathname
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
    }
  }, [user, loading, router, pathname])

  // 인증 확인 중 로딩 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.verifyingAuth')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const allMenuItems = [
    {
      href: '/dashboard',
      icon: '🏠',
      label: t('navigation.dashboard'),
      description: t('dashboard.subtitle'),
      active: pathname === '/dashboard',
      requiresPermission: false
    },
    {
      href: '/dashboard/equipment',
      icon: '🏭',
      label: t('navigation.equipment'),
      description: t('equipment.subtitle'),
      active: pathname === '/dashboard/equipment',
      requiresPermission: false
    },
    {
      href: '/dashboard/endmill',
      icon: '🔧',
      label: t('navigation.endmill'),
      description: t('endmill.subtitle'),
      active: pathname === '/dashboard/endmill',
      requiresPermission: false
    },
    {
      href: '/dashboard/tool-changes',
      icon: '🔄',
      label: t('navigation.toolChanges'),
      description: t('toolChanges.subtitle'),
      active: pathname === '/dashboard/tool-changes',
      requiresPermission: false
    },
    {
      href: '/dashboard/cam-sheets',
      icon: '📋',
      label: t('navigation.camSheets'),
      description: t('camSheets.subtitle'),
      active: pathname === '/dashboard/cam-sheets',
      requiresPermission: false
    },
    {
      href: '/dashboard/inventory',
      icon: '📦',
      label: t('navigation.inventory'),
      description: t('inventory.subtitle'),
      active: pathname === '/dashboard/inventory' || pathname.startsWith('/dashboard/inventory/'),
      requiresPermission: false
    },
    {
      href: '/dashboard/endmill-disposal',
      icon: '🗑️',
      label: t('navigation.endmillDisposal'),
      description: t('endmillDisposal.subtitle'),
      active: pathname === '/dashboard/endmill-disposal',
      requiresPermission: false
    },
    {
      href: '/dashboard/reports',
      icon: '📊',
      label: t('navigation.reports'),
      description: t('reports.subtitle'),
      active: pathname === '/dashboard/reports',
      requiresPermission: false
    },
    {
      href: '/dashboard/users',
      icon: '👥',
      label: t('navigation.users'),
      description: t('users.subtitle'),
      active: pathname === '/dashboard/users',
      requiresPermission: true,
      adminOnly: true
    },
    {
      href: '/dashboard/settings',
      icon: '⚙️',
      label: t('navigation.settings'),
      description: t('settings.subtitle'),
      active: pathname === '/dashboard/settings',
      requiresPermission: true,
      adminOnly: true
    }
  ]

  // 권한에 따라 메뉴 아이템 필터링
  const menuItems = allMenuItems.filter(item => {
    if (!item.requiresPermission) return true
    if (item.adminOnly) return isAdmin()
    return canAccessPage(item.href)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 바 */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 로고 및 제목 */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
                <Image
                  src="/icons/endmill.png"
                  alt={t('auth.loginTitle')}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t('auth.loginTitle')}</h1>
                <p className="text-blue-200 text-sm">{t('dashboard.subtitle')}</p>
              </div>
            </div>

            {/* 우측 영역 - 언어선택, 시계, 사용자 정보, 알림, 로그아웃 */}
            <div className="flex items-center space-x-6">
              {/* 언어 선택 */}
              <div className="flex space-x-1">
                <button
                  onClick={() => handleLanguageChange('ko')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    currentLanguage === 'ko'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-700 text-blue-200 hover:bg-blue-600'
                  }`}
                >
                  🇰🇷 한국어
                </button>
                <button
                  onClick={() => handleLanguageChange('vi')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    currentLanguage === 'vi'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-700 text-blue-200 hover:bg-blue-600'
                  }`}
                >
                  🇻🇳 Tiếng Việt
                </button>
              </div>

              {/* 실시간 시계 */}
              <div className="bg-blue-700 rounded-lg px-4 py-2 border border-blue-600">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⏰</span>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{currentTime || t('common.loading')}</p>
                    <p className="text-xs text-blue-200">{new Date().toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>

              {/* 사용자 정보 */}
              <div className="relative group">
                <button className="text-right hover:bg-blue-700 rounded-lg p-2 transition-colors">
                  <p className="text-sm text-blue-100">
                    {user?.name || t('common.user')} ({user?.position || t('common.noPosition')})
                  </p>
                  <p className="text-xs text-blue-200">
                    {user?.department || t('common.noDepartment')} · {user?.shift || 'A'}{t('common.shift')}
                  </p>
                </button>

                {/* 드롭다운 메뉴 */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>👤</span>
                    <span>{t('common.profile')}</span>
                  </Link>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <span>🚪</span>
                    <span>{t('navigation.logout')}</span>
                  </button>
                </div>
              </div>

              {/* 알림 */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-blue-100 hover:bg-blue-700 rounded-lg">
                  🔔
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
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-3 whitespace-nowrap transition-all duration-200 ${
                      item.active
                        ? 'bg-blue-600 text-white border-b-2 border-white'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>

                  {/* 툴팁 */}
                  {!item.active && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                      {item.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="p-6 relative">
        {/* 브레드크럼 */}
        <Breadcrumb />

        {/* 페이지 제목 - 메인 페이지에서만 표시 (상세 페이지에서는 숨김) */}
        {!pathname.match(/\/dashboard\/[^\/]+\/[^\/]+/) && (
          <div className="mb-6">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {menuItems.find(item => item.active)?.label || t('navigation.dashboard')}
              </h1>
            </div>
            <p className="text-gray-600 text-sm">
              {menuItems.find(item => item.active)?.description || t('dashboard.subtitle')}
            </p>
          </div>
        )}

        {/* 페이지 콘텐츠 */}
        <div className="bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  )
}