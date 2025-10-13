import { createServerClient } from '../supabase/client'
import { logger } from './logger'

export type NotificationType =
  | 'equipment_status_change'
  | 'inventory_low'
  | 'tool_change_required'
  | 'maintenance_due'
  | 'system_alert'

export interface NotificationData {
  recipient_id?: string | null // null이면 전체 관리자에게
  type: NotificationType
  title: string
  message: string
  data?: any
}

/**
 * 알림 생성 헬퍼 함수
 */
export async function createNotification(notification: NotificationData) {
  try {
    const supabase = createServerClient()

    // recipient_id가 null이면 모든 admin 사용자에게 알림
    if (!notification.recipient_id) {
      const { data: adminProfiles, error: adminError } = await supabase
        .from('user_profiles')
        .select('id, role_id, user_roles(type)')
        .in('user_roles.type', ['system_admin', 'admin'])

      if (adminError) {
        logger.error('관리자 조회 오류:', adminError)
        return { success: false, error: adminError }
      }

      // 각 관리자에게 알림 생성
      const notifications = (adminProfiles || []).map(profile => ({
        recipient_id: profile.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        is_read: false
      }))

      if (notifications.length > 0) {
        const { data, error } = await supabase
          .from('notifications')
          .insert(notifications)
          .select()

        if (error) {
          logger.error('알림 생성 오류:', error)
          return { success: false, error }
        }

        return { success: true, data, count: data?.length || 0 }
      }
    } else {
      // 특정 사용자에게만 알림
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: notification.recipient_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          is_read: false
        })
        .select()
        .single()

      if (error) {
        logger.error('알림 생성 오류:', error)
        return { success: false, error }
      }

      return { success: true, data, count: 1 }
    }
  } catch (error) {
    logger.error('알림 생성 예외:', error)
    return { success: false, error }
  }
}

/**
 * 재고 부족 알림
 */
export async function notifyLowInventory(endmillCode: string, currentStock: number, minStock: number) {
  return createNotification({
    type: 'inventory_low',
    title: '재고 부족 경고',
    message: `${endmillCode} 재고가 부족합니다. (현재: ${currentStock}, 최소: ${minStock})`,
    data: {
      endmill_code: endmillCode,
      current_stock: currentStock,
      min_stock: minStock
    }
  })
}

/**
 * 공구 교체 필요 알림
 */
export async function notifyToolChangeRequired(equipmentNumber: number, tNumber: number, currentLife: number) {
  return createNotification({
    type: 'tool_change_required',
    title: '공구 교체 필요',
    message: `C${String(equipmentNumber).padStart(3, '0')} 설비의 T${tNumber} 공구 교체가 필요합니다. (잔여 수명: ${currentLife}개)`,
    data: {
      equipment_number: equipmentNumber,
      t_number: tNumber,
      current_life: currentLife
    }
  })
}

/**
 * 설비 상태 변경 알림
 */
export async function notifyEquipmentStatusChange(
  equipmentNumber: number,
  oldStatus: string,
  newStatus: string,
  userId?: string
) {
  return createNotification({
    recipient_id: userId,
    type: 'equipment_status_change',
    title: '설비 상태 변경',
    message: `C${String(equipmentNumber).padStart(3, '0')} 설비 상태가 "${oldStatus}"에서 "${newStatus}"(으)로 변경되었습니다.`,
    data: {
      equipment_number: equipmentNumber,
      old_status: oldStatus,
      new_status: newStatus
    }
  })
}

/**
 * 설비 점검 필요 알림
 */
export async function notifyMaintenanceDue(equipmentNumber: number, lastMaintenance: string) {
  return createNotification({
    type: 'maintenance_due',
    title: '설비 점검 필요',
    message: `C${String(equipmentNumber).padStart(3, '0')} 설비의 정기 점검이 필요합니다. (마지막 점검: ${lastMaintenance})`,
    data: {
      equipment_number: equipmentNumber,
      last_maintenance: lastMaintenance
    }
  })
}

/**
 * 시스템 알림
 */
export async function notifySystemAlert(title: string, message: string, data?: any) {
  return createNotification({
    type: 'system_alert',
    title,
    message,
    data
  })
}

/**
 * 읽지 않은 알림 수 조회
 */
export async function getUnreadNotificationCount(userId: string) {
  try {
    const supabase = createServerClient()
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) {
      logger.error('읽지 않은 알림 수 조회 오류:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    logger.error('읽지 않은 알림 수 조회 예외:', error)
    return 0
  }
}
