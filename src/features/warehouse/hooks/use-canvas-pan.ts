import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface PointerPanStart {
  readonly pointerId: number
  readonly clientX: number
  readonly clientY: number
  readonly scrollLeft: number
  readonly scrollTop: number
}

interface CanvasPanOptions {
  readonly cancelGesture: () => void
  readonly onPanStart: () => void
}

/** Ctrl + kéo chuột trái để cuộn khung canvas; mọi thao tác kệ đang dở bị huỷ khi bắt đầu kéo. */
export function useCanvasPan({ cancelGesture, onPanStart }: CanvasPanOptions) {
  const pointerPanStart = useRef<PointerPanStart | null>(null)
  const [isPanning, setIsPanning] = useState(false)

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Portalled selection tools must keep their own focus and native button interaction.
    if (event.target instanceof Node && !event.currentTarget.contains(event.target)) return
    event.currentTarget.focus({ preventScroll: true })
    if (!event.ctrlKey || event.button !== 0) return
    cancelGesture()
    onPanStart()
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerPanStart.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    }
    setIsPanning(true)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerPanStart.current
    if (!start || start.pointerId !== event.pointerId) return
    event.preventDefault()
    event.currentTarget.scrollLeft = start.scrollLeft - (event.clientX - start.clientX)
    event.currentTarget.scrollTop = start.scrollTop - (event.clientY - start.clientY)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerPanStart.current?.pointerId !== event.pointerId) return
    pointerPanStart.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsPanning(false)
  }

  return { isPanning, handlePointerDown, handlePointerMove, handlePointerUp }
}
