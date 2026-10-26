import { useMemo } from 'react'
import type { CanvasMode, CanvasSceneData } from '../components/WarehouseDesigner/Canvas/types'
import type { WarehouseLayoutEditorScene } from '../types/warehouse-layout-scene.types'
import {
  getMaximumStock,
  getRackMetricLabel,
  type LayoutHighlight,
  type LayoutMetric,
  type LayoutMetricLabel,
} from '../utils/layout-rack-metrics'

interface CanvasSceneDataOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly mode: CanvasMode
  readonly metric: LayoutMetric
  readonly highlight: LayoutHighlight
}

export function useCanvasSceneData({
  scene,
  mode,
  metric,
  highlight,
}: CanvasSceneDataOptions): CanvasSceneData {
  const activeZoneIds = useMemo(
    () => new Set(scene.zones.filter((zone) => zone.status === 'Active').map((zone) => zone.id)),
    [scene.zones]
  )
  const visibleRacks = useMemo(
    () =>
      scene.racks.filter(
        (rack) =>
          !rack.placementPending &&
          !scene.zones.find((zone) => zone.id === rack.zoneId)?.placementPending
      ),
    [scene.racks, scene.zones]
  )
  const sortedZones = useMemo(
    () =>
      scene.zones
        .filter((zone) => !zone.placementPending)
        .toSorted((first, second) => first.zIndex - second.zIndex),
    [scene.zones]
  )
  const sortedRacks = useMemo(
    () => visibleRacks.toSorted((first, second) => first.zIndex - second.zIndex),
    [visibleRacks]
  )
  const sortedDecorations = useMemo(
    () => scene.decorations.toSorted((first, second) => first.zIndex - second.zIndex),
    [scene.decorations]
  )
  const slotsByRack = useMemo(() => {
    const result = new Map<string, WarehouseLayoutEditorScene['slots']>()
    for (const slot of scene.slots) {
      const rackSlots = result.get(slot.rackId) ?? []
      rackSlots.push(slot)
      result.set(slot.rackId, rackSlots)
    }
    return result
  }, [scene.slots])
  const maximumRackStock = useMemo(() => getMaximumStock(scene.racks), [scene.racks])
  const maximumSlotStock = useMemo(() => getMaximumStock(scene.slots), [scene.slots])
  const activeMetric: LayoutMetric = mode === 'viewer' ? metric : 'off'
  const activeHighlight: LayoutHighlight = mode === 'viewer' ? highlight : 'all'
  // Nhãn chỉ phụ thuộc dữ liệu và chế độ đo, không phụ thuộc zoom/cuộn, nên tính một lần cho cả sơ đồ.
  const rackMetricLabels = useMemo(() => {
    const result = new Map<string, LayoutMetricLabel | null>()
    if (activeMetric === 'off') return result
    for (const rack of scene.racks) {
      result.set(
        rack.id,
        getRackMetricLabel(activeMetric, rack, slotsByRack.get(rack.id) ?? [], maximumRackStock)
      )
    }
    return result
  }, [activeMetric, maximumRackStock, scene.racks, slotsByRack])

  return {
    activeZoneIds,
    sortedZones,
    sortedRacks,
    sortedDecorations,
    slotsByRack,
    maximumSlotStock,
    rackMetricLabels,
    activeMetric,
    activeHighlight,
  }
}
