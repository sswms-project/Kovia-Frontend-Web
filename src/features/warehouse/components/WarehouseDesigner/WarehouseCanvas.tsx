'use client'

import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
  ReactNode,
} from 'react'
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva'
import { cn } from '@/lib/utils'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { useRackCanvasGestures } from '../../hooks/use-rack-canvas-gestures'
import { rackGroupBounds, selectedLayoutRacks } from '../../utils/layout-rack-operations'
import { getLayoutLocationLabel } from '../../utils/layout-placement'
import type { RackEditingControls } from './rack-editing.types'
import type {
  WarehouseLayoutDecorationType,
  WarehouseLayoutEditorScene,
  WarehouseLayoutGeometry,
  WarehouseLayoutGeometryTarget,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import {
  constrainLayoutGeometryToCanvas,
  getLayoutGeometryBounds,
  LAYOUT_DECORATION_MARGIN,
  snapToGrid,
  type LayoutBounds,
} from '../../utils/layout-grid'
import {
  hasLayoutDragData,
  isPaletteDecorationType,
  readLayoutDragData,
  type LayoutPaletteDragData,
} from './designer-constants'

const MIN_SCALE = 0.2
const MAX_SCALE = 4
const ZOOM_FACTOR = 1.15
const CANVAS_PADDING = 32
const SCROLLBAR_ALLOWANCE = 18

interface CanvasPalette {
  background: string
  foreground: string
  muted: string
  border: string
  primary: string
  accent: string
  destructive: string
  errorContainer: string
  card: string
  warning: string
  warningContainer: string
  selectionFill: string
  selectionForeground: string
  viewerSelected: string
  viewerOccupied: string
}

interface CanvasHoverInfo {
  readonly code: string
  readonly name: string
  readonly left: number
  readonly top: number
}

interface WarehouseCanvasProps {
  readonly rackEditing?: RackEditingControls
  readonly rackTools?: ReactNode
  readonly ref?: React.Ref<WarehouseCanvasHandle>
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly canConfigure: boolean
  readonly mode?: 'designer' | 'viewer'
  readonly isGridVisible: boolean
  readonly onSelect: (selection: WarehouseLayoutSelection | null) => void
  readonly onGeometryChange: (
    target: WarehouseLayoutGeometryTarget,
    id: string,
    geometry: WarehouseLayoutGeometry
  ) => void
  readonly onZoomChange: (zoomPercent: number) => void
  readonly onPaletteDrop: (payload: LayoutPaletteDragData, x: number, y: number) => void
}

export interface WarehouseCanvasHandle {
  cancelGesture: () => boolean
  nudgeRacks: (ids: readonly string[], delta: { x: number; y: number }, repeat?: boolean) => void
  finishNudge: () => void
  fitRacks: (ids: readonly string[]) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomTo: (zoomPercent: number) => void
  fit: () => void
  revealSelection: (selection: WarehouseLayoutSelection) => void
}

function readCanvasPalette(): CanvasPalette {
  const styles = getComputedStyle(document.documentElement)
  const read = (token: string) => styles.getPropertyValue(token).trim()
  const isDark = document.documentElement.classList.contains('dark')
  return {
    background: isDark ? '#111827' : '#FFFFFF',
    foreground: isDark ? '#E5E7EB' : '#1F2937',
    muted: isDark ? '#1F2937' : '#F2F4F7',
    border: isDark ? '#475569' : '#CBD5E1',
    primary: read('--diagram-outline'),
    accent: read('--diagram-zone-fill'),
    destructive: read('--destructive'),
    errorContainer: read('--error-container'),
    card: isDark ? '#172033' : '#FFFFFF',
    warning: read('--warning'),
    warningContainer: read('--warning-container'),
    selectionFill: read('--canvas-selection-fill'),
    selectionForeground: read('--canvas-selection-foreground'),
    viewerSelected: read('--diagram-viewer-selected') || '#FF9800',
    viewerOccupied: read('--secondary-container'),
  }
}

function useCanvasPalette() {
  const [palette, setPalette] = useState<CanvasPalette | null>(null)

  useEffect(() => {
    const updatePalette = () => setPalette(readCanvasPalette())
    updatePalette()
    const observer = new MutationObserver(updatePalette)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return palette
}

function useContainerSize() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = (width: number, height: number) => {
      const nextWidth = Math.floor(width)
      const nextHeight = Math.floor(height)
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      )
    }
    const initialBounds = container.getBoundingClientRect()
    updateSize(initialBounds.width, initialBounds.height)

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      updateSize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return { containerRef, size }
}

function getFitScale(containerWidth: number, containerHeight: number, bounds: LayoutBounds) {
  const availableWidth = Math.max(containerWidth - CANVAS_PADDING * 2 - SCROLLBAR_ALLOWANCE, 1)
  const availableHeight = Math.max(containerHeight - CANVAS_PADDING * 2 - SCROLLBAR_ALLOWANCE, 1)
  const canvasWidth = Math.max(bounds.maxX - bounds.minX, 1)
  const canvasHeight = Math.max(bounds.maxY - bounds.minY, 1)
  return Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight))
  )
}

function isSelected(
  selection: WarehouseLayoutSelection | null,
  kind: WarehouseLayoutSelection['kind'],
  id: string
) {
  return selection?.kind === kind && selection.id === id
}

function parseHexColor(color: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color)
  if (!match) return null
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
  ] as const
}

