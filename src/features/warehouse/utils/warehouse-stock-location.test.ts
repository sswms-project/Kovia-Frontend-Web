import { describe, expect, it } from 'vitest'
import { locationScene } from './warehouse-stock-location.test-fixtures'
import { resolveWarehouseStockLocation } from './warehouse-stock-location'

describe('resolveWarehouseStockLocation', () => {
  it('resolves exact IDs across GUID casing and preserves rotated rack geometry', () => {
    expect(resolveWarehouseStockLocation(locationScene(), 'WAREHOUSE-A', 'SLOT-A')).toMatchObject({
      placed: true,
      rack: { id: 'rack-a', rotation: 90 },
    })
  })
  it('rejects another warehouse and unknown slots instead of guessing from codes', () => {
    expect(resolveWarehouseStockLocation(locationScene(), 'warehouse-b', 'slot-a')).toBeNull()
    expect(resolveWarehouseStockLocation(locationScene(), 'warehouse-a', 'unknown')).toBeNull()
  })
  it('resolves a rack-level default slot omitted from the slots collection', () => {
    const scene = locationScene()
    scene.slots = []
    Object.assign(scene.racks[0]!, { storageMode: 'RackLevel', defaultSlotId: 'default-slot' })
    expect(resolveWarehouseStockLocation(scene, 'warehouse-a', 'default-slot')).toMatchObject({
      rack: { id: 'rack-a' },
      slot: undefined,
      placed: true,
    })
  })
  it.each(['zone', 'rack', 'slot'])('rejects inactive %s', (entity) => {
    const scene = locationScene()
    if (entity === 'zone') scene.zones[0]!.status = 'Inactive'
    if (entity === 'rack') scene.racks[0]!.status = 'Inactive'
    if (entity === 'slot') scene.slots[0]!.isActive = false
    expect(resolveWarehouseStockLocation(scene, 'warehouse-a', 'slot-a')).toBeNull()
  })
  it('rejects mismatched hierarchy and ambiguous IDs', () => {
    const scene = locationScene()
    scene.slots[0]!.zoneId = 'another-zone'
    expect(resolveWarehouseStockLocation(scene, 'warehouse-a', 'slot-a')).toBeNull()
    scene.slots[0]!.zoneId = 'zone-a'
    scene.slots.push({ ...scene.slots[0]! })
    expect(resolveWarehouseStockLocation(scene, 'warehouse-a', 'slot-a')).toBeNull()
  })
  it.each([null, NaN, Infinity])(
    'keeps text only for unplaced or invalid geometry (%s)',
    (value) => {
      const scene = locationScene()
      scene.racks[0]!.x = value
      expect(resolveWarehouseStockLocation(scene, 'warehouse-a', 'slot-a')?.placed).toBe(false)
    }
  )
})
