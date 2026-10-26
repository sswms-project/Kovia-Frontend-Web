import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import ProductListPage from './ProductListPage'

vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: (options: unknown) => {
    state.exportOptions(options)
    return { canExport: false, buttonProps: { isPending: false, onExport: vi.fn() } }
  },
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
  listParams: vi.fn(),
  listEnabled: vi.fn(),
  exportOptions: vi.fn(),
  optionsPending: false,
  optionsError: false,
  refetchWarehouses: vi.fn(),
  warehouses: [
    { id: 'managed', warehouseCode: 'DN-01', warehouseName: 'Đà Nẵng', canManageWarehouse: true },
    { id: 'other', warehouseCode: 'HN-01', warehouseName: 'Hà Nội', canManageWarehouse: false },
  ],
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
  useInventoryWarehouseOptionsQuery: () => ({
    data: state.optionsPending || state.optionsError ? undefined : state.warehouses,
    isError: state.optionsError,
    refetch: state.refetchWarehouses,
  }),
}))
vi.mock('../hooks/use-products', () => ({
  useProductListQuery: (params: unknown, enabled: boolean) => {
    state.listParams(params)
    state.listEnabled(enabled)
    return state.query
  },
  useCategoriesQuery: () => ({ data: [] }),
  useUnitsQuery: () => ({ data: [] }),
  useCreateProductMutation: () => ({}),
  useUploadProductImageMutation: () => ({}),
  useCreateCategoryMutation: () => ({}),
}))

describe('ProductListPage filter loading stability', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => {
    state.params = new URLSearchParams()
    state.query.isFetching = false
    state.query.isPlaceholderData = false
    state.query.data.totalCount = 3
    state.optionsPending = false
    state.optionsError = false
    state.warehouses = state.warehouses.map((warehouse) => ({
      ...warehouse,
      canManageWarehouse: warehouse.id === 'managed',
    }))
    vi.clearAllMocks()
  })

  it('limits warehouse choices and sends the same managed scope to listing and export', () => {
    render(<ProductListPage />)
    expect(screen.getByRole('option', { name: 'DN-01 — Đà Nẵng' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'HN-01 — Hà Nội' })).not.toBeInTheDocument()
    expect(state.listParams).toHaveBeenCalledWith(
      expect.objectContaining({ managedWarehousesOnly: true })
    )
    expect(state.exportOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ managedWarehousesOnly: true }),
      })
    )
  })

  it('retains every warehouse when the server marks all as manageable for the owner', () => {
    state.warehouses = state.warehouses.map((warehouse) => ({
      ...warehouse,
      canManageWarehouse: true,
    }))
    render(<ProductListPage />)
    expect(screen.getByRole('option', { name: 'HN-01 — Hà Nội' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'DN-01 — Đà Nẵng' })).toBeInTheDocument()
  })

  it('clears an inaccessible warehouse and resets pagination while retaining other URL filters', () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    state.params = new URLSearchParams('warehouse=other&page=3&search=Tiger&status=Active')
    render(<ProductListPage />)
    expect(screen.getByRole('combobox', { name: 'Lọc theo kho hàng' })).toHaveValue('')
    expect(state.listParams).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 1, status: 'Active' })
    )
    expect(state.listParams.mock.lastCall?.[0]).not.toHaveProperty('warehouseId')
    expect(state.listEnabled).toHaveBeenLastCalledWith(true)
    expect(replace).toHaveBeenCalledWith(null, '', '/products?search=Tiger&status=Active')
    expect(state.exportOptions.mock.lastCall?.[0].filters).not.toHaveProperty('warehouseId')
  })

  it('retains an accessible warehouse filter and page', () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    state.params = new URLSearchParams('warehouse=managed&page=2')
    render(<ProductListPage />)
    expect(screen.getByRole('combobox', { name: 'Lọc theo kho hàng' })).toHaveValue('managed')
    expect(state.listParams).toHaveBeenLastCalledWith(
      expect.objectContaining({ warehouseId: 'managed', pageNumber: 2 })
    )
    expect(state.listEnabled).toHaveBeenLastCalledWith(true)
    expect(replace).not.toHaveBeenCalled()
  })

  it('waits for warehouse options before querying a bookmarked scope', () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    state.params = new URLSearchParams('warehouse=other&page=3')
    state.optionsPending = true
    const view = render(<ProductListPage />)
    expect(state.listEnabled).toHaveBeenLastCalledWith(false)
    expect(state.exportOptions).toHaveBeenLastCalledWith(expect.objectContaining({ blocked: true }))
    expect(replace).not.toHaveBeenCalled()
    state.optionsPending = false
    view.rerender(<ProductListPage />)
    expect(state.listEnabled).toHaveBeenLastCalledWith(true)
    expect(state.listParams.mock.lastCall?.[0]).not.toHaveProperty('warehouseId')
    expect(replace).toHaveBeenCalledWith(null, '', '/products')
  })

  it('preserves the URL and retries scope loading when warehouse options fail', () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    state.params = new URLSearchParams('warehouse=managed&page=2')
    state.optionsError = true
    render(<ProductListPage />)
    expect(state.listEnabled).toHaveBeenLastCalledWith(false)
    expect(replace).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(state.refetchWarehouses).toHaveBeenCalledTimes(1)
    expect(state.query.refetch).not.toHaveBeenCalled()
  })

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
