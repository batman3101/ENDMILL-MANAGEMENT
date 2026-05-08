'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'
import { useSettings } from './useSettings'

/**
 * 자동 로그아웃 (Idle Timeout) Hook
 *
 * 동작 원리:
 * - settings.system.autoLogout = true 일 때만 활성화
 * - settings.system.sessionTimeout(분) 동안 mouse/keyboard/touch/scroll 입력이 없으면
 *   자동으로 signOut() 후 /login?reason=idle 로 이동
 * - 이벤트는 1초 단위로 throttle 처리해 성능 부담 최소화
 * - 컴포넌트 언마운트 시 이벤트 리스너 및 타이머 자동 정리
 */
export function useIdleTimeout() {
  const router = useRouter()
  const { signOut, isAuthenticated } = useAuth()
  const { settings } = useSettings()

  const autoLogout: boolean = settings?.system?.autoLogout ?? false
  // sessionTimeout 단위: 분. 최솟값 5분, 없으면 60분 기본
  const timeoutMinutes: number = settings?.system?.sessionTimeout ?? 60
  const timeoutMs = timeoutMinutes * 60 * 1000

  // 마지막 활동 시간 추적 (ref — re-render 불필요)
  const lastActivityRef = useRef<number>(Date.now())
  // throttle 용 타임스탬프
  const lastThrottleRef = useRef<number>(0)
  // 체크 인터벌 ref
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 로그아웃 처리
  const handleIdle = useCallback(async () => {
    await signOut()
    router.push('/login?reason=idle')
  }, [signOut, router])

  // 활동 갱신 (1초 throttle)
  const handleActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastThrottleRef.current >= 1000) {
      lastActivityRef.current = now
      lastThrottleRef.current = now
    }
  }, [])

  useEffect(() => {
    // autoLogout 비활성 또는 미인증 상태면 아무것도 하지 않음
    if (!autoLogout || !isAuthenticated) return

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'] as const

    // 이벤트 리스너 등록
    events.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    )

    // 30초마다 idle 여부 체크 (timeoutMs 보다 짧은 주기로 체크)
    const checkInterval = Math.min(30_000, timeoutMs / 2)
    intervalRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current
      if (idleMs >= timeoutMs) {
        handleIdle()
      }
    }, checkInterval)

    return () => {
      // 정리
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      )
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoLogout, isAuthenticated, timeoutMs, handleActivity, handleIdle])
}
