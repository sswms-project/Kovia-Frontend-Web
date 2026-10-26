import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import {
  CANVAS_PADDING,
  CANVAS_ZOOM_FACTOR,
  clampCanvasScale,
  getCanvasPaperBounds,
  getFitScale,
  type CanvasSize,
  type CanvasViewport,
} from '../utils/layout-canvas-view'
import { getLayoutGeometryBounds, type LayoutBounds } from '../utils/layout-grid'
import { rackGroupBounds, selectedLayoutRacks } from '../utils/layout-rack-operations'
import { useFrameThrottledScroll } from './use-frame-throttled-scroll'

interface CanvasViewportOptions {
  readonly containerRef: RefObject<HTMLDivElement | null>
  readonly size: CanvasSize
  readonly scene: WarehouseLayoutEditorScene
  readonly cancelGesture: () => void
  readonly onZoomChange: (zoomPercent: number) => void
}

function getBoundsCenter(bounds: LayoutBounds) {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
}

/**
 * Giữ mức zoom, vị trí cuộn và toạ độ "giấy" của canvas. Zoom/fit chỉ đặt tâm cần giữ và scale,
 * còn useLayoutEffect bên dưới cuộn khung về đúng tâm sau khi kích thước nội dung đã đổi.
 */
export function useCanvasViewport({
  containerRef,
  size,
  scene,
  cancelGesture,
  onZoomChange,
}: CanvasViewportOptions) {
  const isFitMode = useRef(true)
  const pendingCenter = useRef<{ x: number; y: number } | null>(null)
  const pendingFocus = useRef(false)
  const [revealRevision, setRevealRevision] = useState(0)
  const [scale, setScale] = useState(1)
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 })
  const handleScroll = useFrameThrottledScroll(setScrollPosition)

  const canvasWidth = scene.canvas.width
  const canvasHeight = scene.canvas.height
  const paperBounds = useMemo(
    () => getCanvasPaperBounds(canvasWidth, canvasHeight),
    [canvasHeight, canvasWidth]
  )
  const paperWidth = (paperBounds.maxX - paperBounds.minX) * scale
  const paperHeight = (paperBounds.maxY - paperBounds.minY) * scale
  const contentWidth = Math.max(size.width, paperWidth + CANVAS_PADDING * 2)
  const contentHeight = Math.max(size.height, paperHeight + CANVAS_PADDING * 2)
  const paperLeft = (contentWidth - paperWidth) / 2 - paperBounds.minX * scale
  const paperTop = (contentHeight - paperHeight) / 2 - paperBounds.minY * scale
  const viewport = useMemo<CanvasViewport>(
    () => ({
      scale,
      x: paperLeft - scrollPosition.left,
      y: paperTop - scrollPosition.top,
    }),
    [paperLeft, paperTop, scale, scrollPosition.left, scrollPosition.top]
  )

  const fit = useCallback(() => {
    if (!size.width || !size.height) return
    cancelGesture()
    isFitMode.current = true
    pendingCenter.current = getBoundsCenter(paperBounds)
    setScale(getFitScale(size.width, size.height, paperBounds))
  }, [paperBounds, size.height, size.width, cancelGesture])

  const zoomAtCenter = useCallback(
    (factor: number) => {
      cancelGesture()
      isFitMode.current = false
      pendingCenter.current = {
        x: (size.width / 2 - viewport.x) / viewport.scale,
        y: (size.height / 2 - viewport.y) / viewport.scale,
      }
      setScale((current) => clampCanvasScale(current * factor))
    },
    [size.height, size.width, viewport, cancelGesture]
  )
  const zoomIn = useCallback(() => zoomAtCenter(CANVAS_ZOOM_FACTOR), [zoomAtCenter])
  const zoomOut = useCallback(() => zoomAtCenter(1 / CANVAS_ZOOM_FACTOR), [zoomAtCenter])
  const zoomTo = useCallback(
    (zoomPercent: number) => {
      if (!size.width || !size.height) return
      cancelGesture()
      isFitMode.current = false
      pendingCenter.current = {
        x: (size.width / 2 - viewport.x) / viewport.scale,
        y: (size.height / 2 - viewport.y) / viewport.scale,
      }
      setScale(clampCanvasScale(zoomPercent / 100))
    },
    [size.height, size.width, viewport, cancelGesture]
  )

  const revealSelection = useCallback(
    (nextSelection: WarehouseLayoutSelection) => {
      const object =
        nextSelection.kind === 'zone'
          ? scene.zones.find((zone) => zone.id === nextSelection.id)
          : nextSelection.kind === 'rack'
            ? scene.racks.find((rack) => rack.id === nextSelection.id)
            : undefined
      if (!object || object.placementPending || !size.width || !size.height) return
      const bounds = getLayoutGeometryBounds(object)
      isFitMode.current = false
      pendingCenter.current = getBoundsCenter(bounds)
      pendingFocus.current = true
      setScale((current) => Math.min(current, getFitScale(size.width, size.height, bounds)))
      setRevealRevision((current) => current + 1)
    },
    [scene.racks, scene.zones, size.height, size.width]
  )

  const fitRacks = useCallback(
    (ids: readonly string[]) => {
      const racks = selectedLayoutRacks(scene, ids)
      if (!racks) return
      const bounds = rackGroupBounds(racks)
      isFitMode.current = false
      pendingCenter.current = getBoundsCenter(bounds)
      pendingFocus.current = true
      setScale(getFitScale(size.width, size.height, bounds))
      setRevealRevision((current) => current + 1)
    },
    [scene, size.height, size.width]
  )

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return
    if (isFitMode.current) fit()
  }, [fit, size])

  useLayoutEffect(() => {
    const container = containerRef.current
    const center = pendingCenter.current
    if (!container || !center || size.width <= 0 || size.height <= 0) return

    const nextLeft = Math.max(0, paperLeft + center.x * scale - size.width / 2)
    const nextTop = Math.max(0, paperTop + center.y * scale - size.height / 2)
    container.scrollTo({ left: nextLeft, top: nextTop, behavior: 'instant' })
    setScrollPosition({ left: nextLeft, top: nextTop })
    pendingCenter.current = null
    if (pendingFocus.current) {
      pendingFocus.current = false
      container.focus({ preventScroll: true })
    }
  }, [
    containerRef,
    contentHeight,
    contentWidth,
    paperLeft,
    paperTop,
    scale,
    revealRevision,
    size.height,
    size.width,
  ])

  useEffect(() => {
    onZoomChange(Math.round(scale * 100))
  }, [onZoomChange, scale])

  return {
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
  }
}
