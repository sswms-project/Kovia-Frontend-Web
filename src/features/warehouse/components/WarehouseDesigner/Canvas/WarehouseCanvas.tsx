'use client'

import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Layer, Stage, Transformer } from 'react-konva'
import { cn } from '@/lib/utils'
import { useCanvasDrop } from '../../../hooks/use-canvas-drop'
import { useCanvasPalette } from '../../../hooks/use-canvas-palette'
import { useCanvasPan } from '../../../hooks/use-canvas-pan'
import { useCanvasSceneData } from '../../../hooks/use-canvas-scene-data'
import { useCanvasTransformer } from '../../../hooks/use-canvas-transformer'
import { useCanvasViewport } from '../../../hooks/use-canvas-viewport'
import { useCanvasZoomGestures } from '../../../hooks/use-canvas-zoom-gestures'
import { useContainerSize } from '../../../hooks/use-container-size'
import { useRackCanvasGestures } from '../../../hooks/use-rack-canvas-gestures'
import { rackGroupBounds, selectedLayoutRacks } from '../../../utils/layout-rack-operations'
import {
  LAYOUT_DECORATION_MARGIN,
  constrainLayoutGeometryToCanvas,
} from '../../../utils/layout-grid'
import { CanvasBackgroundLayer } from './CanvasBackgroundLayer'
import { CanvasDecorationLayer } from './CanvasDecorationLayer'
import { CanvasGestureOverlay } from './CanvasGestureOverlay'
import { CanvasHoverTooltip, type CanvasHoverTooltipHandle } from './CanvasHoverTooltip'
import { CanvasObjectLayer } from './CanvasObjectLayer'
import { CanvasRackToolsPopover } from './CanvasRackToolsPopover'
import { getCanvasNodeGeometry } from './canvas-node-geometry'
import type { CommitNodeGeometry, WarehouseCanvasProps } from './types'

