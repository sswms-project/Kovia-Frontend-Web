'use client'

import { useReducer } from 'react'
import type {
  WarehouseLayoutCanvas,
  WarehouseLayoutEditorDecoration,
  WarehouseLayoutEditorScene,
  WarehouseLayoutGeometry,
  WarehouseLayoutGeometryTarget,
  WarehouseLayoutRackShape,
} from '../types/warehouse-layout-scene.types'
import { normalizeLayoutGeometry } from '../utils/layout-grid'
import { suggestUnplacedLayout } from '../utils/layout-placement'
import {
  applyRackPositions,
  canResizeLayoutCanvas,
  type RackPosition,
} from '../utils/layout-rack-operations'

const MAX_HISTORY_LENGTH = 100

export interface LayoutEditorHistoryState {
  past: WarehouseLayoutEditorScene[]
  present: WarehouseLayoutEditorScene
  future: WarehouseLayoutEditorScene[]
}

export type LayoutEditorHistoryAction =
  | { type: 'suggest-placement' }
  | { type: 'move-racks'; positions: readonly RackPosition[] }
  | {
      type: 'update-geometry'
      target: WarehouseLayoutGeometryTarget
      id: string
      geometry: WarehouseLayoutGeometry
      rackShape?: WarehouseLayoutRackShape
    }
  | {
      type: 'update-color'
      target: WarehouseLayoutGeometryTarget
      id: string
      color: string | null
    }
  | { type: 'update-canvas'; canvas: WarehouseLayoutCanvas }
  | { type: 'add-decoration'; decoration: WarehouseLayoutEditorDecoration }
  | {
      type: 'update-decoration'
      id: string
      decoration: Omit<WarehouseLayoutEditorDecoration, 'clientKey' | 'id'>
    }
  | { type: 'delete-decoration'; id: string }
  | { type: 'reset'; scene: WarehouseLayoutEditorScene }
  | { type: 'reconcile-server-scene'; scene: WarehouseLayoutEditorScene }
  | { type: 'undo' }
  | { type: 'redo' }

export function createLayoutEditorHistory(
  scene: WarehouseLayoutEditorScene
): LayoutEditorHistoryState {
  return { past: [], present: scene, future: [] }
}

function commitScene(
  state: LayoutEditorHistoryState,
  scene: WarehouseLayoutEditorScene
): LayoutEditorHistoryState {
  if (JSON.stringify(scene) === JSON.stringify(state.present)) return state
  return {
    past: [...state.past.slice(-(MAX_HISTORY_LENGTH - 1)), state.present],
    present: scene,
    future: [],
  }
}

function updateGeometry(
  scene: WarehouseLayoutEditorScene,
  target: WarehouseLayoutGeometryTarget,
  id: string,
  geometry: WarehouseLayoutGeometry,
  rackShape?: WarehouseLayoutRackShape
): WarehouseLayoutEditorScene {
  const normalizedGeometry = normalizeLayoutGeometry(geometry, scene.canvas)
  if (target === 'zone') {
    return {
      ...scene,
      zones: scene.zones.map((zone) =>
        zone.id === id ? { ...zone, ...normalizedGeometry, placementPending: false } : zone
      ),
    }
  }
  if (target === 'rack') {
    return {
      ...scene,
      racks: scene.racks.map((rack) =>
        rack.id === id
          ? {
              ...rack,
              ...normalizedGeometry,
              placementPending: false,
              ...(rackShape ? { layoutShape: rackShape } : {}),
            }
          : rack
      ),
    }
  }
  return {
    ...scene,
    decorations: scene.decorations.map((decoration) =>
      decoration.clientKey === id ? { ...decoration, ...normalizedGeometry } : decoration
    ),
  }
}

function updateCanvas(
  scene: WarehouseLayoutEditorScene,
  canvas: WarehouseLayoutCanvas
): WarehouseLayoutEditorScene {
  return canResizeLayoutCanvas(scene, canvas) ? { ...scene, canvas } : scene
}

