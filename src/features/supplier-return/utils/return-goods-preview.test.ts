import { expect, it } from 'vitest'
import { buildSupplierReturn } from '../components/SupplierReturnsPage/fixtures'
import { supplierReturnGoodsRows } from './return-goods-preview'

it('keeps delivered quantity unknown rather than manufacturing zero and uses full location', () => {
  const document = buildSupplierReturn()
  const rows = supplierReturnGoodsRows({
    ...document,
    items: document.items.map((line) => ({
      ...line,
      slotCode: '__SYSTEM_DEFAULT__',
      zoneCode: 'K01',
      rackCode: 'A04',
    })),
  })
  expect(rows[0]?.cells[4]).toBe('Chưa giao')
  expect(rows[0]?.cells[6]).toBe('Khu vực K01 / Kệ A04')
  expect(rows[1]?.cells[5]).toBe('Hư hỏng')
  expect(supplierReturnGoodsRows({ ...document, status: 'Completed' })[0]?.cells[4]).toBe(
    'Chưa ghi nhận'
  )
})
it('preserves actual delivered zero, quantities, units, and lot from the contract', () => {
  const document = buildSupplierReturn()
  const rows = supplierReturnGoodsRows({
    ...document,
    status: 'Completed',
    items: document.items.map((line) => ({ ...line, deliveredQuantity: 0 })),
  })
  expect(rows[0]?.cells[4]).toBe('0')
  expect(rows[1]?.cells.slice(2, 5)).toEqual(['Hộp', '5', '0'])
  expect(rows[1]?.cells[7]).toBe('LOT-1')
})
