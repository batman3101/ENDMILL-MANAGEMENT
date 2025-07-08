'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useToast } from '../../components/shared/Toast'

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 사용자 타입 정의
interface User {
  id: string
  email: string
  name?: string
  department?: string
  position?: string
  shift?: string
  role?: string
}

// Auth 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

// Auth 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider 컴포넌트
export function AuthProvider(props: { children: ReactNode }) {
  const { children } = props
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    // 초기 세션 상태 확인
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('세션 확인 오류:', error)
          setUser(null)
        } else if (session?.user) {
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
          setUser(null)
        }
      } catch (error) {
        console.error('세션 확인 오류:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
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
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // 로그인 함수
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
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

      if (data.user) {
        const userProfile = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || '',
          department: data.user.user_metadata?.department || '',
          position: data.user.user_metadata?.position || '',
          shift: data.user.user_metadata?.shift || '',
          role: data.user.user_metadata?.role || 'user'
        }
        setUser(userProfile)
        showSuccess('로그인 성공', `${userProfile.name || '사용자'}님, 환영합니다!`)
        return { success: true }
      }

      return { success: false, error: '로그인에 실패했습니다.' }
    } catch (error) {
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
        console.error('로그아웃 오류:', error)
        showError('로그아웃 실패', '로그아웃 중 오류가 발생했습니다.')
      } else {
        setUser(null)
        showSuccess('로그아웃 완료', '안전하게 로그아웃되었습니다.')
      }
    } catch (error) {
      console.error('로그아웃 오류:', error)
      showError('로그아웃 실패', '로그아웃 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const contextValue: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
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