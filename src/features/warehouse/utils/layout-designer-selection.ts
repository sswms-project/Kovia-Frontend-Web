import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'

export function activeZoneContainsRack(
  scene: WarehouseLayoutEditorScene,
  rack: WarehouseLayoutEditorRack
) {
  return scene.zones.some((zone) => zone.id === rack.zoneId && zone.status === 'Active')
}

export function selectionHasInventory(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection
): boolean {
  if (selection.kind === 'rack') {
    return scene.slots.some((slot) => slot.rackId === selection.id && slot.currentOccupancy > 0)
  }
  if (selection.kind === 'zone') {
    return scene.slots.some((slot) => slot.zoneId === selection.id && slot.currentOccupancy > 0)
  }
  return false
}

export function isSelectionEditable(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection
): boolean {
  if (selection.kind === 'decoration') return true
  if (selection.kind === 'zone') {
    return scene.zones.some((zone) => zone.id === selection.id && zone.status === 'Active')
  }
  if (selection.kind === 'rack') {
    const rack = scene.racks.find((candidate) => candidate.id === selection.id)
    return Boolean(
      rack?.status === 'Active' &&
      scene.zones.some((zone) => zone.id === rack.zoneId && zone.status === 'Active')
    )
  }
  return false
}
