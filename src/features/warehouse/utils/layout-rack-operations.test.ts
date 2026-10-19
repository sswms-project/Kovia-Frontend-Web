import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'
import type Konva from 'konva'
import { Group } from 'konva/lib/Group'
import { Transform } from 'konva/lib/Util'
import { describe, expect, it, vi } from 'vitest'
import { useRackCanvasGestures } from '../hooks/use-rack-canvas-gestures'
import {
  createLayoutEditorHistory,
  layoutEditorHistoryReducer,
} from '../hooks/use-layout-editor-history'
import type { RackEditingControls } from '../components/WarehouseDesigner/rack-editing.types'
import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
} from '../types/warehouse-layout-scene.types'
import { constrainLayoutGeometryToCanvas, getLayoutGeometryBounds } from './layout-grid'
import {
  applyRackPositions,
  arrangeLayoutRacks,
  eligibleLayoutRacks,
  moveLayoutRacks,
  rackReferenceId,
  type RackOperationResult,
} from './layout-rack-operations'
import { mapEditorSceneToSaveRequest, mapWarehouseLayoutScene } from './layout-scene-mapper'

const rack = (
  id: string,
  x: number,
  y: number,
  overrides: Partial<WarehouseLayoutEditorRack> = {}
): WarehouseLayoutEditorRack => ({
  id,
  zoneId: 'zone',
  zoneCode: 'Z',
  rackCode: id,
  rackName: id,
  description: null,
  status: 'Active',
  layoutShape: 'Standard',
  x,
  y,
  width: 80,
  height: 40,
  rotation: 0,
  zIndex: 1,
  ...overrides,
})
const scene: WarehouseLayoutEditorScene = {
  canvas: { width: 1000, height: 700, gridSize: 20 },
  zones: [
    {
      id: 'zone',
      zoneCode: 'Z',
      zoneName: 'Zone',
      status: 'Active',
      x: 0,
      y: 0,
      width: 1000,
      height: 700,
      rotation: 0,
      zIndex: 0,
    },
  ],
  racks: [rack('a', 100, 100), rack('b', 250, 180), rack('c', 500, 300, { width: 120 })],
  slots: [],
  decorations: [
    {
      id: 'd',
      clientKey: 'd',
      type: 'Forklift',
      label: 'Xe nâng',
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      rotation: 0,
      zIndex: 2,
    },
  ],
}
function positions(result: RackOperationResult) {
  if (!result.ok) throw new Error(result.message)
  return result.positions
}

