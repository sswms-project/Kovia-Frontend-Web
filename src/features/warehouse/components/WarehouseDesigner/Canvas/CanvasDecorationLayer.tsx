import { Group, Layer, Rect } from 'react-konva'
import type { WarehouseLayoutSelection } from '../../../types/warehouse-layout-scene.types'
import { isPaletteDecorationType } from '../../../utils/layout-decoration-options'
import { snapToGrid } from '../../../utils/layout-grid'
import type { CanvasPalette } from './canvas-palette'
import { isSelected } from './canvas-selection'
import { renderDecorationSymbol } from './decoration-symbol-rendering'
import type { CanvasDecoration, CanvasMode, CommitNodeGeometry, SetObjectNode } from './types'

interface CanvasDecorationLayerProps {
  readonly decorations: readonly CanvasDecoration[]
  readonly gridSize: number
  readonly selection: WarehouseLayoutSelection | null
  readonly mode: CanvasMode
  readonly isDraggable: boolean
  readonly palette: CanvasPalette
  readonly viewportScale: number
  readonly onSelect: (selection: WarehouseLayoutSelection | null) => void
  readonly onCommitGeometry: CommitNodeGeometry
  readonly setObjectNode: SetObjectNode
}

export function CanvasDecorationLayer({
  decorations,
  gridSize,
  selection,
  mode,
  isDraggable,
  palette,
  viewportScale,
  onSelect,
  onCommitGeometry,
  setObjectNode,
}: CanvasDecorationLayerProps) {
  function renderDecoration(decoration: CanvasDecoration) {
    const key = `decoration:${decoration.clientKey}`
    const selected = isSelected(selection, 'decoration', decoration.clientKey)
    const decorationFill = decoration.color ?? palette.background
    const decorationForeground = decoration.color ?? palette.foreground
    return (
      <Group
        key={key}
        layoutKind="decoration"
        ref={(node) => setObjectNode(key, node)}
        x={decoration.x + decoration.width / 2}
        y={decoration.y + decoration.height / 2}
        offsetX={decoration.width / 2}
        offsetY={decoration.height / 2}
        width={decoration.width}
        height={decoration.height}
        rotation={decoration.rotation}
        draggable={isDraggable}
        dragBoundFunc={(position) => ({
          x: snapToGrid(position.x - decoration.width / 2, gridSize) + decoration.width / 2,
          y: snapToGrid(position.y - decoration.height / 2, gridSize) + decoration.height / 2,
        })}
        onClick={(event) => {
          event.cancelBubble = true
          onSelect({ kind: 'decoration', id: decoration.clientKey })
        }}
        onTap={(event) => {
          event.cancelBubble = true
          onSelect({ kind: 'decoration', id: decoration.clientKey })
        }}
        onDragEnd={(event) => {
          event.cancelBubble = true
          onCommitGeometry('decoration', decoration.clientKey, event.target, decoration.zIndex)
        }}
        onTransformEnd={(event) => {
          event.cancelBubble = true
          onCommitGeometry('decoration', decoration.clientKey, event.target, decoration.zIndex)
        }}
      >
        <Rect
          name={`decoration:${decoration.clientKey}`}
          width={decoration.width}
          height={decoration.height}
          fill={mode === 'viewer' && selected ? decorationFill : 'transparent'}
          opacity={mode === 'viewer' && selected ? 1 : 0}
          stroke={selected ? palette.primary : 'transparent'}
          strokeWidth={selected ? (mode === 'viewer' ? 1.5 : 1) / viewportScale : 0}
          cornerRadius={2}
        />
        {isPaletteDecorationType(decoration.type)
          ? renderDecorationSymbol(
              decoration.type,
              decoration.width,
              decoration.height,
              palette,
              palette.background,
              1.14
            )
          : null}
        {renderDecorationSymbol(
          decoration.type,
          decoration.width,
          decoration.height,
          palette,
          decoration.color ? decorationForeground : undefined
        )}
      </Group>
    )
  }

  return <Layer>{decorations.map(renderDecoration)}</Layer>
}
