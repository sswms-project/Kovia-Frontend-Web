import { describe, expect, it } from 'vitest'
import type {
  ProductResponse,
  ProductUnitConversion,
  UnitResponse,
} from '@/features/product/types/product.types'
import type { TransferAvailability } from '../types/transfer.types'
import { buildTransferLineUnits, transferUnitLabel } from './transfer-line-units'

const product = { id: 'p1', unitId: 'chai', unitName: 'Chai' } as ProductResponse
const units = [{ id: 'chai', unitName: 'Chai', quantityPrecision: 0 }] as UnitResponse[]
const conversion = (overrides: Partial<ProductUnitConversion>) =>
  ({
    unitId: 'thung',
    unitName: 'Thùng',
    conversionFactor: 24,
    quantityPrecision: 0,
    status: 'Active',
    ...overrides,
  }) as ProductUnitConversion

describe('buildTransferLineUnits', () => {
  it('lists the base unit first, then active conversions, without needing warehouses', () => {
    const result = buildTransferLineUnits(
      product,
      [conversion({}), conversion({ unitId: 'cu', status: 'Inactive' })],
      units
    )
    expect(result.baseUnitName).toBe('Chai')
    expect(result.units.map((unit) => unit.unitId)).toEqual(['chai', 'thung'])
    expect(result.units.every((unit) => unit.availableQuantity === undefined)).toBe(true)
  })

  it('adds stock per unit once the availability for the source warehouse is known', () => {
    const availability = {
      units: [
        { unitId: 'chai', availableQuantity: 100 },
        { unitId: 'thung', availableQuantity: 4 },
      ],
    } as TransferAvailability
    const result = buildTransferLineUnits(product, [conversion({})], units, availability)
    expect(result.units.map((unit) => unit.availableQuantity)).toEqual([100, 4])
  })

  it('writes labels a user can read without knowing the factor', () => {
    const [base, box] = buildTransferLineUnits(product, [conversion({})], units).units
    const format = (value: number) => String(value)
    expect(transferUnitLabel(base!, 'Chai', format)).toBe('Chai (đơn vị chính)')
    expect(transferUnitLabel(box!, 'Chai', format)).toBe('Thùng (1 Thùng = 24 Chai)')
  })
})
