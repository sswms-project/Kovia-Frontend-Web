import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  StockIssueRequestSummary,
  StockIssueAuditLogQuery,
} from '../../types/stock-issue.types'
import { StockIssueRequestDetail } from './StockIssueRequestDetail'

const { auditQuery } = vi.hoisted(() => ({ auditQuery: vi.fn() }))
vi.mock('../../hooks/use-stock-issue-requests', () => ({
  useStockIssueRequestAuditLogsQuery: auditQuery,
}))
vi.mock('../StockIssueRequestsPage/StockIssueAttachmentList', () => ({
  StockIssueAttachmentList: () => <p>Chưa có tệp đính kèm.</p>,
}))

const order: StockIssueRequestSummary = {
  id: 'request',
  stockIssueRequestCode: 'XK000001',
  stockRecipientId: 'recipient',
  stockRecipientName: 'Đơn vị nhận A',
  recipientCode: 'KH000001',
  warehouseId: 'warehouse',
  warehouseName: 'Kho A',
  purpose: null,
  referenceCode: null,
  issueDate: '2026-10-23',
  note: null,
  recipientName: 'Đơn vị nhận A',
  recipientPhone: '',
  recipientEmail: null,
  recipientAddress: 'Đà Nẵng',
  status: 'Pending',
  createdAt: '2026-10-23T08:00:00Z',
  dispatchAuthorizedByUserId: null,
  dispatchAuthorizedAt: null,
  dispatchedAt: null,
  assignedStaffId: null,
  assignedStaffName: null,
  version: 'v1',
  items: [],
  attachments: [],
}
const handlers = {
  onReleaseForPicking: vi.fn(),
  onRecordStockPicking: vi.fn(),
  onReportPickIssue: vi.fn(),
  onAuthorizeDispatch: vi.fn(),
  onConfirmDispatch: vi.fn(),
  onCancel: vi.fn(),
}
const capabilities = {
  canCreate: false,
  canAssignPicker: true,
  canPick: false,
  canAuthorizeDispatch: false,
  canDispatch: false,
  canCancel: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  auditQuery.mockImplementation((_id: string, params: StockIssueAuditLogQuery) => ({
    data: {
      data: {
        items: Array.from({ length: params.pageSize }, (_, index) => ({
          id: `${params.pageNumber}-${index}`,
          actionLabel: `Hoạt động ${params.pageNumber}-${index}`,
          actorName: 'Nhân viên',
          createdAt: '2026-10-23T08:00:00Z',
          description: 'Nội dung nhật ký',
          reason: null,
        })),
        totalCount: 25,
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }))
})

function renderDetail() {
  return render(
    <StockIssueRequestDetail
      order={order}
      capabilities={capabilities}
      handlers={handlers}
      pickerOptions={[]}
      isAssigningPicker={false}
      isRemovingPick={false}
      onAssignPicker={vi.fn()}
      onRemovePickDetail={vi.fn()}
      pickingPlan={<section aria-label="Kế hoạch lấy hàng">Kế hoạch</section>}
    />
  )
}

describe('outbound detail layout', () => {
  it('keeps the plan in the main content before attachments, independently of the audit column', async () => {
    renderDetail()
    const overview = screen.getByRole('region', { name: 'Tổng quan' })
    const plan = screen.getByRole('region', { name: 'Kế hoạch lấy hàng' })
    const attachments = screen.getByRole('region', { name: 'Đính kèm' })
    expect(plan.parentElement).toBe(overview.parentElement)
    expect(attachments.parentElement).toBe(plan.parentElement)
    expect(
      plan.compareDocumentPosition(attachments) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Nhật ký thao tác' }).parentElement).not.toBe(
      plan.parentElement
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Giao việc lấy hàng' }))
    expect(handlers.onReleaseForPicking).toHaveBeenCalledExactlyOnceWith(order)
  })

  it('limits the preview to three events and opens paginated full history in a sheet', async () => {
    renderDetail()
    const preview = screen.getByRole('region', { name: 'Nhật ký thao tác' })
    expect(within(preview).getAllByRole('listitem')).toHaveLength(3)
    expect(within(preview).queryByRole('button', { name: 'Sau' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Xem toàn bộ nhật ký' }))
    const sheet = screen.getByRole('dialog', { name: 'Nhật ký thao tác' })
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(10)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Sau' }))
    expect(within(sheet).getByText('Hoạt động 2-0')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(preview).getByText('Hoạt động 1-0')).toBeInTheDocument()
  })
})