describe('rack batch geometry', () => {
  it('rejects pending/inactive/orphan racks and duplicate/invalid batches atomically', () => {
    const source = {
      ...scene,
      racks: [
        ...scene.racks,
        rack('pending', 0, 0, { placementPending: true }),
        rack('inactive', 0, 0, { status: 'Inactive' }),
        rack('orphan', 0, 0, { zoneId: 'missing' }),
      ],
    }
    expect(eligibleLayoutRacks(source).map((item) => item.id)).toEqual(['a', 'b', 'c'])
    for (const invalid of [
      [
        { id: 'a', x: 120, y: 100 },
        { id: 'pending', x: 20, y: 20 },
      ],
      [
        { id: 'a', x: 10, y: 10 },
        { id: 'a', x: 20, y: 20 },
      ],
      [{ id: 'a', x: NaN, y: 10 }],
      [{ id: 'a', x: 10.123, y: 10 }],
      [{ id: 'a', x: -1, y: 10 }],
    ]) {
      expect(applyRackPositions(source, invalid)).toBe(source)
    }
  })
  it.each([0, 45, 23.45, 90, 270])(
    'clamps the common delta at all edges without resizing/rotating (%s degrees)',
    (rotation) => {
      const source = {
        ...scene,
        racks: [
          rack('a', 150.25, 170.25, { rotation }),
          rack('b', 400.25, 200.25, { rotation, width: 160 }),
        ],
      }
      for (const delta of [
        { x: -5000, y: -5000 },
        { x: 5000, y: 5000 },
        { x: -5000, y: 5000 },
        { x: 5000, y: -5000 },
      ]) {
        const moved = applyRackPositions(
          source,
          positions(moveLayoutRacks(source, ['a', 'b'], delta))
        )
        expect(moved.racks[1]!.x - moved.racks[0]!.x).toBeCloseTo(250)
        expect(moved.racks[1]!.y - moved.racks[0]!.y).toBeCloseTo(30)
        moved.racks.forEach((item, index) => {
          const bounds = getLayoutGeometryBounds(item)
          expect(bounds.minX).toBeGreaterThanOrEqual(0)
          expect(bounds.minY).toBeGreaterThanOrEqual(0)
          expect(bounds.maxX).toBeLessThanOrEqual(source.canvas.width)
          expect(bounds.maxY).toBeLessThanOrEqual(source.canvas.height)
          expect(item.width).toBe(source.racks[index]!.width)
          expect(item.rotation).toBe(rotation)
        })
      }
    }
  )
  it.each(['left', 'right', 'top', 'bottom', 'center-x', 'center-y'] as const)(
    'aligns %s to the reference, including rotated racks',
    (operation) => {
      const source = {
        ...scene,
        racks: [
          rack('a', 200, 200, { rotation: 45 }),
          rack('b', 420, 350, { width: 120, rotation: 23.45 }),
        ],
      }
      const result = applyRackPositions(
        source,
        positions(arrangeLayoutRacks(source, ['a', 'b'], 'a', operation))
      )
      expect(result.racks[0]).toEqual(source.racks[0])
      const [a, b] = result.racks.map(getLayoutGeometryBounds)
      const value = (bounds: NonNullable<typeof a>) =>
        operation === 'left'
          ? bounds.minX
          : operation === 'right'
            ? bounds.maxX
            : operation === 'top'
              ? bounds.minY
              : operation === 'bottom'
                ? bounds.maxY
                : operation === 'center-x'
                  ? (bounds.minX + bounds.maxX) / 2
                  : (bounds.minY + bounds.maxY) / 2
      expect(Math.abs(value(a!) - value(b!))).toBeLessThanOrEqual(0.01000001)
    }
  )
  it('uses edge gaps, fixes outer racks and rejects insufficient space', () => {
    const result = applyRackPositions(
      scene,
      positions(arrangeLayoutRacks(scene, ['c', 'b', 'a'], 'a', 'distribute-x'))
    )
    expect(result.racks[0]).toEqual(scene.racks[0])
    expect(result.racks[2]).toEqual(scene.racks[2])
    expect(result.racks[1]!.x - 180).toBe(500 - result.racks[1]!.x - 80)
    const crowded = { ...scene, racks: scene.racks.map((item) => ({ ...item, x: 100 })) }
    expect(arrangeLayoutRacks(crowded, ['a', 'b', 'c'], 'a', 'distribute-x').ok).toBe(false)
    expect(rackReferenceId(scene, ['b', 'a'])).toBe('a')
  })
  it('uses six screen pixels and keeps off-grid snapped coordinates through history/save', () => {
    const source = { ...scene, racks: [rack('a', 100, 100), rack('b', 303.27, 240)] }
    const snap = moveLayoutRacks(source, ['a'], { x: 121, y: 0 }, { scale: 2, snapObjects: true })
    expect(snap.ok && snap.guides.some((guide) => guide.axis === 'x')).toBe(true)
    const state = layoutEditorHistoryReducer(createLayoutEditorHistory(source), {
      type: 'move-racks',
      positions: positions(snap),
    })
    expect(state.present.racks[0]!.x).toBe(223.27)
    expect(mapEditorSceneToSaveRequest('w', 1, state.present).racks[0]!.x).toBe(223.27)
    const noSnap = moveLayoutRacks(source, ['a'], { x: 119, y: 0 }, { scale: 2, snapObjects: true })
    expect(noSnap.ok && noSnap.guides.some((guide) => guide.axis === 'x')).toBe(false)
  })
  it('preserves business identity/slots/decorations and makes one reversible history step', () => {
    let state = createLayoutEditorHistory(scene)
    const change = positions(moveLayoutRacks(scene, ['a', 'b'], { x: 20, y: 20 }))
    state = layoutEditorHistoryReducer(state, { type: 'move-racks', positions: change })
    expect(state.past).toHaveLength(1)
    expect(state.present.slots).toBe(scene.slots)
    expect(state.present.decorations).toBe(scene.decorations)
    expect(mapEditorSceneToSaveRequest('w', 2, state.present).decorations).toHaveLength(1)
    const unchanged = layoutEditorHistoryReducer(state, { type: 'move-racks', positions: change })
    expect(unchanged).toBe(state)
    const undone = layoutEditorHistoryReducer(state, { type: 'undo' })
    expect(undone.present).toBe(scene)
    expect(layoutEditorHistoryReducer(undone, { type: 'redo' }).present).toBe(state.present)
  })
  it('does not round a persisted fractional angle during passive reading', () => {
    const geometry = rack('a', 150.25, 100.27, { rotation: 23.45 })
    expect(constrainLayoutGeometryToCanvas(geometry, scene.canvas, false)).toMatchObject({
      x: 150.25,
      y: 100.27,
      rotation: 23.45,
    })
  })
  it('changes the grid without re-snapping geometry and rejects a canvas that cuts objects', () => {
    const source = { ...scene, racks: [rack('a', 223.27, 150.25, { rotation: 23.45 })] }
    const state = createLayoutEditorHistory(source)
    const changed = layoutEditorHistoryReducer(state, {
      type: 'update-canvas',
      canvas: { ...source.canvas, gridSize: 30 },
    })
    expect(changed.present.racks).toBe(source.racks)
    expect(changed.present.decorations).toBe(source.decorations)
    expect(
      layoutEditorHistoryReducer(changed, {
        type: 'update-canvas',
        canvas: { ...source.canvas, width: 100 },
      })
    ).toBe(changed)
  })
  it.each(['RackLevel', 'SlotLevel'] as const)(
    'keeps %s business data and all slots untouched across a decimal round trip',
    (storageMode) => {
      const source: WarehouseLayoutEditorScene = {
        ...scene,
        racks: [
          rack('a', 150.25, 170.25, {
            rotation: 45,
            storageMode,
            defaultSlotId: storageMode === 'RackLevel' ? 'slot' : null,
            capacityType: 'Quantity',
            capacityUnitId: 'u',
            capacity: 100,
            currentOccupancy: 24,
            storageCapacity: 1000,
            storageCapacityUnit: 'Kilogram',
            physicalLength: 3,
            physicalLengthUnit: 'Meter',
          }),
        ],
        slots: [
          {
            id: 'slot',
            zoneId: 'zone',
            rackId: 'a',
            slotCode: 'S1',
            slotName: 'Slot',
            description: null,
            occupancyStatus: 'Occupied',
            isActive: true,
            capacity: 100,
            currentOccupancy: 24,
            capacityType: 'Quantity',
            capacityUnitId: 'u',
            isOutboundStaging: false,
          },
        ],
      }
      const moved = applyRackPositions(
        source,
        positions(moveLayoutRacks(source, ['a'], { x: -10000, y: 10000 }))
      )
      expect(moved.slots).toBe(source.slots)
      const { x, y } = moved.racks[0]!
      expect(moved.racks[0]).toEqual({ ...source.racks[0], x, y })
      const roundTrip = { ...moved.racks[0]!, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
      const bounds = getLayoutGeometryBounds(roundTrip)
      expect(bounds.minX).toBeGreaterThanOrEqual(0)
      expect(bounds.maxY).toBeLessThanOrEqual(source.canvas.height)
      expect(mapEditorSceneToSaveRequest('w', 1, moved)).not.toHaveProperty('slots')
      expect(
        mapWarehouseLayoutScene({ warehouseId: 'w', version: 1, ...moved }).editorScene.racks[0]
      ).toMatchObject({ x, y, rotation: 45 })
    }
  )
})

describe('rack gesture transactions', () => {
  function setup() {
    const controls: RackEditingControls = {
      ids: ['a', 'b'],
      referenceId: 'a',
      multiSelect: true,
      snapObjects: true,
      locked: false,
      onSelectionChange: vi.fn(),
      onGestureChange: vi.fn(),
      onCommit: vi.fn(),
      onError: vi.fn(),
    }
    const nodes = { current: new Map<string, Konva.Node>() }
    const stage = createRef<Konva.Stage>()
    const hook = renderHook(
      ({ source, locked }) =>
        useRackCanvasGestures({
          scene: source,
          controls: { ...controls, locked },
          nodes,
          stage,
          scale: 1,
        }),
      { initialProps: { source: scene, locked: false } }
    )
    return { controls, ...hook }
  }
  it('coalesces held-key nudges until keyup, with no intermediate commit', () => {
    const { controls, result } = setup()
    act(() => {
      result.current.nudge(['a', 'b'], { x: 20, y: 0 })
      result.current.nudge(['a', 'b'], { x: 20, y: 0 })
    })
    expect(controls.onCommit).not.toHaveBeenCalled()
    act(() => result.current.finishNudge())
    expect(controls.onCommit).toHaveBeenCalledExactlyOnceWith([
      { id: 'a', x: 140, y: 100 },
      { id: 'b', x: 290, y: 180 },
    ])
  })
  it.each(['escape', 'blur', 'permission', 'reconcile'] as const)(
    'cancels on %s and ignores a late finish',
    (reason) => {
      const { controls, result, rerender } = setup()
      act(() => result.current.nudge(['a', 'b'], { x: 20, y: 0 }))
      act(() => {
        if (reason === 'escape') result.current.cancel()
        if (reason === 'blur') window.dispatchEvent(new Event('blur'))
      })
      if (reason === 'permission') rerender({ source: scene, locked: true })
      if (reason === 'reconcile') rerender({ source: { ...scene }, locked: false })
      act(() => result.current.finishNudge())
      expect(controls.onCommit).not.toHaveBeenCalled()
      expect(controls.onGestureChange).toHaveBeenLastCalledWith(false)
    }
  )
  it.each([0.2, 1, 4])(
    'uses scene coordinates for drag and lasso at zoom %s, with no preview commit',
    (scale) => {
      let pointer = { x: 0, y: 0 }
      const controls: RackEditingControls = {
        ids: ['a', 'b'],
        referenceId: 'a',
        multiSelect: true,
        snapObjects: false,
        locked: false,
        onSelectionChange: vi.fn(),
        onGestureChange: vi.fn(),
        onCommit: vi.fn(),
        onError: vi.fn(),
      }
      const a = new Group({ x: 140, y: 120 }),
        b = new Group({ x: 290, y: 200 })
      const nodes = {
        current: new Map<string, Konva.Node>([
          ['rack:a', a],
          ['rack:b', b],
        ]),
      }
      // The hook needs only these Stage methods; a full renderer requires a real browser canvas.
      const stageDouble = {
        getPointerPosition: () => pointer,
        getAbsoluteTransform: () => new Transform().translate(50, 80).scale(scale, scale),
        batchDraw: vi.fn(),
        stopDrag: vi.fn(),
      }
      const stage = { current: stageDouble as unknown as Konva.Stage }
      const { result } = renderHook(() =>
        useRackCanvasGestures({ scene, controls, nodes, stage, scale })
      )
      act(() => {
        result.current.dragStart('a')
        a.position({ x: 160, y: 140 })
        result.current.dragMove('a', a)
      })
      expect(b.position()).toEqual({ x: 310, y: 220 })
      expect(controls.onCommit).not.toHaveBeenCalled()
      act(() => result.current.dragEnd('a'))
      expect(controls.onCommit).toHaveBeenCalledTimes(1)
      const target = stage.current
      const event = {
        type: 'mousedown',
        evt: new MouseEvent('mousedown'),
        pointerId: 1,
        target,
        currentTarget: target,
        cancelBubble: false,
      }
      pointer = { x: 90 * scale + 50, y: 90 * scale + 80 }
      act(() => result.current.startBox(event))
      pointer = { x: 340 * scale + 50, y: 230 * scale + 80 }
      act(() => {
        result.current.moveBox(event)
        result.current.finishBox()
      })
      expect(controls.onSelectionChange).toHaveBeenLastCalledWith(['a', 'b'], 'a')
      expect(controls.onCommit).toHaveBeenCalledTimes(1)
      act(() => {
        result.current.dragStart('a')
        a.position({ x: 160, y: 140 })
        result.current.dragMove('a', a)
      })
      const touch = new TouchEvent('touchmove')
      Object.defineProperty(touch, 'touches', { value: [{}, {}] })
      act(() => result.current.moveBox({ ...event, evt: touch }))
      act(() => result.current.dragEnd('a'))
      expect(controls.onCommit).toHaveBeenCalledTimes(1)
      expect(a.position()).toEqual({ x: 140, y: 120 })
      a.destroy()
      b.destroy()
    }
  )
  it('adds/toggles with Shift, and read-only blocks selection and gestures', () => {
    const controls: RackEditingControls = {
      ids: [],
      singleRackId: 'a',
      referenceId: null,
      multiSelect: false,
      snapObjects: true,
      locked: false,
      onSelectionChange: vi.fn(),
      onGestureChange: vi.fn(),
      onCommit: vi.fn(),
      onError: vi.fn(),
    }
    const nodes = { current: new Map<string, Konva.Node>() },
      stage = createRef<Konva.Stage>()
    const { result, rerender } = renderHook(
      ({ locked }) =>
        useRackCanvasGestures({ scene, controls: { ...controls, locked }, nodes, stage, scale: 1 }),
      { initialProps: { locked: false } }
    )
    act(() => result.current.selectRack('b', true))
    expect(controls.onSelectionChange).toHaveBeenLastCalledWith(['a', 'b'], 'b')
    rerender({ locked: true })
    act(() => {
      result.current.selectRack('c', true)
      result.current.nudge(['a'], { x: 20, y: 0 })
      result.current.finishNudge()
    })
    expect(controls.onSelectionChange).toHaveBeenCalledTimes(1)
    expect(controls.onCommit).not.toHaveBeenCalled()
  })
  it('ignores a stale scene callback without ending a newer keyboard transaction', () => {
    const { controls, result, rerender } = setup()
    const staleFinish = result.current.finishNudge
    act(() => result.current.nudge(['a', 'b'], { x: 20, y: 0 }))
    rerender({ source: { ...scene }, locked: false })
    act(() => result.current.nudge(['a', 'b'], { x: 40, y: 0 }))
    act(() => staleFinish())
    expect(controls.onCommit).not.toHaveBeenCalled()
    act(() => result.current.finishNudge())
    expect(controls.onCommit).toHaveBeenCalledTimes(1)
  })
  it.each(['escape', 'blur', 'reconcile'] as const)(
    'ignores key-repeat after %s until a fresh key press',
    (reason) => {
      const { controls, result, rerender } = setup()
      act(() => result.current.nudge(['a', 'b'], { x: 20, y: 0 }, false))
      act(() => result.current.nudge(['a', 'b'], { x: 20, y: 0 }, true))
      if (reason === 'reconcile') rerender({ source: { ...scene }, locked: false })
      else
        act(() => {
          if (reason === 'escape') result.current.cancel()
          else window.dispatchEvent(new Event('blur'))
        })
      act(() => result.current.nudge(['a', 'b'], { x: 20, y: 0 }, true))
      act(() => result.current.finishNudge())
      expect(controls.onCommit).not.toHaveBeenCalled()
      act(() => {
        result.current.nudge(['a', 'b'], { x: 20, y: 0 }, false)
        result.current.nudge(['a', 'b'], { x: 20, y: 0 }, true)
        result.current.finishNudge()
      })
      expect(controls.onCommit).toHaveBeenCalledExactlyOnceWith([
        { id: 'a', x: 140, y: 100 },
        { id: 'b', x: 290, y: 180 },
      ])
    }
  )
})
