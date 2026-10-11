import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProductListItem } from '../../types/product.types'
import { ProductListTable } from './ProductListTable'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const product: ProductListItem = {
  id: 'product-1',
  sku: 'SKU-001',
  productName: 'Sản phẩm thử nghiệm',
  description: null,
  unitId: 'unit-1',
  unitName: 'Cái',
  categoryId: null,
  categoryCode: null,
  categoryName: null,
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

describe('ProductListTable', () => {
  it('shows only the on-hand quantity when inventory can be viewed', () => {
    render(
      <ProductListTable
        products={[product]}
        canEdit={false}
        canViewInventory
        onView={vi.fn()}
        onEdit={vi.fn()}
      />
    )

    expect(screen.getByRole('columnheader', { name: 'Số lượng tồn' })).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Đang giữ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Khả dụng' })).not.toBeInTheDocument()
  })

  it('hides inventory quantity without inventory:view', () => {
    render(
      <ProductListTable
        products={[{ ...product, quantityOnHand: null }]}
        canEdit={false}
        canViewInventory={false}
        onView={vi.fn()}
        onEdit={vi.fn()}
      />
    )

    expect(screen.queryByRole('columnheader', { name: 'Số lượng tồn' })).not.toBeInTheDocument()
    expect(screen.queryByText('12')).not.toBeInTheDocument()
  })
})
