'use client'

import { useEffect, useState } from 'react'

/**
 * 모바일 환경 디버깅용 Eruda 콘솔.
 * 스마트폰에서 DevTools 사용이 어려워 화면 우하단에 ⚙️ 버튼이 떠서
 * 콘솔/네트워크/엘리먼트 등을 확인 가능.
 *
 * 활성화: URL에 `?debug=1` 또는 localStorage에 `debug=1` 설정.
 * 비활성화: URL에서 `?debug=1` 제거 + localStorage.removeItem('debug').
 *
 * Production 환경에서도 활성화 가능 — 옵션 사용시에만 로드되므로 성능 영향 0.
 */
export function MobileDebugConsole() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const queryDebug = params.get('debug') === '1'
    const storageDebug = (() => {
      try {
        return window.localStorage.getItem('debug') === '1'
      } catch {
        return false
      }
    })()

    if (!queryDebug && !storageDebug) return

    if (queryDebug) {
      try {
        window.localStorage.setItem('debug', '1')
      } catch {
        // ignore
      }
    }

    if (typeof (window as any).eruda !== 'undefined') {
      setActive(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/eruda@3'
    script.async = true
    script.onload = () => {
      try {
        const eruda = (window as any).eruda
        if (eruda && typeof eruda.init === 'function') {
          eruda.init({
            tool: ['console', 'network', 'elements', 'resources', 'info'],
            useShadowDom: true,
            autoScale: true,
          })
          setActive(true)
        }
      } catch (err) {
        console.error('[MobileDebugConsole] eruda init failed:', err)
      }
    }
    script.onerror = () => {
      console.error('[MobileDebugConsole] eruda script load failed')
    }
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  if (!active) return null

  return (
    <div
      className="fixed left-2 z-[9999] rounded-sm bg-signal-stop-strong/90 text-paper text-caption px-2 py-1 font-mono pointer-events-none"
      style={{ bottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      DEBUG ON
    </div>
  )
}
