import { describe, expect, it } from 'vitest'
import type { WarehouseLayoutEditorScene } from '@/features/warehouse/types/warehouse-layout-scene.types'
import { describeRackPick, describeSlotPick } from './transfer-slot-pick'

const scene: WarehouseLayoutEditorScene = {
  canvas: { width: 1000, height: 1000, gridSize: 10 },
  zones: [
    {
      id: 'zone',
      zoneCode: 'K01',
      zoneName: 'Hàng khô',
      status: 'Active',
      x: 0,
      y: 0,
      width: 500,
      height: 500,
      rotation: 0,
      zIndex: 0,
    },
  ],
  racks: [
    {
      id: 'rack',
      zoneId: 'zone',
      zoneCode: 'K01',
      rackCode: 'A04',
      rackName: 'Kệ Kèm A3',
      description: null,
      status: 'Active',
      storageMode: 'RackLevel',
      defaultSlotId: 'default-slot',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
    },
  ],
  slots: [
    {
      id: 'slot',
      zoneId: 'zone',
      rackId: 'rack',
      slotCode: 'A04-01',
      slotName: '',
      description: null,
      occupancyStatus: 'Empty',
      isActive: true,
      capacity: null,
      currentOccupancy: 0,
    },
  ],
  decorations: [],
}

describe('transfer destination map labels', () => {
  it('includes zone and rack names without changing the selected IDs', () => {
    expect(describeSlotPick(scene, 'slot')).toEqual({
      slotId: 'slot',
      label: 'Khu K01 - Hàng khô / Kệ A04 - Kệ Kèm A3 / A04-01',
      isValid: true,
    })
    expect(describeRackPick(scene, 'rack')).toEqual({
      slotId: 'default-slot',
      label: 'Khu K01 - Hàng khô / Kệ A04 - Kệ Kèm A3',
      isValid: true,
    })
  })

  it('falls back to codes when names are blank', () => {
    const unnamed = {
      ...scene,
      zones: scene.zones.map((zone) => ({ ...zone, zoneName: ' ' })),
      racks: scene.racks.map((rack) => ({ ...rack, rackName: '' })),
    }
    expect(describeRackPick(unnamed, 'rack')?.label).toBe('Khu K01 / Kệ A04')
  })

  it('still rejects inactive destinations and preserves source inventory labels', () => {
    const inactive = { ...scene, slots: scene.slots.map((slot) => ({ ...slot, isActive: false })) }
    expect(describeSlotPick(inactive, 'slot')?.isValid).toBe(false)
    expect(
      describeSlotPick(scene, 'slot', [{ slotId: 'slot', label: 'Nguồn đã phân bổ' }])?.label
    ).toBe('Nguồn đã phân bổ')
  })
})
