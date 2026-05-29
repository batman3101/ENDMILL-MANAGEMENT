'use client'

import { useCallback, useRef } from 'react'

/**
 * 모달을 드래그하여 위치 이동할 수 있게 하는 훅.
 *
 * 반환된 콜백 ref 를 `.mobile-modal-content` 요소에 연결하면, 내부의
 * `.mobile-modal-header` 를 드래그 핸들로 사용해 모달을 이동시킨다.
 *
 * 설계 메모:
 * - 마우스·터치·펜을 모두 지원한다(Pointer Events). 이전에는 mouse 이벤트만
 *   바인딩해 태블릿(>=768px, 터치)에서 드래그가 전혀 동작하지 않는 버그가 있었다.
 * - 모바일 폰(<768px)에서는 모달이 하단 시트 형태라 드래그 이동이 어색하고
 *   터치 스크롤과 충돌하므로 비활성화한다(>=768px 에서만 동작).
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

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const next = clamp(baseX + (e.clientX - startX), baseY + (e.clientY - startY))
      offset = next
      node.style.transform = `translate(${next.x}px, ${next.y}px)`
    }

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      try {
        handle.releasePointerCapture(e.pointerId)
      } catch {
        // 캡처가 이미 해제된 경우 등 — 무시
      }
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', endDrag)
      document.removeEventListener('pointercancel', endDrag)
    }

    const onPointerDown = (e: PointerEvent) => {
      // 주 포인터(마우스 좌클릭/터치 첫 손가락/펜)만, 그리고 폰(<768px)에서는 비활성
      if (e.button !== 0) return
      if (window.innerWidth < 768) return
      const target = e.target as HTMLElement
      // 헤더의 인터랙티브 요소(닫기 버튼 등)에서 시작한 입력은 드래그로 가로채지 않음
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return

      e.preventDefault()
      dragging = true
      startX = e.clientX
      startY = e.clientY
      baseX = offset.x
      baseY = offset.y
      try {
        // 포인터 캡처로 핸들 밖으로 빠르게 움직여도 이동 추적이 끊기지 않게 함
        handle.setPointerCapture(e.pointerId)
      } catch {
        // 미지원 환경 — 무시 (document 리스너로 폴백)
      }
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', endDrag)
      document.addEventListener('pointercancel', endDrag)
    }

    handle.addEventListener('pointerdown', onPointerDown)
    // 터치 드래그가 페이지 스크롤/줌 제스처로 해석되지 않도록 차단
    const prevTouchAction = handle.style.touchAction
    handle.style.touchAction = 'none'

    const cleanup = () => {
      handle.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', endDrag)
      document.removeEventListener('pointercancel', endDrag)
      handle.style.touchAction = prevTouchAction
    }
    active.current = { node, cleanup }
  }, [])

  return setRef
}
