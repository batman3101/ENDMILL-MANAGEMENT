'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import DevMockDataManager from '../../components/dev/MockDataManager'
// import { useTranslations } from '../../lib/hooks/useTranslations'
import { useAuth } from '../../lib/hooks/useAuth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  // const { currentLanguage, changeLanguage, t } = useTranslations()
  const { user, signOut, loading } = useAuth()

  // 임시로 하드코딩된 번역 함수
  const t = (namespace: string, key: string) => {
    const translations: Record<string, Record<string, string>> = {
      auth: {
        loginTitle: 'CNC 앤드밀 관리 시스템'
      },
      navigation: {
        dashboard: '대시보드',
        equipment: '설비 관리',
        endmill: '앤드밀 관리',
        toolChanges: '교체 실적',
        camSheets: 'CAM SHEET 관리',
        inventory: '재고 관리',
        reports: '분석 & 리포트',
        users: '사용자 관리',
        settings: '설정'
      },
      dashboard: {
        subtitle: '실시간 CNC 앤드밀 관리 현황'
      },
      equipment: {
        subtitle: '지시한 보기'
      },
      endmill: {
        subtitle: '지시한 보기'
      },
      toolChanges: {
        subtitle: '지시한 보기'
      },
      camSheets: {
        subtitle: '지시한 보기'
      },
      inventory: {
        subtitle: '지시한 보기'
      },
      reports: {
        subtitle: '지시한 보기'
      },
      users: {
        subtitle: '지시한 보기'
      },
      settings: {
        subtitle: '지시한 보기'
      }
    }
    return translations[namespace]?.[key] || key
  }

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  // 인증 확인 중 로딩 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    router.push('/login')
    return null
  }

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
              {/* 언어 선택 (임시 비활성화) */}
              <div className="flex space-x-1">
                <button
                  className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
                >
                  🇰🇷 한국어
                </button>
              </div>

              {/* 사용자 정보 */}
              <div className="text-right">
                <p className="text-sm text-blue-100">
                  {user?.name || '사용자'} ({user?.position || '직위 없음'})
                </p>
                <p className="text-xs text-blue-200">
                  {user?.department || '부서 없음'} · {user?.shift || 'A'}교대
                </p>
              </div>

              {/* 알림 및 로그아웃 */}
              <div className="flex items-center space-x-2">
                <button className="p-2 text-blue-100 hover:bg-blue-700 rounded-lg">
                  🔔
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-sm text-blue-100 hover:text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                >
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