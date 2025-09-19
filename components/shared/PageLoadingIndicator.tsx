'use client'

interface PageLoadingIndicatorProps {
  message?: string
  subMessage?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function PageLoadingIndicator({
  message = "데이터를 불러오는 중...",
  subMessage = "잠시만 기다려주세요",
  size = 'md'
}: PageLoadingIndicatorProps) {
  const sizeClasses = {
    sm: {
      spinner: 'w-8 h-8',
      title: 'text-base',
      subtitle: 'text-xs'
    },
    md: {
      spinner: 'w-12 h-12',
      title: 'text-lg',
      subtitle: 'text-sm'
    },
    lg: {
      spinner: 'w-16 h-16',
      title: 'text-xl',
      subtitle: 'text-base'
    }
  }

  const classes = sizeClasses[size]

  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className={`${classes.spinner} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4`}></div>
        <p className={`text-gray-600 font-medium ${classes.title}`}>{message}</p>
        <p className={`text-gray-500 mt-1 ${classes.subtitle}`}>{subMessage}</p>
      </div>
    </div>
  )
}

// 네비게이션 로딩 오버레이 컴포넌트
interface NavigationLoadingOverlayProps {
  isVisible: boolean
  targetPageName?: string
}

export function NavigationLoadingOverlay({
  isVisible,
  targetPageName = '새 페이지'
}: NavigationLoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="absolute inset-0 animate-backdropBlur flex items-center justify-center z-10">
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 text-center animate-fadeInScale">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">페이지 로딩 중</h3>
        <p className="text-gray-600 text-sm">
          {targetPageName}로 이동하고 있습니다...
        </p>
        <div className="mt-4 flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}

// 스켈레톤 카드 컴포넌트
interface SkeletonCardProps {
  className?: string
  children?: React.ReactNode
}

export function SkeletonCard({ className = '', children }: SkeletonCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border animate-pulse ${className}`}>
      {children || (
        <div className="p-4">
          <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded mb-3 w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      )}
    </div>
  )
}

// 스켈레톤 테이블 로우 컴포넌트
export function SkeletonTableRow({ columns = 7 }: { columns?: number }) {
  return (
    <div className="flex items-center space-x-4 py-3 border-b border-gray-100 animate-pulse">
      {[...Array(columns)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
      ))}
    </div>
  )
}