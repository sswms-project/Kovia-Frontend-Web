import { expect, it } from 'vitest'
import { createSupplierReturnSchema } from './supplier-return.schema'
const base = {
  warehouseId: 'warehouse',
  supplierId: 'supplier',
  sourceGoodsReceiptId: '11111111-1111-4111-8111-111111111111',
  reason: 'Trả hàng',
  negotiationNote: '',
}
function line(id: string, quantity: number) {
  return {
    inventoryStockId: id,
    label: 'SKU - Hàng',
    maxQuantity: 100,
    unit: 'Cái',
    quantity,
    sourceGroupKey: 'P:L',
    sourceRemainingQuantity: 12,
  }
}
it('requires a receiving document and validates the aggregate source allowance across different locations', () => {
  expect(
    createSupplierReturnSchema.safeParse({
      ...base,
      sourceGoodsReceiptId: '',
      lines: [line('A', 5)],
    }).success
  ).toBe(false)
  expect(
    createSupplierReturnSchema.safeParse({ ...base, lines: [line('A', 7), line('B', 6)] }).success
  ).toBe(false)
  expect(
    createSupplierReturnSchema.safeParse({ ...base, lines: [line('A', 7), line('B', 5)] }).success
  ).toBe(true)
})
