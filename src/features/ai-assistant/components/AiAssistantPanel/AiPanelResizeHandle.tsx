'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

export const AI_PANEL_MIN_WIDTH = 340
// Trang nằm cạnh khung nên phải còn đủ chỗ cho thanh bên và vùng làm việc.
const MIN_PAGE_WIDTH = 480
const KEYBOARD_STEP = 24

/** Luôn chừa đủ bề rộng cho trang nằm cạnh khung để người dùng còn thao tác được. */
export function clampAiPanelWidth(width: number) {
  const maximum = Math.max(AI_PANEL_MIN_WIDTH, window.innerWidth - MIN_PAGE_WIDTH)
  return Math.min(Math.max(width, AI_PANEL_MIN_WIDTH), maximum)
}

interface AiPanelResizeHandleProps {
  readonly width: number
  readonly onResize: (width: number) => void
  readonly onResizeEnd: (width: number) => void
}

/**
 * Mép trái của khung trợ lý: kéo (hoặc dùng phím mũi tên) để nới rộng / thu hẹp.
 *
 * Không dùng `src/components/ui/resizable`: primitive đó chia tỉ lệ các ô nằm trong cùng một bố cục,
 * còn khung này là Sheet nổi bám mép phải màn hình, không có ô anh em nào để chia.
 */
export function AiPanelResizeHandle({ width, onResize, onResizeEnd }: AiPanelResizeHandleProps) {
  const draggingPointer = useRef<number | null>(null)

  // Khung bám mép phải màn hình nên bề rộng chính là khoảng cách từ con trỏ tới mép phải.
  const widthAt = (event: PointerEvent<HTMLDivElement>) =>
    clampAiPanelWidth(window.innerWidth - event.clientX)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = clampAiPanelWidth(
      width + (event.key === 'ArrowLeft' ? KEYBOARD_STEP : -KEYBOARD_STEP)
    )
    onResize(next)
    onResizeEnd(next)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để đổi bề rộng khung trợ lý"
      aria-valuemin={AI_PANEL_MIN_WIDTH}
      aria-valuenow={Math.round(width)}
      tabIndex={0}
      className="group focus-visible:ring-ring absolute inset-y-0 left-0 z-10 hidden w-2 -translate-x-1/2 cursor-ew-resize touch-none outline-none focus-visible:ring-2 sm:block"
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        draggingPointer.current = event.pointerId
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (draggingPointer.current === event.pointerId) onResize(widthAt(event))
      }}
      onPointerUp={(event) => {
        if (draggingPointer.current !== event.pointerId) return
        draggingPointer.current = null
        event.currentTarget.releasePointerCapture?.(event.pointerId)
        onResizeEnd(widthAt(event))
      }}
      onPointerCancel={() => {
        if (draggingPointer.current === null) return
        draggingPointer.current = null
        // Bố cục trang đang đi theo con trỏ; trả nó về trạng thái bình thường.
        onResizeEnd(width)
      }}
    >
      <span className="bg-border group-hover:bg-primary group-active:bg-primary absolute inset-y-0 left-1/2 w-px transition-colors group-hover:w-0.5 group-active:w-0.5" />
    </div>
  )
}
