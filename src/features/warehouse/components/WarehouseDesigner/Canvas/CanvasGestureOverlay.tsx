import { Layer, Line, Rect } from 'react-konva'
import type { LayoutBounds } from '../../../utils/layout-grid'
import type { CanvasPalette } from './canvas-palette'
import type { RackCanvasGestures } from './types'

interface CanvasGestureOverlayProps {
  /** Khung bao nhóm kệ đang chọn; chỉ vẽ khi chọn nhiều kệ. */
  readonly groupBounds: LayoutBounds | null
  readonly rackGestures: RackCanvasGestures
  readonly canvas: { readonly width: number; readonly height: number }
  readonly palette: CanvasPalette
  readonly scale: number
}

/** Khung nhóm, đường gióng và khung chọn vùng; không nhận sự kiện chuột. */
export function CanvasGestureOverlay({
  groupBounds,
  rackGestures,
  canvas,
  palette,
  scale,
}: CanvasGestureOverlayProps) {
  const { guides, marquee } = rackGestures
  return (
    <Layer listening={false}>
      {groupBounds ? (
        <Rect
          x={groupBounds.minX}
          y={groupBounds.minY}
          width={groupBounds.maxX - groupBounds.minX}
          height={groupBounds.maxY - groupBounds.minY}
          stroke={palette.primary}
          strokeWidth={1 / scale}
          dash={[5 / scale, 3 / scale]}
        />
      ) : null}
      {guides.map((guide) => (
        <Line
          key={`${guide.axis}:${guide.value}`}
          points={
            guide.axis === 'x'
              ? [guide.value, 0, guide.value, canvas.height]
              : [0, guide.value, canvas.width, guide.value]
          }
          stroke={palette.primary}
          strokeWidth={1 / scale}
          dash={[5 / scale, 4 / scale]}
        />
      ))}
      {marquee ? (
        <Rect
          x={marquee.minX}
          y={marquee.minY}
          width={marquee.maxX - marquee.minX}
          height={marquee.maxY - marquee.minY}
          fill={palette.selectionFill}
          opacity={0.4}
          stroke={palette.primary}
          strokeWidth={1 / scale}
        />
      ) : null}
    </Layer>
  )
}
