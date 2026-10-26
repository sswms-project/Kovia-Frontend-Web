import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'

export function getSelectedLocation(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection | null
) {
  if (!selection || selection.kind === 'decoration') return null
  if (selection.kind === 'zone') {
    const zone = scene.zones.find((item) => item.id === selection.id)
    return zone
      ? { code: zone.zoneCode, name: zone.zoneName, capacity: null, pending: false }
      : null
  }
  if (selection.kind === 'rack') {
    const rack = scene.racks.find((item) => item.id === selection.id)
    return rack
      ? {
          code: rack.rackCode,
          name: rack.rackName,
          capacity: rack.storageMode === 'RackLevel' ? rack : null,
          pending: rack.requiresCapacityConfiguration,
        }
      : null
  }
  const slot = scene.slots.find((item) => item.id === selection.id)
  return slot
    ? {
        code: slot.slotCode,
        name: slot.slotName,
        capacity: slot,
        pending: slot.requiresCapacityConfiguration,
      }
    : null
}

export type ViewerSelectedLocation = NonNullable<ReturnType<typeof getSelectedLocation>>
