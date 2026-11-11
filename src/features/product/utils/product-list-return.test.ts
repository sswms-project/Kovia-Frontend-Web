import { describe, expect, it } from 'vitest'
import { productDetailHref, productListHref } from './product-list-return'

describe('product list return query (E-03)', () => {
  it('carries list filters to the detail page and back', () => {
    const href = productDetailHref('p1', 'search=ao&category=c1&page=3')
    expect(href).toBe('/products/p1?list=search%3Dao%26category%3Dc1%26page%3D3')
    const list = new URL(href, 'http://x').searchParams.get('list')
    expect(productListHref(list)).toBe('/products?search=ao&category=c1&page=3')
  })

  it('keeps the edit flag and drops unknown keys', () => {
    expect(productDetailHref('p1', 'foo=1&stock=LowStock', { edit: true })).toBe(
      '/products/p1?edit=1&list=stock%3DLowStock'
    )
    expect(productListHref('next=//evil.com&search=x')).toBe('/products?search=x')
  })

  it('falls back to the bare routes without filters', () => {
    expect(productDetailHref('p1', '')).toBe('/products/p1')
    expect(productListHref(null)).toBe('/products')
  })
})