function updateColor(
  scene: WarehouseLayoutEditorScene,
  target: WarehouseLayoutGeometryTarget,
  id: string,
  color: string | null
): WarehouseLayoutEditorScene {
  if (target === 'zone') {
    return {
      ...scene,
      zones: scene.zones.map((zone) => (zone.id === id ? { ...zone, color } : zone)),
    }
  }
  if (target === 'rack') {
    return {
      ...scene,
      racks: scene.racks.map((rack) => (rack.id === id ? { ...rack, color } : rack)),
    }
  }
  return {
    ...scene,
    decorations: scene.decorations.map((decoration) =>
      decoration.clientKey === id ? { ...decoration, color } : decoration
    ),
  }
}

function reconcileServerScene(
  draft: WarehouseLayoutEditorScene,
  serverScene: WarehouseLayoutEditorScene
): WarehouseLayoutEditorScene {
  const zonesById = new Map(draft.zones.map((zone) => [zone.id, zone]))
  const racksById = new Map(draft.racks.map((rack) => [rack.id, rack]))

  return {
    ...draft,
    zones: serverScene.zones.map((serverZone) => {
      const draftZone = zonesById.get(serverZone.id)
      return draftZone
        ? {
            ...serverZone,
            x: draftZone.x,
            y: draftZone.y,
            width: draftZone.width,
            height: draftZone.height,
            rotation: draftZone.rotation,
            zIndex: draftZone.zIndex,
            color: draftZone.color ?? null,
            placementPending: draftZone.placementPending,
          }
        : serverZone
    }),
    racks: serverScene.racks.map((serverRack) => {
      const draftRack = racksById.get(serverRack.id)
      return draftRack
        ? {
            ...serverRack,
            x: draftRack.x,
            y: draftRack.y,
            width: draftRack.width,
            height: draftRack.height,
            rotation: draftRack.rotation,
            zIndex: draftRack.zIndex,
            color: draftRack.color ?? null,
            placementPending: draftRack.placementPending,
            layoutShape: draftRack.layoutShape ?? serverRack.layoutShape ?? 'Standard',
          }
        : serverRack
    }),
    slots: serverScene.slots,
  }
}

export function layoutEditorHistoryReducer(
  state: LayoutEditorHistoryState,
  action: LayoutEditorHistoryAction
): LayoutEditorHistoryState {
  if (action.type === 'suggest-placement')
    return commitScene(state, suggestUnplacedLayout(state.present))
  if (action.type === 'move-racks')
    return commitScene(state, applyRackPositions(state.present, action.positions))
  if (action.type === 'reset') return createLayoutEditorHistory(action.scene)

  if (action.type === 'reconcile-server-scene') {
    return {
      past: state.past.map((scene) => reconcileServerScene(scene, action.scene)),
      present: reconcileServerScene(state.present, action.scene),
      future: state.future.map((scene) => reconcileServerScene(scene, action.scene)),
    }
  }

  if (action.type === 'undo') {
    const previous = state.past.at(-1)
    if (!previous) return state
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    }
  }

  if (action.type === 'redo') {
    const next = state.future[0]
    if (!next) return state
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    }
  }

  if (action.type === 'update-geometry') {
    return commitScene(
      state,
      updateGeometry(state.present, action.target, action.id, action.geometry, action.rackShape)
    )
  }

  if (action.type === 'update-color') {
    return commitScene(state, updateColor(state.present, action.target, action.id, action.color))
  }

  if (action.type === 'update-canvas') {
    return commitScene(state, updateCanvas(state.present, action.canvas))
  }

  if (action.type === 'add-decoration') {
    return commitScene(state, {
      ...state.present,
      decorations: [...state.present.decorations, action.decoration],
    })
  }

  if (action.type === 'update-decoration') {
    return commitScene(state, {
      ...state.present,
      decorations: state.present.decorations.map((decoration) =>
        decoration.clientKey === action.id
          ? {
              ...decoration,
              ...action.decoration,
              clientKey: decoration.clientKey,
              id: decoration.id,
            }
          : decoration
      ),
    })
  }

  return commitScene(state, {
    ...state.present,
    decorations: state.present.decorations.filter(
      (decoration) => decoration.clientKey !== action.id
    ),
  })
}

export function useLayoutEditorHistory(scene: WarehouseLayoutEditorScene) {
  return useReducer(layoutEditorHistoryReducer, scene, createLayoutEditorHistory)
}
