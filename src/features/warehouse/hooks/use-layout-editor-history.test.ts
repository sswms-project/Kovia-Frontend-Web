import { describe, expect, it } from 'vitest'
import type { WarehouseLayoutEditorScene } from '../types/warehouse-layout-scene.types'
import { createLayoutEditorHistory, layoutEditorHistoryReducer } from './use-layout-editor-history'

const scene: WarehouseLayoutEditorScene = {
  canvas: { width: 1000, height: 1000, gridSize: 20 },
  zones: [],
  racks: [
    {
      id: 'rack-1',
      zoneId: 'zone-1',
      zoneCode: 'Z01',
      rackCode: 'K01',
      rackName: 'Kệ 1',
      description: null,
      status: 'Active',
      layoutShape: 'Standard',
      x: 20,
      y: 20,
      width: 260,
      height: 100,
      rotation: 0,
      zIndex: 1,
      color: null,
    },
  ],
  slots: [],
  decorations: [],
}

describe('layout editor rack shape history', () => {
  it('keeps unplaced items pending after canvas/color edits and preserves explicit placement on refetch', () => {
    const pending = { ...scene, racks: [{ ...scene.racks[0]!, placementPending: true }] }
    let state = createLayoutEditorHistory(pending)
    state = layoutEditorHistoryReducer(state, {
      type: 'update-color',
      target: 'rack',
      id: 'rack-1',
      color: '#FFFFFF',
    })
    state = layoutEditorHistoryReducer(state, {
      type: 'update-canvas',
      canvas: { ...scene.canvas, width: 800 },
    })
    expect(state.present.racks[0]?.placementPending).toBe(true)
    state = layoutEditorHistoryReducer(state, {
      type: 'update-geometry',
      target: 'rack',
      id: 'rack-1',
      geometry: state.present.racks[0]!,
    })
    expect(state.present.racks[0]?.placementPending).toBe(false)
    state = layoutEditorHistoryReducer(state, { type: 'reconcile-server-scene', scene: pending })
    expect(state.present.racks[0]?.placementPending).toBe(false)
    expect(
      layoutEditorHistoryReducer(state, { type: 'undo' }).present.racks[0]?.placementPending
    ).toBe(true)
  })
  it('changes and undoes the rack shape in one history step', () => {
    const rack = scene.racks[0]
    if (!rack) throw new Error('Test rack is missing.')

    const updated = layoutEditorHistoryReducer(createLayoutEditorHistory(scene), {
      type: 'update-geometry',
      target: 'rack',
      id: rack.id,
      geometry: { ...rack, width: 160, height: 320 },
      rackShape: 'Vertical',
    })

    expect(updated.present.racks[0]).toMatchObject({
      width: 160,
      height: 320,
      layoutShape: 'Vertical',
    })

    const undone = layoutEditorHistoryReducer(updated, { type: 'undo' })
    expect(undone.present.racks[0]?.layoutShape).toBe('Standard')
  })
})
