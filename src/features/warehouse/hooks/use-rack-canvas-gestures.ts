import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { WarehouseLayoutEditorScene } from '../types/warehouse-layout-scene.types'
import type { RackEditingControls } from '../components/WarehouseDesigner/rack-editing.types'
import { getLayoutGeometryBounds, type LayoutBounds } from '../utils/layout-grid'
import {
  eligibleLayoutRacks,
  moveLayoutRacks,
  rackReferenceId,
  selectedLayoutRacks,
  type RackGuide,
  type RackPosition,
} from '../utils/layout-rack-operations'

interface Point {
  readonly x: number
  readonly y: number
}
interface RackGesture {
  readonly dragRackId?: string
  readonly scene: WarehouseLayoutEditorScene
  readonly ids: readonly string[]
  readonly kind: 'drag' | 'keys'
  readonly referenceId: string
  delta: Point
  positions: readonly RackPosition[]
}
type CanvasEvent = KonvaEventObject<MouseEvent | TouchEvent>
interface RackCanvasGestureProps {
  readonly scene: WarehouseLayoutEditorScene
  readonly controls?: RackEditingControls
  readonly nodes: RefObject<Map<string, Konva.Node>>
  readonly stage: RefObject<Konva.Stage | null>
  readonly scale: number
}

