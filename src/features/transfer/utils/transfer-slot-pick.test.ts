import { describe, expect, it } from 'vitest'
import type { WarehouseLayoutEditorScene } from '@/features/warehouse/types/warehouse-layout-scene.types'
import { describeSlotPick } from './transfer-slot-pick'

function slot(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    zoneId: 'z1',
    rackId: 'r1',
    slotCode: `S-${id}`,
    slotName: id,
    description: null,
    occupancyStatus: 'Empty',
    isActive: true,
    isOutboundStaging: false,
    capacity: null,
    currentOccupancy: 0,
    ...overrides,
  }
}

const scene = {
  canvas: { width: 100, height: 100, gridSize: 10 },
  zones: [{ id: 'z1', zoneCode: 'K01' }],
  racks: [{ id: 'r1', rackCode: 'A07' }],
  decorations: [],
  slots: [
    slot('ok'),
    slot('off', { isActive: false }),
    slot('staging', { isOutboundStaging: true }),
  ],
} as unknown as WarehouseLayoutEditorScene

describe('describeSlotPick', () => {
  it('accepts an active receiving slot and labels it Khu / Kệ / Ô', () => {
    expect(describeSlotPick(scene, 'ok')).toEqual({
      slotId: 'ok',
      label: 'Khu K01 / Kệ A07 / S-ok',
      isValid: true,
    })
  })

  it('rejects inactive slots and the outbound staging area as a destination', () => {
    expect(describeSlotPick(scene, 'off')).toMatchObject({ isValid: false })
    expect(describeSlotPick(scene, 'staging')).toMatchObject({
      isValid: false,
      problem: 'Đây là khu chờ xuất, không dùng làm nơi nhận hàng.',
    })
  })

  it('only accepts slots that hold the product when picking a source, using the server label', () => {
    const allowed = [{ slotId: 'ok', label: 'Khu K01 / Kệ A07 / S-ok · còn 12' }]
    expect(describeSlotPick(scene, 'ok', allowed)).toEqual({
      slotId: 'ok',
      label: 'Khu K01 / Kệ A07 / S-ok · còn 12',
      isValid: true,
    })
    expect(describeSlotPick(scene, 'off', allowed)).toMatchObject({ isValid: false })
  })

  it('returns null for something that is not a slot of this warehouse', () => {
    expect(describeSlotPick(scene, 'missing')).toBeNull()
  })
})
