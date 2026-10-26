import { LAYOUT_DECORATION_MARGIN, snapToGrid, type LayoutBounds } from './layout-grid'

export const CANVAS_MIN_SCALE = 0.2
export const CANVAS_MAX_SCALE = 4
export const CANVAS_ZOOM_FACTOR = 1.15
export const CANVAS_PADDING = 32
const SCROLLBAR_ALLOWANCE = 18
const MIN_GRID_SCREEN_SPACING = 7

export interface CanvasViewport {
  readonly scale: number
  readonly x: number
  readonly y: number
}

export interface CanvasSize {
  readonly width: number
  readonly height: number
}

export interface CanvasGridLine {
  readonly key: string
  readonly points: number[]
}

export function clampCanvasScale(scale: number) {
  return Math.min(CANVAS_MAX_SCALE, Math.max(CANVAS_MIN_SCALE, scale))
}

/** Vùng giấy gồm cả lề cho đồ trang trí đặt ngoài mặt bằng. */
export function getCanvasPaperBounds(width: number, height: number): LayoutBounds {
  return {
    minX: -LAYOUT_DECORATION_MARGIN,
    minY: -LAYOUT_DECORATION_MARGIN,
    maxX: width + LAYOUT_DECORATION_MARGIN,
    maxY: height + LAYOUT_DECORATION_MARGIN,
  }
}

export function getFitScale(containerWidth: number, containerHeight: number, bounds: LayoutBounds) {
  const availableWidth = Math.max(containerWidth - CANVAS_PADDING * 2 - SCROLLBAR_ALLOWANCE, 1)
  const availableHeight = Math.max(containerHeight - CANVAS_PADDING * 2 - SCROLLBAR_ALLOWANCE, 1)
  const canvasWidth = Math.max(bounds.maxX - bounds.minX, 1)
  const canvasHeight = Math.max(bounds.maxY - bounds.minY, 1)
  return clampCanvasScale(Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight))
}

/** Chỉ dựng các đường lưới đang nằm trong khung nhìn để giữ số node Konva nhỏ khi phóng to. */
export function getVisibleGridLines(
  gridSize: number,
  paperBounds: LayoutBounds,
  viewport: CanvasViewport,
  size: CanvasSize
) {
  if (gridSize * viewport.scale < MIN_GRID_SCREEN_SPACING) return []
  const lines: CanvasGridLine[] = []
  const overscan = gridSize
  const visibleBounds = {
    minX: -viewport.x / viewport.scale - overscan,
    minY: -viewport.y / viewport.scale - overscan,
    maxX: (size.width - viewport.x) / viewport.scale + overscan,
    maxY: (size.height - viewport.y) / viewport.scale + overscan,
  }
  const minX = Math.max(paperBounds.minX, visibleBounds.minX)
  const maxX = Math.min(paperBounds.maxX, visibleBounds.maxX)
  const minY = Math.max(paperBounds.minY, visibleBounds.minY)
  const maxY = Math.min(paperBounds.maxY, visibleBounds.maxY)
  const startX = Math.floor(minX / gridSize) * gridSize
  const endX = Math.ceil(maxX / gridSize) * gridSize
  const startY = Math.floor(minY / gridSize) * gridSize
  const endY = Math.ceil(maxY / gridSize) * gridSize

  for (let x = startX; x <= endX; x += gridSize) {
    if (x < paperBounds.minX || x > paperBounds.maxX) continue
    lines.push({ key: `x-${x}`, points: [x, minY, x, maxY] })
  }
  for (let y = startY; y <= endY; y += gridSize) {
    if (y < paperBounds.minY || y > paperBounds.maxY) continue
    lines.push({ key: `y-${y}`, points: [minX, y, maxX, y] })
  }
  return lines
}

interface CanvasDropInput {
  readonly clientX: number
  readonly clientY: number
  readonly containerBounds: Pick<DOMRect, 'left' | 'top'>
  readonly scrollLeft: number
  readonly scrollTop: number
  readonly paperLeft: number
  readonly paperTop: number
  readonly scale: number
  readonly gridSize: number
}

/** Đổi toạ độ con trỏ trên màn hình sang toạ độ mặt bằng, căn theo lưới. */
export function getCanvasDropPoint(input: CanvasDropInput) {
  return {
    x: snapToGrid(
      (input.clientX - input.containerBounds.left + input.scrollLeft - input.paperLeft) /
        input.scale,
      input.gridSize
    ),
    y: snapToGrid(
      (input.clientY - input.containerBounds.top + input.scrollTop - input.paperTop) / input.scale,
      input.gridSize
    ),
  }
}

export function isPointInsideCanvas(
  point: { readonly x: number; readonly y: number },
  canvas: { readonly width: number; readonly height: number },
  margin: number
) {
  return !(
    point.x < -margin ||
    point.y < -margin ||
    point.x > canvas.width + margin ||
    point.y > canvas.height + margin
  )
}
