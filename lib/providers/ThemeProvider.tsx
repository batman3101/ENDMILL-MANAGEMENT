'use client'

/**
 * ThemeProvider — settings.ui.theme(light/dark/auto)와 OS prefers-color-scheme를 추적,
 * <html class="dark"> 토글로 전체 앱의 다크모드를 제어한다.
 *
 * 동작 원리:
 * - settings.ui.theme === 'auto' (또는 'system') → window.matchMedia('(prefers-color-scheme: dark)')를 따름
 * - settings.ui.theme === 'light' / 'dark' → 그 값을 직접 사용
 * - effective theme이 결정되면 <html>에 'dark' 클래스를 토글
 * - localStorage에 마지막 effective theme를 저장 (FOUC 방지 inline script가 참조)
 *
 * 외부 의존성 없이 자체 구현. settings는 useSettings() hook을 통해 구독한다.
 *
 * 보안 주의:
 * - THEME_NO_FLASH_SCRIPT는 사용자 입력이 일절 포함되지 않은 정적 상수다.
 *   STORAGE_KEY 또한 컴파일 타임 상수이므로 XSS 위험이 없다.
 *   layout.tsx의 dangerouslySetInnerHTML은 이 정적 문자열만 주입한다.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { useSettings } from '../hooks/useSettings'

export type ThemePreference = 'light' | 'dark' | 'auto'
export type EffectiveTheme = 'light' | 'dark'

interface ThemeContextValue {
  // 사용자가 선택한 테마 (light / dark / auto)
  preference: ThemePreference
  // 실제로 적용된 테마 (light / dark)
  effective: EffectiveTheme
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'auto',
  effective: 'light',
})

const STORAGE_KEY = 'omc-effective-theme'

/**
 * settings.ui.theme 값을 ThemePreference로 정규화한다.
 * 기존 settings 페이지는 'system'을 사용하므로 이를 'auto'로 매핑한다.
 */
function normalizePreference(raw: unknown): ThemePreference {
  if (raw === 'dark') return 'dark'
  if (raw === 'light') return 'light'
  // 'auto', 'system', undefined, null, 그 외 모든 값 → auto
  return 'auto'
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveEffective(preference: ThemePreference): EffectiveTheme {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return getSystemPrefersDark() ? 'dark' : 'light'
}

function applyThemeClass(theme: EffectiveTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  // FOUC 방지용 캐시
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage 사용 불가 (private mode 등) — 무시
  }
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings } = useSettings()
  const preference: ThemePreference = normalizePreference(settings?.ui?.theme)

  const [effective, setEffective] = useState<EffectiveTheme>(() => {
    // SSR 안전: 서버 렌더 시엔 light, 클라이언트 마운트 후 즉시 보정
    if (typeof window === 'undefined') return 'light'
    return resolveEffective(preference)
  })

  // preference 변경 시 effective 재계산
  useEffect(() => {
    const next = resolveEffective(preference)
    setEffective(next)
    applyThemeClass(next)
  }, [preference])

  // 'auto'일 때 OS prefers-color-scheme 변경을 listen
  useEffect(() => {
    if (preference !== 'auto') return
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const next: EffectiveTheme = e.matches ? 'dark' : 'light'
      setEffective(next)
      applyThemeClass(next)
    }
    // Safari 14 이전 호환성
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    } else {
      // legacy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(media as any).addListener(handler)
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(media as any).removeListener(handler)
      }
    }
  }, [preference])

  return (
    <ThemeContext.Provider value={{ preference, effective }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * 현재 effective theme를 읽거나 사용자 preference를 확인한다.
 * preference 변경은 settings 페이지의 select(useSettings hook)를 통해 이루어진다.
 */
export function useTheme(): ThemeContextValue & { isDark: boolean } {
  const ctx = useContext(ThemeContext)
  return {
    ...ctx,
    isDark: ctx.effective === 'dark',
  }
}

/**
 * FOUC 방지용 inline script.
 * - app/layout.tsx의 <head>에 dangerouslySetInnerHTML로 주입한다.
 * - 사용자 입력이 일절 포함되지 않은 정적 문자열이므로 XSS 위험 없음.
 * - localStorage 캐시 우선, 없으면 OS prefers-color-scheme로 폴백.
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s||(d?'dark':'light');if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`
