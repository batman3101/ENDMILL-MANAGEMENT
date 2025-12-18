'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Factory,
  Wrench,
  Package,
  BarChart3,
  MoreHorizontal,
  X,
  RefreshCw,
  ClipboardList,
  Trash2,
  Bot,
  Users,
  Settings,
  User
} from 'lucide-react';
import { useTranslation } from '../../lib/hooks/useTranslations';
import { usePermissions } from '../../lib/hooks/usePermissions';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAdmin } = usePermissions();
  const [showMore, setShowMore] = useState(false);

  // 주요 메뉴 (하단 바에 항상 표시)
  const mainItems: NavItem[] = [
    {
      href: '/dashboard',
      icon: <Home className="w-5 h-5" />,
      label: t('navigation.dashboard'),
    },
    {
      href: '/dashboard/equipment',
      icon: <Factory className="w-5 h-5" />,
      label: t('navigation.equipment'),
    },
    {
      href: '/dashboard/tool-changes',
      icon: <RefreshCw className="w-5 h-5" />,
      label: t('navigation.toolChanges'),
    },
    {
      href: '/dashboard/inventory',
      icon: <Package className="w-5 h-5" />,
      label: t('navigation.inventory'),
    },
  ];

  // 추가 메뉴 ("더보기"에서 표시)
  const moreItems: NavItem[] = [
    {
      href: '/dashboard/endmill',
      icon: <Wrench className="w-5 h-5" />,
      label: t('navigation.endmill'),
    },
    {
      href: '/dashboard/cam-sheets',
      icon: <ClipboardList className="w-5 h-5" />,
      label: t('navigation.camSheets'),
    },
    {
      href: '/dashboard/endmill-disposal',
      icon: <Trash2 className="w-5 h-5" />,
      label: t('navigation.endmillDisposal'),
    },
    {
      href: '/dashboard/reports',
      icon: <BarChart3 className="w-5 h-5" />,
      label: t('navigation.reports'),
    },
    {
      href: '/dashboard/ai-insights',
      icon: <Bot className="w-5 h-5" />,
      label: t('navigation.aiInsights'),
    },
    {
      href: '/dashboard/profile',
      icon: <User className="w-5 h-5" />,
      label: t('common.profile'),
    },
    {
      href: '/dashboard/users',
      icon: <Users className="w-5 h-5" />,
      label: t('navigation.users'),
      adminOnly: true,
    },
    {
      href: '/dashboard/settings',
      icon: <Settings className="w-5 h-5" />,
      label: t('navigation.settings'),
      adminOnly: true,
    },
  ];

  // 권한에 따라 필터링
  const filteredMoreItems = moreItems.filter(item => {
    if (item.adminOnly) return isAdmin();
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const isMoreActive = filteredMoreItems.some(item => isActive(item.href));

  return (
    <>
      {/* 더보기 메뉴 오버레이 */}
      {showMore && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />

          {/* 메뉴 패널 - 하단 네비게이션 위에 표시, 스크롤 가능 */}
          <div className="absolute bottom-16 left-0 right-0 max-h-[70vh] bg-white rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up">
            {/* 헤더 - 고정 */}
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{t('common.menu')}</h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 메뉴 그리드 - 스크롤 가능 */}
            <div className="overflow-y-auto max-h-[calc(70vh-60px)] p-4 pb-safe">
              <div className="grid grid-cols-4 gap-3">
                {filteredMoreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-600'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.icon}
                    <span className="text-xs mt-1.5 text-center line-clamp-2">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 바 */}
      <nav className="mobile-bottom-nav bg-white border-t border-gray-200 z-50 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mainItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.href)
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          ))}

          {/* 더보기 버튼 */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              showMore || isMoreActive
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">{t('common.more')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
