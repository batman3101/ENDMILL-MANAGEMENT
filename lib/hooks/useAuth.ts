'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase/client'
import { useToast } from '../../components/shared/Toast'
import { TempAuthService, TempSessionManager } from '../data/tempAuth'
import type { User, Session } from '@supabase/supabase-js'

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

  // 세션 만료 확인 및 자동 갱신
  useEffect(() => {
    const checkSessionExpiry = () => {
      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000)
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
    }
    
    const interval = setInterval(checkSessionExpiry, 60000) // 1분마다 확인
    checkSessionExpiry() // 즉시 확인
    
    return () => clearInterval(interval)
  }, [session, isSessionExpiring])
  
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
    const extendSession = () => {
      const now = new Date()
      const timeSinceActivity = now.getTime() - lastActivity.getTime()
      const thirtyMinutes = 30 * 60 * 1000 // 30분
      
      // 30분 이내 활동이 있었고 세션이 있으면 연장
      if (timeSinceActivity < thirtyMinutes && session) {
        refreshSession()
      }
    }
    
    const interval = setInterval(extendSession, 15 * 60 * 1000) // 15분마다 확인
    
    return () => clearInterval(interval)
  }, [lastActivity, session])
  
  // 세션 만료 처리
  const handleSessionExpired = async () => {
    showError('세션 만료', '세션이 만료되어 로그아웃됩니다.')
    await signOut()
    window.location.href = '/login?expired=true'
  }

  useEffect(() => {
    // 초기 세션 상태 확인
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('세션 확인 오류:', error)
          // Supabase 세션 확인 실패 시 임시 인증 확인
          const tempUser = TempSessionManager.getCurrentUser()
          if (tempUser) {
            console.log('✅ 임시 세션 발견')
            setUser({
              id: tempUser.id,
              email: tempUser.email,
              name: tempUser.name,
              department: tempUser.department,
              position: tempUser.position,
              shift: tempUser.shift,
              role: tempUser.role,
              language: 'ko'
            })
          } else {
            setUser(null)
            setSession(null)
          }
        } else if (session?.user) {
          setSession(session)
          // 사용자 프로필 정보 조회
          const userProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || '',
            department: session.user.user_metadata?.department || '',
            position: session.user.user_metadata?.position || '',
            shift: session.user.user_metadata?.shift || '',
            role: session.user.user_metadata?.role || 'user'
          }
          setUser(userProfile)
        } else {
          // Supabase 세션이 없을 때 임시 인증 확인
          const tempUser = TempSessionManager.getCurrentUser()
          if (tempUser) {
            console.log('✅ 임시 세션 발견')
            setUser({
              id: tempUser.id,
              email: tempUser.email,
              name: tempUser.name,
              department: tempUser.department,
              position: tempUser.position,
              shift: tempUser.shift,
              role: tempUser.role,
              language: 'ko'
            })
          } else {
            setUser(null)
            setSession(null)
          }
        }
      } catch (error) {
          console.error('세션 확인 오류:', error)
          // 오류 발생 시에도 임시 인증 확인
          try {
            const tempUser = TempSessionManager.getCurrentUser()
            if (tempUser) {
              console.log('✅ 오류 시 임시 세션 발견')
              setUser({
                id: tempUser.id,
                email: tempUser.email,
                name: tempUser.name,
                department: tempUser.department,
                position: tempUser.position,
                shift: tempUser.shift,
                role: tempUser.role,
                language: 'ko'
              })
            } else {
              setUser(null)
              setSession(null)
            }
          } catch (tempError) {
            console.error('임시 세션 확인 오류:', tempError)
            setUser(null)
            setSession(null)
          }
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
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
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session)
          setIsSessionExpiring(false) // 토큰 갱신 시 만료 경고 해제
        }
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // 세션 새로고침 함수
  const refreshSession = async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('세션 새로고침 오류:', error)
      } else if (data.session) {
        setSession(data.session)
      }
    } catch (error) {
      console.error('세션 새로고침 오류:', error)
    }
  }

  // 로그인 함수
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      
      // API 라우트를 통한 로그인 시도
      try {
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
        }
      } catch (apiError) {
        console.log('API 로그인 실패, Supabase 직접 시도:', apiError)
      }
      
      // API 실패 시 Supabase 직접 로그인 시도
      console.log('🔐 Supabase 로그인 시도...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.warn('⚠️ Supabase 로그인 실패, 임시 인증 시도...', error.message);
        
        // Supabase 로그인 실패 시 임시 인증 시스템 사용
        const tempResult = await TempAuthService.signIn(email, password);
        
        if (tempResult.success && tempResult.user) {
          console.log('✅ 임시 인증 성공');
          setUser({
            id: tempResult.user.id,
            email: tempResult.user.email,
            name: tempResult.user.name,
            department: tempResult.user.department,
            position: tempResult.user.position,
            shift: tempResult.user.shift,
            role: tempResult.user.role,
            language: 'ko'
          });
          
          showSuccess('로그인 성공', `${tempResult.user.name}님, 환영합니다! (임시 모드)`);
          return { success: true };
        } else {
          let errorMessage = '로그인에 실패했습니다.'
          
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = '이메일 인증이 완료되지 않았습니다.'
          } else {
            errorMessage = error.message
          }
          
          showError('로그인 실패', errorMessage)
          return { success: false, error: errorMessage }
        }
      }

      if (data.user && data.session) {
        setSession(data.session)
        const userProfile = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || '',
          department: data.user.user_metadata?.department || '',
          position: data.user.user_metadata?.position || '',
          shift: data.user.user_metadata?.shift || '',
          role: data.user.user_metadata?.role || 'user',
          language: data.user.user_metadata?.language || 'ko'
        }
        setUser(userProfile)
        showSuccess('로그인 성공', `${userProfile.name || '사용자'}님, 환영합니다!`)
        return { success: true }
      }

      return { success: false, error: '로그인에 실패했습니다.' }
    } catch (error) {
      console.error('로그인 오류:', error);
      
      // 네트워크 오류 등의 경우 임시 인증 시도
      const tempResult = await TempAuthService.signIn(email, password);
      
      if (tempResult.success && tempResult.user) {
        console.log('✅ 오류 시 임시 인증 성공');
        setUser({
          id: tempResult.user.id,
          email: tempResult.user.email,
          name: tempResult.user.name,
          department: tempResult.user.department,
          position: tempResult.user.position,
          shift: tempResult.user.shift,
          role: tempResult.user.role,
          language: 'ko'
        });
        
        showSuccess('로그인 성공', `${tempResult.user.name}님, 환영합니다! (임시 모드)`);
        return { success: true };
      }
      
      const errorMessage = '로그인 중 오류가 발생했습니다.'
      showError('로그인 실패', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 로그아웃 함수
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Supabase 로그아웃 오류:', error)
      }
      
      // 임시 인증 로그아웃
      TempAuthService.logout()
      
      setUser(null)
      setSession(null)
      showSuccess('로그아웃 완료', '안전하게 로그아웃되었습니다.')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      showError('로그아웃 실패', '로그아웃 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

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