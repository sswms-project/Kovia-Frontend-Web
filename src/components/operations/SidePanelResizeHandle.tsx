'use client'

import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

// Trang nằm cạnh khung nên phải còn đủ chỗ cho thanh bên và vùng làm việc.
const MIN_PAGE_WIDTH = 480
const KEYBOARD_STEP = 24

/**
 * Luôn chừa đủ bề rộng cho trang nằm cạnh khung để người dùng còn thao tác được.
 * `rightOffset`: phần mép phải đã có khung khác chiếm (ví dụ trợ lý AI đang mở).
 */
export function clampSidePanelWidth(width: number, minWidth: number, rightOffset = 0) {
  const maximum = Math.max(minWidth, window.innerWidth - rightOffset - MIN_PAGE_WIDTH)
  return Math.min(Math.max(width, minWidth), maximum)
}

interface SidePanelResizeHandleProps {
  readonly width: number
  readonly minWidth: number
  readonly label: string
  /** Khoảng cách từ mép phải khung tới mép phải màn hình. */
  readonly rightOffset?: number
  readonly onResize: (width: number) => void
  readonly onResizeEnd: (width: number) => void
}

/**
 * Mép trái của một khung Sheet bám mép phải màn hình: kéo (hoặc dùng phím mũi tên) để nới rộng / thu hẹp.
 *
 * Không dùng `src/components/ui/resizable`: primitive đó chia tỉ lệ các ô nằm trong cùng một bố cục,
 * còn khung này là Sheet nổi bám mép phải màn hình, không có ô anh em nào để chia.
 */
export function SidePanelResizeHandle({
  width,
  minWidth,
  label,
  rightOffset = 0,
  onResize,
  onResizeEnd,
}: SidePanelResizeHandleProps) {
  const draggingPointer = useRef<number | null>(null)

  // Khung bám mép phải nên bề rộng chính là khoảng cách từ con trỏ tới mép phải của khung.
  const widthAt = (event: PointerEvent<HTMLDivElement>) =>
    clampSidePanelWidth(window.innerWidth - rightOffset - event.clientX, minWidth, rightOffset)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = clampSidePanelWidth(
      width + (event.key === 'ArrowLeft' ? KEYBOARD_STEP : -KEYBOARD_STEP),
      minWidth,
      rightOffset
    )
    onResize(next)
    onResizeEnd(next)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={minWidth}
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
