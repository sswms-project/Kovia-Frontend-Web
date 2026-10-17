import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StockDiscrepancyDirectory } from './StockDiscrepancyDirectory'

afterEach(cleanup)

it('groups filters at natural widths with wrapping and preserves callbacks', () => {
  render(
    <StockDiscrepancyDirectory
      {...props}
      warehouseOptions={[{ value: 'warehouse', label: 'DN-01' }]}
    />
  )
  const filters = screen.getByLabelText('Bộ lọc báo cáo chênh lệch')
  expect(filters).toHaveClass('flex-wrap', 'shrink-0')
  const warehouse = within(filters).getByRole('combobox', { name: 'Lọc theo kho' })
  expect(warehouse.parentElement).toHaveClass('w-full')
  fireEvent.change(warehouse, { target: { value: 'warehouse' } })
  expect(props.onFilterWarehouseChange).toHaveBeenCalledWith('warehouse')
  fireEvent.change(within(filters).getByLabelText('Từ ngày'), { target: { value: '2026-10-17' } })
  expect(props.onDateFromChange).toHaveBeenCalledWith('2026-10-17')
})

const props: ComponentProps<typeof StockDiscrepancyDirectory> = {
  permissions: [],
  currentUserId: null,
  items: [],
  page: 1,
  pageSize: 20,
  totalCount: 0,
  filterWarehouseId: '',
  filterProductId: '',
  statusFilter: '',
  dateFrom: '',
  dateTo: '',
  warehouseOptions: [],
  productOptions: [],
  slotOptions: [],
  lotOptions: [],
  staffOptions: [],
  taskOptions: [],
  canLinkTask: true,
  isLoading: false,
  isError: false,
  isPending: false,
  canReport: true,
  canReview: false,
  warehouseId: '',
  productId: '',
  slotId: '',
  lotId: '',
  correctSlotId: '',
  relatedTaskKey: '',
  onWarehouseChange: vi.fn(),
  onProductChange: vi.fn(),
  onSlotChange: vi.fn(),
  onLotChange: vi.fn(),
  onCorrectSlotChange: vi.fn(),
  onRelatedTaskChange: vi.fn(),
  onPageChange: vi.fn(),
  onFilterWarehouseChange: vi.fn(),
  onFilterProductChange: vi.fn(),
  onStatusFilterChange: vi.fn(),
  onDateFromChange: vi.fn(),
  onDateToChange: vi.fn(),
  onRetry: vi.fn(),
  onCreate: vi.fn(),
  onReview: vi.fn(),
  onAddEvidence: vi.fn(),
}

it('keeps labelled report fields in a scrollable, responsive wide dialog with fixed actions', () => {
  render(<StockDiscrepancyDirectory {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Báo chênh lệch' }))
  const dialog = screen.getByRole('dialog', { name: 'Báo chênh lệch tồn kho' })
  expect(dialog).toHaveClass('sm:max-w-3xl', 'max-h-[calc(100dvh-2rem)]', 'overflow-hidden')
  const body = dialog.querySelector('[data-scrollbar="slim"]')!
  expect(body).toHaveClass('overflow-y-auto', 'min-h-0')
  expect(body.querySelector('[data-slot="field-group"]')).toHaveClass(
    'grid-cols-1',
    'sm:grid-cols-2'
  )
  expect(body).toContainElement(within(dialog).getByLabelText('Tệp bằng chứng'))
  expect(body).not.toContainElement(within(dialog).getByRole('button', { name: 'Gửi báo cáo' }))
  expect(within(dialog).getByRole('button', { name: 'Gửi báo cáo' })).toBeDisabled()
  fireEvent.change(within(dialog).getByLabelText('Loại'), { target: { value: 'WrongLocation' } })
  expect(within(dialog).getByLabelText('Vị trí đúng')).toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
