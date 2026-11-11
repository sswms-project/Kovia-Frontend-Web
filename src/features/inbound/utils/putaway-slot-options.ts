import type { ZoneResponse } from '@/types/warehouse'
import type { SlotOption } from '../components/PutawayDetailPage'
import {
  formatStorageCapacity,
  type CapacityLocation,
} from '@/features/warehouse/utils/storage-capacity'

function unavailableReason(location: CapacityLocation) {
  if (location.requiresCapacityConfiguration) return 'Cần cấu hình đơn vị sức chứa'
  if (location.capacityType == null) return 'Cần tải lại chính sách sức chứa'
  if (location.capacityType === 'Quantity' && location.remainingCapacity == null)
    return 'Chưa xác định sức chứa còn lại'
  if (location.capacityType === 'Quantity' && (location.remainingCapacity ?? 0) <= 0)
    return 'Vị trí đã đầy'
  return undefined
}

interface CapacitySlot {
  readonly remainingCapacity?: number | null
  readonly capacityUnitId?: string | null
}

/**
 * Remaining capacity expressed in the item's base unit, or null when it cannot be compared
 * client-side (unlimited, unknown, or tracked in another unit — BE still validates those).
 */
export function getSlotRemainingInBaseUnit(slot: CapacitySlot | undefined, baseUnitId: string) {
  if (!slot || slot.remainingCapacity == null || !slot.capacityUnitId) return null
  return slot.capacityUnitId === baseUnitId ? slot.remainingCapacity : null
}

const capacityFields = (location: CapacityLocation) => ({
  remainingCapacity: location.capacityType === 'Quantity' ? location.remainingCapacity : null,
  capacityUnitId: location.capacityType === 'Quantity' ? location.capacityUnitId : null,
})

// The receiving slot is where goods wait before put-away, so it can never be a put-away destination.
export function getPutawaySlotOptions(
  zones: readonly ZoneResponse[],
  receivingSlotId?: string | null
): SlotOption[] {
  return zones
    .flatMap((zone) =>
      zone.status !== 'Active'
        ? []
        : zone.racks.flatMap((rack) => {
            if (rack.status !== 'Active' || rack.isIsolationPoint) return []
            const zoneLabel = `${zone.zoneCode} - ${zone.zoneName}`
            if (rack.storageMode === 'RackLevel') {
              if (!rack.defaultSlotId) return []
              return [
                {
                  id: rack.defaultSlotId,
                  code: rack.rackCode,
                  scanCodes: [
                    `${zone.zoneCode.trim()}-${rack.rackCode.trim()}`,
                    `KOVIA:LOC:RACK:${rack.id}`,
                  ],
                  name: rack.rackName,
                  zoneId: zone.id,
                  zoneLabel,
                  hierarchy: zoneLabel,
                  allowsMixedProducts: rack.allowsMixedProducts,
                  capacityLabel: formatStorageCapacity(rack),
                  unavailableReason: unavailableReason(rack),
                  ...capacityFields(rack),
                },
              ]
            }
            return rack.slots
              .filter((slot) => slot.isActive && !slot.isOutboundStaging && !slot.isIsolationPoint)
              .map((slot) => ({
                id: slot.id,
                code: slot.slotCode,
                scanCodes: [
                  `${zone.zoneCode.trim()}-${rack.rackCode.trim()}-${slot.slotCode.trim()}`,
                  `KOVIA:LOC:SLOT:${slot.id}`,
                  ...(slot.barcodeValue ? [slot.barcodeValue] : []),
                ],
                name: slot.slotName,
                zoneId: zone.id,
                zoneLabel,
                hierarchy: `${zone.zoneCode} / ${rack.rackCode}`,
                allowsMixedProducts: slot.allowsMixedProducts ?? rack.allowsMixedProducts,
                capacityLabel: formatStorageCapacity(slot),
                unavailableReason: unavailableReason(slot),
                ...capacityFields(slot),
              }))
          })
    )
    .filter((option) => option.id !== receivingSlotId)
}