function getRelativeLuminance(color: string) {
  const rgb = parseHexColor(color)
  if (!rgb) return null
  const channels = rgb.map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

function getContrastRatio(first: string, second: string) {
  const firstLuminance = getRelativeLuminance(first)
  const secondLuminance = getRelativeLuminance(second)
  if (firstLuminance === null || secondLuminance === null) return 0
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

function getReadableCanvasColor(background: string, palette: CanvasPalette) {
  return getContrastRatio(background, palette.foreground) >=
    getContrastRatio(background, palette.background)
    ? palette.foreground
    : palette.background
}

function renderDecorationSymbol(
  type: WarehouseLayoutDecorationType,
  width: number,
  height: number,
  palette: CanvasPalette,
  foreground?: string,
  sizeMultiplier = 1
) {
  const iconSize =
    Math.max(20, Math.min(width, height - (height >= 58 ? 18 : 0)) * 0.62) * sizeMultiplier
  const scale = iconSize / 24
  const x = (width - iconSize) / 2
  const y = Math.max(0, (height - iconSize - (height >= 58 ? 18 : 0)) / 2)
  const stroke = foreground ?? palette.foreground
  const strokeWidth = 1.6
  let symbol: React.ReactNode

  switch (type) {
    case 'Door':
      symbol = (
        <>
          <Line points={[3, 22, 21, 22]} stroke={stroke} strokeWidth={2} />
          <Line points={[6, 22, 6, 4]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[6, 4, 16, 4, 21, 12, 21, 22]}
            bezier
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )
      break
    case 'DoubleDoor':
      symbol = (
        <>
          <Line points={[1, 22, 23, 22]} stroke={stroke} strokeWidth={2} />
          <Line points={[4, 22, 4, 7]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[20, 22, 20, 7]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[4, 7, 12, 7, 12, 15, 12, 22]}
            bezier
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[20, 7, 12, 7, 12, 15, 12, 22]}
            bezier
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )
      break
    case 'Gate':
      symbol = (
        <>
          <Line points={[3, 4, 3, 21, 6, 21, 6, 4, 3, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[18, 4, 18, 21, 21, 21, 21, 4, 18, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[6, 14, 18, 14]} stroke={stroke} strokeWidth={2} />
          <Rect x={10.5} y={11.5} width={3} height={5} stroke={stroke} strokeWidth={1.2} />
        </>
      )
      break
    case 'DirectionArrow':
      symbol = (
        <Line
          points={[3, 12, 19, 12, 14, 7, 19, 12, 14, 17]}
          stroke={stroke}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      )
      break
    case 'Exit':
      symbol = (
        <>
          <Rect x={3} y={3} width={12} height={18} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[9, 12, 22, 12, 18, 8, 22, 12, 18, 16]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )
      break
    case 'Forklift':
      symbol = (
        <>
          <Rect x={3} y={8} width={12} height={9} fill={stroke} opacity={0.16} />
          <Line points={[5, 8, 5, 3, 8, 3, 8, 8]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[12, 8, 12, 3, 15, 3, 17, 17, 21, 17]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line points={[5, 12, 14, 12]} stroke={stroke} strokeWidth={1.2} />
          <Circle x={7} y={20} radius={2.2} fill={stroke} />
          <Circle x={17} y={20} radius={2.2} fill={stroke} />
        </>
      )
      break
    case 'PalletTruck':
      symbol = (
        <>
          <Rect x={6} y={3} width={12} height={17} fill={stroke} opacity={0.16} />
          <Line points={[8, 7, 16, 7]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[8, 10, 16, 10]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[8, 13, 16, 13]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[8, 16, 16, 16]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[6, 5, 3, 5, 3, 21, 21, 21]} stroke={stroke} strokeWidth={strokeWidth} />
          <Circle x={7} y={22} radius={1.5} fill={stroke} />
          <Circle x={18} y={22} radius={1.5} fill={stroke} />
        </>
      )
      break
    case 'Packing':
      symbol = (
        <>
          <Rect x={4} y={5} width={16} height={15} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[4, 10, 20, 10]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[12, 5, 12, 20]} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )
      break
    case 'Picking':
      symbol = (
        <>
          <Rect x={4} y={4} width={16} height={16} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[7, 12, 10.5, 15.5, 17, 8]} stroke={stroke} strokeWidth={2} />
        </>
      )
      break
    case 'Damaged':
      symbol = (
        <>
          <Line
            points={[12, 2, 22, 21, 2, 21]}
            closed
            stroke={foreground ?? palette.destructive}
            strokeWidth={strokeWidth}
          />
          <Text
            x={9}
            y={7}
            width={6}
            text="!"
            align="center"
            fill={foreground ?? palette.destructive}
            fontSize={12}
          />
        </>
      )
      break
    case 'Office':
      symbol = (
        <>
          <Rect x={4} y={3} width={16} height={18} stroke={stroke} strokeWidth={strokeWidth} />
          <Rect x={7} y={7} width={3} height={3} stroke={stroke} strokeWidth={1} />
          <Rect x={14} y={7} width={3} height={3} stroke={stroke} strokeWidth={1} />
          <Rect x={10} y={14} width={5} height={7} stroke={stroke} strokeWidth={1} />
        </>
      )
      break
    case 'DoubleGate':
      symbol = (
        <>
          <Line points={[3, 4, 3, 21, 6, 21, 6, 4, 3, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[18, 4, 18, 21, 21, 21, 21, 4, 18, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[6, 16, 18, 10]} stroke={stroke} strokeWidth={2} />
          <Rect x={10.5} y={10.5} width={3} height={5} stroke={stroke} strokeWidth={1.2} />
        </>
      )
      break
    case 'Aisle':
      symbol = (
        <>
          <Line points={[4, 3, 4, 21]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[20, 3, 20, 21]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[8, 12, 16, 12]} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )
      break
    case 'Receiving':
      symbol = (
        <>
          <Rect x={4} y={5} width={16} height={15} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[2, 12, 12, 12, 9, 9, 12, 12, 9, 15]} stroke={stroke} strokeWidth={1.5} />
        </>
      )
      break
    case 'Other':
      symbol = (
        <>
          <Line
            points={[12, 2, 21, 7, 12, 12, 3, 7, 12, 2]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[3, 7, 3, 17, 12, 22, 21, 17, 21, 7]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line points={[12, 12, 12, 22]} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )
      break
    default:
      symbol = <Rect x={4} y={4} width={16} height={16} stroke={stroke} strokeWidth={strokeWidth} />
  }

  return (
    <Group x={x} y={y} scaleX={scale} scaleY={scale} listening={false}>
      {symbol}
    </Group>
  )
}

export function WarehouseCanvas({
  ref,
  rackEditing,
  rackTools,
  scene,
  selection,
  canConfigure,
  mode = 'designer',
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
  const transformerRef = useRef<Konva.Transformer>(null)
  const objectNodes = useRef(new Map<string, Konva.Node>())
  const lastPinchDistance = useRef<number | null>(null)
  const pointerPanStart = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [hoverInfo, setHoverInfo] = useState<CanvasHoverInfo | null>(null)
  const isFitMode = useRef(true)
  const pendingCenter = useRef<{ x: number; y: number } | null>(null)
  const pendingFocus = useRef(false)
  const [revealRevision, setRevealRevision] = useState(0)
  const [scale, setScale] = useState(1)
  const rackGestures = useRackCanvasGestures({
    scene,
    controls: mode === 'designer' ? rackEditing : undefined,
    nodes: objectNodes,
    stage: stageRef,
    scale,
  })
  const cancelRackGesture = rackGestures.cancel
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 })
  const activeZoneIds = useMemo(
    () => new Set(scene.zones.filter((zone) => zone.status === 'Active').map((zone) => zone.id)),
    [scene.zones]
  )
  const visibleRacks = useMemo(
    () =>
      scene.racks.filter(
        (rack) =>
          !rack.placementPending &&
          !scene.zones.find((zone) => zone.id === rack.zoneId)?.placementPending
      ),
    [scene.racks, scene.zones]
  )
  const selectedRackId =
    selection?.kind === 'rack'
      ? selection.id
      : selection?.kind === 'slot'
        ? scene.slots.find((slot) => slot.id === selection.id)?.rackId
        : rackEditing?.referenceId
  const selectedZoneId =
    selection?.kind === 'zone'
      ? selection.id
      : scene.racks.find((rack) => rack.id === selectedRackId)?.zoneId
  const effectiveBounds = useMemo(
    () => ({
      minX: -LAYOUT_DECORATION_MARGIN,
      minY: -LAYOUT_DECORATION_MARGIN,
      maxX: scene.canvas.width + LAYOUT_DECORATION_MARGIN,
      maxY: scene.canvas.height + LAYOUT_DECORATION_MARGIN,
    }),
    [scene.canvas.height, scene.canvas.width]
  )
  const paperWidth = (effectiveBounds.maxX - effectiveBounds.minX) * scale
  const paperHeight = (effectiveBounds.maxY - effectiveBounds.minY) * scale
  const contentWidth = Math.max(size.width, paperWidth + CANVAS_PADDING * 2)
  const contentHeight = Math.max(size.height, paperHeight + CANVAS_PADDING * 2)
  const paperLeft = (contentWidth - paperWidth) / 2 - effectiveBounds.minX * scale
  const paperTop = (contentHeight - paperHeight) / 2 - effectiveBounds.minY * scale
  const viewport = useMemo(
    () => ({
      scale,
      x: paperLeft - scrollPosition.left,
      y: paperTop - scrollPosition.top,
    }),
    [paperLeft, paperTop, scale, scrollPosition.left, scrollPosition.top]
  )

  const fit = useCallback(() => {
    if (!size.width || !size.height) return
    cancelRackGesture()
    isFitMode.current = true
    pendingCenter.current = {
      x: (effectiveBounds.minX + effectiveBounds.maxX) / 2,
      y: (effectiveBounds.minY + effectiveBounds.maxY) / 2,
    }
    setScale(getFitScale(size.width, size.height, effectiveBounds))
  }, [effectiveBounds, size.height, size.width, cancelRackGesture])

  const zoomAtCenter = useCallback(
    (factor: number) => {
      cancelRackGesture()
      isFitMode.current = false
      pendingCenter.current = {
        x: (size.width / 2 - viewport.x) / viewport.scale,
        y: (size.height / 2 - viewport.y) / viewport.scale,
      }
      setScale((current) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor)))
    },
    [size.height, size.width, viewport, cancelRackGesture]
  )
  const zoomTo = useCallback(
    (zoomPercent: number) => {
      if (!size.width || !size.height) return
      cancelRackGesture()
      isFitMode.current = false
      pendingCenter.current = {
        x: (size.width / 2 - viewport.x) / viewport.scale,
        y: (size.height / 2 - viewport.y) / viewport.scale,
      }
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoomPercent / 100)))
    },
    [size.height, size.width, viewport, cancelRackGesture]
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
      pendingCenter.current = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      }
      pendingFocus.current = true
      setScale((current) => Math.min(current, getFitScale(size.width, size.height, bounds)))
      setRevealRevision((current) => current + 1)
    },
    [scene.racks, scene.zones, size.height, size.width]
  )

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomAtCenter(ZOOM_FACTOR),
      zoomOut: () => zoomAtCenter(1 / ZOOM_FACTOR),
      zoomTo,
      fit,
      revealSelection,
      cancelGesture: rackGestures.cancel,
      nudgeRacks: rackGestures.nudge,
      finishNudge: rackGestures.finishNudge,
      fitRacks: (ids) => {
        const racks = selectedLayoutRacks(scene, ids)
        if (!racks) return
        const bounds = rackGroupBounds(racks)
        isFitMode.current = false
        pendingCenter.current = {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2,
        }
        pendingFocus.current = true
        setScale(getFitScale(size.width, size.height, bounds))
        setRevealRevision((current) => current + 1)
      },
    }),
    [fit, revealSelection, zoomAtCenter, zoomTo, rackGestures, scene, size]
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

  const canTransformSelection = (() => {
    if (!canConfigure || !selection || rackEditing?.ids.length || rackEditing?.locked) return false
    if (selection.kind === 'decoration') return true
    if (selection.kind === 'zone') {
      return scene.zones.some((zone) => zone.id === selection.id && zone.status === 'Active')
    }
    if (selection.kind === 'rack') {
      return scene.racks.some(
        (rack) =>
          rack.id === selection.id && rack.status === 'Active' && activeZoneIds.has(rack.zoneId)
      )
    }
    return false
  })()
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : null
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const selectedNode = selectionKey ? objectNodes.current.get(selectionKey) : undefined
    transformer.nodes(selectedNode && canTransformSelection ? [selectedNode] : [])
    transformer.getLayer()?.batchDraw()
  }, [canTransformSelection, selectionKey])

  const setObjectNode = useCallback((key: string, node: Konva.Node | null) => {
    if (node) objectNodes.current.set(key, node)
    else objectNodes.current.delete(key)
  }, [])

  const gridLines = useMemo(() => {
    if (!isGridVisible || scene.canvas.gridSize * viewport.scale < 7) return []
    const lines: { points: number[]; key: string }[] = []
    const overscan = scene.canvas.gridSize
    const visibleBounds = {
      minX: -viewport.x / viewport.scale - overscan,
      minY: -viewport.y / viewport.scale - overscan,
      maxX: (size.width - viewport.x) / viewport.scale + overscan,
      maxY: (size.height - viewport.y) / viewport.scale + overscan,
    }
    const minX = Math.max(effectiveBounds.minX, visibleBounds.minX)
    const maxX = Math.min(effectiveBounds.maxX, visibleBounds.maxX)
    const minY = Math.max(effectiveBounds.minY, visibleBounds.minY)
    const maxY = Math.min(effectiveBounds.maxY, visibleBounds.maxY)
    const startX = Math.floor(minX / scene.canvas.gridSize) * scene.canvas.gridSize
    const endX = Math.ceil(maxX / scene.canvas.gridSize) * scene.canvas.gridSize
    const startY = Math.floor(minY / scene.canvas.gridSize) * scene.canvas.gridSize
    const endY = Math.ceil(maxY / scene.canvas.gridSize) * scene.canvas.gridSize

    for (let x = startX; x <= endX; x += scene.canvas.gridSize) {
      if (x < effectiveBounds.minX || x > effectiveBounds.maxX) continue
      lines.push({ key: `x-${x}`, points: [x, minY, x, maxY] })
    }
    for (let y = startY; y <= endY; y += scene.canvas.gridSize) {
      if (y < effectiveBounds.minY || y > effectiveBounds.maxY) continue
      lines.push({ key: `y-${y}`, points: [minX, y, maxX, y] })
    }
    return lines
  }, [effectiveBounds, isGridVisible, scene.canvas.gridSize, size, viewport])
  const sortedZones = useMemo(
    () =>
      scene.zones
        .filter((zone) => !zone.placementPending)
        .toSorted((first, second) => first.zIndex - second.zIndex),
    [scene.zones]
  )
  const sortedRacks = useMemo(
    () => visibleRacks.toSorted((first, second) => first.zIndex - second.zIndex),
    [visibleRacks]
  )
  const sortedDecorations = useMemo(
    () => scene.decorations.toSorted((first, second) => first.zIndex - second.zIndex),
    [scene.decorations]
  )
  const slotsByRack = useMemo(() => {
    const result = new Map<string, WarehouseLayoutEditorScene['slots']>()
    for (const slot of scene.slots) {
      const rackSlots = result.get(slot.rackId) ?? []
      rackSlots.push(slot)
      result.set(slot.rackId, rackSlots)
    }
    return result
  }, [scene.slots])

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
  const canvasPalette = palette

  function handleWheel(event: KonvaEventObject<WheelEvent>) {
    if (!event.evt.ctrlKey) return
    rackGestures.cancel()
    event.evt.preventDefault()
    const direction = event.evt.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR
    zoomAtCenter(direction)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Portalled selection tools must keep their own focus and native button interaction.
    if (event.target instanceof Node && !event.currentTarget.contains(event.target)) return
    event.currentTarget.focus({ preventScroll: true })
    if (!event.ctrlKey || event.button !== 0) return
    rackGestures.cancel()
    setHoverInfo(null)
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerPanStart.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    }
    setIsPanning(true)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerPanStart.current
    if (!start || start.pointerId !== event.pointerId) return
    event.preventDefault()
    event.currentTarget.scrollLeft = start.scrollLeft - (event.clientX - start.clientX)
    event.currentTarget.scrollTop = start.scrollTop - (event.clientY - start.clientY)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerPanStart.current?.pointerId !== event.pointerId) return
    pointerPanStart.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsPanning(false)
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      if (lastPinchDistance.current !== null) {
        event.stopPropagation()
      }
      return
    }
    // Capture before Konva suppresses touchmove during drag; touch-none prevents browser zoom.
    event.stopPropagation()
    rackGestures.cancel()
    const [firstTouch, secondTouch] = Array.from(event.touches)
    if (!firstTouch || !secondTouch) return
    const distance = Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY
    )
    const previousDistance = lastPinchDistance.current
    lastPinchDistance.current = distance
    if (!previousDistance) return
    const factor = distance / previousDistance
    zoomAtCenter(factor)
  }

  function getNodeGeometry(node: Konva.Node, zIndex: number): WarehouseLayoutGeometry {
    const width = Math.max(1, node.width() * node.scaleX())
    const height = Math.max(1, node.height() * node.scaleY())
    return {
      x: node.x() - width / 2,
      y: node.y() - height / 2,
      width,
      height,
      rotation: node.rotation(),
      zIndex,
    }
  }

  function showHoverInfo(event: KonvaEventObject<MouseEvent>, code: string, name: string) {
    const left = Math.min(event.evt.clientX + 12, window.innerWidth - 240)
    const top = Math.min(event.evt.clientY + 12, window.innerHeight - 128)
    setHoverInfo({ code, name, left: Math.max(8, left), top: Math.max(8, top) })
  }

  function commitNodeGeometry(
    target: WarehouseLayoutGeometryTarget,
    id: string,
    node: Konva.Node,
    zIndex: number
  ) {
    const nodeGeometry = getNodeGeometry(node, zIndex)
    node.scaleX(1)
    node.scaleY(1)
    const geometry = constrainLayoutGeometryToCanvas(
      nodeGeometry,
      scene.canvas,
      true,
      target === 'decoration' ? LAYOUT_DECORATION_MARGIN : 0
    )
    onGeometryChange(target, id, geometry)
  }

  function renderBusinessObject(
    target: 'zone' | 'rack',
    object:
      | WarehouseLayoutEditorScene['zones'][number]
      | WarehouseLayoutEditorScene['racks'][number]
  ) {
    const isRack = 'rackCode' in object
    const code = isRack ? object.rackCode : object.zoneCode
    const key = `${target}:${object.id}`
    const selected =
      isSelected(selection, target, object.id) ||
      (isRack && Boolean(rackEditing?.ids.includes(object.id)))
    const isZone = !isRack
    const parentHighlighted = isZone && object.id === selectedZoneId
    const rack = isRack ? object : null
    const usesRackGestures = Boolean(rackEditing && rack && !rack.placementPending)
    const isEditableRack = Boolean(
      usesRackGestures && rack?.status === 'Active' && activeZoneIds.has(rack.zoneId)
    )
    const rackSlots = rack ? (slotsByRack.get(rack.id) ?? []) : []
    const hasStock = isZone
      ? scene.slots.some((slot) => slot.zoneId === object.id && slot.currentOccupancy > 0)
      : rackSlots.some((slot) => slot.currentOccupancy > 0)
    const objectFill =
      mode === 'viewer'
        ? object.status === 'Inactive'
          ? canvasPalette.errorContainer
          : selected
            ? canvasPalette.selectionFill
            : isZone
              ? canvasPalette.accent
              : hasStock
                ? canvasPalette.viewerOccupied
                : canvasPalette.card
        : isZone
          ? canvasPalette.accent
          : (object.color ?? canvasPalette.card)
    const objectForeground = object.color
      ? getReadableCanvasColor(object.color, canvasPalette)
      : canvasPalette.foreground
    const selectionStroke = mode === 'viewer' ? canvasPalette.viewerSelected : canvasPalette.primary
    const checkBadgeSize = Math.min(22 / viewport.scale, object.width * 0.45, object.height * 0.45)
    const checkBadgeInset = Math.min(
      4 / viewport.scale,
      Math.max(0, (Math.min(object.width, object.height) - checkBadgeSize) / 2)
    )
    const canMoveObject =
      canConfigure &&
      !rackEditing?.locked &&
      (!isZone || !rackEditing || selected) &&
      object.status === 'Active' &&
      (isZone || (rack !== null && activeZoneIds.has(rack.zoneId)))
    return (
      <Group
        key={key}
        layoutKind={target}
        ref={(node) => setObjectNode(key, node)}
        x={object.x + object.width / 2}
        y={object.y + object.height / 2}
        offsetX={object.width / 2}
        offsetY={object.height / 2}
        width={object.width}
        height={object.height}
        rotation={object.rotation}
        draggable={canMoveObject}
        dragBoundFunc={
          isEditableRack
            ? (position) => position
            : (position) => ({
                x:
                  snapToGrid(position.x - object.width / 2, scene.canvas.gridSize) +
                  object.width / 2,
                y:
                  snapToGrid(position.y - object.height / 2, scene.canvas.gridSize) +
                  object.height / 2,
              })
        }
        onMouseEnter={(event) =>
          showHoverInfo(event, code, getLayoutLocationLabel(scene, { kind: target, id: object.id }))
        }
        onMouseLeave={() => setHoverInfo(null)}
        onClick={(event) => {
          event.cancelBubble = true
          if (rackGestures.isClickSuppressed()) return
          if (isRack && rackGestures.selectRack(object.id, event.evt.shiftKey)) return
          onSelect({ kind: target, id: object.id })
        }}
        onTap={(event) => {
          event.cancelBubble = true
          if (rackGestures.isClickSuppressed()) return
          if (isRack && rackGestures.selectRack(object.id, false)) return
          onSelect({ kind: target, id: object.id })
        }}
        onDragStart={(event) => {
          if (!isEditableRack) return
          event.cancelBubble = true
          if (!rackGestures.dragStart(object.id)) event.target.stopDrag()
        }}
        onDragMove={(event) => {
          if (!isEditableRack) return
          event.cancelBubble = true
          rackGestures.dragMove(object.id, event.target)
        }}
        onDragEnd={(event) => {
          event.cancelBubble = true
          if (usesRackGestures) {
            rackGestures.dragEnd(object.id)
            return
          }
          commitNodeGeometry(target, object.id, event.target, object.zIndex)
        }}
        onTransformEnd={(event) => {
          event.cancelBubble = true
          commitNodeGeometry(target, object.id, event.target, object.zIndex)
        }}
      >
        <Rect
          name={`${target}:${object.id}`}
          width={object.width}
          height={object.height}
          fill={objectFill}
          stroke={
            selected || parentHighlighted
              ? selectionStroke
              : object.status === 'Inactive'
                ? canvasPalette.destructive
                : isZone
                  ? (object.color ?? canvasPalette.primary)
                  : canvasPalette.foreground
          }
          strokeWidth={
            selected || parentHighlighted
              ? (rackEditing?.referenceId === object.id ? 2.5 : mode === 'viewer' ? 1.5 : 1.25) /
                viewport.scale
              : 1 / viewport.scale
          }
          cornerRadius={isZone ? 4 : 2}
        />
        {rack?.layoutShape === 'Vertical' ? (
          <Line
            points={[rack.width / 2, 4, rack.width / 2, rack.height - 4]}
            stroke={objectForeground}
            strokeWidth={1 / viewport.scale}
            listening={false}
          />
        ) : null}
        {rack?.layoutShape === 'CrossBraced' ? (
          <>
            <Line
              points={[5, 5, rack.width - 5, rack.height - 5]}
              stroke={objectForeground}
              strokeWidth={1.5 / viewport.scale}
              listening={false}
            />
            <Line
              points={[rack.width - 5, 5, 5, rack.height - 5]}
              stroke={objectForeground}
              strokeWidth={1.5 / viewport.scale}
              listening={false}
            />
          </>
        ) : null}
        {rack?.layoutShape === 'Pallet' ? (
          <>
            {[0.3, 0.5, 0.7].map((fraction) => (
              <Line
                key={fraction}
                points={[
                  rack.width * fraction,
                  rack.height * 0.12,
                  rack.width * fraction,
                  rack.height * 0.88,
                ]}
                stroke={objectForeground}
                strokeWidth={2 / viewport.scale}
                listening={false}
              />
            ))}
            {[0.35, 0.65].map((fraction) => (
              <Line
                key={fraction}
                points={[
                  rack.width * 0.12,
                  rack.height * fraction,
                  rack.width * 0.88,
                  rack.height * fraction,
                ]}
                stroke={objectForeground}
                strokeWidth={1 / viewport.scale}
                listening={false}
              />
            ))}
          </>
        ) : null}
        {rack
          ? renderRackSlots(
              rack,
              rackSlots,
              canvasPalette,
              selection,
              (next) => {
                if (!rackGestures.isClickSuppressed()) onSelect(next)
              },
              mode,
              showHoverInfo,
              () => setHoverInfo(null),
              (shift) => rackGestures.isClickSuppressed() || rackGestures.selectRack(rack.id, shift)
            )
          : null}
        {mode === 'viewer' && selected && target === 'rack' ? (
          <Group
            x={object.width - checkBadgeSize - checkBadgeInset}
            y={checkBadgeInset}
            listening={false}
          >
            <Rect
              width={checkBadgeSize}
              height={checkBadgeSize}
              cornerRadius={Math.min(4 / viewport.scale, checkBadgeSize * 0.18)}
              fill={canvasPalette.selectionFill}
              stroke={canvasPalette.viewerSelected}
              strokeWidth={Math.min(1.5 / viewport.scale, checkBadgeSize * 0.08)}
            />
            <Line
              points={[
                checkBadgeSize * 0.23,
                checkBadgeSize * 0.5,
                checkBadgeSize * 0.42,
                checkBadgeSize * 0.68,
                checkBadgeSize * 0.76,
                checkBadgeSize * 0.3,
              ]}
              stroke={canvasPalette.viewerSelected}
              strokeWidth={Math.min(2 / viewport.scale, checkBadgeSize * 0.1)}
              lineCap="round"
              lineJoin="round"
            />
          </Group>
        ) : null}
      </Group>
    )
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
        'focus-visible:ring-ring relative h-full min-h-0 w-full touch-none overflow-auto overscroll-contain bg-[#eef1f5] outline-none select-none focus-visible:ring-2 focus-visible:ring-inset dark:bg-slate-950',
        isPanning ? 'cursor-grabbing' : 'cursor-default'
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
      onPointerDownCapture={handlePointerDown}
      onTouchStartCapture={(event) => {
        if (event.touches.length >= 2) lastPinchDistance.current = null
        handleTouchMove(event)
      }}
      onTouchMoveCapture={handleTouchMove}
      onTouchEndCapture={(event) => {
        if (lastPinchDistance.current === null) return
        event.stopPropagation()
        if (event.touches.length === 0) lastPinchDistance.current = null
      }}
      onTouchCancelCapture={(event) => {
        rackGestures.cancel()
        lastPinchDistance.current = event.touches.length ? 0 : null
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(event) => {
        rackGestures.cancel()
        handlePointerUp(event)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) rackGestures.cancel()
      }}
      onMouseLeave={() => setHoverInfo(null)}
      onDragOver={(event) => {
        if (hasLayoutDragData(event.dataTransfer)) event.preventDefault()
      }}
      onDrop={(event) => {
        const payload = readLayoutDragData(event.dataTransfer)
        if (!payload) return
        event.preventDefault()
        const bounds = event.currentTarget.getBoundingClientRect()
        const x = snapToGrid(
          (event.clientX - bounds.left + event.currentTarget.scrollLeft - paperLeft) / scale,
          scene.canvas.gridSize
        )
        const y = snapToGrid(
          (event.clientY - bounds.top + event.currentTarget.scrollTop - paperTop) / scale,
          scene.canvas.gridSize
        )
        const margin = payload.kind === 'decoration' ? LAYOUT_DECORATION_MARGIN : 0
        if (
          x < -margin ||
          y < -margin ||
          x > scene.canvas.width + margin ||
          y > scene.canvas.height + margin
        )
          return
        onPaletteDrop(payload, x, y)
      }}
      onScroll={(event) => {
        setScrollPosition({
          left: event.currentTarget.scrollLeft,
          top: event.currentTarget.scrollTop,
        })
      }}
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
              onWheel={handleWheel}
              onMouseDown={rackGestures.startBox}
              onMouseMove={rackGestures.moveBox}
              onMouseUp={rackGestures.finishBox}
              onMouseLeave={rackGestures.finishBox}
              onTouchStart={rackGestures.startBox}
              onTouchMove={rackGestures.moveBox}
              onTouchEnd={rackGestures.finishBox}
            >
              <Layer>
                <Rect
                  name="canvas-background"
                  x={effectiveBounds.minX}
                  y={effectiveBounds.minY}
                  width={effectiveBounds.maxX - effectiveBounds.minX}
                  height={effectiveBounds.maxY - effectiveBounds.minY}
                  fill={canvasPalette.background}
                  onClick={() => {
                    if (!rackGestures.isClickSuppressed()) onSelect(null)
                  }}
                  onTap={() => {
                    if (!rackGestures.isClickSuppressed()) onSelect(null)
                  }}
                />
                {gridLines.map((line) => (
                  <Line
                    key={line.key}
                    points={line.points}
                    stroke={canvasPalette.border}
                    strokeWidth={1 / viewport.scale}
                    opacity={0.45}
                    listening={false}
                  />
                ))}
                <Rect
                  x={0}
                  y={0}
                  width={scene.canvas.width}
                  height={scene.canvas.height}
                  stroke={canvasPalette.primary}
                  strokeWidth={2 / viewport.scale}
                  listening={false}
                />
              </Layer>
              <Layer>{sortedZones.map((zone) => renderBusinessObject('zone', zone))}</Layer>
              <Layer>{sortedRacks.map((rack) => renderBusinessObject('rack', rack))}</Layer>
              <Layer>
                {sortedDecorations.map((decoration) => {
                  const key = `decoration:${decoration.clientKey}`
                  const selected = isSelected(selection, 'decoration', decoration.clientKey)
                  const decorationFill = decoration.color ?? canvasPalette.background
                  const decorationForeground = decoration.color ?? canvasPalette.foreground
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
                      draggable={canConfigure && !rackEditing?.locked}
                      dragBoundFunc={(position) => ({
                        x:
                          snapToGrid(position.x - decoration.width / 2, scene.canvas.gridSize) +
                          decoration.width / 2,
                        y:
                          snapToGrid(position.y - decoration.height / 2, scene.canvas.gridSize) +
                          decoration.height / 2,
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
                        commitNodeGeometry(
                          'decoration',
                          decoration.clientKey,
                          event.target,
                          decoration.zIndex
                        )
                      }}
                      onTransformEnd={(event) => {
                        event.cancelBubble = true
                        commitNodeGeometry(
                          'decoration',
                          decoration.clientKey,
                          event.target,
                          decoration.zIndex
                        )
                      }}
                    >
                      <Rect
                        name={`decoration:${decoration.clientKey}`}
                        width={decoration.width}
                        height={decoration.height}
                        fill={mode === 'viewer' && selected ? decorationFill : 'transparent'}
                        opacity={mode === 'viewer' && selected ? 1 : 0}
                        stroke={selected ? canvasPalette.primary : 'transparent'}
                        strokeWidth={selected ? (mode === 'viewer' ? 1.5 : 1) / viewport.scale : 0}
                        cornerRadius={2}
                      />
                      {isPaletteDecorationType(decoration.type)
                        ? renderDecorationSymbol(
                            decoration.type,
                            decoration.width,
                            decoration.height,
                            canvasPalette,
                            canvasPalette.background,
                            1.14
                          )
                        : null}
                      {renderDecorationSymbol(
                        decoration.type,
                        decoration.width,
                        decoration.height,
                        canvasPalette,
                        decoration.color ? decorationForeground : undefined
                      )}
                    </Group>
                  )
                })}
              </Layer>
              <Layer listening={false}>
                {toolBounds && (rackEditing?.ids.length ?? 0) > 1 ? (
                  <Rect
                    x={toolBounds.minX}
                    y={toolBounds.minY}
                    width={toolBounds.maxX - toolBounds.minX}
                    height={toolBounds.maxY - toolBounds.minY}
                    stroke={canvasPalette.primary}
                    strokeWidth={1 / viewport.scale}
                    dash={[5 / viewport.scale, 3 / viewport.scale]}
                  />
                ) : null}
                {rackGestures.guides.map((guide) => (
                  <Line
                    key={`${guide.axis}:${guide.value}`}
                    points={
                      guide.axis === 'x'
                        ? [guide.value, 0, guide.value, scene.canvas.height]
                        : [0, guide.value, scene.canvas.width, guide.value]
                    }
                    stroke={canvasPalette.primary}
                    strokeWidth={1 / scale}
                    dash={[5 / scale, 4 / scale]}
                  />
                ))}
                {rackGestures.marquee ? (
                  <Rect
                    x={rackGestures.marquee.minX}
                    y={rackGestures.marquee.minY}
                    width={rackGestures.marquee.maxX - rackGestures.marquee.minX}
                    height={rackGestures.marquee.maxY - rackGestures.marquee.minY}
                    fill={canvasPalette.selectionFill}
                    opacity={0.4}
                    stroke={canvasPalette.primary}
                    strokeWidth={1 / scale}
                  />
                ) : null}
              </Layer>
              <Layer>
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  flipEnabled={false}
                  borderStroke={canvasPalette.primary}
                  anchorStroke={canvasPalette.primary}
                  anchorFill={canvasPalette.card}
                  anchorSize={8}
                  rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                  boundBoxFunc={(oldBox, newBox) =>
                    Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20 ? oldBox : newBox
                  }
                />
              </Layer>
            </Stage>
            {toolsVisible && toolBounds ? (
              <Popover
                open
                onOpenChange={(open) => {
                  if (!open) rackEditing?.onSelectionChange([], null)
                }}
              >
                <PopoverAnchor asChild>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute size-px"
                    style={{
                      left: Math.max(
                        8,
                        Math.min(size.width - 8, viewport.x + toolBounds.maxX * scale)
                      ),
                      top: Math.max(
                        8,
                        Math.min(size.height - 8, viewport.y + toolBounds.maxY * scale)
                      ),
                    }}
                  />
                </PopoverAnchor>
                <PopoverContent
                  aria-label="Căn chỉnh nhóm kệ"
                  align="end"
                  sideOffset={8}
                  collisionBoundary={containerElement}
                  collisionPadding={12}
                  className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 animation-duration-200 max-h-(--radix-popover-content-available-height) w-76 max-w-(--radix-popover-content-available-width) overflow-y-auto overscroll-contain motion-reduce:animate-none"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    if (document.activeElement === document.body)
                      containerRef.current?.focus({ preventScroll: true })
                  }}
                  onInteractOutside={(event) => event.preventDefault()}
                >
                  {rackTools}
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </div>
      ) : null}
      {hoverInfo && !toolsVisible && !rackGestures.marquee ? (
        <div
          role="tooltip"
          className="bg-popover text-popover-foreground pointer-events-none fixed z-50 max-w-56 rounded-md border px-3 py-2 text-xs break-words shadow-sm"
          style={{ left: hoverInfo.left, top: hoverInfo.top }}
        >
          <p>
            <span className="text-muted-foreground">Mã vị trí: </span>
            <span translate="no" className="font-mono break-all">
              {hoverInfo.code}
            </span>
          </p>
          <p className="mt-1 break-words">
            <span className="text-muted-foreground">Tên vị trí: </span>
            {hoverInfo.name}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function renderRackSlots(
  rack: WarehouseLayoutEditorScene['racks'][number],
  slots: WarehouseLayoutEditorScene['slots'],
  palette: CanvasPalette,
  selection: WarehouseLayoutSelection | null,
  onSelect: (selection: WarehouseLayoutSelection | null) => void,
  mode: 'designer' | 'viewer',
  onHover: (event: KonvaEventObject<MouseEvent>, code: string, name: string) => void,
  onHoverEnd: () => void,
  onRackSelect?: (shift: boolean) => boolean
) {
  if (slots.length === 0 || rack.width < 60 || rack.height < 45) return null
  const gap = 3
  const availableWidth = Math.max(rack.width - 20, 1)
  const availableHeight = Math.max(rack.height - 52, 1)
  const visibleSlots = slots.slice(0, 60)
  const columns = Math.min(
    visibleSlots.length,
    Math.max(1, Math.ceil(Math.sqrt(visibleSlots.length * (availableWidth / availableHeight))))
  )
  const rows = Math.ceil(visibleSlots.length / columns)
  const slotWidth = (availableWidth - gap * (columns - 1)) / columns
  const slotHeight = (availableHeight - gap * (rows - 1)) / rows
  if (slotWidth < 7 || slotHeight < 7) return null

  return visibleSlots.map((slot, index) => {
    const x = 10 + (index % columns) * (slotWidth + gap)
    const y = 42 + Math.floor(index / columns) * (slotHeight + gap)
    const selected = isSelected(selection, 'slot', slot.id)
    const fill =
      mode === 'viewer'
        ? !slot.isActive
          ? palette.errorContainer
          : selected
            ? palette.selectionFill
            : slot.currentOccupancy > 0
              ? palette.viewerOccupied
              : palette.card
        : !slot.isActive
          ? palette.muted
          : slot.occupancyStatus === 'Vacant'
            ? palette.card
            : slot.occupancyStatus === 'Reserved'
              ? palette.warningContainer
              : palette.accent
    return (
      <Group
        key={slot.id}
        x={x}
        y={y}
        onMouseEnter={(event) => onHover(event, slot.slotCode, slot.slotName)}
        onMouseLeave={onHoverEnd}
        onClick={(event) => {
          event.cancelBubble = true
          if (onRackSelect?.(event.evt.shiftKey)) return
          onSelect({ kind: 'slot', id: slot.id })
        }}
        onTap={(event) => {
          event.cancelBubble = true
          if (onRackSelect?.(false)) return
          onSelect({ kind: 'slot', id: slot.id })
        }}
      >
        <Rect
          name={`slot:${slot.id}`}
          width={slotWidth}
          height={slotHeight}
          fill={fill}
          opacity={mode === 'designer' && !slot.isActive ? 0.55 : 1}
          stroke={
            selected
              ? mode === 'viewer'
                ? palette.viewerSelected
                : palette.primary
              : mode === 'viewer' && !slot.isActive
                ? palette.destructive
                : palette.border
          }
          strokeWidth={selected ? (mode === 'viewer' ? 1.5 : 1.25) : 1}
          cornerRadius={2}
        />
        {mode === 'viewer' && selected && slotWidth >= 14 && slotHeight >= 10 ? (
          <Line
            points={[
              slotWidth * 0.3,
              slotHeight * 0.52,
              slotWidth * 0.45,
              slotHeight * 0.68,
              slotWidth * 0.72,
              slotHeight * 0.32,
            ]}
            stroke={palette.selectionForeground}
            strokeWidth={1.5}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        ) : null}
      </Group>
    )
  })
}
