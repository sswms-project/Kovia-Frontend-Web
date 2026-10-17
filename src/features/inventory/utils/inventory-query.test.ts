import { expect, it } from 'vitest'
import { buildInventoryQuery } from './inventory-query'

it('sends combined warehouse/product/location filters and trimmed search with pagination', () => {
  expect(
    buildInventoryQuery(
      { warehouseId: 'warehouse', productId: 'product', slotId: 'slot', searchTerm: ' SKU ' },
      1,
      20
    )
  ).toEqual({
    warehouseId: 'warehouse',
    productId: 'product',
    slotId: 'slot',
    searchTerm: 'SKU',
    pageNumber: 1,
    pageSize: 20,
  })
  expect(
    buildInventoryQuery({ warehouseId: '', productId: '', slotId: '', searchTerm: ' ' }, 1, 20)
  ).toEqual({ pageNumber: 1, pageSize: 20 })
})
