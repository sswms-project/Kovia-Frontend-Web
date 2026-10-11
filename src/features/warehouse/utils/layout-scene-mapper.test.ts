import { describe, expect, it } from 'vitest'
import {
  createLayoutEditorHistory,
  layoutEditorHistoryReducer,
} from '../hooks/use-layout-editor-history'
import type { WarehouseLayoutSceneResponse } from '../types/warehouse-layout-scene.types'
import { getLayoutGeometryBounds } from './layout-grid'
import { mapEditorSceneToSaveRequest, mapWarehouseLayoutScene } from './layout-scene-mapper'

const scene: WarehouseLayoutSceneResponse = {
  warehouseId: 'warehouse-1',
  version: 2,
  canvas: { width: 100, height: 100, gridSize: 10 },
  zones: [
    {
      id: 'zone-1',
      zoneCode: 'Z01',
      zoneName: 'Khu A',
      status: 'Active',
      x: 90,
      y: 10,
      width: 20,
      height: 20,
      rotation: 0,
      zIndex: 1,
    },
  ],
  racks: [
    {
      id: 'rack-1',
      zoneId: 'zone-1',
      zoneCode: 'Z01',
      rackCode: 'K01',
      rackName: 'Kệ 1',
      description: null,
      status: 'Active',
      layoutShape: 'Pallet',
      x: -10,
      y: 40,
      width: 20,
      height: 20,
      rotation: 0,
      zIndex: 2,
    },
  ],
  slots: [],
  decorations: [
    {
      id: 'decoration-1',
      type: 'Forklift',
      label: 'Xe nâng',
      x: 95,
      y: 95,
      width: 20,
      height: 20,
      rotation: 0,
      zIndex: 3,
    },
  ],
}

