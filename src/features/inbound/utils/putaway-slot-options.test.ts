import { describe, expect, it } from 'vitest'
import type { SlotResponse, ZoneResponse } from '@/types/warehouse'
import type { GoodsReceiptItem } from '../types/inbound.types'
import { getPutawaySlotOptions } from './putaway-slot-options'
import {
  getPutawayAllocationState,
  getPutawayFillRemaining,
} from '../schemas/putaway-allocation.schema'
import {
  getPutawayBaseQuantity,
  getPutawayRemainingInput,
  formatPutawayQuantity,
} from './putaway-units'
import { putawayLineSchema } from '../schemas/inbound.schema'

const slot: SlotResponse = {
  id: '10000000-0000-4000-8000-000000000001',
  slotCode: 'A01',
  slotName: 'A01',
  description: null,
  status: 'Vacant',
  isActive: true,
  capacityType: 'Quantity',
  capacity: 20,
  capacityUsed: 8,
  capacityUnitName: 'Thùng',
  remainingCapacity: 12,
  currentOccupancy: 192,
  barcodeValue: null,
}
const zone: ZoneResponse = {
  id: 'zone',
  zoneCode: 'ZA',
  zoneName: 'Khu A',
  description: null,
  status: 'Active',
  racks: [
    {
      id: 'rack',
      rackCode: 'R',
      rackName: 'Kệ',
      description: null,
      status: 'Active',
      storageMode: 'SlotLevel',
      slots: [slot],
    },
  ],
}
const item: GoodsReceiptItem = {
  id: '10000000-0000-4000-8000-000000000002',
  productId: 'product',
  productSKU: 'SKU',
  productName: 'Lon nước',
  baseUnitId: '10000000-0000-4000-8000-000000000003',
  baseUnitName: 'Lon',
  enteredUnitId: '10000000-0000-4000-8000-000000000004',
  conversionFactorSnapshot: 24,
  allowedUnits: [
    {
      unitId: '10000000-0000-4000-8000-000000000003',
      unitName: 'Lon',
      unitCode: 'LON',
      quantityPrecision: 0,
      conversionFactor: 1,
    },
    {
      unitId: '10000000-0000-4000-8000-000000000004',
      unitName: 'Thùng',
      unitCode: 'THUNG',
      quantityPrecision: 0,
      conversionFactor: 24,
    },
  ],
  inboundRequestItemId: 'request',
  lotId: null,
  lotNumber: null,
  manufacturedDate: null,
  expiryDate: null,
  orderedQuantity: 240,
  receivedQuantity: 240,
  damagedQuantity: 0,
  usableQuantity: 240,
  putAwayQuantity: 0,
  remainingPutAwayQuantity: 240,
  exceptionReason: null,
  putAwayDetails: [],
  putAwayPlan: [],
}

