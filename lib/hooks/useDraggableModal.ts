'use client'

import { useCallback, useRef } from 'react'

/**
 * 모달을 마우스로 드래그하여 위치 이동할 수 있게 하는 훅.
 *
 * 반환된 콜백 ref 를 `.mobile-modal-content` 요소에 연결하면, 내부의
 * `.mobile-modal-header` 를 드래그 핸들로 사용해 모달을 이동시킨다.
 *
 * 설계 메모:
 * - 데스크톱(>=768px)에서만 동작한다. 모바일에서는 모달이 하단 시트 형태라
 *   드래그 이동이 어색하고, 터치 스크롤과 충돌하므로 비활성화한다.
 * - 드래그 중에는 매 프레임 state 를 갱신하면 리렌더가 과해지므로,
 *   ref 의 transform 을 직접 갱신한다(드래그 라이브러리들의 표준 패턴).
 * - 모달은 보통 상호 배타적으로 한 번에 하나만 열리므로, 파일당 훅 1개를
 *   여러 모달이 공유해도 안전하다. 노드가 마운트/언마운트될 때마다 리스너를
 *   다시 연결/해제한다.
 */
export function useDraggableModal() {
  // 현재 드래그가 연결된 노드와 정리 함수를 추적
  const active = useRef<{ node: HTMLElement; cleanup: () => void } | null>(null)

  const setRef = useCallback((node: HTMLElement | null) => {
    // 이전 노드 정리 (다른 모달로 전환되거나 언마운트될 때)
    if (active.current) {
      active.current.cleanup()
      active.current = null
    }
    if (!node) return

    const handle = node.querySelector<HTMLElement>('.mobile-modal-header')
    if (!handle) return

    // 이 노드에 누적된 이동량 (중앙 정렬 기준 0,0 에서 시작)
    let offset = { x: 0, y: 0 }
    let dragging = false
    let startX = 0
    let startY = 0
    let baseX = 0
    let baseY = 0

    const clamp = (x: number, y: number) => {
      // 모달이 화면 밖으로 완전히 사라지지 않도록 최소 가시 영역을 보장
      const margin = 80
      const w = node.offsetWidth
      const h = node.offsetHeight
      const winW = window.innerWidth
      const winH = window.innerHeight
      // 중앙 정렬 기준 초기 위치
      const left0 = (winW - w) / 2
      const top0 = (winH - h) / 2
      const minX = -(left0 + w - margin)
      const maxX = winW - margin - left0
      const minY = -top0
      const maxY = winH - margin - top0
      return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      const next = clamp(baseX + (e.clientX - startX), baseY + (e.clientY - startY))
      offset = next
      node.style.transform = `translate(${next.x}px, ${next.y}px)`
    }

    const onMouseUp = () => {
      dragging = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    const onMouseDown = (e: MouseEvent) => {
      // 좌클릭 + 데스크톱에서만, 그리고 헤더의 인터랙티브 요소(닫기 버튼 등)는 제외
      if (e.button !== 0) return
      if (window.innerWidth < 768) return
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return

      e.preventDefault()
      dragging = true
      startX = e.clientX
      startY = e.clientY
      baseX = offset.x
      baseY = offset.y
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    handle.addEventListener('mousedown', onMouseDown)

    const cleanup = () => {
      handle.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    active.current = { node, cleanup }
  }, [])

  return setRef
}
