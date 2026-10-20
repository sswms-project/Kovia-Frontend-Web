import type { ComponentProps } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { InventoryReservationDirectory } from './InventoryReservationDirectory'

it('exposes reservation filters directly in the toolbar and retains callbacks', () => {
  const props: ComponentProps<typeof InventoryReservationDirectory> = {
    permissions: [],
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    warehouseId: '',
    productId: '',
    status: 'Active',
    warehouseOptions: [{ value: 'warehouse', label: 'Kho QA' }],
    productOptions: [{ value: 'product', label: 'Hàng QA' }],
    isLoading: false,
    isFetching: false,
    isError: false,
    areFiltersLoading: false,
    areFiltersError: false,
    activeFilterCount: 0,
    onWarehouseChange: vi.fn(),
    onProductChange: vi.fn(),
    onStatusChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onResetFilters: vi.fn(),
    onRetryFilters: vi.fn(),
    onRetry: vi.fn(),
  }
  render(<InventoryReservationDirectory {...props} />)
  const reload = screen.getByRole('button', { name: 'Làm mới lịch sử giữ hàng' })
  expect(reload).toHaveClass('justify-self-end')
  expect(reload.parentElement).toHaveClass('w-full', 'grid', 'grid-cols-[minmax(0,1fr)_auto]')
  expect(screen.getByLabelText('Bộ lọc giữ hàng')).not.toContainElement(reload)
  expect(screen.queryByText('Danh sách giữ hàng')).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Tồn đang giữ' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Bộ lọc/ })).not.toBeInTheDocument()
  expect(
    screen.queryByText('Mỗi dòng thuộc một tồn kho và chứng từ cụ thể.')
  ).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Kho'), { target: { value: 'warehouse' } })
  fireEvent.change(screen.getByLabelText('Sản phẩm'), { target: { value: 'product' } })
  fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'Released' } })
  fireEvent.click(screen.getByRole('button', { name: 'Làm mới lịch sử giữ hàng' }))
  expect(props.onWarehouseChange).toHaveBeenCalledWith('warehouse')
  expect(props.onProductChange).toHaveBeenCalledWith('product')
  expect(props.onStatusChange).toHaveBeenCalledWith('Released')
  expect(props.onRetry).toHaveBeenCalledOnce()
})

it('labels supplier-return reservations with the return code', () => {
  render(
    <InventoryReservationDirectory
      permissions={[]}
      items={[
        {
          id: 'r-1',
          inventoryStockId: 'st-1',
          productId: 'p-1',
          productSku: 'SKU1',
          productName: 'Sữa',
          warehouseId: 'w-1',
          warehouseCode: 'MAIN',
          warehouseName: 'Kho chính',
          slotId: 's-1',
          slotCode: 'A-01',
          lotId: null,
          lotNumber: null,
          qualityStatus: 'Good',
          eligibilityStatus: 'Available',
          referenceType: 'SupplierReturnLine',
          referenceId: 'sri-1',
          referenceCode: 'SRT-20261019100000-ABC123',
          reservedQuantity: 5,
          status: 'Active',
          createdByUserId: 'u-1',
          createdByName: 'Người lập',
          releasedAt: null,
          createdAt: '2026-10-19T00:00:00Z',
        },
      ]}
      page={1}
      pageSize={20}
      totalCount={1}
      warehouseId=""
      productId=""
      status="Active"
      warehouseOptions={[]}
      productOptions={[]}
      isLoading={false}
      isFetching={false}
      isError={false}
      areFiltersLoading={false}
      areFiltersError={false}
      activeFilterCount={0}
      onWarehouseChange={vi.fn()}
      onProductChange={vi.fn()}
      onStatusChange={vi.fn()}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onResetFilters={vi.fn()}
      onRetryFilters={vi.fn()}
      onRetry={vi.fn()}
    />
  )
  expect(screen.getAllByText(/Trả hàng NCC ·/).length).toBeGreaterThan(0)
  expect(screen.getAllByText('SRT-20261019100000-ABC123').length).toBeGreaterThan(0)
  expect(screen.queryByText(/Điều chuyển kho/)).not.toBeInTheDocument()
})
