'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { useTranslation } from '../../lib/hooks/useTranslations'
import { useAuth } from '../../lib/hooks/useAuth'
import { usePermissions } from '../../lib/hooks/usePermissions'
import Breadcrumb from '../../components/shared/Breadcrumb'
import { MobileBottomNav } from '../../components/mobile'
import { clientLogger } from '@/lib/utils/logger'
import { FactorySelector } from '@/components/shared/FactorySelector'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)


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

  // 인증 확인 중: 레이아웃 골격 유지 (깜빡임 방지)
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 스켈레톤 */}
        <header className="bg-blue-800 text-white shadow-lg">
          <div className="hidden md:block px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-700 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-5 w-40 bg-blue-700 rounded animate-pulse"></div>
                  <div className="h-3 w-28 bg-blue-700 rounded animate-pulse mt-2"></div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-8 w-32 bg-blue-700 rounded animate-pulse"></div>
                <div className="h-8 w-24 bg-blue-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="md:hidden px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-700 rounded-lg animate-pulse"></div>
                <div className="h-4 w-24 bg-blue-700 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-16 bg-blue-700 rounded animate-pulse"></div>
                <div className="h-6 w-8 bg-blue-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          {/* 네비게이션 스켈레톤 */}
          <nav className="hidden md:block border-t border-blue-700">
            <div className="px-6">
              <div className="flex space-x-1 py-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 w-24 bg-blue-700 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </nav>
        </header>
        {/* 콘텐츠 스켈레톤 */}
        <main className="p-4 md:p-6">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
                <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-3 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
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
      href: '/dashboard/ai-insights',
      icon: '🤖',
      label: t('navigation.aiInsights'),
      description: t('aiInsights.subtitle'),
      active: pathname === '/dashboard/ai-insights' || pathname.startsWith('/dashboard/ai-insights/'),
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
      {/* 상단 네비게이션 바 - 모바일에서 축소 */}
      <header className="bg-blue-800 text-white shadow-lg">
        {/* 모바일 헤더 */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 로고 */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-0.5">
                <Image
                  src="/icons/endmill-sm.webp"
                  alt={t('auth.loginTitle')}
                  width={32}
                  height={32}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">{t('auth.loginTitle')}</h1>
                <p className="text-blue-200 text-xs">{t('dashboard.subtitle')}</p>
              </div>
            </div>

            {/* 모바일 우측 영역 */}
            <div className="flex items-center space-x-2">
              {/* 언어 선택 */}
              <div className="flex space-x-1">
                <button
                  onClick={() => handleLanguageChange('ko')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentLanguage === 'ko'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-700/50 text-blue-200'
                  }`}
                >
                  🇰🇷
                </button>
                <button
                  onClick={() => handleLanguageChange('vi')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentLanguage === 'vi'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-700/50 text-blue-200'
                  }`}
                >
                  🇻🇳
                </button>
              </div>

              {/* 공장 선택 */}
              <FactorySelector compact showLabel={false} />

              {/* 시계 */}
              <div className="bg-blue-700/50 rounded px-2 py-1">
                <p className="text-xs font-bold">{currentTime || '--:--'}</p>
              </div>

              {/* 사용자 메뉴 버튼 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-blue-700"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 모바일 사용자 메뉴 드롭다운 */}
          {mobileMenuOpen && (
            <div className="mt-3 pt-3 border-t border-blue-700 animate-slideInUp">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">{user?.name || t('common.user')}</p>
                  <p className="text-xs text-blue-200">{user?.department || t('common.noDepartment')}</p>
                </div>
                <span className="text-xs bg-blue-700 px-2 py-1 rounded">{user?.shift || 'A'}{t('common.shift')}</span>
              </div>
              <div className="flex space-x-2">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm bg-blue-700 rounded hover:bg-blue-600"
                >
                  {t('common.profile')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 text-center py-2 text-sm bg-red-600 rounded hover:bg-red-500"
                >
                  {t('navigation.logout')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 데스크톱 헤더 */}
        <div className="hidden md:block px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 로고 및 제목 */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
                <Image
                  src="/icons/endmill-sm.webp"
                  alt={t('auth.loginTitle')}
                  width={48}
                  height={48}
                  priority
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

              {/* 공장 선택 */}
              <FactorySelector showLabel={true} />

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

        {/* 네비게이션 메뉴 - 데스크톱에서만 표시 */}
        <nav className="hidden md:block border-t border-blue-700">
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

      {/* 메인 콘텐츠 영역 - 모바일에서 하단 네비게이션 공간 확보 */}
      <main className="p-4 md:p-6 relative pb-20 md:pb-6">
        {/* 브레드크럼 - 데스크톱에서만 표시 */}
        <div className="hidden md:block">
          <Breadcrumb />
        </div>

        {/* 페이지 제목 - 메인 페이지에서만 표시 (상세 페이지 및 AI Insights에서는 숨김) */}
        {!pathname.match(/\/dashboard\/[^\/]+\/[^\/]+/) &&
         !pathname.startsWith('/dashboard/ai-insights') && (
          <div className="mb-4 md:mb-6">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {menuItems.find(item => item.active)?.label || t('navigation.dashboard')}
              </h1>
            </div>
            <p className="text-gray-600 text-xs md:text-sm">
              {menuItems.find(item => item.active)?.description || t('dashboard.subtitle')}
            </p>
          </div>
        )}

        {/* 페이지 콘텐츠 */}
        <div className="bg-gray-50">
          {children}
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <MobileBottomNav />
    </div>
  )
}