import type { WarehouseLayoutSceneResponse } from '../types/warehouse-layout-scene.types'

/** Resolve by IDs only: codes are labels and may repeat between warehouses. */
export function resolveWarehouseStockLocation(
  scene: WarehouseLayoutSceneResponse,
  warehouseId: string,
  slotId: string
) {
  const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
  if (!warehouseId || !slotId || !sameId(scene.warehouseId, warehouseId)) return null
  const slots = scene.slots.filter((slot) => sameId(slot.id, slotId))
  if (slots.length > 1) return null
  const slot = slots[0]
  const racks = scene.racks.filter((rack) =>
    slot
      ? sameId(rack.id, slot.rackId)
      : rack.storageMode === 'RackLevel' &&
        !!rack.defaultSlotId &&
        sameId(rack.defaultSlotId, slotId)
  )
  if (racks.length !== 1) return null
  const rack = racks[0]
  if (!rack) return null
  const zones = scene.zones.filter((zone) => sameId(zone.id, rack.zoneId))
  if (zones.length !== 1) return null
  const zone = zones[0]
  if (!zone) return null
  if (
    rack.status !== 'Active' ||
    zone.status !== 'Active' ||
    (slot && (!slot.isActive || !sameId(slot.zoneId, zone.id)))
  )
    return null
  const placed = [zone, rack].every(
    (item) =>
      [item.x, item.y, item.width, item.height, item.rotation].every(
        (value) => typeof value === 'number' && Number.isFinite(value)
      ) &&
      (item.width ?? 0) > 0 &&
      (item.height ?? 0) > 0
  )
  return { zone, rack, slot, placed }
}
