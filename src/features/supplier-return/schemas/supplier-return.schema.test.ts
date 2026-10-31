import { expect, it } from 'vitest'
import { createSupplierReturnSchema } from './supplier-return.schema'

const valid = {
  warehouseId: 'warehouse',
  supplierId: 'supplier',
  sourceGoodsReceiptId: 'b6d01387-f053-4984-1655-08df3267ca97',
  reason: 'Trả hàng lỗi',
  negotiationNote: '',
  lines: [{ inventoryStockId: 'stock', label: 'Sữa', maxQuantity: 5, unit: 'Thùng', quantity: 2 }],
}

it('accepts a .NET sequential receipt GUID without imposing RFC version/variant bits', () => {
  expect(createSupplierReturnSchema.safeParse(valid).success).toBe(true)
})

it.each(['', 'PN000005', '00000000-0000-0000-0000-000000000000'])(
  'rejects an unselected or invalid source receipt: %s',
  (sourceGoodsReceiptId) => {
    const result = createSupplierReturnSchema.safeParse({ ...valid, sourceGoodsReceiptId })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues.some((issue) => issue.path[0] === 'sourceGoodsReceiptId')).toBe(
        true
      )
  }
)
