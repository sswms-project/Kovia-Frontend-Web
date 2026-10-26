'use client'

import { toast } from 'sonner'
import type { LayoutPaletteDragData } from '../types/warehouse-layout-palette.types'
import type {
  WarehouseLayoutDecorationType,
  WarehouseLayoutEditorScene,
  WarehouseLayoutGeometry,
  WarehouseLayoutGeometryTarget,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import type { WarehouseLayoutDropPosition } from '../types/warehouse-layout-workspace.types'
import { createClientKey, getDuplicateLabel } from '../utils/layout-designer-keys'
import {
  constrainLayoutGeometryToCanvas,
  getRackPresetSize,
  LAYOUT_DECORATION_MARGIN,
} from '../utils/layout-grid'
import {
  arrangeLayoutRacks,
  type RackOperation,
  type RackPosition,
} from '../utils/layout-rack-operations'
import type { LayoutEditorHistoryAction } from './use-layout-editor-history'

interface UseLayoutDesignerObjectActionsOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly dispatch: (action: LayoutEditorHistoryAction) => void
  readonly selection: WarehouseLayoutSelection | null
  readonly setSelection: (selection: WarehouseLayoutSelection | null) => void
  readonly setIsInspectorOpen: (isOpen: boolean) => void
  readonly setIsToolboxOpen: (isOpen: boolean) => void
  readonly canMutate: () => boolean
  readonly groupIds: readonly string[]
  readonly rackReferenceId: string | null
  readonly getSelectedZoneId: () => string | null | undefined
  readonly onCreateZone: (position?: WarehouseLayoutDropPosition) => void
  readonly onCreateRack: (zoneId: string, position?: WarehouseLayoutDropPosition) => void
}

export function useLayoutDesignerObjectActions({
  scene,
  dispatch,
  selection,
  setSelection,
  setIsInspectorOpen,
  setIsToolboxOpen,
  canMutate,
  groupIds,
  rackReferenceId,
  getSelectedZoneId,
  onCreateZone,
  onCreateRack,
}: UseLayoutDesignerObjectActionsOptions) {
  function updateGeometry(
    target: WarehouseLayoutGeometryTarget,
    id: string,
    geometry: WarehouseLayoutGeometry
  ) {
    if (!canMutate()) return
    dispatch({
      type: 'update-geometry',
      target,
      id,
      geometry: constrainLayoutGeometryToCanvas(
        geometry,
        scene.canvas,
        true,
        target === 'decoration' ? LAYOUT_DECORATION_MARGIN : 0
      ),
    })
  }

  function updateColor(target: WarehouseLayoutGeometryTarget, id: string, color: string | null) {
    if (!canMutate()) return
    const placementPending =
      target === 'zone'
        ? scene.zones.find((zone) => zone.id === id)?.placementPending
        : target === 'rack'
          ? scene.racks.find((rack) => rack.id === id)?.placementPending
          : false
    if (placementPending) {
      toast.info('Hãy đặt vị trí trên sơ đồ trước khi đổi màu.')
      return
    }
    dispatch({ type: 'update-color', target, id, color })
  }

  function addDecoration(
    type: WarehouseLayoutDecorationType,
    label: string,
    position?: WarehouseLayoutDropPosition
  ) {
    if (!canMutate()) return
    const clientKey = createClientKey()
    const offset = scene.decorations.length * scene.canvas.gridSize
    const geometry = constrainLayoutGeometryToCanvas(
      {
        x: position?.x ?? scene.canvas.gridSize * 5 + offset,
        y: position?.y ?? scene.canvas.gridSize * 5 + offset,
        width: type === 'Aisle' ? scene.canvas.gridSize * 12 : scene.canvas.gridSize * 8,
        height: type === 'Aisle' ? scene.canvas.gridSize * 3 : scene.canvas.gridSize * 5,
        rotation: 0,
        zIndex: 500 + scene.decorations.length,
      },
      scene.canvas,
      true,
      LAYOUT_DECORATION_MARGIN
    )
    dispatch({
      type: 'add-decoration',
      decoration: { id: '', clientKey, type, label, color: null, ...geometry },
    })
    setSelection({ kind: 'decoration', id: clientKey })
    setIsInspectorOpen(false)
    setIsToolboxOpen(false)
  }

  function handlePaletteDrop(payload: LayoutPaletteDragData, x: number, y: number) {
    if (!canMutate()) return
    const position = { x, y }
    if (payload.kind === 'zone') onCreateZone(position)
    else if (payload.kind === 'rack') {
      const zoneId = getSelectedZoneId()
      const rackSize = getRackPresetSize()
      if (zoneId)
        onCreateRack(zoneId, {
          ...position,
          ...rackSize,
          layoutShape: payload.shape ?? 'Standard',
        })
      else toast.error('Chọn một khu vực trước khi đặt kệ hàng.')
    } else addDecoration(payload.type, payload.label, position)
  }

  function duplicateSelectedDecoration() {
    if (selection?.kind !== 'decoration' || !canMutate()) return
    const source = scene.decorations.find((decoration) => decoration.clientKey === selection.id)
    if (!source) return
    const clientKey = createClientKey()
    const geometry = constrainLayoutGeometryToCanvas(
      {
        ...source,
        x: source.x + scene.canvas.gridSize,
        y: source.y + scene.canvas.gridSize,
        zIndex: source.zIndex + 1,
      },
      scene.canvas,
      true,
      LAYOUT_DECORATION_MARGIN
    )
    dispatch({
      type: 'add-decoration',
      decoration: {
        ...source,
        ...geometry,
        id: '',
        clientKey,
        label: getDuplicateLabel(source.label),
      },
    })
    setSelection({ kind: 'decoration', id: clientKey })
    setIsInspectorOpen(false)
  }

  function deleteSelectedDecoration() {
    if (selection?.kind !== 'decoration' || !canMutate()) return
    dispatch({ type: 'delete-decoration', id: selection.id })
    setSelection(null)
    setIsInspectorOpen(false)
  }

  function rotateSelectedObject() {
    if (!selection || selection.kind === 'slot' || !canMutate()) return
    const object =
      selection.kind === 'zone'
        ? scene.zones.find((zone) => zone.id === selection.id)
        : selection.kind === 'rack'
          ? scene.racks.find((rack) => rack.id === selection.id)
          : scene.decorations.find((decoration) => decoration.clientKey === selection.id)
    if (!object) return
    if ('placementPending' in object && object.placementPending) {
      toast.info('Hãy đặt vị trí trên sơ đồ trước khi xoay.')
      return
    }
    updateGeometry(selection.kind, selection.id, {
      ...object,
      rotation: (object.rotation + 90) % 360,
    })
  }

  function commitRackPositions(positions: readonly RackPosition[]) {
    if (!canMutate()) return
    dispatch({ type: 'move-racks', positions })
  }

  function arrangeRacks(operation: RackOperation) {
    if (!canMutate() || !rackReferenceId) return
    const result = arrangeLayoutRacks(scene, groupIds, rackReferenceId, operation)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    commitRackPositions(result.positions)
  }

  return {
    updateGeometry,
    updateColor,
    addDecoration,
    handlePaletteDrop,
    duplicateSelectedDecoration,
    deleteSelectedDecoration,
    rotateSelectedObject,
    commitRackPositions,
    arrangeRacks,
  }
}
