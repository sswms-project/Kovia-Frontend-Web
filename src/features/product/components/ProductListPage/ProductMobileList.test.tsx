import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProductListItem } from '../../types/product.types'
import { ProductMobileList } from './ProductMobileList'

const product: ProductListItem = {
  id: 'product-1',
  sku: 'SKU-001',
  productName: 'Sản phẩm thử nghiệm',
  description: null,
  unitId: 'unit-1',
  unitName: 'Cái',
  categoryId: null,
  categoryCode: null,
  categoryName: 'Ngũ kim',
  categoryPath: null,
  status: 'Active',
  imageUrl: null,
  barcodeValue: null,
  isLotTracked: false,
  shelfLifeDays: null,
  quantityOnHand: 12,
  reservedQuantity: 3,
  availableQuantity: 9,
  createdAt: '2026-09-29T00:00:00Z',
}

describe('ProductMobileList', () => {
  it('opens the product when the card is tapped and edits from its own button', () => {
    const onView = vi.fn()
    const onEdit = vi.fn()
    render(
      <ProductMobileList
        products={[product]}
        canEdit
        canViewInventory
        onView={onView}
        onEdit={onEdit}
      />
    )

    expect(screen.getByText('SKU-001')).toBeInTheDocument()
    expect(screen.getByText('Ngũ kim · Cái')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Sản phẩm thử nghiệm' }))
    expect(onEdit).toHaveBeenCalledWith(product)
    expect(onView).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Sản phẩm thử nghiệm'))
    expect(onView).toHaveBeenCalledWith(product)
  })

  it('hides stock and edit without the matching permissions', () => {
    render(
      <ProductMobileList
        products={[{ ...product, quantityOnHand: null }]}
        canEdit={false}
        canViewInventory={false}
        onView={vi.fn()}
        onEdit={vi.fn()}
      />
    )

    expect(screen.queryByText(/Tồn:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Chỉnh sửa/ })).not.toBeInTheDocument()
  })
})