describe('putaway capacity units', () => {
  it('rejects conversion when JS quantity loses exact hundredths near its safe-integer boundary', () => {
    const unit = { ...item.allowedUnits[1]!, conversionFactor: 1000.000001 }
    const base = { ...item.allowedUnits[0]!, quantityPrecision: 2 }
    expect(getPutawayBaseQuantity(90071990000, unit, base)).toBeNull()
    expect(getPutawayBaseQuantity(90071980000, unit, base)).toBe(90071980090071.98)
  })
  it('normalizes four cartons to 96 cans and defaults remaining to ten cartons', () => {
    const line = {
      goodsReceiptItemId: item.id,
      slotId: slot.id,
      enteredQuantity: 4,
      enteredUnitId: item.enteredUnitId!,
    }
    const state = getPutawayAllocationState([line], [item], getPutawaySlotOptions([zone]))
    expect(state.canSubmit).toBe(true)
    expect(state.rows[0]?.baseQuantity).toBe(96)
    expect(state.assignedByItem.get(item.id)).toBe(9600)
    expect(getPutawayRemainingInput(item, 240)).toEqual({
      enteredQuantity: 10,
      enteredUnitId: item.enteredUnitId,
    })
    expect(formatPutawayQuantity(item, 144)).toBe('6 Thùng (144 Lon)')
  })
  it('fills only the quantity left after other rows, irrespective of their position', () => {
    const slots = getPutawaySlotOptions([zone])
    const lines = [
      {
        goodsReceiptItemId: item.id,
        slotId: '',
        enteredQuantity: 1,
        enteredUnitId: item.enteredUnitId!,
      },
      {
        goodsReceiptItemId: item.id,
        slotId: slot.id,
        enteredQuantity: 4,
        enteredUnitId: item.enteredUnitId!,
      },
    ]
    expect(getPutawayFillRemaining(lines, 0, [item], slots)).toEqual({
      enteredQuantity: 6,
      enteredUnitId: item.enteredUnitId,
    })
    expect(getPutawayFillRemaining(lines.toReversed(), 1, [item], slots)).toEqual({
      enteredQuantity: 6,
      enteredUnitId: item.enteredUnitId,
    })
    expect(
      getPutawayFillRemaining([lines[0]!, { ...lines[1]!, enteredQuantity: 10 }], 0, [item], slots)
    ).toBeNull()
  })
  it('uses base UOM for a non-divisible remainder and never rounds a partial carton', () => {
    expect(getPutawayRemainingInput(item, 145)).toEqual({
      enteredQuantity: 145,
      enteredUnitId: item.baseUnitId,
    })
    expect(getPutawayBaseQuantity(0.5, item.allowedUnits[1], item.allowedUnits[0])).toBeNull()
    expect(
      getPutawayBaseQuantity(
        4,
        { ...item.allowedUnits[1]!, conversionFactor: 0.001 },
        item.allowedUnits[0]
      )
    ).toBeNull()
  })
  it('rejects unavailable units and missing metadata rather than silently treating input as base', () => {
    const line = {
      goodsReceiptItemId: item.id,
      slotId: slot.id,
      enteredQuantity: 4,
      enteredUnitId: crypto.randomUUID(),
    }
    expect(getPutawayAllocationState([line], [item], getPutawaySlotOptions([zone])).canSubmit).toBe(
      false
    )
    expect(getPutawayRemainingInput({ ...item, allowedUnits: [] }, 240)).toBeNull()
    expect(
      getPutawayAllocationState(
        [{ ...line, enteredUnitId: item.baseUnitId }],
        [{ ...item, allowedUnits: [] }],
        getPutawaySlotOptions([zone])
      ).canSubmit
    ).toBe(false)
  })
  it('sums base and packaging quantities for the same item before detecting over-allocation', () => {
    const secondSlot = { ...slot, id: '10000000-0000-4000-8000-000000000005' }
    const slots = getPutawaySlotOptions([
      { ...zone, racks: zone.racks.map((rack) => ({ ...rack, slots: [slot, secondSlot] })) },
    ])
    const state = getPutawayAllocationState(
      [
        {
          goodsReceiptItemId: item.id,
          slotId: slot.id,
          enteredQuantity: 4,
          enteredUnitId: item.enteredUnitId!,
        },
        {
          goodsReceiptItemId: item.id,
          slotId: secondSlot.id,
          enteredQuantity: 145,
          enteredUnitId: item.baseUnitId,
        },
      ],
      [item],
      slots
    )
    expect(state.canSubmit).toBe(false)
    expect(state.rows[1]?.errors.enteredQuantity).toContain('vượt 1 Lon')
    expect(state.totalAssigned).toBe(96)
  })
  it('converts decimal units exactly and rejects unsafe numbers', () => {
    const base = { ...item.allowedUnits[0]!, quantityPrecision: 2 }
    const unit = { ...item.allowedUnits[1]!, quantityPrecision: 6, conversionFactor: 0.1 }
    expect(getPutawayBaseQuantity(0.3, unit, base)).toBe(0.03)
    expect(getPutawayBaseQuantity(0.000001, { ...unit, conversionFactor: 10000 }, base)).toBe(0.01)
    expect(getPutawayBaseQuantity(1e15, unit, base)).toBeNull()
    expect(getPutawayBaseQuantity(Number.NaN, unit, base)).toBeNull()
  })
  it.each([0, -1, Number.NaN, 1e12, 0.0000001])(
    'rejects invalid entered quantity %s',
    (enteredQuantity) => {
      expect(
        putawayLineSchema.safeParse({
          goodsReceiptItemId: item.id,
          slotId: slot.id,
          enteredUnitId: item.baseUnitId,
          enteredQuantity,
        }).success
      ).toBe(false)
    }
  )
  it('allows 240 base units to be submitted for BE conversion instead of comparing to 12 cartons', () => {
    const slots = getPutawaySlotOptions([zone])
    expect(slots[0]?.capacityLabel).toContain('8 / 20 Thùng')
    const allocation = getPutawayAllocationState(
      [
        {
          goodsReceiptItemId: item.id,
          slotId: slot.id,
          enteredQuantity: 240,
          enteredUnitId: item.baseUnitId,
        },
      ],
      [item],
      slots
    )
    expect(allocation.canSubmit).toBe(true)
    expect(allocation.rows[0]?.maxQuantity).toBe(240)
  })
  it.each([
    { capacityType: 'Quantity' as const, remainingCapacity: 0, unavailableReason: 'Vị trí đã đầy' },
    {
      capacityType: 'None' as const,
      requiresCapacityConfiguration: true,
      unavailableReason: 'Cần cấu hình đơn vị sức chứa',
    },
  ])('indicates and rejects unavailable positions %o', ({ unavailableReason, ...policy }) => {
    const slots = getPutawaySlotOptions([
      { ...zone, racks: zone.racks.map((rack) => ({ ...rack, slots: [{ ...slot, ...policy }] })) },
    ])
    expect(slots[0]?.unavailableReason).toBe(unavailableReason)
    expect(
      getPutawayAllocationState(
        [
          {
            goodsReceiptItemId: item.id,
            slotId: slot.id,
            enteredQuantity: 1,
            enteredUnitId: item.baseUnitId,
          },
        ],
        [item],
        slots
      ).canSubmit
    ).toBe(false)
  })
  it('lists RackLevel default slot once and excludes outbound and inactive slots', () => {
    const racks = zone.racks.map((rack) => ({
      ...rack,
      ...slot,
      status: 'Active',
      rackCode: 'R',
      rackName: 'Kệ',
      storageMode: 'RackLevel' as const,
      defaultSlotId: slot.id,
    }))
    expect(getPutawaySlotOptions([{ ...zone, racks }])).toHaveLength(1)
    expect(
      getPutawaySlotOptions([
        {
          ...zone,
          racks: zone.racks.map((rack) => ({
            ...rack,
            slots: [
              { ...slot, isOutboundStaging: true },
              { ...slot, id: 'inactive', isActive: false },
            ],
          })),
        },
      ])
    ).toEqual([])
  })
  it('still rejects over-allocation against receipt quantity and duplicate lines', () => {
    const slots = getPutawaySlotOptions([zone])
    expect(
      getPutawayAllocationState(
        [
          {
            goodsReceiptItemId: item.id,
            slotId: slot.id,
            enteredQuantity: 241,
            enteredUnitId: item.baseUnitId,
          },
        ],
        [item],
        slots
      ).canSubmit
    ).toBe(false)
    const line = {
      goodsReceiptItemId: item.id,
      slotId: slot.id,
      enteredQuantity: 1,
      enteredUnitId: item.baseUnitId,
    }
    expect(getPutawayAllocationState([line, line], [item], slots).canSubmit).toBe(false)
  })
})
