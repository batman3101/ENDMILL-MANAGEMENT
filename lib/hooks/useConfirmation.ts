'use client'

import { useState, useCallback } from 'react'
import { ConfirmationConfig, ConfirmationType } from '../../components/shared/ConfirmationModal'

interface UseConfirmationReturn {
  isOpen: boolean
  config: ConfirmationConfig | null
  loading: boolean
  showConfirmation: (config: ConfirmationConfig) => Promise<boolean>
  hideConfirmation: () => void
  handleConfirm: () => void
  handleCancel: () => void
  setLoading: (loading: boolean) => void
}

export const useConfirmation = (): UseConfirmationReturn => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ConfirmationConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const showConfirmation = useCallback((confirmationConfig: ConfirmationConfig): Promise<boolean> => {
    setConfig(confirmationConfig)
    setIsOpen(true)
    setLoading(false)

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
    })
  }, [])

  const hideConfirmation = useCallback(() => {
    setIsOpen(false)
    setConfig(null)
    setLoading(false)
    setResolvePromise(null)
  }, [])

  const handleConfirm = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true)
    }
    hideConfirmation()
  }, [resolvePromise, hideConfirmation])

  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false)
    }
    hideConfirmation()
  }, [resolvePromise, hideConfirmation])

  return {
    isOpen,
    config,
    loading,
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    handleCancel,
    setLoading
  }
}

// 편의 함수 공통 t 타입
type TFunc = (key: string, opts?: Record<string, unknown>) => string

// 편의 함수들
export const createDeleteConfirmation = (itemName: string, t?: TFunc): ConfirmationConfig => ({
  type: 'delete',
  title: t ? t('common.confirmDelete') : '삭제 확인',
  message: t
    ? `"${itemName}"\n\n⚠️ ${t('common.deleteWarning')}`
    : `"${itemName}"을(를) 정말로 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`,
  confirmText: t ? t('common.delete') : '삭제',
  cancelText: t ? t('common.cancel') : '취소',
  isDangerous: true
})

export const createSaveConfirmation = (itemName: string, t?: TFunc): ConfirmationConfig => ({
  type: 'save',
  title: t ? t('common.confirmSave') : '저장 확인',
  message: `"${itemName}"`,
  confirmText: t ? t('common.save') : '저장',
  cancelText: t ? t('common.cancel') : '취소'
})

export const createUpdateConfirmation = (itemName: string, t?: TFunc): ConfirmationConfig => ({
  type: 'update',
  title: t ? t('common.confirmUpdate') : '수정 확인',
  message: `"${itemName}"`,
  confirmText: t ? t('common.edit') : '수정',
  cancelText: t ? t('common.cancel') : '취소'
})

export const createCreateConfirmation = (itemName: string, t?: TFunc): ConfirmationConfig => ({
  type: 'create',
  title: t ? t('common.confirmCreate') : '생성 확인',
  message: `"${itemName}"`,
  confirmText: t ? t('common.create') : '생성',
  cancelText: t ? t('common.cancel') : '취소'
})

export const createCustomConfirmation = (
  type: ConfirmationType,
  title: string,
  message: string,
  confirmText?: string,
  cancelText?: string
): ConfirmationConfig => ({
  type,
  title,
  message,
  confirmText,
  cancelText
})

// 특별한 확인들
export const createStatusChangeConfirmation = (
  equipmentNumber: string,
  currentStatus: string,
  newStatus: string,
  t?: TFunc
): ConfirmationConfig => ({
  type: 'update',
  title: t ? t('common.confirmStatusChange') : '상태 변경 확인',
  message: t
    ? `"${equipmentNumber}"\n\n${currentStatus} → ${newStatus}`
    : `설비 "${equipmentNumber}"의 상태를 변경하시겠습니까?\n\n현재: ${currentStatus}\n변경: ${newStatus}`,
  confirmText: t ? t('common.change') : '변경',
  cancelText: t ? t('common.cancel') : '취소'
})

export const createBulkDeleteConfirmation = (count: number, t?: TFunc): ConfirmationConfig => ({
  type: 'delete',
  title: t ? t('common.confirmBulkDelete') : '일괄 삭제 확인',
  message: t
    ? `${count} ${t('common.deleteWarning')}`
    : `선택된 ${count}개의 항목을 모두 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`,
  confirmText: t ? t('common.deleteAll') : '모두 삭제',
  cancelText: t ? t('common.cancel') : '취소',
  isDangerous: true
}) 