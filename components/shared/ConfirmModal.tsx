'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmModalProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// 앱 공용 확인 모달 — 브라우저 기본 confirm() 대신 사용 (Toast/모달과 동일 스타일)
export default function ConfirmModal({
  open, title, message, confirmLabel, cancelLabel,
  variant = 'primary', loading = false, onConfirm, onCancel
}: ConfirmModalProps) {
  const { t } = useTranslation()
  if (!open) return null

  const confirmClass = variant === 'danger'
    ? 'bg-danger hover:bg-danger/90'
    : 'bg-primary hover:bg-primary-700'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-md border border-divider bg-paper-warm p-6 shadow-lg"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold">{title}</h2>
        {message && <p className="mt-2 break-words text-sm text-secondary-600">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-touch rounded border px-4 disabled:opacity-40"
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-touch rounded px-4 font-medium text-white disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? t('common.saving') : (confirmLabel ?? t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  )
}