export function WarehouseCanvas({
  ref,
  rackEditing,
  rackTools,
  scene,
  selection,
  canConfigure,
  mode = 'designer',
  metric = 'off',
  highlight = 'all',
  isGridVisible,
  onSelect,
  onGeometryChange,
  onZoomChange,
  onPaletteDrop,
}: WarehouseCanvasProps) {
  const palette = useCanvasPalette()
  const { containerRef, size } = useContainerSize()
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)
  const setCanvasContainer = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element
      setContainerElement(element)
    },
    [containerRef]
  )
  const stageRef = useRef<Konva.Stage>(null)
  // Giữ handle trong state (không phải ref) để các hàm render kệ có thể gọi nó mà không đọc ref lúc render.
  const [hoverTooltip, setHoverTooltip] = useState<CanvasHoverTooltipHandle | null>(null)
  const showHoverInfo = useCallback(
    (event: KonvaEventObject<MouseEvent>, code: string, name: string) => {
      const left = Math.min(event.evt.clientX + 12, window.innerWidth - 240)
      const top = Math.min(event.evt.clientY + 12, window.innerHeight - 128)
      hoverTooltip?.show({ code, name, left: Math.max(8, left), top: Math.max(8, top) })
    },
    [hoverTooltip]
  )
  const hideHoverInfo = useCallback(() => hoverTooltip?.hide(), [hoverTooltip])

  // Viewport cần huỷ thao tác kệ đang dở, còn thao tác kệ cần scale của viewport: nối vòng này qua ref.
  const cancelGestureRef = useRef<() => boolean>(() => false)
  const cancelGesture = useCallback(() => {
    cancelGestureRef.current()
  }, [])
  const {
    scale,
    viewport,
    paperBounds,
    paperLeft,
    paperTop,
    contentWidth,
    contentHeight,
    handleScroll,
    fit,
    zoomAtCenter,
    zoomIn,
    zoomOut,
    zoomTo,
    revealSelection,
    fitRacks,
  } = useCanvasViewport({ containerRef, size, scene, cancelGesture, onZoomChange })
  const data = useCanvasSceneData({ scene, mode, metric, highlight })
  const { transformerRef, objectNodes, setObjectNode } = useCanvasTransformer({
    scene,
    selection,
    canConfigure,
    rackEditing,
    activeZoneIds: data.activeZoneIds,
  })
  const rackGestures = useRackCanvasGestures({
    scene,
    controls: mode === 'designer' ? rackEditing : undefined,
    nodes: objectNodes,
    stage: stageRef,
    scale,
  })
  useEffect(() => {
    cancelGestureRef.current = rackGestures.cancel
  }, [rackGestures.cancel])

  useImperativeHandle(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      zoomTo,
      fit,
      revealSelection,
      fitRacks,
      cancelGesture: rackGestures.cancel,
      nudgeRacks: rackGestures.nudge,
      finishNudge: rackGestures.finishNudge,
    }),
    [fit, fitRacks, revealSelection, zoomIn, zoomOut, zoomTo, rackGestures]
  )

  const pan = useCanvasPan({ cancelGesture: rackGestures.cancel, onPanStart: hideHoverInfo })
  const zoomGestures = useCanvasZoomGestures({ zoomAtCenter, cancelGesture: rackGestures.cancel })
  const drop = useCanvasDrop({ canvas: scene.canvas, scale, paperLeft, paperTop, onPaletteDrop })

  const commitNodeGeometry = useCallback<CommitNodeGeometry>(
    (target, id, node, zIndex) => {
      const nodeGeometry = getCanvasNodeGeometry(node, zIndex)
      node.scaleX(1)
      node.scaleY(1)
      onGeometryChange(
        target,
        id,
        constrainLayoutGeometryToCanvas(
          nodeGeometry,
          scene.canvas,
          true,
          target === 'decoration' ? LAYOUT_DECORATION_MARGIN : 0
        )
      )
    },
    [onGeometryChange, scene.canvas]
  )

  if (!palette) {
    return (
      <div
        ref={containerRef}
        className="bg-muted h-full min-h-[28rem] w-full"
        role="application"
        aria-label="Mặt bằng kho tương tác đang tải"
        aria-busy="true"
      />
    )
  }

  const selectUnlessSuppressed = (next: Parameters<typeof onSelect>[0]) => {
    if (!rackGestures.isClickSuppressed()) onSelect(next)
  }
  const objectLayerProps = {
    scene,
    data,
    selection,
    mode,
    canConfigure,
    rackEditing,
    rackGestures,
    palette,
    viewportScale: scale,
    onSelect,
    onCommitGeometry: commitNodeGeometry,
    setObjectNode,
    showHoverInfo,
    hideHoverInfo,
  }
  const toolRacks = rackEditing ? selectedLayoutRacks(scene, rackEditing.ids) : null
  const toolBounds = toolRacks?.length ? rackGroupBounds(toolRacks) : null
  const toolsVisible = Boolean(
    mode === 'designer' &&
    canConfigure &&
    !rackEditing?.locked &&
    rackTools &&
    toolBounds &&
    viewport.x + toolBounds.maxX * scale >= 0 &&
    viewport.x + toolBounds.minX * scale <= size.width &&
    viewport.y + toolBounds.maxY * scale >= 0 &&
    viewport.y + toolBounds.minY * scale <= size.height
  )

  return (
    <div
      ref={setCanvasContainer}
      className={cn(
        'bg-diagram-canvas-surface focus-visible:ring-ring relative h-full min-h-0 w-full touch-none overflow-auto overscroll-contain outline-none select-none focus-visible:ring-2 focus-visible:ring-inset',
        pan.isPanning ? 'cursor-grabbing' : 'cursor-default'
      )}
      role="application"
      aria-label="Mặt bằng kho tương tác"
      aria-describedby="warehouse-canvas-instructions"
      tabIndex={0}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.28) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          if (rackGestures.cancel()) event.stopPropagation()
          else onSelect(null)
        }
      }}
      onPointerDownCapture={pan.handlePointerDown}
      onTouchStartCapture={zoomGestures.handleTouchStart}
      onTouchMoveCapture={zoomGestures.handleTouchMove}
      onTouchEndCapture={zoomGestures.handleTouchEnd}
      onTouchCancelCapture={zoomGestures.handleTouchCancel}
      onPointerMove={pan.handlePointerMove}
      onPointerUp={pan.handlePointerUp}
      onPointerCancel={(event) => {
        rackGestures.cancel()
        pan.handlePointerUp(event)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) rackGestures.cancel()
      }}
      onMouseLeave={hideHoverInfo}
      onDragOver={drop.handleDragOver}
      onDrop={drop.handleDrop}
      onScroll={handleScroll}
    >
      <p id="warehouse-canvas-instructions" className="sr-only">
        Dùng danh sách đối tượng để chọn bằng bàn phím. Nhấn Escape để bỏ chọn.
      </p>
      {size.width > 0 && size.height > 0 ? (
        <div style={{ width: contentWidth, height: contentHeight }} className="relative">
          <div className="sticky top-0 left-0" style={{ width: size.width, height: size.height }}>
            <Stage
              ref={stageRef}
              width={size.width}
              height={size.height}
              x={viewport.x}
              y={viewport.y}
              scaleX={scale}
              scaleY={scale}
              draggable={false}
              onClick={(event) => {
                if (event.evt.ctrlKey) event.cancelBubble = true
              }}
              onWheel={zoomGestures.handleWheel}
              onMouseDown={rackGestures.startBox}
              onMouseMove={rackGestures.moveBox}
              onMouseUp={rackGestures.finishBox}
              onMouseLeave={rackGestures.finishBox}
              onTouchStart={rackGestures.startBox}
              onTouchMove={rackGestures.moveBox}
              onTouchEnd={rackGestures.finishBox}
            >
              <CanvasBackgroundLayer
                palette={palette}
                paperBounds={paperBounds}
                canvas={scene.canvas}
                isGridVisible={isGridVisible}
                viewport={viewport}
                size={size}
                onBackgroundClick={() => selectUnlessSuppressed(null)}
              />
              <CanvasObjectLayer target="zone" objects={data.sortedZones} {...objectLayerProps} />
              <CanvasObjectLayer target="rack" objects={data.sortedRacks} {...objectLayerProps} />
              <CanvasDecorationLayer
                decorations={data.sortedDecorations}
                gridSize={scene.canvas.gridSize}
                selection={selection}
                mode={mode}
                isDraggable={canConfigure && !rackEditing?.locked}
                palette={palette}
                viewportScale={scale}
                onSelect={onSelect}
                onCommitGeometry={commitNodeGeometry}
                setObjectNode={setObjectNode}
              />
              <CanvasGestureOverlay
                groupBounds={toolBounds && (rackEditing?.ids.length ?? 0) > 1 ? toolBounds : null}
                rackGestures={rackGestures}
                canvas={scene.canvas}
                palette={palette}
                scale={scale}
              />
              <Layer>
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  flipEnabled={false}
                  borderStroke={palette.primary}
                  anchorStroke={palette.primary}
                  anchorFill={palette.card}
                  anchorSize={8}
                  rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                  boundBoxFunc={(oldBox, newBox) =>
                    Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20 ? oldBox : newBox
                  }
                />
              </Layer>
            </Stage>
            {toolsVisible && toolBounds ? (
              <CanvasRackToolsPopover
                toolBounds={toolBounds}
                viewport={viewport}
                size={size}
                collisionBoundary={containerElement}
                onClose={() => rackEditing?.onSelectionChange([], null)}
                onCloseAutoFocus={() => {
                  if (document.activeElement === document.body)
                    containerRef.current?.focus({ preventScroll: true })
                }}
              >
                {rackTools}
              </CanvasRackToolsPopover>
            ) : null}
          </div>
        </div>
      ) : null}
      <CanvasHoverTooltip
        ref={setHoverTooltip}
        suppressed={toolsVisible || Boolean(rackGestures.marquee)}
      />
    </div>
  )
}
