import { describe, expect, it } from 'vitest'
import type { ZoneResponse } from '@/types/warehouse'
import type { GoodsReceiptItem } from '../types/inbound.types'
import { getPutawaySlotOptions } from '../utils/putaway-slot-options'
import { validatePlanDrafts } from '../utils/putaway-plan-draft'
import { getPutawayAllocationState } from './putaway-allocation.schema'

const ITEM = '11111111-1111-1111-1111-111111111111'
const BASE = '22222222-2222-2222-2222-222222222222'
const SLOT = '33333333-3333-3333-3333-333333333333'
const RECEIVING = '44444444-4444-4444-4444-444444444444'

const item = {
  id: ITEM,
  inboundRequestItemId: 'req-item',
  productId: 'product',
  baseUnitId: BASE,
  baseUnitName: 'Cái',
  remainingPutAwayQuantity: 100,
  allowedUnits: [
    { unitId: BASE, unitName: 'Cái', unitCode: 'CAI', quantityPrecision: 0, conversionFactor: 1 },
  ],
} as unknown as GoodsReceiptItem

const slot = (remainingCapacity: number | null, capacityUnitId: string | null = BASE) => ({
  id: SLOT,
  code: 'A-01',
  remainingCapacity,
  capacityUnitId,
})

const line = (enteredQuantity: number) => ({
  goodsReceiptItemId: ITEM,
  slotId: SLOT,
  enteredUnitId: BASE,
  enteredQuantity,
})

describe('getPutawayAllocationState capacity', () => {
  it('blocks quantities above the slot remaining capacity', () => {
    const state = getPutawayAllocationState([line(30)], [item], [slot(20)])
    expect(state.rows[0]?.errors.enteredQuantity).toBe(
      'Vượt sức chứa còn lại của vị trí (còn 20 Cái).'
    )
    expect(state.canSubmit).toBe(false)
    expect(state.canSavePlan).toBe(false)
  })

  it('allows quantities within capacity', () => {
    expect(getPutawayAllocationState([line(20)], [item], [slot(20)]).canSubmit).toBe(true)
  })

  it('allows a partial plan while keeping unassigned rows invalid for execution', () => {
    const state = getPutawayAllocationState(
      [line(20), { ...line(80), slotId: '' }],
      [item],
      [slot(20)]
    )
    expect(state.canSavePlan).toBe(true)
    expect(state.canSubmit).toBe(false)
  })

  it('skips the client check when capacity is tracked in another unit', () => {
    expect(getPutawayAllocationState([line(30)], [item], [slot(20, 'other')]).canSubmit).toBe(true)
  })
})

describe('validatePlanDrafts capacity', () => {
  it('blocks saving when the plan exceeds remaining capacity', () => {
    const result = validatePlanDrafts(
      [item],
      { [ITEM]: [{ key: 'k', slotId: SLOT, quantity: 30 }] },
      [slot(20)]
    )
    expect(result.lineErrors.get(`${ITEM}:k`)).toContain('còn 20 Cái')
    expect(result.canSave).toBe(false)
  })
})

describe('getPutawaySlotOptions', () => {
  const zone = (slotIds: string[]) =>
    ({
      id: 'zone',
      zoneCode: 'Z',
      zoneName: 'Zone',
      status: 'Active',
      racks: [
        {
          id: 'rack',
          rackCode: 'R',
          rackName: 'Rack',
          status: 'Active',
          storageMode: 'SlotLevel',
          isIsolationPoint: false,
          allowsMixedProducts: true,
          slots: slotIds.map((id) => ({
            id,
            slotCode: id.slice(0, 2),
            slotName: id,
            isActive: true,
            isOutboundStaging: false,
            isIsolationPoint: false,
            capacityType: 'Quantity',
            capacityUnitId: BASE,
            remainingCapacity: 5,
          })),
        },
      ],
    }) as unknown as ZoneResponse

  it('excludes the receiving slot and exposes remaining capacity', () => {
    const options = getPutawaySlotOptions([zone([SLOT, RECEIVING])], RECEIVING)
    expect(options.map((option) => option.id)).toEqual([SLOT])
    expect(options[0]).toMatchObject({ remainingCapacity: 5, capacityUnitId: BASE })
  })
})
