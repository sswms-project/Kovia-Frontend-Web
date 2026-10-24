import { describe, expect, it } from 'vitest'
import {
  createSupplierReturnSchema,
  confirmSupplierReturnDeliverySchema,
} from './supplier-return.schema'

const line = {
  inventoryStockId: 'stock-1',
  label: 'SKU-001',
  maxQuantity: 7,
  unit: 'Cái',
  quantity: 3,
}

const valid = {
  warehouseId: 'warehouse-1',
  supplierId: 'supplier-1',
  reason: 'Hàng lỗi',
  negotiationNote: '',
  lines: [line],
}

describe('createSupplierReturnSchema', () => {
  it.each([
    [0, 0.5, false],
    [0, 1, true],
    [2, 0.25, true],
    [6, 0.001, false],
  ])(
    'validates unit precision %s for quantity %s before creating a return',
    (quantityPrecision, quantity, accepted) => {
      expect(
        createSupplierReturnSchema.safeParse({
          ...valid,
          lines: [{ ...line, quantityPrecision, quantity }],
        }).success
      ).toBe(accepted)
    }
  )
  it.each([
    [2, 0.5],
    [1.5, 1],
  ])(
    'rejects fractional delivery or an invalid old approved quantity (%s/%s)',
    (approvedQuantity, deliveredQuantity) => {
      expect(
        confirmSupplierReturnDeliverySchema.safeParse({
          items: [{ itemId: 'line', quantityPrecision: 0, approvedQuantity, deliveredQuantity }],
        }).success
      ).toBe(false)
    }
  )
  it('accepts a valid return', () => {
    expect(createSupplierReturnSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects the same stock position twice', () => {
    const result = createSupplierReturnSchema.safeParse({ ...valid, lines: [line, line] })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('chỉ được chọn một lần')
  })

  it('rejects quantity above the returnable quantity', () => {
    const result = createSupplierReturnSchema.safeParse({
      ...valid,
      lines: [{ ...line, quantity: 8 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero quantity and an empty line list', () => {
    expect(
      createSupplierReturnSchema.safeParse({ ...valid, lines: [{ ...line, quantity: 0 }] }).success
    ).toBe(false)
    expect(createSupplierReturnSchema.safeParse({ ...valid, lines: [] }).success).toBe(false)
  })
})
