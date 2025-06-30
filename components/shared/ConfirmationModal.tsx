'use client'

import { ReactNode } from 'react'

export type ConfirmationType = 'delete' | 'save' | 'update' | 'create' | 'cancel' | 'warning'

export interface ConfirmationConfig {
  type: ConfirmationType
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  showIcon?: boolean
}

interface ConfirmationModalProps {
  isOpen: boolean
  config: ConfirmationConfig
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmationModal({
  isOpen,
  config,
  onConfirm,
  onCancel,
  loading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (config.type) {
      case 'delete':
        return {
          iconBg: 'bg-red-100',
          icon: '🗑️',
          iconColor: 'text-red-600',
          confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          confirmText: config.confirmText || '삭제'
        }
      case 'save':
        return {
          iconBg: 'bg-blue-100',
          icon: '💾',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          confirmText: config.confirmText || '저장'
        }
      case 'update':
        return {
          iconBg: 'bg-green-100',
          icon: '✏️',
          iconColor: 'text-green-600',
          confirmBtn: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          confirmText: config.confirmText || '수정'
        }
      case 'create':
        return {
          iconBg: 'bg-purple-100',
          icon: '➕',
          iconColor: 'text-purple-600',
          confirmBtn: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
          confirmText: config.confirmText || '생성'
        }
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          icon: '⚠️',
          iconColor: 'text-yellow-600',
          confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          confirmText: config.confirmText || '확인'
        }
      case 'cancel':
        return {
          iconBg: 'bg-gray-100',
          icon: '❌',
          iconColor: 'text-gray-600',
          confirmBtn: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
          confirmText: config.confirmText || '취소'
        }
      default:
        return {
          iconBg: 'bg-blue-100',
          icon: '❓',
          iconColor: 'text-blue-600',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          confirmText: config.confirmText || '확인'
        }
    }
  }

  const styles = getTypeStyles()

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter' && !loading) {
      onConfirm()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
        {/* 헤더 */}
        <div className="p-6 pb-4">
          <div className="flex items-start">
            {config.showIcon !== false && (
              <div className={`flex-shrink-0 mx-auto w-12 h-12 ${styles.iconBg} rounded-lg flex items-center justify-center mb-4 sm:mx-0 sm:mb-0 sm:mr-4`}>
                <span className="text-2xl">{styles.icon}</span>
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <h3 
                id="confirmation-title"
                className="text-lg font-semibold text-gray-900 mb-2"
              >
                {config.title}
              </h3>
              <div 
                id="confirmation-message"
                className="text-sm text-gray-600 leading-relaxed"
              >
                {config.message}
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {config.cancelText || '취소'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white ${styles.confirmBtn} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                처리 중...
              </>
            ) : (
              styles.confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 