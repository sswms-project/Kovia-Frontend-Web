import { describe, expect, it } from 'vitest'
import { productStockOption } from './product-stock-option'

const product = { id: 'p', sku: 'SKU000005', productName: 'Bia Tiger', unitName: 'Thùng' }

describe('product option stock description', () => {
  it('uses the requested hyphen label and base unit below it', () => {
    expect(productStockOption(product, 23)).toEqual({
      value: 'p',
      label: 'SKU000005 - Bia Tiger',
      description: 'Tồn khả dụng: 23 Thùng',
    })
    expect(productStockOption({ ...product, unitName: 'Lon' }, 23).description).toBe(
      'Tồn khả dụng: 23 Lon'
    )
  })
  it('distinguishes confirmed zero from unknown, loading and not-selected warehouse', () => {
    expect(productStockOption(product, 0).description).toBe('Tồn khả dụng: 0 Thùng')
    expect(productStockOption(product, undefined).description).toBe('Chưa tải được tồn khả dụng')
    expect(productStockOption(product, undefined, 'Chọn kho nhận để xem tồn').description).toBe(
      'Chọn kho nhận để xem tồn'
    )
    expect(productStockOption(product, undefined, 'Đang tải tồn khả dụng…').description).toBe(
      'Đang tải tồn khả dụng…'
    )
  })
})
