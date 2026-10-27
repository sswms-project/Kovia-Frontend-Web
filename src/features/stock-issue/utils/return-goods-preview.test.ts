import { expect, it } from 'vitest'
import type { GoodsReturnRequestSummary } from '../types/stock-issue.types'
import { customerReturnGoodsRows } from './return-goods-preview'

const document: GoodsReturnRequestSummary = {
  id: 'return',
  goodsReturnRequestCode: 'RTN-1',
  stockIssueRequestId: 'issue',
  stockIssueRequestCode: 'XK-1',
  reason: 'Trả',
  status: 'Approved',
  createdAt: '',
  createdBy: 'maker',
  approvedBy: null,
  approvedAt: null,
  rejectionReason: null,
  items: [
    {
      id: 'item',
      stockIssuePickDetailId: null,
      productId: 'product',
      productName: 'Bia',
      sku: 'SKU-1',
      quantity: 1.25,
      unitName: 'Thùng',
      condition: 'Good',
      restockSlotId: 'slot',
      restockLocation: 'Khu K01 / Kệ A04 / __SYSTEM_DEFAULT__',
      lotId: null,
      lotNumber: null,
    },
  ],
}
it('separates planned condition/location from actual restock without leaking a system slot', () => {
  const row = customerReturnGoodsRows(document)[0]
  expect(row?.cells).toEqual([
    'SKU-1',
    'Bia',
    'Thùng',
    '1,25',
    'Còn tốt',
    'Chưa ghi nhận',
    'Dự kiến: Khu K01 / Kệ A04',
    'Không theo lô',
  ])
})
it('uses actual disposition for restocked goods and never credits scrapped goods', () => {
  for (const [condition, label] of [
    ['Good', 'Còn tốt'],
    ['Damaged', 'Hư hỏng'],
    ['Expired', 'Hết hạn'],
    ['Scrap', 'Hủy bỏ'],
  ] as const) {
    const row = customerReturnGoodsRows({
      ...document,
      status: 'Restocked',
      items: document.items.map((line) => ({ ...line, actualCondition: condition })),
    })[0]
    expect(row?.cells[4]).toBe('Còn tốt')
    expect(row?.cells[5]).toBe(label)
    expect(row?.cells[6]).toBe(condition === 'Scrap' ? 'Không nhập kho' : 'Khu K01 / Kệ A04')
  }
})
it('does not invent an actual condition for old or rejected documents', () => {
  expect(customerReturnGoodsRows({ ...document, status: 'Restocked' })[0]?.cells[5]).toBe(
    'Chưa ghi nhận'
  )
  expect(customerReturnGoodsRows({ ...document, status: 'Rejected' })[0]?.cells[5]).toBe(
    'Chưa ghi nhận'
  )
})
