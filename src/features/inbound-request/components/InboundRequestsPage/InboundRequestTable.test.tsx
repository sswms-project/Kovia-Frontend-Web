import { cleanup, fireEvent, render as renderUI, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactElement } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { InboundRequestTable } from './InboundRequestTable'
import { InboundRequestDirectory } from './InboundRequestDirectory'
import type { InboundRequestSummary } from '../../types/inbound-request.types'

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const draft: InboundRequestSummary = {
  id: 'draft',
  inboundRequestCode: 'IR-001',
  warehouseId: 'warehouse',
  warehouseCode: 'WH',
  warehouseName: 'Kho kiểm thử',
  supplierId: 'supplier',
  supplierName: 'Nhà cung cấp A',
  sourceType: 'Supplier',
  sourceName: null,
  sourceReference: null,
  status: 'Draft',
  createdBy: 'owner',
  createdByName: 'Chủ doanh nghiệp',
  expectedDate: null,
  createdAt: '2026-10-05T00:00:00Z',
  lineCount: 1,
  orderedQuantity: 24,
  receivedQuantity: 0,
}
const approved: InboundRequestSummary = {
  ...draft,
  id: 'approved',
  inboundRequestCode: 'IR-002',
  status: 'Approved',
}

function props(): ComponentProps<typeof InboundRequestTable> {
  return {
    items: [draft, approved],
    canCreate: true,
    canDelete: true,
    canSubmit: true,
    canApprove: true,
    isDeleting: false,
    isSubmitting: false,
    isApproving: false,
    isDeletingMany: false,
    isDuplicating: false,
    selectAllIds: ['draft', 'approved'],
    selectedIds: [],
    allSelected: false,
    onDelete: vi.fn(),
    onSubmit: vi.fn(),
    onApprove: vi.fn(),
    onDuplicate: vi.fn(),
    onSelectionChange: vi.fn(),
  }
}
afterEach(() => {
  cleanup()
  push.mockClear()
})

function render(view: ReactElement) {
  return renderUI(<TooltipProvider>{view}</TooltipProvider>)
}

function directoryProps(): ComponentProps<typeof InboundRequestDirectory> {
  return {
    ...props(),
    totalCount: 2,
    page: 1,
    pageSize: 20,
    searchText: '',
    status: '',
    createdFrom: '',
    createdTo: '',
    statusCounts: [],
    isLoading: false,
    isStatsError: false,
    isFetching: false,
    isError: false,
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onCreatedFromChange: vi.fn(),
    onCreatedToChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onRetry: vi.fn(),
    onDeleteMany: vi.fn(),
    onSubmitMany: vi.fn(),
    onApproveMany: vi.fn(),
  }
}

