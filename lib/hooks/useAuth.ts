'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase/client'
import { useToast } from '../../components/shared/Toast'
import type { Session } from '@supabase/supabase-js'
import { clientLogger } from '../utils/logger'
import { mergePermissionMatrices, hasPermission as checkPermission, parsePermissionsFromDB, type Permission } from '../auth/permissions'

// 사용자 타입 정의
interface User {
  id: string
  email: string
  name?: string
  department?: string
  position?: string
  shift?: string
  role?: string
  language?: string
  permissions?: Record<string, string[]> // 사용자 개별 권한 매트릭스
}

// Auth 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
  sessionExpiresAt: Date | null
  isSessionExpiring: boolean
  hasPermission: (resource: string, action: Permission['action']) => boolean
}

// Auth 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// user_profiles 조회 결과 (직접 쿼리/서버 API 공통 형태)
interface ProfileData {
  name?: string | null
  department?: string | null
  position?: string | null
  shift?: string | null
  permissions?: Record<string, string[]> | null
  user_roles?: { name?: string; type?: string; permissions?: Record<string, string[]> } | null
}

// 프로필 조회: 서버(/api/auth/me, 쿠키 세션) 우선.
// 전체 새로고침 시 클라이언트 토큰 복원 레이스로 직접 쿼리가 anon 컨텍스트로 나가
// user_profiles RLS에 걸려 0행이 되는 문제를 회피한다(서버는 항상 authenticated).
// 서버 조회 실패(쿠키 desync 등) 시 기존 직접 쿼리로 폴백해 현행 동작을 보존한다.
async function fetchUserProfileData(userId: string): Promise<ProfileData | null> {
  try {
    const res = await fetch('/api/auth/me')
    if (res.ok) {
      const json = await res.json()
      if (json.success && json.profile) return json.profile as ProfileData
    }
  } catch (error) {
    clientLogger.error('서버 프로필 조회 실패, 직접 조회로 폴백:', error)
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, name, department, position, shift, phone, permissions, user_roles(name, type, permissions)')
    .eq('user_id', userId)
    .single()
  if (error) {
    clientLogger.error('사용자 정보 조회 오류:', error)
    return null
  }
  return data as unknown as ProfileData
}

// Auth Provider 컴포넌트
export function AuthProvider(props: { children: ReactNode }) {
  const { children } = props
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [isSessionExpiring, setIsSessionExpiring] = useState(false)
  const [lastActivity, setLastActivity] = useState<Date>(new Date())
  const { showSuccess, showError, showWarning } = useToast()

  // 세션 새로고침 함수 (useCallback으로 메모이제이션)
  const refreshSession = React.useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        clientLogger.error('세션 새로고침 오류:', error)
      } else if (data.session) {
        setSession(data.session)
      }
    } catch (error) {
      clientLogger.error('세션 새로고침 오류:', error)
    }
  }, [])

  // 로그아웃 함수 (useCallback으로 메모이제이션)
  const signOut = React.useCallback(async (): Promise<void> => {
    try {
      setLoading(true)

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })

      let result: { success?: boolean; error?: string } | null = null
      try {
        result = await response.json()
      } catch (_error) {
        result = null
      }

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || '서버 로그아웃에 실패했습니다.')
      }

      const { error } = await supabase.auth.signOut({ scope: 'local' })

      if (error) {
        clientLogger.error('Supabase 로컬 세션 정리 오류:', error)
      }

      setUser(null)
      setSession(null)
      showSuccess('로그아웃 완료', '안전하게 로그아웃되었습니다.')
    } catch (error) {
      clientLogger.error('로그아웃 오류:', error)
      showError('로그아웃 실패', '로그아웃 중 오류가 발생했습니다.')
      throw error
    } finally {
       setLoading(false)
     }
   }, [showSuccess, showError])

  // 세션 만료 처리 함수 (useCallback으로 메모이제이션)
  const handleSessionExpired = React.useCallback(async () => {
    showError('세션 만료', '세션이 만료되어 로그아웃됩니다.')
    await signOut()
    window.location.href = '/login?expired=true'
  }, [showError, signOut])

  // 세션 만료 확인 및 자동 갱신
  useEffect(() => {
    if (!session?.expires_at) return
    
    const checkSessionExpiry = () => {
      const expiresAt = new Date((session.expires_at ?? 0) * 1000)
      const now = new Date()
      const timeUntilExpiry = expiresAt.getTime() - now.getTime()
      const fiveMinutes = 5 * 60 * 1000 // 5분
      
      setSessionExpiresAt(expiresAt)
      
      // 5분 전에 경고 표시
      if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0) {
        if (!isSessionExpiring) {
          setIsSessionExpiring(true)
          showWarning('세션 만료 경고', '세션이 곧 만료됩니다. 계속 사용하시겠습니까?')
        }
      } else {
        setIsSessionExpiring(false)
      }
      
      // 자동 토큰 갱신 (만료 10분 전)
      if (timeUntilExpiry <= 10 * 60 * 1000 && timeUntilExpiry > 0) {
        refreshSession()
      }
      
      // 세션 만료 시 자동 로그아웃
      if (timeUntilExpiry <= 0) {
        handleSessionExpired()
      }
    }
    
    const interval = setInterval(checkSessionExpiry, 5 * 60 * 1000) // 5분마다 확인
    checkSessionExpiry() // 즉시 확인
    
    return () => clearInterval(interval)
  }, [session?.expires_at, isSessionExpiring, refreshSession, handleSessionExpired, showWarning])
  
  // 사용자 활동 감지
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(new Date())
    }
    
    const events = ['mousedown', 'keypress', 'touchstart'] as const

    events.forEach(event => {
      document.addEventListener(event, updateActivity)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [])
  
  // 비활성 상태에서 세션 연장
  useEffect(() => {
    if (!session) return
    
    const extendSession = () => {
      const now = new Date()
      const timeSinceActivity = now.getTime() - lastActivity.getTime()
      const thirtyMinutes = 30 * 60 * 1000 // 30분
      
      // 30분 이내 활동이 있었고 세션이 있으면 연장
      if (timeSinceActivity < thirtyMinutes) {
        refreshSession()
      }
    }
    
    const interval = setInterval(extendSession, 15 * 60 * 1000) // 15분마다 확인
    
    return () => clearInterval(interval)
  }, [lastActivity, session, refreshSession])
  
  // 중복 함수 제거 (이미 위에서 useCallback으로 정의됨)

  useEffect(() => {
    let mounted = true

    // 초기 세션 상태 확인
    const checkSession = async () => {
      try {
        clientLogger.log('🔍 Supabase 세션 확인 시작...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          clientLogger.error('세션 확인 오류:', error)
          setUser(null)
          setSession(null)
        } else if (session?.user) {
          clientLogger.log('✅ Supabase 세션 발견:', session.user.email)
          setSession(session)

          // 사용자 프로필 조회 (서버 우선 + 직접 쿼리 폴백 — RLS/토큰 레이스 안전)
          const userData = await fetchUserProfileData(session.user.id)

          const userProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: userData?.name || session.user.user_metadata?.name || '',
            department: userData?.department || session.user.user_metadata?.department || '',
            position: userData?.position || session.user.user_metadata?.position || '',
            shift: userData?.shift || session.user.user_metadata?.shift || '',
            role: (userData?.user_roles as any)?.type || session.user.user_metadata?.role || 'user',
            language: session.user.user_metadata?.language || 'ko',
            // 역할 권한 + 사용자 개별 권한 병합 (사용자 권한이 역할 권한보다 우선)
            permissions: mergePermissionMatrices((userData?.permissions || {}) as Record<string, string[]>, ((userData?.user_roles as any)?.permissions || {}) as Record<string, string[]>)
          }
          setUser(userProfile)
        } else {
          clientLogger.log('❌ 세션 없음')
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        clientLogger.error('세션 확인 오류:', error)
        if (mounted) {
          setUser(null)
          setSession(null)
        }
      } finally {
        if (mounted) {
          clientLogger.log('✅ 세션 확인 완료, loading 해제')
          setLoading(false)
        }
      }
    }

    checkSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clientLogger.log('🔄 Auth state changed:', event, session?.user?.email)
        
        if (!mounted) return
        
        if (event === 'SIGNED_IN' && session) {
          setSession(session)

          // SIGNED_IN 이벤트에서도 프로필 조회 (서버 우선 + 직접 쿼리 폴백)
          const userData = await fetchUserProfileData(session.user.id)

          const userProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: userData?.name || session.user.user_metadata?.name || '',
            department: userData?.department || session.user.user_metadata?.department || '',
            position: userData?.position || session.user.user_metadata?.position || '',
            shift: userData?.shift || session.user.user_metadata?.shift || '',
            role: (userData?.user_roles as any)?.type || session.user.user_metadata?.role || 'user',
            language: session.user.user_metadata?.language || 'ko',
            // 역할 권한 + 사용자 개별 권한 병합 (사용자 권한이 역할 권한보다 우선)
            permissions: mergePermissionMatrices((userData?.permissions || {}) as Record<string, string[]>, ((userData?.user_roles as any)?.permissions || {}) as Record<string, string[]>)
          }
          setUser(userProfile)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session)
          setIsSessionExpiring(false) // 토큰 갱신 시 만료 경고 해제
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // 중복 함수 제거 (이미 위에서 useCallback으로 정의됨)

  // 로그인 함수 (useCallback으로 메모이제이션)
  const signIn = React.useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // API 라우트를 통한 로그인 시도
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (result.success && result.user) {
        setUser(result.user)
        // 서버 로그인 API가 설정한 쿠키 세션과 클라이언트(localStorage) 세션을 동기화한다.
        // 이 동기화가 없으면 새로고침 시 useAuth(localStorage=로그아웃)와 미들웨어(쿠키=로그인)가
        // 불일치하여 /login↔/dashboard 무한 리다이렉트 루프로 대시보드가 멈춘다.
        if (result.session?.access_token && result.session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
          })
        } else {
          await refreshSession()
        }
        showSuccess('로그인 성공', `${result.user.name}님, 환영합니다!`)
        return { success: true }
      } else {
        showError('로그인 실패', result.error || '로그인에 실패했습니다.')
        return { success: false, error: result.error }
      }
    } catch (error) {
      clientLogger.error('로그인 오류:', error)
      const errorMessage = '로그인 중 오류가 발생했습니다.'
      showError('로그인 실패', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [refreshSession, showSuccess, showError])


  // 중복 함수 제거 (이미 위에서 useCallback으로 정의됨)

  // 권한 체크 함수 (DB 권한 우선 사용)
  const hasPermission = React.useCallback((resource: string, action: Permission['action']): boolean => {
    if (!user) return false

    // user.permissions를 Permission[] 배열로 변환
    const customPermissions = user.permissions
      ? parsePermissionsFromDB(user.permissions as Record<string, string[]>)
      : undefined

    return checkPermission(
      user.role as 'system_admin' | 'admin' | 'user',
      resource,
      action,
      customPermissions
    )
  }, [user])

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshSession,
    isAuthenticated: !!user,
    sessionExpiresAt,
    isSessionExpiring,
    hasPermission,
  }

  return React.createElement(AuthContext.Provider, { value: contextValue }, children)
}

// useAuth Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용되어야 합니다.')
  }
  return context
}

// 권한 체크를 위한 추가 Hook
export function useRequireAuth() {
  const { user, loading } = useAuth()
  
  useEffect(() => {
    if (!loading && !user) {
      // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
      window.location.href = '/login'
    }
  }, [user, loading])

  return { user, loading }
}
