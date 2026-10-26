import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'

export function getSelectedPath(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection | null,
  zoneIds: ReadonlySet<string>,
  rackIds: ReadonlySet<string>
) {
  if (!selection) return { zoneId: null, rackId: null, isUnclassified: false }
  if (selection.kind === 'zone') {
    return { zoneId: selection.id, rackId: null, isUnclassified: false }
  }
  if (selection.kind === 'rack') {
    const rack = scene.racks.find((candidate) => candidate.id === selection.id)
    return {
      zoneId: rack?.zoneId ?? null,
      rackId: selection.id,
      isUnclassified: Boolean(rack && !zoneIds.has(rack.zoneId)),
    }
  }
  if (selection.kind === 'slot') {
    const slot = scene.slots.find((candidate) => candidate.id === selection.id)
    const rack = slot ? scene.racks.find((candidate) => candidate.id === slot.rackId) : undefined
    return {
      zoneId: rack?.zoneId ?? null,
      rackId: rack?.id ?? null,
      isUnclassified: Boolean(
        slot && (!rackIds.has(slot.rackId) || (rack && !zoneIds.has(rack.zoneId)))
      ),
    }
  }
  return { zoneId: null, rackId: null, isUnclassified: false }
}

export function filterOutlineScene(scene: WarehouseLayoutEditorScene, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('vi')
  if (!normalizedQuery) return scene
  const includesQuery = (...values: Array<string | null | undefined>) =>
    values.some((value) => value?.toLocaleLowerCase('vi').includes(normalizedQuery))

  const matchingSlotIds = new Set(
    scene.slots
      .filter((slot) => includesQuery(slot.slotCode, slot.slotName, slot.description))
      .map((slot) => slot.id)
  )
  const matchingZoneSelfIds = new Set(
    scene.zones.filter((zone) => includesQuery(zone.zoneCode, zone.zoneName)).map((zone) => zone.id)
  )
  const matchingRackIds = new Set(
    scene.racks
      .filter(
        (rack) =>
          matchingZoneSelfIds.has(rack.zoneId) ||
          includesQuery(rack.rackCode, rack.rackName, rack.description) ||
          scene.slots.some((slot) => slot.rackId === rack.id && matchingSlotIds.has(slot.id))
      )
      .map((rack) => rack.id)
  )
  const matchingZoneIds = new Set(
    scene.zones
      .filter(
        (zone) =>
          matchingZoneSelfIds.has(zone.id) ||
          scene.racks.some((rack) => rack.zoneId === zone.id && matchingRackIds.has(rack.id))
      )
      .map((zone) => zone.id)
  )

  return {
    ...scene,
    zones: scene.zones.filter((zone) => matchingZoneIds.has(zone.id)),
    racks: scene.racks.filter((rack) => matchingRackIds.has(rack.id)),
    slots: scene.slots.filter(
      (slot) => matchingSlotIds.has(slot.id) || matchingRackIds.has(slot.rackId)
    ),
    decorations: scene.decorations.filter((decoration) =>
      includesQuery(decoration.label, decoration.type)
    ),
  }
}

export function groupBy<T>(items: readonly T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>()
  items.forEach((item) => {
    const key = getKey(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  })
  return groups
}

export function updateIdSet(current: ReadonlySet<string>, id: string, open: boolean) {
  const next = new Set(current)
  if (open) next.add(id)
  else next.delete(id)
  return next
}
