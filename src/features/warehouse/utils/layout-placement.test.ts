import { describe, expect, it } from 'vitest'
import type { WarehouseLayoutEditorScene } from '../types/warehouse-layout-scene.types'
import {
  createLayoutEditorHistory,
  layoutEditorHistoryReducer,
} from '../hooks/use-layout-editor-history'
import { mapEditorSceneToSaveRequest } from './layout-scene-mapper'
import {
  getLayoutLocationLabel,
  getLayoutPlacementIssues,
  suggestUnplacedLayout,
  getLayoutPlacementError,
  placeUnplacedLayoutObject,
} from './layout-placement'

const zone = {
  id: 'z',
  zoneCode: 'K01',
  zoneName: 'Hàng khô',
  status: 'Active',
  x: 0,
  y: 0,
  width: 520,
  height: 320,
  rotation: 0,
  zIndex: 0,
}
const rack = {
  id: 'r',
  zoneId: 'z',
  zoneCode: 'K01',
  rackCode: 'A04',
  rackName: 'Hàng tiêu dùng',
  description: null,
  status: 'Active',
  x: 20,
  y: 60,
  width: 160,
  height: 60,
  rotation: 0,
  zIndex: 1,
}
const scene: WarehouseLayoutEditorScene = {
  canvas: { width: 1200, height: 800, gridSize: 20 },
  zones: [zone],
  racks: [rack],
  slots: [],
  decorations: [],
}