describe('layout scene mapper', () => {
  it('marks 500 imported racks as unplaced without changing existing geometry or serializing UI flags', () => {
    const existing = { ...scene.racks[0]!, x: 120, y: 150, width: 160, height: 60 }
    const source = {
      ...scene,
      canvas: { width: 1200, height: 800, gridSize: 20 },
      zones: [{ ...scene.zones[0]!, x: 40, y: 40, width: 600, height: 400 }],
      racks: [
        existing,
        ...Array.from({ length: 500 }, (_, index) => ({
          ...existing,
          id: `new-${index}`,
          x: null,
          y: null,
          width: null,
          height: null,
        })),
      ],
      decorations: [],
    }
    const { editorScene, hasGeneratedGeometry } = mapWarehouseLayoutScene(source)
    expect(hasGeneratedGeometry).toBe(false)
    expect(editorScene.racks.filter((rack) => rack.placementPending)).toHaveLength(500)
    expect(editorScene.racks[0]).toMatchObject({ ...existing, placementPending: false })
    const request = mapEditorSceneToSaveRequest(source.warehouseId, source.version, editorScene)
    expect(request.racks).toHaveLength(1)
    expect(request.racks.every((rack) => !('placementPending' in rack))).toBe(true)
    expect(source.racks[1]?.x).toBeNull()
    const rack = editorScene.racks[1]!
    const arranged = layoutEditorHistoryReducer(createLayoutEditorHistory(editorScene), {
      type: 'update-geometry',
      target: 'rack',
      id: rack.id,
      geometry: { ...rack, x: 300, y: 200 },
    })
    const saved = mapEditorSceneToSaveRequest(source.warehouseId, source.version, arranged.present)
    expect(saved.racks).toHaveLength(2)
    const reloaded = mapWarehouseLayoutScene({
      ...source,
      racks: source.racks.map((item) => {
        const geometry = saved.racks.find((entry) => entry.entityId === item.id)
        return geometry ? { ...item, ...geometry } : item
      }),
    }).editorScene
    expect(reloaded.racks.filter((item) => item.placementPending)).toHaveLength(499)
    expect(reloaded.racks[0]).toMatchObject(existing)
    const undone = layoutEditorHistoryReducer(arranged, { type: 'undo' })
    expect(mapEditorSceneToSaveRequest('w', 2, undone.present).racks).toHaveLength(1)
    const redone = layoutEditorHistoryReducer(undone, { type: 'redo' })
    expect(mapEditorSceneToSaveRequest('w', 2, redone.present).racks).toHaveLength(2)
  })
  it('brings legacy geometry inside the fixed canvas before the next save', () => {
    const mapped = mapWarehouseLayoutScene(scene)

    expect(mapped.hasGeneratedGeometry).toBe(true)
    const geometries = [...mapped.editorScene.zones, ...mapped.editorScene.racks]
    geometries.forEach((geometry) => {
      const bounds = getLayoutGeometryBounds(geometry)
      expect(bounds.minX).toBeGreaterThanOrEqual(0)
      expect(bounds.minY).toBeGreaterThanOrEqual(0)
      expect(bounds.maxX).toBeLessThanOrEqual(scene.canvas.width)
      expect(bounds.maxY).toBeLessThanOrEqual(scene.canvas.height)
    })

    const request = mapEditorSceneToSaveRequest(
      scene.warehouseId,
      scene.version,
      mapped.editorScene
    )
    expect(request.zones[0]).toMatchObject({ x: 80, y: 10 })
    expect(request.racks[0]).toMatchObject({ x: 0, y: 40 })
    expect(request.racks[0]?.layoutShape).toBe('Pallet')
    expect(request.decorations[0]).toMatchObject({ x: 95, y: 95 })
  })

  it('leaves an untouched imported zone unplaced while allowing deliberate placement of its rack', () => {
    const source = {
      ...scene,
      decorations: [],
      zones: [{ ...scene.zones[0]!, x: null, y: null, width: null, height: null }],
      racks: [{ ...scene.racks[0]!, x: null, y: null, width: null, height: null }],
    }
    const mapped = mapWarehouseLayoutScene(source)
    expect(mapped.hasGeneratedGeometry).toBe(false)
    expect(mapEditorSceneToSaveRequest('w', 1, mapped.editorScene)).toMatchObject({
      zones: [],
      racks: [],
    })
    const rack = mapped.editorScene.racks[0]!
    const arranged = layoutEditorHistoryReducer(createLayoutEditorHistory(mapped.editorScene), {
      type: 'update-geometry',
      target: 'rack',
      id: rack.id,
      geometry: rack,
    })
    expect(mapEditorSceneToSaveRequest('w', 1, arranged.present)).toMatchObject({
      zones: [],
      racks: [{ entityId: rack.id }],
    })
    const zone = arranged.present.zones[0]!
    const zoneArranged = layoutEditorHistoryReducer(arranged, {
      type: 'update-geometry',
      target: 'zone',
      id: zone.id,
      geometry: zone,
    })
    expect(mapEditorSceneToSaveRequest('w', 1, zoneArranged.present).zones).toHaveLength(1)
  })

  it('preserves the exact rotated door geometry through save and reload outside the blue wall', () => {
    const door = {
      ...scene.decorations[0]!,
      type: 'Door' as const,
      x: -35.25,
      y: 20,
      width: 60,
      height: 40,
      rotation: 90,
    }
    const source = { ...scene, zones: [], racks: [], decorations: [door] }
    const mapped = mapWarehouseLayoutScene(source)
    expect(mapped.hasGeneratedGeometry).toBe(false)
    const saved = mapEditorSceneToSaveRequest(scene.warehouseId, scene.version, mapped.editorScene)
    expect(saved.decorations[0]).toMatchObject({
      x: door.x,
      y: door.y,
      width: door.width,
      height: door.height,
      rotation: door.rotation,
    })
    expect(mapWarehouseLayoutScene(source).editorScene.decorations[0]).toMatchObject(door)
  })

  it('gives a physical rack the same preset size as a rack placed from the diagram palette', () => {
    const mapped = mapWarehouseLayoutScene({
      ...scene,
      canvas: { width: 1000, height: 600, gridSize: 20 },
      zones: [
        {
          ...scene.zones[0]!,
          x: 40,
          y: 40,
          width: 600,
          height: 400,
        },
      ],
      racks: [
        {
          ...scene.racks[0]!,
          layoutShape: null,
          x: null,
          y: null,
          width: null,
          height: null,
        },
      ],
      decorations: [],
    })

    expect(mapped.editorScene.racks[0]).toMatchObject({
      width: 160,
      height: 60,
      layoutShape: 'Standard',
    })
  })
})
