import { describe, expect, it } from 'vitest'
import type {
  WarehouseLayoutRackSceneResponse,
  WarehouseLayoutSlotSceneResponse,
} from '../types/warehouse-layout-scene.types'
import {
  getMaximumStock,
  getRackHeaderScreenHeight,
  getRackLabelMode,
  getRackMetricLabel,
  getSlotMetricLabel,
} from './layout-rack-metrics'

const quantityCapacity = {
  capacityType: 'Quantity',
  capacityUnitId: 'unit-pallet',
  capacityUnitSymbol: 'pl',
} as const

function buildRack(overrides: Partial<WarehouseLayoutRackSceneResponse>) {
  return {
    id: 'rack-1',
    storageMode: 'RackLevel',
    ...overrides,
  } as WarehouseLayoutRackSceneResponse
}

function buildSlot(overrides: Partial<WarehouseLayoutSlotSceneResponse>) {
  return {
    id: 'slot-1',
    isActive: true,
    ...overrides,
  } as WarehouseLayoutSlotSceneResponse
}

describe('getSlotMetricLabel', () => {
  it.each([
    [0, 'empty', '0%'],
    [30, 'low', '30%'],
    [50, 'mid', '50%'],
    [80, 'high', '80%'],
    [100, 'full', '100%'],
    [130, 'full', '130%'],
  ])('bands %i used of 100 as %s', (used, band, primary) => {
    const label = getSlotMetricLabel(
      'capacity',
      buildSlot({ ...quantityCapacity, capacity: 100, capacityUsed: used }),
      0
    )
    expect(label).toMatchObject({ band, primary, secondary: `${used}/100 pl` })
  })

  it('flags a slot whose capacity unit is not configured', () => {
    const label = getSlotMetricLabel(
      'capacity',
      buildSlot({ requiresCapacityConfiguration: true, capacity: 10 }),
      0
    )
    expect(label).toEqual({
      band: null,
      primary: 'Chưa cấu hình',
      compact: '!',
      secondary: null,
    })
  })

  it('labels a slot without a capacity limit instead of leaving it blank', () => {
    expect(getSlotMetricLabel('capacity', buildSlot({ capacityType: 'None' }), 0)).toEqual({
      band: null,
      primary: 'Không giới hạn',
      compact: '∞',
      secondary: null,
    })
  })

  it('has no capacity label when the API did not report a capacity type', () => {
    expect(getSlotMetricLabel('capacity', buildSlot({}), 0)).toBeNull()
  })

  it('shows nothing when the metric is off', () => {
    expect(getSlotMetricLabel('off', buildSlot({ onHandQuantity: 5 }), 5)).toBeNull()
  })

  it('bands stock relative to the busiest slot and counts SKUs', () => {
    const stock = (onHandQuantity: number) =>
      getSlotMetricLabel('stock', buildSlot({ onHandQuantity, skuCount: 2 }), 100)
    expect(stock(0)).toMatchObject({ band: 'empty', primary: '0', secondary: '2 mã hàng' })
    expect(stock(20)?.band).toBe('low')
    expect(stock(50)?.band).toBe('mid')
    expect(stock(100)?.band).toBe('high')
    expect(stock(1500)?.primary).toBe('1,5K')
  })
})

describe('getRackMetricLabel', () => {
  it('uses the rack capacity for rack-level storage', () => {
    const rack = buildRack({ ...quantityCapacity, capacity: 40, capacityUsed: 30 })
    expect(getRackMetricLabel('capacity', rack, [], 0)).toMatchObject({
      band: 'mid',
      primary: '75%',
      secondary: '30/40 pl',
    })
  })

  it('adds up active slots of the same unit for slot-level storage', () => {
    const rack = buildRack({ storageMode: 'SlotLevel' })
    const slots = [
      buildSlot({ ...quantityCapacity, capacity: 10, capacityUsed: 10 }),
      buildSlot({ ...quantityCapacity, capacity: 30, capacityUsed: 0 }),
      buildSlot({ ...quantityCapacity, capacity: 99, capacityUsed: 99, isActive: false }),
    ]
    expect(getRackMetricLabel('capacity', rack, slots, 0)).toMatchObject({
      band: 'low',
      primary: '25%',
    })
  })

  it('shows a dash for slot-level racks whose slots use different units', () => {
    const slots = [
      buildSlot({ ...quantityCapacity, capacity: 10, capacityUsed: 5 }),
      buildSlot({ ...quantityCapacity, capacityUnitId: 'unit-kg', capacity: 10, capacityUsed: 5 }),
    ]
    expect(
      getRackMetricLabel('capacity', buildRack({ storageMode: 'SlotLevel' }), slots, 0)?.primary
    ).toBe('—')
  })

  it('labels racks without a capacity limit, rack-level or slot-level', () => {
    const unlimitedRack = buildRack({ capacityType: 'None' })
    expect(getRackMetricLabel('capacity', unlimitedRack, [], 0)?.compact).toBe('∞')
    const slotRack = buildRack({ storageMode: 'SlotLevel' })
    const unlimitedSlots = [
      buildSlot({ capacityType: 'None' }),
      buildSlot({ capacityType: 'None' }),
    ]
    expect(getRackMetricLabel('capacity', slotRack, unlimitedSlots, 0)?.primary).toBe(
      'Không giới hạn'
    )
    expect(getRackMetricLabel('capacity', slotRack, [], 0)?.primary).toBe('—')
  })

  it('reports on-hand stock and SKU count for the stock metric', () => {
    const rack = buildRack({ onHandQuantity: 12, skuCount: 3 })
    expect(getRackMetricLabel('stock', rack, [], 12)).toEqual({
      band: 'high',
      primary: '12',
      compact: '12',
      secondary: '3 mã hàng',
    })
  })
})

describe('getMaximumStock', () => {
  it('ignores locations without a reported quantity', () => {
    expect(getMaximumStock([{ onHandQuantity: 4 }, {}, { onHandQuantity: 9 }])).toBe(9)
    expect(getMaximumStock([])).toBe(0)
  })
})

describe('getRackLabelMode', () => {
  it.each([
    [20, 60, 0, 'none'],
    [60, 60, 0, 'center'],
    [140, 60, 90, 'center'],
    [140, 20, 0, 'center'],
    [79, 60, 0, 'center'],
    [80, 60, 0, 'header'],
    [140, 60, 0, 'header'],
  ])('maps %ipx x %ipx at %i degrees to %s', (width, height, rotation, mode) => {
    expect(getRackLabelMode(width, height, rotation)).toBe(mode)
  })
})

describe('getRackHeaderScreenHeight', () => {
  it.each([
    [200, 120, true, true, 30],
    [200, 120, false, true, 18],
    [99, 120, true, true, 18],
    [200, 89, true, true, 18],
    [125, 41, true, false, 30],
    [125, 35, true, false, 18],
  ])(
    'uses %ipx x %ipx (secondary: %s, slots: %s) -> %ipx header',
    (width, height, secondary, hasSlots, header) => {
      expect(getRackHeaderScreenHeight(width, height, secondary, hasSlots)).toBe(header)
    }
  )
})