describe('inbound row navigation and bulk checkboxes', () => {
  it('opens the detail page when any plain cell of the row is clicked, not only the code link', async () => {
    const options = props()
    render(<InboundRequestTable {...options} />)
    const row = screen.getByRole('row', { name: /IR-001/ })
    expect(within(row).getAllByRole('link')).toHaveLength(1)
    const code = within(row).getByRole('link', { name: 'IR-001' })
    expect(code).toHaveAttribute('href', '/inbound-requests/draft')
    code.addEventListener('click', (event) => event.preventDefault())
    await userEvent.setup().click(code)
    expect(push).not.toHaveBeenCalled()
    await userEvent.setup().click(within(row).getByText(/Kho kiểm thử/))
    expect(push).toHaveBeenCalledExactlyOnceWith('/inbound-requests/draft')
  })
  it('keeps checkbox, its cell and action controls independent from row navigation', async () => {
    const options = props()
    render(<InboundRequestTable {...options} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Chọn IR-001' })
    await userEvent.setup().click(checkbox)
    expect(options.onSelectionChange).toHaveBeenCalledExactlyOnceWith(['draft'])
    expect(push).not.toHaveBeenCalled()
    fireEvent.click(checkbox.closest('td')!)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thao tác cho IR-001' }))
    expect(push).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('menuitem', { name: 'Sao chép' }))
    expect(options.onDuplicate).toHaveBeenCalledExactlyOnceWith(draft)
    expect(push).not.toHaveBeenCalled()
  })
  it('allows selecting an approved document without invoking an operation or navigation', async () => {
    const options = props()
    render(<InboundRequestTable {...options} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Chọn IR-002' })
    expect(checkbox).toBeEnabled()
    expect(checkbox).toHaveClass('mx-auto')
    await userEvent.setup().click(checkbox)
    expect(options.onSelectionChange).toHaveBeenCalledExactlyOnceWith(['approved'])
    fireEvent.click(checkbox.closest('td')!)
    expect(options.onApprove).not.toHaveBeenCalled()
    expect(options.onSubmit).not.toHaveBeenCalled()
    expect(options.onDelete).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
  it('shows partial header selection and selects every document on the page', async () => {
    const options = props()
    render(
      <InboundRequestTable
        {...options}
        items={[draft, { ...draft, id: 'draft-2', inboundRequestCode: 'IR-003' }, approved]}
        selectedIds={['draft']}
        selectAllIds={['draft', 'draft-2', 'approved']}
      />
    )
    const header = screen.getByRole('checkbox', { name: 'Chọn tất cả yêu cầu nhập kho trên trang' })
    expect(header).toHaveClass('mx-auto')
    expect(header).toHaveAttribute('aria-checked', 'mixed')
    await userEvent.setup().click(header)
    expect(options.onSelectionChange).toHaveBeenCalledWith(['draft', 'draft-2', 'approved'])
  })
  it('does not offer bulk operations for mixed statuses or approved documents', async () => {
    const options = directoryProps()
    const view = render(
      <InboundRequestDirectory {...options} selectedIds={['draft', 'approved']} />
    )
    expect(screen.getByText('Đã chọn')).toHaveTextContent('Đã chọn 2')
    expect(screen.queryByRole('button', { name: 'Gửi duyệt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa chứng từ' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Xóa chứng từ' }))
    expect(options.onDeleteMany).not.toHaveBeenCalled()
    view.rerender(
      <TooltipProvider>
        <InboundRequestDirectory {...options} selectedIds={['approved']} />
      </TooltipProvider>
    )
    expect(screen.queryByRole('button', { name: 'Gửi duyệt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa chứng từ' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Bỏ chọn' }))
    expect(options.onSelectionChange).toHaveBeenCalledWith([])
  })
  it('retains authorized draft operations and blocks them without permission', async () => {
    const options = directoryProps()
    const view = render(
      <InboundRequestDirectory {...options} selectedIds={['draft', 'stale-id']} />
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Gửi duyệt' }))
    expect(options.onSubmitMany).toHaveBeenCalledExactlyOnceWith(['draft'])
    expect(screen.getByRole('button', { name: 'Xóa chứng từ' })).toBeEnabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Xóa chứng từ' }))
    expect(options.onDeleteMany).toHaveBeenCalledExactlyOnceWith(['draft'])
    expect(
      screen.getByRole('heading', { name: 'Danh sách yêu cầu nhập kho' }).parentElement
    ).toContainElement(screen.getByText('Đã chọn'))
    view.rerender(
      <TooltipProvider>
        <InboundRequestDirectory
          {...options}
          selectedIds={['draft']}
          canDelete={false}
          canSubmit={false}
          canApprove={false}
        />
      </TooltipProvider>
    )
    expect(screen.queryByRole('button', { name: 'Gửi duyệt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xóa chứng từ' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Chọn IR-001' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Bỏ chọn' })).toBeEnabled()
  })
  it('keeps selection locked while a bulk operation is in flight', () => {
    render(<InboundRequestTable {...props()} isSubmitting />)
    expect(screen.getByRole('checkbox', { name: 'Chọn IR-001' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Chọn IR-002' })).toBeDisabled()
    expect(
      screen.getByRole('checkbox', { name: 'Chọn tất cả yêu cầu nhập kho trên trang' })
    ).toBeDisabled()
  })
  it('allows the backend-authorized owner to delete draft and approved selections together', async () => {
    const options = directoryProps()
    render(
      <InboundRequestDirectory {...options} canDeleteApproved selectedIds={['draft', 'approved']} />
    )
    const button = screen.getByRole('button', { name: 'Xóa chứng từ' })
    expect(button).toBeEnabled()
    await userEvent.setup().click(button)
    expect(options.onDeleteMany).toHaveBeenCalledExactlyOnceWith(['draft', 'approved'])
    expect(screen.queryByRole('button', { name: 'Gửi duyệt' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+ đơn$/)).not.toBeInTheDocument()
    expect(screen.getByText('Tổng số:')).toBeInTheDocument()
  })
  it('does not delete an approved selection with received quantity even for the owner', () => {
    render(
      <InboundRequestDirectory
        {...directoryProps()}
        canDeleteApproved
        items={[{ ...approved, receivedQuantity: 1 }]}
        selectedIds={['approved']}
      />
    )
    expect(screen.getByRole('button', { name: 'Xóa chứng từ' })).toBeDisabled()
  })
})
