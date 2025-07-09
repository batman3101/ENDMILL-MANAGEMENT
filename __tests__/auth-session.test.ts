/**
 * 사용자 인증 세션 관리 테스트
 * TDD Red Phase - 실패하는 테스트 작성
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../lib/hooks/useAuth'
import { TempAuthService } from '../lib/data/tempAuth'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

// Mock toast
jest.mock('../components/shared/Toast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}))

describe('Authentication Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.clear()
  })

  describe('세션 지속성 (Session Persistence)', () => {
    test('should restore user session on page refresh', async () => {
      // Given: 로컬 스토리지에 유효한 세션이 저장되어 있음
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: '테스트 사용자',
        role: 'admin' as const,
        department: '종합관리실',
        position: '관리자',
        shift: 'A' as const,
      }
      
      const mockSession = {
        user: mockUser,
        token: 'mock-token',
        expiresAt: Date.now() + 3600000, // 1시간 후
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockSession))

      // When: useAuth 훅을 렌더링
      const { result } = renderHook(() => useAuth())

      // Then: 사용자가 자동으로 인증되어야 함
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.loading).toBe(false)
      })
    })

    test('should clear expired session on page refresh', async () => {
      // Given: 로컬 스토리지에 만료된 세션이 저장되어 있음
      const expiredSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        token: 'expired-token',
        expiresAt: Date.now() - 3600000, // 1시간 전 만료
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredSession))

      // When: useAuth 훅을 렌더링
      const { result } = renderHook(() => useAuth())

      // Then: 세션이 삭제되고 로그아웃 상태가 되어야 함
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
      })
    })
  })

  describe('자동 로그인 (Auto Login)', () => {
    test('should attempt auto-login with stored credentials', async () => {
      // Given: 자동 로그인 정보가 저장되어 있음
      const autoLoginData = {
        email: 'test@example.com',
        rememberMe: true,
        lastLogin: Date.now(),
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auto_login') return JSON.stringify(autoLoginData)
        return null
      })

      // Mock TempAuthService
      const mockSignIn = jest.spyOn(TempAuthService, 'getStoredSession')
      mockSignIn.mockResolvedValue({
        success: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: '테스트 사용자',
          role: 'admin',
          department: '종합관리실',
          position: '관리자',
          shift: 'A',
        },
      })

      // When: useAuth 훅을 렌더링
      const { result } = renderHook(() => useAuth())

      // Then: 자동 로그인이 시도되어야 함
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user?.email).toBe('test@example.com')
      })
    })

    test('should not auto-login if remember me is disabled', async () => {
      // Given: remember me가 비활성화된 상태
      const autoLoginData = {
        email: 'test@example.com',
        rememberMe: false,
        lastLogin: Date.now(),
      }
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'auto_login') return JSON.stringify(autoLoginData)
        return null
      })

      // When: useAuth 훅을 렌더링
      const { result } = renderHook(() => useAuth())

      // Then: 자동 로그인이 시도되지 않아야 함
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
      })
    })
  })

  describe('세션 토큰 갱신 (Token Refresh)', () => {
    test('should refresh token before expiration', async () => {
      // Given: 곧 만료될 토큰을 가진 세션
      const soonToExpireSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        token: 'soon-to-expire-token',
        expiresAt: Date.now() + 300000, // 5분 후 만료
        refreshToken: 'refresh-token',
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(soonToExpireSession))

      // When: useAuth 훅을 렌더링하고 토큰 갱신 확인
      const { result } = renderHook(() => useAuth())

      // Then: 토큰이 자동으로 갱신되어야 함
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
        // 토큰 갱신 로직이 호출되어야 함 (구현 필요)
      })
    })
  })

  describe('세션 무효화 (Session Invalidation)', () => {
    test('should invalidate session on logout', async () => {
      // Given: 로그인된 사용자
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: '테스트 사용자',
        role: 'admin' as const,
        department: '종합관리실',
        position: '관리자',
        shift: 'A' as const,
      }

      const { result } = renderHook(() => useAuth())

      // 사용자 설정
      act(() => {
        result.current.setUser(mockUser)
      })

      // When: 로그아웃 실행
      await act(async () => {
        await result.current.signOut()
      })

      // Then: 모든 세션 정보가 삭제되어야 함
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_session')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auto_login')
      })
    })

    test('should handle concurrent session conflicts', async () => {
      // Given: 다른 탭에서 로그아웃이 발생
      const { result } = renderHook(() => useAuth())

      // When: storage 이벤트로 세션 삭제가 감지됨
      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'auth_session',
          newValue: null,
          oldValue: JSON.stringify({ user: { id: 'user-1' } }),
        })
        window.dispatchEvent(storageEvent)
      })

      // Then: 현재 탭도 로그아웃 상태가 되어야 함
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
      })
    })
  })
}) 