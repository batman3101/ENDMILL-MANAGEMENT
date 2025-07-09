// 임시 인증 시스템 (개발용)
export interface TempUser {
  id: string
  email: string
  name: string
  role: 'system_admin' | 'admin' | 'user'
  department: string
  position: string
  shift: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
}

// 임시 사용자 데이터
const tempUsers: TempUser[] = [
  {
    id: 'admin-001',
    email: 'zetooo1972@gmail.com',
    name: '시스템 소유자',
    role: 'system_admin',
    department: '최고경영진',
    position: '시스템 소유자',
    shift: 'A',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-002',
    email: 'admin@almustech.com',
    name: '시스템 관리자',
    role: 'system_admin',
    department: '종합관리실',
    position: '시스템 관리자',
    shift: 'A',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-003',
    email: 'manager@almustech.com',
    name: '공구관리실장',
    role: 'admin',
    department: '공구관리실',
    position: '실장',
    shift: 'A',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
]

// 임시 비밀번호 (실제로는 해시화되어야 함)
const tempPasswords: Record<string, string> = {
  'zetooo1972@gmail.com': 'youkillme-1',
  'admin@almustech.com': 'admin123',
  'manager@almustech.com': 'manager123'
}

export class TempAuthService {
  // 로그인 검증
  static async signIn(email: string, password: string): Promise<{ success: boolean; user?: TempUser; error?: string }> {
    try {
      // 이메일로 사용자 찾기
      const user = tempUsers.find(u => u.email === email && u.isActive)
      
      if (!user) {
        return { success: false, error: '등록되지 않은 이메일입니다.' }
      }

      // 비밀번호 검증
      const storedPassword = tempPasswords[email]
      if (!storedPassword || storedPassword !== password) {
        return { success: false, error: '비밀번호가 올바르지 않습니다.' }
      }

      // 로그인 성공 - 마지막 로그인 시간 업데이트
      user.lastLogin = new Date().toISOString()
      
      return { success: true, user }
    } catch (error) {
      return { success: false, error: '로그인 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 정보 조회
  static getUserById(id: string): TempUser | null {
    return tempUsers.find(u => u.id === id && u.isActive) || null
  }

  // 세션 토큰 생성 (간단한 구현)
  static generateSessionToken(user: TempUser): string {
    const payload = {
      id: user.id,
      email: user.email,
      iat: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24시간
    }
    
    // 실제로는 JWT를 사용해야 하지만, 여기서는 단순한 base64 인코딩
    return btoa(JSON.stringify(payload))
  }

  // 세션 토큰 검증
  static validateSessionToken(token: string): { valid: boolean; user?: TempUser } {
    try {
      const payload = JSON.parse(atob(token))
      
      // 토큰 만료 확인
      if (Date.now() > payload.exp) {
        return { valid: false }
      }

      // 사용자 정보 조회
      const user = this.getUserById(payload.id)
      if (!user) {
        return { valid: false }
      }

      return { valid: true, user }
    } catch (error) {
      return { valid: false }
    }
  }

  // 로그아웃 (토큰 무효화)
  static signOut(): boolean {
    // 로컬 스토리지에서 토큰 제거
    if (typeof window !== 'undefined') {
      localStorage.removeItem('temp_auth_token')
    }
    return true
  }
}

// 브라우저 환경에서 세션 관리
export class TempSessionManager {
  private static readonly TOKEN_KEY = 'temp_auth_token'
  
  static saveSession(user: TempUser): void {
    if (typeof window === 'undefined') return
    
    const token = TempAuthService.generateSessionToken(user)
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  static getCurrentUser(): TempUser | null {
    if (typeof window === 'undefined') return null
    
    const token = localStorage.getItem(this.TOKEN_KEY)
    if (!token) return null

    const { valid, user } = TempAuthService.validateSessionToken(token)
    return valid ? user || null : null
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.TOKEN_KEY)
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }
} 