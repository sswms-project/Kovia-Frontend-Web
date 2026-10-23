import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { SupplierReturnDirectory } from './SupplierReturnDirectory'

function renderDirectory(overrides: Partial<ComponentProps<typeof SupplierReturnDirectory>> = {}) {
  const props: ComponentProps<typeof SupplierReturnDirectory> = {
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    searchText: '',
    status: '',
    warehouseId: '',
    supplierId: '',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-20',
    warehouses: [{ id: 'warehouse-1', label: 'DN-01 · Đà Nẵng' }],
    suppliers: [{ id: 'supplier-1', label: 'NCC-01 · Nhà cung cấp' }],
    permissions: [
      P.SUPPLIER_RETURNS_VIEW,
      P.STOCK_ISSUE_REQUESTS_VIEW,
      P.GOODS_RETURN_REQUESTS_VIEW,
    ],
    canCreate: true,
    isLoading: false,
    isFetching: false,
    isError: false,
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onWarehouseChange: vi.fn(),
    onSupplierChange: vi.fn(),
    onDateFromChange: vi.fn(),
    onDateToChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onInspect: vi.fn(),
    onCreate: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  }
  render(<SupplierReturnDirectory {...props} />)
  return props
}

describe('supplier return list toolbar', () => {
  it('puts the create action beside navigation, outside the list panel', () => {
    const props = renderDirectory()
    const navigation = screen.getByRole('navigation', { name: 'Không gian trả hàng' })
    const create = screen.getByRole('button', { name: 'Lập phiếu' })
    expect(navigation.closest('header')).toContainElement(create)
    expect(
      screen.getByRole('region', { name: 'Danh sách phiếu trả hàng nhà cung cấp' })
    ).not.toContainElement(create)
    expect(screen.getByRole('link', { name: 'Trả hàng NCC' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    fireEvent.click(create)
    expect(props.onCreate).toHaveBeenCalledOnce()
  })

  it('does not expose creation without the existing capability', () => {
    renderDirectory({ canCreate: false })
    expect(screen.queryByRole('button', { name: 'Lập phiếu' })).not.toBeInTheDocument()
  })

  it('keeps all six filter controls and their callbacks together with date bounds intact', () => {
    const props = renderDirectory()
    const filters = within(screen.getByRole('search', { name: 'Bộ lọc phiếu trả hàng NCC' }))
    fireEvent.change(filters.getByLabelText('Tìm phiếu trả hàng NCC'), {
      target: { value: 'PT-01' },
    })
    fireEvent.change(filters.getByLabelText('Lọc trạng thái phiếu trả hàng NCC'), {
      target: { value: 'Pending' },
    })
    fireEvent.change(filters.getByLabelText('Lọc kho'), { target: { value: 'warehouse-1' } })
    fireEvent.change(filters.getByLabelText('Lọc nhà cung cấp'), {
      target: { value: 'supplier-1' },
    })
    fireEvent.change(filters.getByLabelText('Từ ngày'), { target: { value: '2026-10-02' } })
    fireEvent.change(filters.getByLabelText('Đến ngày'), { target: { value: '2026-10-19' } })
    expect(props.onSearchChange).toHaveBeenCalledWith('PT-01')
    expect(props.onStatusChange).toHaveBeenCalledWith('Pending')
    expect(props.onWarehouseChange).toHaveBeenCalledWith('warehouse-1')
    expect(props.onSupplierChange).toHaveBeenCalledWith('supplier-1')
    expect(props.onDateFromChange).toHaveBeenCalledWith('2026-10-02')
    expect(props.onDateToChange).toHaveBeenCalledWith('2026-10-19')
    expect(filters.getByLabelText('Từ ngày')).toHaveAttribute('max', '2026-10-20')
    expect(filters.getByLabelText('Đến ngày')).toHaveAttribute('min', '2026-10-01')
  })
})
