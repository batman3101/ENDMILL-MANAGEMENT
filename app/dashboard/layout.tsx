'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Home,
  Factory,
  Wrench,
  RefreshCw,
  ClipboardList,
  Package,
  Trash2,
  BarChart3,
  Sparkles,
  Users,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '../../lib/hooks/useTranslations'
import { useAuth } from '../../lib/hooks/useAuth'
import { usePermissions } from '../../lib/hooks/usePermissions'
import Breadcrumb from '../../components/shared/Breadcrumb'
import { MobileBottomNav } from '../../components/mobile'
import { clientLogger } from '@/lib/utils/logger'
import { FactorySelector } from '@/components/shared/FactorySelector'
import { LanguageSelector } from '@/components/shared/LanguageSelector'

interface MenuItem {
  href: string
  Icon: LucideIcon
  labelKey: string
  descriptionKey: string
  active: boolean
  requiresPermission: boolean
  adminOnly?: boolean
}

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // 실시간 시계
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('ko-KR'))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLanguageChange = (language: 'ko' | 'vi') => {
    changeLanguage(language)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      clientLogger.error('Logout error:', error)
    }
  }

  // 인증되지 않은 사용자는 로그인 페이지로
  useEffect(() => {
    if (!loading && !user) {
      const currentPath = pathname
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
    }
  }, [user, loading, router, pathname])

  // 라우트 변경 시 모바일 사이드바 자동 닫기
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  // 인증 스켈레톤
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="flex min-h-screen">
          <aside className="hidden lg:flex w-64 bg-ink min-h-screen p-4 flex-col gap-2">
            <div className="h-12 bg-paper/10 rounded-md animate-pulse mb-4" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-paper/10 rounded-sm animate-pulse" />
            ))}
          </aside>
          <div className="flex-1 p-4 md:p-6">
            <div className="h-12 bg-paper-warm rounded-md animate-pulse mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-md border border-divider bg-paper-warm p-6 animate-pulse h-32"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 메뉴 정의 (항목/계층 변경 없음)
  const allMenuItems: MenuItem[] = [
    {
      href: '/dashboard',
      Icon: Home,
      labelKey: 'navigation.dashboard',
      descriptionKey: 'dashboard.subtitle',
      active: pathname === '/dashboard',
      requiresPermission: false,
    },
    {
      href: '/dashboard/equipment',
      Icon: Factory,
      labelKey: 'navigation.equipment',
      descriptionKey: 'equipment.subtitle',
      active: pathname === '/dashboard/equipment',
      requiresPermission: false,
    },
    {
      href: '/dashboard/endmill',
      Icon: Wrench,
      labelKey: 'navigation.endmill',
      descriptionKey: 'endmill.subtitle',
      active: pathname === '/dashboard/endmill',
      requiresPermission: false,
    },
    {
      href: '/dashboard/tool-changes',
      Icon: RefreshCw,
      labelKey: 'navigation.toolChanges',
      descriptionKey: 'toolChanges.subtitle',
      active: pathname === '/dashboard/tool-changes',
      requiresPermission: false,
    },
    {
      href: '/dashboard/cam-sheets',
      Icon: ClipboardList,
      labelKey: 'navigation.camSheets',
      descriptionKey: 'camSheets.subtitle',
      active: pathname === '/dashboard/cam-sheets',
      requiresPermission: false,
    },
    {
      href: '/dashboard/inventory',
      Icon: Package,
      labelKey: 'navigation.inventory',
      descriptionKey: 'inventory.subtitle',
      active:
        pathname === '/dashboard/inventory' ||
        pathname.startsWith('/dashboard/inventory/'),
      requiresPermission: false,
    },
    {
      href: '/dashboard/endmill-disposal',
      Icon: Trash2,
      labelKey: 'navigation.endmillDisposal',
      descriptionKey: 'endmillDisposal.subtitle',
      active: pathname === '/dashboard/endmill-disposal',
      requiresPermission: false,
    },
    {
      href: '/dashboard/reports',
      Icon: BarChart3,
      labelKey: 'navigation.reports',
      descriptionKey: 'reports.subtitle',
      active: pathname === '/dashboard/reports',
      requiresPermission: false,
    },
    {
      href: '/dashboard/ai-insights',
      Icon: Sparkles,
      labelKey: 'navigation.aiInsights',
      descriptionKey: 'aiInsights.subtitle',
      active:
        pathname === '/dashboard/ai-insights' ||
        pathname.startsWith('/dashboard/ai-insights/'),
      requiresPermission: false,
    },
    {
      href: '/dashboard/users',
      Icon: Users,
      labelKey: 'navigation.users',
      descriptionKey: 'users.subtitle',
      active: pathname === '/dashboard/users',
      requiresPermission: true,
      adminOnly: true,
    },
    {
      href: '/dashboard/settings',
      Icon: Settings,
      labelKey: 'navigation.settings',
      descriptionKey: 'settings.subtitle',
      active: pathname === '/dashboard/settings',
      requiresPermission: true,
      adminOnly: true,
    },
  ]

  // 권한 필터링
  const menuItems = allMenuItems.filter(item => {
    if (!item.requiresPermission) return true
    if (item.adminOnly) return isAdmin()
    return canAccessPage(item.href)
  })

  const activeItem = menuItems.find(item => item.active)

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex min-h-screen">
        {/* 모바일 사이드바 오버레이 */}
        {mobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-ink/60"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* === 사이드바 === */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-50 lg:z-auto
            h-screen w-64 flex-shrink-0
            bg-ink text-paper
            flex flex-col
            transition-transform duration-200 ease-out
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          aria-label={t('navigation.dashboard')}
        >
          {/* 로고 영역 */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-paper/10 flex-shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 min-w-0 transition-opacity hover:opacity-90"
            >
              <Image
                src="/icons/endmill-sm.webp"
                alt={t('auth.loginTitle')}
                width={36}
                height={36}
                priority
                className="h-9 w-9 flex-shrink-0 object-contain"
              />
              <span className="text-base font-semibold text-paper truncate no-break">
                CNC ENDMILL MANAGER
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-sm text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 메뉴 리스트 */}
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            <ul className="space-y-0.5">
              {menuItems.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    className={
                      item.active
                        ? 'flex items-center gap-3 min-h-touch px-3 rounded-sm text-label font-medium no-break bg-gauge-cobalt text-paper transition-colors'
                        : 'flex items-center gap-3 min-h-touch px-3 rounded-sm text-label font-medium no-break text-paper/75 transition-colors hover:bg-paper/10 hover:text-paper'
                    }
                  >
                    <item.Icon
                      className="h-5 w-5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 하단 사용자 정보 */}
          <div className="border-t border-paper/10 p-3 flex-shrink-0">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 min-h-touch px-3 rounded-sm text-paper/75 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              <User className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-label font-medium text-paper truncate">
                  {user?.name || t('common.user')}
                </p>
                <p className="text-caption text-paper/60 truncate">
                  {user?.position || t('common.noPosition')}
                </p>
              </div>
            </Link>
          </div>
        </aside>

        {/* === 메인 영역 === */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 메인 헤더 */}
          <header className="sticky top-0 z-30 bg-paper border-b border-divider">
            <div className="flex items-center justify-between gap-3 h-16 px-4 md:px-6">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
                  aria-label={t('common.menu')}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="text-title font-semibold text-ink no-break truncate">
                  {activeItem ? t(activeItem.labelKey) : t('navigation.dashboard')}
                </h1>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                {/* 언어 드롭다운 */}
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  onChange={handleLanguageChange}
                />

                {/* 공장 드롭다운 */}
                <FactorySelector compact showLabel={true} />

                {/* 시계 */}
                <div className="hidden md:flex items-center gap-1.5 rounded-sm border border-divider px-2 h-10">
                  <Clock
                    className="h-3.5 w-3.5 text-ink-mute"
                    aria-hidden="true"
                  />
                  <span className="text-caption font-medium text-ink tabular no-break">
                    {currentTime || '--:--:--'}
                  </span>
                </div>

                {/* 알림 */}
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm hover:text-ink"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </button>

                {/* 사용자 메뉴 */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-expanded={userMenuOpen}
                    className="inline-flex items-center gap-2 h-10 rounded-sm border border-divider px-2 sm:px-3 transition-colors hover:bg-paper-warm"
                  >
                    <div className="hidden sm:block text-right">
                      <p className="text-caption font-medium text-ink truncate max-w-[8rem]">
                        {user?.name || t('common.user')}
                      </p>
                      <p className="text-caption text-ink-soft truncate max-w-[8rem] tabular">
                        {user?.shift || 'A'}
                        {t('common.shift')}
                      </p>
                    </div>
                    <User
                      className="h-5 w-5 text-ink-soft sm:hidden"
                      aria-hidden="true"
                    />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setUserMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 z-40 rounded-md border border-divider bg-paper shadow-hover-lift overflow-hidden">
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 text-base text-ink transition-colors hover:bg-paper-warm"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          {t('common.profile')}
                        </Link>
                        <div className="border-t border-divider" />
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false)
                            handleLogout()
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-base text-signal-stop transition-colors hover:bg-signal-stop-soft"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          {t('navigation.logout')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* 메인 콘텐츠 — 페이지 제목은 헤더(sticky)에 위임, 본문은 즉시 데이터 진입 */}
          <main className="flex-1 p-4 md:p-6 pb-20 lg:pb-6 overflow-x-hidden">
            <div className="hidden md:block">
              <Breadcrumb />
            </div>
            <div>{children}</div>
          </main>
        </div>
      </div>

      {/* 모바일 하단 네비 — 작업자 한 손 우선 (PRODUCT.md) */}
      <MobileBottomNav />
    </div>
  )
}
