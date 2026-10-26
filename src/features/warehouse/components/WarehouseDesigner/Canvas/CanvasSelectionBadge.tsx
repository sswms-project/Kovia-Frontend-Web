import { Group, Line, Rect } from 'react-konva'
import type { CanvasPalette } from './canvas-palette'

interface CanvasSelectionBadgeProps {
  readonly x: number
  readonly y: number
  readonly size: number
  readonly viewportScale: number
  readonly palette: CanvasPalette
}

/** Dấu tick ở góc kệ đang chọn trong chế độ xem. */
export function CanvasSelectionBadge({
  x,
  y,
  size,
  viewportScale,
  palette,
}: CanvasSelectionBadgeProps) {
  return (
    <Group x={x} y={y} listening={false}>
      <Rect
        width={size}
        height={size}
        cornerRadius={Math.min(4 / viewportScale, size * 0.18)}
        fill={palette.selectionFill}
        stroke={palette.viewerSelected}
        strokeWidth={Math.min(1.5 / viewportScale, size * 0.08)}
      />
      <Line
        points={[size * 0.23, size * 0.5, size * 0.42, size * 0.68, size * 0.76, size * 0.3]}
        stroke={palette.viewerSelected}
        strokeWidth={Math.min(2 / viewportScale, size * 0.1)}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  )
}
