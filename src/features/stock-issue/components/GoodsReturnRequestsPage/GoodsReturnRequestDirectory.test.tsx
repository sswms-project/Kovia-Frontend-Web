import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { GoodsReturnRequestDirectory } from './GoodsReturnRequestDirectory'

function renderDirectory(
  overrides: Partial<ComponentProps<typeof GoodsReturnRequestDirectory>> = {}
) {
  const props: ComponentProps<typeof GoodsReturnRequestDirectory> = {
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    searchText: '',
    status: '',
    warehouseId: '',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-20',
    warehouses: [{ id: 'warehouse-1', label: 'DN-01 · Đà Nẵng' }],
    permissions: [
      P.GOODS_RETURN_REQUESTS_VIEW,
      P.STOCK_ISSUE_REQUESTS_VIEW,
      P.SUPPLIER_RETURNS_VIEW,
    ],
    currentUserId: 'user-1',
    isLoading: false,
    isFetching: false,
    isError: false,
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onWarehouseChange: vi.fn(),
    onDateFromChange: vi.fn(),
    onDateToChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onInspect: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onRestock: vi.fn(),
    onCreate: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  }
  render(<GoodsReturnRequestDirectory {...props} />)
  return props
}

describe('goods return list filters', () => {
  it('keeps the new create flow next to the returns tabs, outside the filter panel', () => {
    const props = renderDirectory({
      permissions: [P.GOODS_RETURN_REQUESTS_VIEW, P.STOCK_ISSUE_REQUESTS_RETURN],
    })
    const navigation = screen.getByRole('navigation', { name: 'Không gian trả hàng' })
    const create = screen.getByRole('button', { name: 'Lập phiếu' })
    expect(navigation.closest('header')).toContainElement(create)
    expect(screen.getByRole('region', { name: 'Danh sách phiếu hoàn hàng' })).not.toContainElement(
      create
    )
    fireEvent.click(create)
    expect(props.onCreate).toHaveBeenCalledOnce()
  })
  it('groups all filters together without changing navigation or date bounds', () => {
    const props = renderDirectory()
    const filters = within(screen.getByRole('search', { name: 'Bộ lọc yêu cầu trả hàng' }))
    expect(screen.getByRole('link', { name: 'Trả hàng khách' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    fireEvent.change(filters.getByLabelText('Tìm yêu cầu trả hàng'), { target: { value: 'TH-01' } })
    fireEvent.change(filters.getByLabelText('Lọc trạng thái yêu cầu trả hàng'), {
      target: { value: 'Requested' },
    })
    fireEvent.change(filters.getByLabelText('Lọc kho nhận hàng trả'), {
      target: { value: 'warehouse-1' },
    })
    fireEvent.change(filters.getByLabelText('Từ ngày'), { target: { value: '2026-10-02' } })
    fireEvent.change(filters.getByLabelText('Đến ngày'), { target: { value: '2026-10-19' } })
    expect(props.onSearchChange).toHaveBeenCalledWith('TH-01')
    expect(props.onStatusChange).toHaveBeenCalledWith('Requested')
    expect(props.onWarehouseChange).toHaveBeenCalledWith('warehouse-1')
    expect(props.onDateFromChange).toHaveBeenCalledWith('2026-10-02')
    expect(props.onDateToChange).toHaveBeenCalledWith('2026-10-19')
    expect(filters.getByLabelText('Từ ngày')).toHaveAttribute('max', '2026-10-20')
    expect(filters.getByLabelText('Đến ngày')).toHaveAttribute('min', '2026-10-01')
  })
})
