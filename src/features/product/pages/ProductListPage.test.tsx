import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import ProductListPage from './ProductListPage'

vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: () => ({ canExport: false, buttonProps: { isPending: false, onExport: vi.fn() } }),
}))

const state = vi.hoisted(() => ({
  query: {
    data: { items: [], totalCount: 3, stockStatusCounts: { all: 3, lowStock: 1, outOfStock: 1 } },
    isPlaceholderData: false,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  },
  params: new URLSearchParams(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => state.params,
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [P.INVENTORY_VIEW] } }),
}))
vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useInventoryWarehouseOptionsQuery: () => ({ data: [] }),
}))
vi.mock('../hooks/use-products', () => ({
  useProductListQuery: () => state.query,
  useCategoriesQuery: () => ({ data: [] }),
  useUnitsQuery: () => ({ data: [] }),
  useCreateProductMutation: () => ({}),
  useUploadProductImageMutation: () => ({}),
  useCreateCategoryMutation: () => ({}),
}))

describe('ProductListPage filter loading stability', () => {
  it('keeps stock filters mounted during a first uncached status switch and a filtered empty result', () => {
    const view = render(<ProductListPage />)
    const allFilter = screen.getByRole('radio', { name: 'Tất cả 3 sản phẩm' })
    state.params = new URLSearchParams('stock=LowStock')
    state.query.isPlaceholderData = true
    state.query.isFetching = true
    view.rerender(<ProductListPage />)
    expect(screen.getByRole('radio', { name: 'Tất cả 3 sản phẩm' })).toBe(allFilter)
    expect(screen.getByRole('radio', { name: 'Sắp hết hàng 1 sản phẩm' })).toHaveAttribute(
      'data-state',
      'on'
    )
    expect(allFilter.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Không tìm thấy sản phẩm')).not.toBeInTheDocument()
    state.query.isPlaceholderData = false
    state.query.isFetching = false
    state.query.data.totalCount = 0
    view.rerender(<ProductListPage />)
    expect(screen.getByRole('radio', { name: 'Tất cả 3 sản phẩm' })).toBe(allFilter)
    expect(screen.getByText('Không tìm thấy sản phẩm')).toBeInTheDocument()
  })
})