export function useRackCanvasGestures({
  scene,
  controls,
  nodes,
  stage,
  scale,
}: RackCanvasGestureProps) {
  const gesture = useRef<RackGesture | null>(null)
  const boxStart = useRef<{
    point: Point
    additive: boolean
    scene: WarehouseLayoutEditorScene
  } | null>(null)
  const suppressed = useRef(false)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [guides, setGuides] = useState<readonly RackGuide[]>([])
  const [marquee, setMarquee] = useState<LayoutBounds | null>(null)
  const onGestureChange = controls?.onGestureChange
  const locked = !controls || controls.locked

  const paint = useCallback(
    (source: WarehouseLayoutEditorScene, positions?: readonly RackPosition[]) => {
      const updates = positions
        ? new Map(positions.map((position) => [position.id, position]))
        : null
      for (const rack of source.racks) {
        const position = updates?.get(rack.id)
        if (updates && !position) continue
        nodes.current.get(`rack:${rack.id}`)?.position({
          x: (position?.x ?? rack.x) + rack.width / 2,
          y: (position?.y ?? rack.y) + rack.height / 2,
        })
      }
      stage.current?.batchDraw()
    },
    [nodes, stage]
  )

  const cancel = useCallback(() => {
    const active = Boolean(gesture.current || boxStart.current)
    if (!active) return false
    gesture.current = null
    boxStart.current = null
    stage.current?.stopDrag()
    for (const node of nodes.current.values()) if (node.isDragging()) node.stopDrag()
    paint(scene)
    setGuides([])
    setMarquee(null)
    onGestureChange?.(false)
    return true
  }, [scene, stage, nodes, paint, onGestureChange])

  useLayoutEffect(() => {
    if (
      locked ||
      (gesture.current?.scene !== undefined && gesture.current.scene !== scene) ||
      (boxStart.current && boxStart.current.scene !== scene)
    )
      cancel()
  }, [scene, locked, cancel])
  useEffect(() => {
    window.addEventListener('blur', cancel)
    const onVisibility = () => {
      if (document.hidden) cancel()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [cancel])
  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current)
    },
    []
  )

  function suppressClick() {
    suppressed.current = true
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => {
      suppressed.current = false
    }, 0)
  }

  function selectRack(id: string, additive: boolean) {
    if (locked || !controls || !eligibleLayoutRacks(scene).some((rack) => rack.id === id))
      return false
    if (!additive) return false
    const previous = controls.ids.length
      ? controls.ids
      : additive && controls.singleRackId
        ? [controls.singleRackId]
        : []
    const ids = previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    controls.onSelectionChange(ids, ids.includes(id) ? id : rackReferenceId(scene, ids))
    return true
  }

  function begin(
    ids: readonly string[],
    kind: RackGesture['kind'],
    referenceId: string,
    dragRackId?: string
  ) {
    if (
      gesture.current ||
      boxStart.current ||
      locked ||
      !controls ||
      !selectedLayoutRacks(scene, ids)
    )
      return false
    gesture.current = {
      scene,
      ids,
      kind,
      referenceId,
      dragRackId,
      delta: { x: 0, y: 0 },
      positions: [],
    }
    onGestureChange?.(true)
    return true
  }

  function preview(delta: Point, snapGrid: boolean, snapObjects: boolean) {
    const active = gesture.current
    if (!active || active.scene !== scene) return
    if (locked) {
      cancel()
      return
    }
    active.delta = delta
    const result = moveLayoutRacks(active.scene, active.ids, delta, {
      scale,
      snapGrid,
      snapObjects,
      referenceId: active.referenceId,
    })
    if (!result.ok) {
      controls?.onError(result.message)
      cancel()
      return
    }
    active.positions = result.positions
    paint(scene, result.positions)
    setGuides(result.guides)
  }

  function finish(kind: RackGesture['kind'], dragRackId?: string) {
    const active = gesture.current
    if (
      !active ||
      active.kind !== kind ||
      active.scene !== scene ||
      active.dragRackId !== dragRackId
    )
      return
    const positions = active.positions
    const valid = !locked && active.scene === scene
    gesture.current = null
    paint(scene)
    setGuides([])
    onGestureChange?.(false)
    suppressClick()
    if (valid && positions.length) controls?.onCommit(positions)
  }

  function dragStart(id: string) {
    if (!controls) return false
    const ids = controls.ids.includes(id) ? controls.ids : [id]
    if (controls.ids.length && !controls.ids.includes(id)) controls.onSelectionChange(ids, id)
    return begin(
      ids,
      'drag',
      ids.includes(controls.referenceId ?? '') ? controls.referenceId! : id,
      id
    )
  }
  function dragMove(id: string, node: Konva.Node) {
    const active = gesture.current
    const rack = active?.scene.racks.find((item) => item.id === id)
    if (!rack || active?.kind !== 'drag' || active.dragRackId !== id || active.scene !== scene)
      return
    preview(
      { x: node.x() - rack.width / 2 - rack.x, y: node.y() - rack.height / 2 - rack.y },
      true,
      controls?.snapObjects ?? false
    )
  }
  function nudge(ids: readonly string[], delta: Point, repeat = false) {
    if (!gesture.current && (repeat || !begin(ids, 'keys', controls?.referenceId ?? ids[0] ?? '')))
      return
    const active = gesture.current
    if (active?.kind !== 'keys') return
    preview({ x: active.delta.x + delta.x, y: active.delta.y + delta.y }, false, false)
  }

  function point(): Point | null {
    const pointer = stage.current?.getPointerPosition()
    return pointer && stage.current
      ? stage.current.getAbsoluteTransform().copy().invert().point(pointer)
      : null
  }
  function startBox(event: CanvasEvent) {
    if (
      gesture.current ||
      boxStart.current ||
      locked ||
      ('ctrlKey' in event.evt && event.evt.ctrlKey) ||
      ('button' in event.evt && event.evt.button !== 0)
    )
      return
    if ('touches' in event.evt && event.evt.touches.length !== 1) return
    let target: Konva.Node | null = event.target
    while (target && target !== stage.current) {
      const kind = target.getAttr('layoutKind')
      if (
        kind === 'rack' ||
        kind === 'decoration' ||
        target.getClassName() === 'Transformer' ||
        (kind === 'zone' && target.draggable())
      )
        return
      target = target.getParent()
    }
    const start = point()
    if (!start) return
    boxStart.current = {
      point: start,
      additive: 'shiftKey' in event.evt && event.evt.shiftKey,
      scene,
    }
    onGestureChange?.(true)
    event.cancelBubble = true
  }
  function moveBox(event: CanvasEvent) {
    if ('touches' in event.evt && event.evt.touches.length > 1) {
      cancel()
      return
    }
    const start = boxStart.current,
      current = point()
    if (!start || !current) return
    setMarquee({
      minX: Math.min(start.point.x, current.x),
      minY: Math.min(start.point.y, current.y),
      maxX: Math.max(start.point.x, current.x),
      maxY: Math.max(start.point.y, current.y),
    })
  }
  function finishBox() {
    const start = boxStart.current,
      end = point()
    if (!start) return
    boxStart.current = null
    setMarquee(null)
    onGestureChange?.(false)
    if (
      !end ||
      locked ||
      scene !== start.scene ||
      Math.hypot(end.x - start.point.x, end.y - start.point.y) * scale < 4
    )
      return
    const box = {
      minX: Math.min(start.point.x, end.x),
      minY: Math.min(start.point.y, end.y),
      maxX: Math.max(start.point.x, end.x),
      maxY: Math.max(start.point.y, end.y),
    }
    const ids = eligibleLayoutRacks(scene)
      .filter((rack) => {
        const bounds = getLayoutGeometryBounds(rack)
        return (
          bounds.minX >= box.minX &&
          bounds.minY >= box.minY &&
          bounds.maxX <= box.maxX &&
          bounds.maxY <= box.maxY
        )
      })
      .map((rack) => rack.id)
    const combined = [...new Set([...(start.additive ? (controls?.ids ?? []) : []), ...ids])]
    controls?.onSelectionChange(combined, rackReferenceId(scene, combined))
    suppressClick()
  }
  return {
    cancel,
    selectRack,
    dragStart,
    dragMove,
    dragEnd: (id: string) => finish('drag', id),
    nudge,
    finishNudge: () => finish('keys'),
    startBox,
    moveBox,
    finishBox,
    guides,
    marquee,
    isClickSuppressed: () => suppressed.current,
  }
}
