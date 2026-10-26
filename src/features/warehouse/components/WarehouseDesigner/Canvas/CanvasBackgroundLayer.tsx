import { useMemo } from 'react'
import { Layer, Line, Rect } from 'react-konva'
import type { WarehouseLayoutEditorScene } from '../../../types/warehouse-layout-scene.types'
import {
  getVisibleGridLines,
  type CanvasSize,
  type CanvasViewport,
} from '../../../utils/layout-canvas-view'
import type { LayoutBounds } from '../../../utils/layout-grid'
import type { CanvasPalette } from './canvas-palette'

interface CanvasBackgroundLayerProps {
  readonly palette: CanvasPalette
  readonly paperBounds: LayoutBounds
  readonly canvas: WarehouseLayoutEditorScene['canvas']
  readonly isGridVisible: boolean
  readonly viewport: CanvasViewport
  readonly size: CanvasSize
  readonly onBackgroundClick: () => void
}

export function CanvasBackgroundLayer({
  palette,
  paperBounds,
  canvas,
  isGridVisible,
  viewport,
  size,
  onBackgroundClick,
}: CanvasBackgroundLayerProps) {
  const gridLines = useMemo(
    () => (isGridVisible ? getVisibleGridLines(canvas.gridSize, paperBounds, viewport, size) : []),
    [canvas.gridSize, isGridVisible, paperBounds, size, viewport]
  )

  return (
    <Layer>
      <Rect
        name="canvas-background"
        x={paperBounds.minX}
        y={paperBounds.minY}
        width={paperBounds.maxX - paperBounds.minX}
        height={paperBounds.maxY - paperBounds.minY}
        fill={palette.background}
        onClick={onBackgroundClick}
        onTap={onBackgroundClick}
      />
      {gridLines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          stroke={palette.border}
          strokeWidth={1 / viewport.scale}
          opacity={0.45}
          listening={false}
        />
      ))}
      <Rect
        x={0}
        y={0}
        width={canvas.width}
        height={canvas.height}
        stroke={palette.primary}
        strokeWidth={2 / viewport.scale}
        listening={false}
      />
    </Layer>
  )
}
