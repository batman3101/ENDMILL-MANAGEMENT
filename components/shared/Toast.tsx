'use client'

import { useEffect, useState } from 'react'
import { createContext, useContext, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, Megaphone, X } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

let toastCounter = 0

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // settings.ui.notifications: 사용자 설정 (위치 + 표시 시간)
  // duration 단위는 초이므로 ms 변환. 기본값 4초, top-right.
  const { settings } = useSettings()
  const defaultDurationMs = (settings?.ui?.notifications?.duration ?? 4) * 1000
  const position: ToastPosition = settings?.ui?.notifications?.position ?? 'top-right'

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showToast = (toast: Omit<Toast, 'id'>) => {
    toastCounter += 1
    const id = `${Date.now()}-${toastCounter}`
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || defaultDurationMs
    }

    setToasts(prev => [...prev, newToast])

    // 자동으로 토스트 제거
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }

  const showSuccess = (title: string, message?: string) => {
    showToast({ type: 'success', title, message })
  }

  const showError = (title: string, message?: string) => {
    showToast({ type: 'error', title, message })
  }

  const showWarning = (title: string, message?: string) => {
    showToast({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message?: string) => {
    showToast({ type: 'info', title, message })
  }

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} position={position} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
  position: ToastPosition
}

const positionClass: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
}

function ToastContainer({ toasts, onRemove, position }: ToastContainerProps) {
  return (
    <div className={`fixed z-50 space-y-2 ${positionClass[position]}`}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // 입장 애니메이션
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  // 시맨틱 토큰 기반 — 4종 type별로 좌측 border 강조 + 아이콘 색상으로 명확히 구분
  // 배경은 공통 bg-paper-warm 사용, 텍스트는 type별 signal-strong 으로 차별화
  const getToastStyles = () => {
    const baseStyles =
      'flex items-start p-4 rounded-md border-l-4 border border-divider bg-paper-warm min-w-80 max-w-96 transform transition-all duration-300 ease-in-out shadow-hover-lift'

    if (isLeaving || !isVisible) {
      return `${baseStyles} translate-x-full opacity-0`
    }

    const typeStyles: Record<ToastType, string> = {
      success: 'border-l-signal-go-strong text-signal-go-strong',
      error: 'border-l-signal-stop-strong text-signal-stop-strong',
      warning: 'border-l-signal-watch-strong text-signal-watch-strong',
      info: 'border-l-gauge-cobalt-strong text-gauge-cobalt-strong',
    }

    return `${baseStyles} translate-x-0 opacity-100 ${typeStyles[toast.type]}`
  }

  const getIcon = () => {
    const iconWrapper = 'flex-shrink-0 mr-3 mt-0.5'

    switch (toast.type) {
      case 'success':
        return (
          <span className={`${iconWrapper} text-signal-go-strong`}>
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </span>
        )
      case 'error':
        return (
          <span className={`${iconWrapper} text-signal-stop-strong`}>
            <XCircle className="w-5 h-5" aria-hidden="true" />
          </span>
        )
      case 'warning':
        return (
          <span className={`${iconWrapper} text-signal-watch-strong`}>
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </span>
        )
      case 'info':
        return (
          <span className={`${iconWrapper} text-gauge-cobalt-strong`}>
            <Info className="w-5 h-5" aria-hidden="true" />
          </span>
        )
      default:
        return (
          <span className={`${iconWrapper} text-ink-mute`}>
            <Megaphone className="w-5 h-5" aria-hidden="true" />
          </span>
        )
    }
  }

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="text-label font-medium text-ink">
          {toast.title}
        </div>
        {toast.message && (
          <div className="text-caption text-ink-soft mt-1">
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-3 text-ink-mute hover:text-ink-soft transition-colors"
        aria-label="닫기"
      >
        <span className="sr-only">닫기</span>
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
