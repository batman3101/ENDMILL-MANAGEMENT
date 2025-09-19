'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '../../lib/hooks/useTranslations'

interface BreadcrumbItem {
  label: string
  href: string
  icon?: string
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const { t } = useTranslation()

  // 경로별 메뉴 매핑
  const routeMap: Record<string, BreadcrumbItem[]> = {
    '/dashboard': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' }
    ],
    '/dashboard/equipment': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.equipment'), href: '/dashboard/equipment', icon: '🏭' }
    ],
    '/dashboard/endmill': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.endmill'), href: '/dashboard/endmill', icon: '🔧' }
    ],
    '/dashboard/tool-changes': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.toolChanges'), href: '/dashboard/tool-changes', icon: '🔄' }
    ],
    '/dashboard/cam-sheets': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.camSheets'), href: '/dashboard/cam-sheets', icon: '📋' }
    ],
    '/dashboard/inventory': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.inventory'), href: '/dashboard/inventory', icon: '📦' }
    ],
    '/dashboard/inventory/inbound': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.inventory'), href: '/dashboard/inventory', icon: '📦' },
      { label: '입고 관리', href: '/dashboard/inventory/inbound', icon: '📥' }
    ],
    '/dashboard/inventory/outbound': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.inventory'), href: '/dashboard/inventory', icon: '📦' },
      { label: '출고 관리', href: '/dashboard/inventory/outbound', icon: '📤' }
    ],
    '/dashboard/reports': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.reports'), href: '/dashboard/reports', icon: '📊' }
    ],
    '/dashboard/users': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.users'), href: '/dashboard/users', icon: '👥' }
    ],
    '/dashboard/settings': [
      { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
      { label: t('navigation.settings'), href: '/dashboard/settings', icon: '⚙️' }
    ]
  }

  const breadcrumbItems = routeMap[pathname] || [
    { label: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' }
  ]

  if (breadcrumbItems.length <= 1) {
    return null // 대시보드 홈에서는 브레드크럼 숨김
  }

  return (
    <nav className="mb-4">
      <div className="flex items-center space-x-2 text-sm">
        {breadcrumbItems.map((item, index) => (
          <div key={item.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400">›</span>
            )}
            {index === breadcrumbItems.length - 1 ? (
              // 현재 페이지 (링크 없음)
              <span className="flex items-center space-x-1 text-gray-600 font-medium">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
            ) : (
              // 이전 페이지들 (링크 있음)
              <Link
                href={item.href}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}
      </div>
    </nav>
  )
}