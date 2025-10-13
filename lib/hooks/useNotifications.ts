import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { clientLogger } from '../utils/logger'
import { useRealtime } from './useRealtime'

export interface Notification {
  id: string
  recipient_id: string | null
  type: string
  title: string
  message: string | null
  data: any
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 알림 조회
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/notifications?user_id=${user.id}&limit=50`)
      const data = await response.json()

      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
        setError(null)
      } else {
        setError(data.error || '알림을 불러오는데 실패했습니다.')
      }
    } catch (err) {
      clientLogger.error('알림 조회 오류:', err)
      setError('알림을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notificationId,
          is_read: true
        })
      })

      const data = await response.json()

      if (data.success) {
        // 로컬 상태 업데이트
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      return data
    } catch (err) {
      clientLogger.error('알림 읽음 처리 오류:', err)
      return { success: false, error: '알림 처리 중 오류가 발생했습니다.' }
    }
  }, [])

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)

      if (unreadIds.length === 0) return { success: true }

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: unreadIds,
          is_read: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }

      return data
    } catch (err) {
      clientLogger.error('전체 알림 읽음 처리 오류:', err)
      return { success: false, error: '알림 처리 중 오류가 발생했습니다.' }
    }
  }, [notifications])

  // 알림 삭제
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        const deletedNotification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))

        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }

      return data
    } catch (err) {
      clientLogger.error('알림 삭제 오류:', err)
      return { success: false, error: '알림 삭제 중 오류가 발생했습니다.' }
    }
  }, [notifications])

  // 실시간 알림 구독
  const { isConnected: realtimeConnected } = useRealtime({
    table: 'notifications',
    onInsert: (payload: any) => {
      clientLogger.log('🔔 새 알림:', payload)
      if (payload.new.recipient_id === user?.id) {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      }
    },
    onUpdate: (payload: any) => {
      clientLogger.log('🔔 알림 업데이트:', payload)
      if (payload.new.recipient_id === user?.id) {
        setNotifications(prev =>
          prev.map(n => (n.id === payload.new.id ? payload.new : n))
        )
      }
    },
    onDelete: (payload: any) => {
      clientLogger.log('🔔 알림 삭제:', payload)
      if (payload.old.recipient_id === user?.id) {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        if (!payload.old.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    }
  })

  // 초기 로드
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    realtimeConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications
  }
}
