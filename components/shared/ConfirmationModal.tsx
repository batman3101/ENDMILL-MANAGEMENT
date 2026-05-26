'use client'

import { ReactNode } from 'react'
import { Trash2, Save, Pencil, Plus, AlertTriangle, X, HelpCircle } from 'lucide-react'

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

  // 시맨틱 토큰 기반 type별 스타일
  const getTypeStyles = () => {
    switch (config.type) {
      case 'delete':
        return {
          iconBg: 'bg-signal-stop-soft',
          iconColor: 'text-signal-stop-strong',
          IconComponent: Trash2,
          confirmBtn:
            'bg-signal-stop-strong hover:opacity-90 text-paper focus:ring-signal-stop-strong',
          confirmText: config.confirmText || '삭제'
        }
      case 'save':
        return {
          iconBg: 'bg-gauge-cobalt-soft',
          iconColor: 'text-gauge-cobalt-strong',
          IconComponent: Save,
          confirmBtn:
            'bg-gauge-cobalt hover:bg-gauge-cobalt-strong text-paper focus:ring-gauge-cobalt-strong',
          confirmText: config.confirmText || '저장'
        }
      case 'update':
        return {
          iconBg: 'bg-signal-go-soft',
          iconColor: 'text-signal-go-strong',
          IconComponent: Pencil,
          confirmBtn:
            'bg-signal-go-strong hover:opacity-90 text-paper focus:ring-signal-go-strong',
          confirmText: config.confirmText || '수정'
        }
      case 'create':
        return {
          iconBg: 'bg-gauge-cobalt-soft',
          iconColor: 'text-gauge-cobalt-strong',
          IconComponent: Plus,
          confirmBtn:
            'bg-gauge-cobalt hover:bg-gauge-cobalt-strong text-paper focus:ring-gauge-cobalt-strong',
          confirmText: config.confirmText || '생성'
        }
      case 'warning':
        return {
          iconBg: 'bg-signal-watch-soft',
          iconColor: 'text-signal-watch-strong',
          IconComponent: AlertTriangle,
          confirmBtn:
            'bg-signal-watch-strong hover:opacity-90 text-paper focus:ring-signal-watch-strong',
          confirmText: config.confirmText || '확인'
        }
      case 'cancel':
        return {
          iconBg: 'bg-paper-warm',
          iconColor: 'text-ink-mute',
          IconComponent: X,
          confirmBtn:
            'bg-ink-soft hover:opacity-90 text-paper focus:ring-ink-soft',
          confirmText: config.confirmText || '취소'
        }
      default:
        return {
          iconBg: 'bg-gauge-cobalt-soft',
          iconColor: 'text-gauge-cobalt-strong',
          IconComponent: HelpCircle,
          confirmBtn:
            'bg-gauge-cobalt hover:bg-gauge-cobalt-strong text-paper focus:ring-gauge-cobalt-strong',
          confirmText: config.confirmText || '확인'
        }
    }
  }

  const styles = getTypeStyles()
  const Icon = styles.IconComponent

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
      className="fixed inset-0 bg-ink/50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
    >
      <div className="bg-paper rounded-md border border-divider shadow-hover-lift max-w-md w-full transform transition-all">
        {/* 헤더 */}
        <div className="p-6 pb-4">
          <div className="flex items-start">
            {config.showIcon !== false && (
              <div className={`flex-shrink-0 mx-auto w-12 h-12 ${styles.iconBg} rounded-md flex items-center justify-center mb-4 sm:mx-0 sm:mb-0 sm:mr-4`}>
                <Icon className={`w-6 h-6 ${styles.iconColor}`} aria-hidden="true" />
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <h3
                id="confirmation-title"
                className="text-title font-semibold text-ink mb-2"
              >
                {config.title}
              </h3>
              <div
                id="confirmation-message"
                className="text-label text-ink-soft leading-relaxed"
              >
                {config.message}
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="px-6 py-4 bg-paper-warm rounded-b-md flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-paper border border-divider rounded-md text-label font-medium text-ink hover:bg-paper-warm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-divider disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-touch"
          >
            {config.cancelText || '취소'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto px-4 py-2 border border-transparent rounded-md text-label font-medium ${styles.confirmBtn} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-touch`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-paper" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
