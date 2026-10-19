import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { DamageCase } from '../../types/inventory.types'
import { DamageCaseDirectory } from './DamageCaseDirectory'

const openCase: DamageCase = {
  id: 'dc-1',
  productId: 'p-1',
  sku: 'SKU1',
  productName: 'Mì gói',
  warehouseId: 'w-1',
  warehouseName: 'Kho 1',
  slotId: 's-1',
  slotCode: 'A-01',
  lotId: null,
  lotNumber: null,
  quantity: 10,
  reason: 'Rách bao',
  evidence: [],
  status: 'Open',
  disposition: null,
  dispositionNote: null,
  reportedByUserId: 'u-reporter',
  reportedByName: 'Nhân viên',
  createdAt: '2026-10-01T00:00:00Z',
  dispositionByUserId: null,
  dispositionByName: null,
  dispositionAt: null,
  linkedStockIssueRequestId: null,
  linkedStockAdjustmentId: null,
  linkedSupplierReturnId: null,
  version: 'v1',
  isQuantityConfirmed: true,
  resolvedQuantity: 0,
  remainingQuantity: 10,
  heldQuantity: 10,
  availableQuantity: 0,
  availableStockVersion: null,
  relatedTaskType: null,
  relatedTaskId: null,
  evidenceRequestedAt: null,
  history: [],
  rackCode: null,
  isSystemDefaultSlot: false,
  relatedTaskCode: null,
  unitName: 'Thùng',
  lotExpiryDate: null,
}

function baseProps(): ComponentProps<typeof DamageCaseDirectory> {
  const noop = vi.fn()
  return {
    permissions: [],
    currentUserId: 'u-owner',
    items: [openCase],
    page: 1,
    pageSize: 20,
    totalCount: 1,
    warehouseId: '',
    productId: '',
    statusFilter: '',
    dateFrom: '',
    dateTo: '',
    warehouseOptions: [],
    productOptions: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    isPending: false,
    canDecide: true,
    supplierOptions: [{ value: 'sup-1', label: 'NCC001 · Thiện Group' }],
    areSuppliersLoading: false,
    onRetry: noop,
    onPageChange: noop,
    onWarehouseChange: noop,
    onProductChange: noop,
    onStatusChange: noop,
    onDateFromChange: noop,
    onDateToChange: noop,
    onDecide: vi.fn().mockResolvedValue(undefined),
    onAddEvidence: vi.fn(),
  }
}

it('requires a supplier for the supplier-return disposition and submits supplierId', async () => {
  const props = baseProps()
  render(<DamageCaseDirectory {...props} />)
  fireEvent.click(screen.getAllByRole('button', { name: 'Chọn xử lý' })[0]!)
  fireEvent.change(screen.getByLabelText('Phương án'), { target: { value: 'SupplierReturn' } })

  expect(screen.queryByLabelText('Đơn vị nhận hàng trả')).not.toBeInTheDocument()
  const confirm = screen.getByRole('button', { name: 'Xác nhận' })
  expect(confirm).toBeDisabled()

  fireEvent.change(screen.getByLabelText('Nhà cung cấp nhận hàng trả'), {
    target: { value: 'sup-1' },
  })
  expect(confirm).toBeEnabled()
  fireEvent.click(confirm)

  await waitFor(() => expect(props.onDecide).toHaveBeenCalledTimes(1))
  expect(props.onDecide).toHaveBeenCalledWith(openCase, 'SupplierReturn', 10, '', 'sup-1')
})

it('links the detail dialog to the supplier return only when the user can view it', () => {
  const resolved: DamageCase = {
    ...openCase,
    status: 'Resolved',
    disposition: 'SupplierReturn',
    dispositionNote: 'Trả NCC',
    linkedSupplierReturnId: 'sr-9',
  }
  const props = { ...baseProps(), items: [resolved] }
  const view = render(<DamageCaseDirectory {...props} permissions={['supplier-returns:view']} />)
  fireEvent.click(screen.getAllByText('Mì gói')[0]!)
  const link = screen.getByRole('link', { name: /Phiếu trả NCC/ })
  expect(link).toHaveAttribute('href', '/supplier-returns?id=sr-9')
  view.unmount()

  render(<DamageCaseDirectory {...props} permissions={[]} />)
  fireEvent.click(screen.getAllByText('Mì gói')[0]!)
  expect(screen.queryByRole('link', { name: /Phiếu trả NCC/ })).not.toBeInTheDocument()
})

it('refreshes damage cases and locks the reload button during fetching', () => {
  const noop = vi.fn()
  const props: ComponentProps<typeof DamageCaseDirectory> = {
    permissions: [],
    currentUserId: null,
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    warehouseId: '',
    productId: '',
    statusFilter: '',
    dateFrom: '',
    dateTo: '',
    warehouseOptions: [],
    productOptions: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    isPending: false,
    canDecide: false,
    supplierOptions: [],
    areSuppliersLoading: false,
    onRetry: vi.fn(),
    onPageChange: noop,
    onWarehouseChange: noop,
    onProductChange: noop,
    onStatusChange: noop,
    onDateFromChange: noop,
    onDateToChange: noop,
    onDecide: vi.fn(),
    onAddEvidence: vi.fn(),
  }
  const view = render(<DamageCaseDirectory {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Làm mới hàng hỏng' }))
  expect(props.onRetry).toHaveBeenCalledOnce()
  view.rerender(<DamageCaseDirectory {...props} isFetching />)
  expect(screen.getByRole('button', { name: 'Làm mới hàng hỏng' })).toBeDisabled()
})
