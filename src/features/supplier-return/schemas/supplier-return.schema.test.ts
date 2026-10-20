import { describe, expect, it } from 'vitest'
import { createSupplierReturnSchema } from './supplier-return.schema'

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
