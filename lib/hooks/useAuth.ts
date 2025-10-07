'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase/client'
import { useToast } from '../../components/shared/Toast'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

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
}

// Auth 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
        console.error('세션 새로고침 오류:', error) // 에러는 유지
      } else if (data.session) {
        setSession(data.session)
      }
    } catch (error) {
      console.error('세션 새로고침 오류:', error) // 에러는 유지
    }
  }, [])

  // 로그아웃 함수 (useCallback으로 메모이제이션)
  const signOut = React.useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Supabase 로그아웃 오류:', error) // 에러는 유지
      }

      setUser(null)
      setSession(null)
      showSuccess('로그아웃 완료', '안전하게 로그아웃되었습니다.')
    } catch (error) {
      console.error('로그아웃 오류:', error) // 에러는 유지
      showError('로그아웃 실패', '로그아웃 중 오류가 발생했습니다.')
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
    
    const interval = setInterval(checkSessionExpiry, 60000) // 1분마다 확인
    checkSessionExpiry() // 즉시 확인
    
    return () => clearInterval(interval)
  }, [session?.expires_at, isSessionExpiring, refreshSession, handleSessionExpired, showWarning])
  
  // 사용자 활동 감지
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(new Date())
    }
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
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
        console.log('🔍 Supabase 세션 확인 시작...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('세션 확인 오류:', error)
          setUser(null)
          setSession(null)
        } else if (session?.user) {
          console.log('✅ Supabase 세션 발견:', session.user.email)
          setSession(session)

          // user_profiles 테이블에서 사용자 프로필 정보 조회
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('id, name, department, position, shift, phone, user_roles(name, type)')
            .eq('user_id', session.user.id)
            .single()

          if (userError) {
            console.error('사용자 정보 조회 오류:', userError)
          }

          const userProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: userData?.name || session.user.user_metadata?.name || '',
            department: userData?.department || session.user.user_metadata?.department || '',
            position: userData?.position || session.user.user_metadata?.position || '',
            shift: userData?.shift || session.user.user_metadata?.shift || '',
            role: (userData?.user_roles as any)?.type || session.user.user_metadata?.role || 'user',
            language: session.user.user_metadata?.language || 'ko'
          }
          setUser(userProfile)
        } else {
          console.log('❌ 세션 없음')
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        console.error('세션 확인 오류:', error)
        if (mounted) {
          setUser(null)
          setSession(null)
        }
      } finally {
        if (mounted) {
          console.log('✅ 세션 확인 완료, loading 해제')
          setLoading(false)
        }
      }
    }

    checkSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Auth state changed:', event, session?.user?.email)
        }
        
        if (!mounted) return
        
        if (event === 'SIGNED_IN' && session) {
          setSession(session)
          const userProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || '',
            department: session.user.user_metadata?.department || '',
            position: session.user.user_metadata?.position || '',
            shift: session.user.user_metadata?.shift || '',
            role: session.user.user_metadata?.role || 'user',
            language: session.user.user_metadata?.language || 'ko'
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
        await refreshSession()
        showSuccess('로그인 성공', `${result.user.name}님, 환영합니다!`)
        return { success: true }
      } else {
        showError('로그인 실패', result.error || '로그인에 실패했습니다.')
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('로그인 오류:', error)
      const errorMessage = '로그인 중 오류가 발생했습니다.'
      showError('로그인 실패', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [refreshSession, showSuccess, showError])


  // 중복 함수 제거 (이미 위에서 useCallback으로 정의됨)

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