describe('warehouse layout placement', () => {
  it('preserves business identity and avoids inactive zones as well as inactive racks', () => {
    const queued = { ...rack, placementPending: true }
    const source: WarehouseLayoutEditorScene = { ...scene, racks: [queued] }
    const candidate = { ...rack, id: 'other', zoneId: 'other-zone', status: 'Inactive' }
    const result = placeUnplacedLayoutObject(source, { kind: 'rack', id: 'r' }, candidate)
    expect(result.racks[0]).toMatchObject({
      id: 'r',
      zoneId: 'z',
      status: 'Active',
      placementPending: false,
    })
    const zoneSource: WarehouseLayoutEditorScene = {
      ...scene,
      racks: [],
      zones: [
        { ...zone, status: 'Inactive' },
        { ...zone, id: 'queued-zone', placementPending: true },
      ],
    }
    const suggested = suggestUnplacedLayout(zoneSource)
    expect(suggested.zones[1]?.placementPending).toBe(false)
    expect(getLayoutPlacementIssues(suggested)).toEqual([])
    expect(
      getLayoutPlacementError(zoneSource, { kind: 'zone', id: 'queued-zone' }, zone)
    ).toContain('chồng')
  })

  it('places a queued rack manually in a narrow zone and preserves one reversible draft', () => {
    const source: WarehouseLayoutEditorScene = {
      ...scene,
      zones: [{ ...zone, width: 100, height: 400 }],
      racks: [{ ...rack, width: 120, height: 40, placementPending: true }],
    }
    const selection = { kind: 'rack', id: 'r' } as const
    expect(suggestUnplacedLayout(source).racks[0]?.placementPending).toBe(true)
    const geometry = { ...source.racks[0]!, x: 0, y: 100, rotation: 90 }
    expect(getLayoutPlacementError(source, selection, geometry)).toBeNull()
    const placed = layoutEditorHistoryReducer(createLayoutEditorHistory(source), {
      type: 'place-pending',
      selection,
      geometry,
    })
    expect(placed.past).toHaveLength(1)
    expect(placed.present.racks[0]).toMatchObject({
      id: 'r',
      zoneId: 'z',
      placementPending: false,
      rotation: 90,
      x: 0,
      y: 100,
    })
    expect(mapEditorSceneToSaveRequest('w', 3, placed.present).racks).toHaveLength(1)
    const undone = layoutEditorHistoryReducer(placed, { type: 'undo' })
    expect(undone.present).toEqual(source)
    expect(layoutEditorHistoryReducer(undone, { type: 'redo' }).present).toEqual(placed.present)
  })

  it('rejects invalid or stale manual placement without changing the scene', () => {
    const source = { ...scene, racks: [{ ...rack, placementPending: true }] }
    const selection = { kind: 'rack', id: 'r' } as const
    for (const geometry of [
      { ...rack, x: -10 },
      { ...rack, x: Number.NaN },
      { ...rack, x: 500 },
      { ...rack, rotation: 360 },
    ]) {
      expect(getLayoutPlacementError(source, selection, geometry)).toBeTruthy()
      expect(placeUnplacedLayoutObject(source, selection, geometry)).toBe(source)
    }
    expect(placeUnplacedLayoutObject(scene, selection, rack)).toBe(scene)
    const parentPending = { ...source, zones: [{ ...zone, placementPending: true }] }
    expect(getLayoutPlacementError(parentPending, selection, rack)).toContain('khu vực')
  })

  it('reconstructs a queued zone around persisted children without moving shelves', () => {
    const child = { ...rack, x: 80, y: 100, width: 120, height: 40 }
    const source: WarehouseLayoutEditorScene = {
      ...scene,
      zones: [{ ...zone, placementPending: true }],
      racks: [child],
    }
    const result = suggestUnplacedLayout(source)
    expect(result.zones[0]).toMatchObject({
      x: 60,
      y: 60,
      width: 160,
      height: 100,
      placementPending: false,
    })
    expect(result.racks[0]).toBe(child)
    expect(getLayoutPlacementIssues(result)).toEqual([])
    expect(
      getLayoutPlacementError(source, { kind: 'zone', id: 'z' }, { ...zone, x: 500 })
    ).toContain('bao quanh')
  })

  it('keeps a parent queued with guidance if reconstructing it would overlap another zone', () => {
    const child = { ...rack, x: 80, y: 100 }
    const source: WarehouseLayoutEditorScene = {
      ...scene,
      zones: [
        { ...zone, placementPending: true },
        { ...zone, id: 'other' },
      ],
      racks: [child],
    }
    const result = suggestUnplacedLayout(source)
    expect(result.zones[0]?.placementPending).toBe(true)
    expect(result.racks[0]).toBe(child)
    expect(
      getLayoutPlacementIssues(result).some(
        (issue) => issue.selection.id === 'z' && issue.message.includes('bao quanh')
      )
    ).toBe(true)
  })

  it('avoids visible inactive geometry and warns if a manual candidate overlaps it', () => {
    const inactive = { ...rack, status: 'Inactive', x: 20, y: 40, width: 120, height: 40 }
    const queued = { ...inactive, id: 'queued', status: 'Active', placementPending: true }
    const source: WarehouseLayoutEditorScene = { ...scene, racks: [inactive, queued] }
    const result = suggestUnplacedLayout(source)
    expect(result.racks[1]?.placementPending).toBe(false)
    expect(result.racks[1]?.x === inactive.x && result.racks[1]?.y === inactive.y).toBe(false)
    expect(getLayoutPlacementIssues(result)).toEqual([])
    expect(getLayoutPlacementError(source, { kind: 'rack', id: 'queued' }, inactive)).toContain(
      'ngừng hoạt động'
    )
    expect(
      getLayoutPlacementIssues({
        ...source,
        racks: [inactive, { ...queued, placementPending: false }],
      })
    ).toHaveLength(2)
  })

  it('places only queued objects in their own zones and avoids shelves and aisles', () => {
    const source: WarehouseLayoutEditorScene = {
      ...scene,
      racks: [
        rack,
        ...Array.from({ length: 8 }, (_, index) => ({
          ...rack,
          id: `new-${index}`,
          placementPending: true,
        })),
      ],
      decorations: [
        {
          id: 'aisle',
          clientKey: 'aisle',
          type: 'Aisle' as const,
          label: 'Lối đi',
          x: 200,
          y: 40,
          width: 80,
          height: 160,
          rotation: 0,
          zIndex: 2,
        },
      ],
    }
    const result = suggestUnplacedLayout(source)
    expect(result.zones[0]).toBe(zone)
    expect(result.racks[0]).toBe(rack)
    expect(result.decorations).toBe(source.decorations)
    expect(result.slots).toBe(source.slots)
    const placed = result.racks.slice(1).filter((item) => !item.placementPending)
    expect(placed.length).toBeGreaterThan(0)
    expect(
      placed.every((item) => item.width === 120 && item.height === 40 && item.zoneId === 'z')
    ).toBe(true)
    expect(
      placed.every((item) => item.x + item.width <= 180 || item.x >= 300 || item.y >= 220)
    ).toBe(true)
    expect(getLayoutPlacementIssues(result)).toEqual([])
    expect(source.racks[1]?.placementPending).toBe(true)
  })

  it('keeps overflow queued instead of shrinking existing objects or changing their zone', () => {
    const source = {
      ...scene,
      racks: [
        { ...rack, x: 0, y: 0, width: 520, height: 320 },
        { ...rack, id: 'new', placementPending: true },
      ],
    }
    const result = suggestUnplacedLayout(source)
    expect(result.racks).toEqual(source.racks)
    expect(mapEditorSceneToSaveRequest('w', 2, result).racks).toHaveLength(1)
  })

  it('fits a queued zone inside a smaller canvas and leaves inactive items alone', () => {
    const source = {
      ...scene,
      canvas: { width: 400, height: 300, gridSize: 20 },
      zones: [{ ...zone, placementPending: true }],
      racks: [
        { ...rack, placementPending: true },
        { ...rack, id: 'inactive', status: 'Inactive', placementPending: true },
      ],
    }
    const result = suggestUnplacedLayout(source)
    expect(result.zones[0]).toMatchObject({ placementPending: false, width: 360, height: 260 })
    expect(result.racks[0]).toMatchObject({ placementPending: false, width: 120, height: 40 })
    expect(result.racks[1]).toBe(source.racks[1])
    expect(getLayoutPlacementIssues(result)).toEqual([])
  })

  it('does not fabricate parent placement when a queued zone has no room', () => {
    const source = {
      ...scene,
      canvas: { width: 520, height: 320, gridSize: 20 },
      zones: [zone, { ...zone, id: 'queued-zone', placementPending: true }],
      racks: [{ ...rack, id: 'queued-rack', zoneId: 'queued-zone', placementPending: true }],
    }
    const result = suggestUnplacedLayout(source)
    expect(result.zones[1]?.placementPending).toBe(true)
    expect(result.racks[0]?.placementPending).toBe(true)
  })

  it('uses actual rotated rectangles for warnings and checks the parent boundary', () => {
    const source = {
      ...scene,
      zones: [{ ...zone, width: 600, height: 500 }],
      racks: [
        { ...rack, x: 100, y: 100, width: 160, height: 20, rotation: 45 },
        { ...rack, id: 'b', x: 100, y: 150, width: 160, height: 20, rotation: 45 },
      ],
    }
    expect(getLayoutPlacementIssues(source)).toEqual([])
    expect(
      getLayoutPlacementIssues({
        ...source,
        racks: [source.racks[0]!, { ...source.racks[1]!, y: 110 }],
      })
    ).toHaveLength(2)
    expect(
      getLayoutPlacementIssues({ ...scene, racks: [{ ...rack, x: 500 }] })[0]?.message
    ).toContain('Vượt ranh giới khu vực')
  })

  it('keeps suggestions as one reversible draft until explicit save', () => {
    const source = { ...scene, racks: [rack, { ...rack, id: 'queued', placementPending: true }] }
    const initial = createLayoutEditorHistory(source)
    const suggested = layoutEditorHistoryReducer(initial, { type: 'suggest-placement' })
    expect(suggested.past).toHaveLength(1)
    expect(mapEditorSceneToSaveRequest('w', 3, suggested.present).racks).toHaveLength(2)
    const undone = layoutEditorHistoryReducer(suggested, { type: 'undo' })
    expect(undone.present).toEqual(source)
    expect(layoutEditorHistoryReducer(undone, { type: 'redo' }).present).toEqual(suggested.present)
  })

  it('shows the same zone/rack path for a rack and a physical slot', () => {
    const source = {
      ...scene,
      slots: [
        {
          id: 'slot',
          rackId: 'r',
          zoneId: 'z',
          slotCode: 'A04-01',
          slotName: 'Tầng 1',
          description: null,
          occupancyStatus: 'Vacant',
          isActive: true,
          capacity: null,
          currentOccupancy: 0,
        },
      ],
    }
    expect(getLayoutLocationLabel(source, { kind: 'rack', id: 'r' })).toBe(
      'Khu K01 · Hàng khô → Kệ A04 · Hàng tiêu dùng'
    )
    expect(getLayoutLocationLabel(source, { kind: 'slot', id: 'slot' })).toBe(
      'Khu K01 · Hàng khô → Kệ A04 · Hàng tiêu dùng → A04-01 · Tầng 1'
    )
  })

  it('keeps a large import queued when there is no free space', () => {
    const source = {
      ...scene,
      racks: [
        { ...rack, x: 0, y: 0, width: 520, height: 320 },
        ...Array.from({ length: 500 }, (_, index) => ({
          ...rack,
          id: `new-${index}`,
          placementPending: true,
        })),
      ],
    }
    expect(
      suggestUnplacedLayout(source).racks.filter((item) => item.placementPending)
    ).toHaveLength(500)
  })
})
