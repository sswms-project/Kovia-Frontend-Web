import type { DragEvent as ReactDragEvent } from 'react'
import type { LayoutPaletteDragData } from '../types/warehouse-layout-palette.types'
import { getCanvasDropPoint, isPointInsideCanvas } from '../utils/layout-canvas-view'
import { LAYOUT_DECORATION_MARGIN } from '../utils/layout-grid'
import { hasLayoutDragData, readLayoutDragData } from '../utils/layout-drag-data'

interface CanvasDropOptions {
  readonly canvas: { readonly width: number; readonly height: number; readonly gridSize: number }
  readonly scale: number
  readonly paperLeft: number
  readonly paperTop: number
  readonly onPaletteDrop: (payload: LayoutPaletteDragData, x: number, y: number) => void
}

/** Nhận đối tượng kéo từ bảng công cụ; bỏ qua nếu thả ngoài mặt bằng (đồ trang trí được thêm lề). */
export function useCanvasDrop({
  canvas,
  scale,
  paperLeft,
  paperTop,
  onPaletteDrop,
}: CanvasDropOptions) {
  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (hasLayoutDragData(event.dataTransfer)) event.preventDefault()
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    const payload = readLayoutDragData(event.dataTransfer)
    if (!payload) return
    event.preventDefault()
    const point = getCanvasDropPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      containerBounds: event.currentTarget.getBoundingClientRect(),
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
      paperLeft,
      paperTop,
      scale,
      gridSize: canvas.gridSize,
    })
    const margin = payload.kind === 'decoration' ? LAYOUT_DECORATION_MARGIN : 0
    if (!isPointInsideCanvas(point, canvas, margin)) return
    onPaletteDrop(payload, point.x, point.y)
  }

  return { handleDragOver, handleDrop }
}
