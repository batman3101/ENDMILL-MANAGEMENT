'use client'

import { useEffect, useState } from 'react'
import { createContext, useContext, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

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

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 4000
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
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

  const getToastStyles = () => {
    const baseStyles = "flex items-start p-4 rounded-lg shadow-lg border min-w-80 max-w-96 transform transition-all duration-300 ease-in-out"
    
    if (isLeaving) {
      return `${baseStyles} translate-x-full opacity-0`
    }
    
    if (!isVisible) {
      return `${baseStyles} translate-x-full opacity-0`
    }

    const typeStyles = {
      success: "bg-white border-green-200 text-green-800",
      error: "bg-white border-red-200 text-red-800", 
      warning: "bg-white border-yellow-200 text-yellow-800",
      info: "bg-white border-blue-200 text-blue-800"
    }

    return `${baseStyles} translate-x-0 opacity-100 ${typeStyles[toast.type]}`
  }

  const getIcon = () => {
    const iconStyles = "flex-shrink-0 w-5 h-5 mr-3 mt-0.5"
    
    switch (toast.type) {
      case 'success':
        return <div className={`${iconStyles} text-green-500`}>✅</div>
      case 'error':
        return <div className={`${iconStyles} text-red-500`}>❌</div>
      case 'warning':
        return <div className={`${iconStyles} text-yellow-500`}>⚠️</div>
      case 'info':
        return <div className={`${iconStyles} text-blue-500`}>ℹ️</div>
      default:
        return <div className={`${iconStyles} text-gray-500`}>📢</div>
    }
  }

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {toast.title}
        </div>
        {toast.message && (
          <div className="text-sm opacity-90 mt-1">
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span className="sr-only">닫기</span>
        ✕
      </button>
    </div>
  )
} 