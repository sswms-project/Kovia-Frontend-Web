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
