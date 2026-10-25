import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  InboundRequestAction,
  InboundRequestDetail as InboundRequestDetailType,
} from '../../types/inbound-request.types'
import { InboundRequestDetail } from './InboundRequestDetail'
import { InboundRequestLines } from './InboundRequestLines'
import { InboundRequestOverview } from './InboundRequestOverview'

function request(overrides: Partial<InboundRequestDetailType> = {}): InboundRequestDetailType {
  return {
    id: 'ir-1',
    inboundRequestCode: 'IR-001',
    warehouseId: 'wh-1',
    warehouseCode: 'WH1',
    warehouseName: 'Kho A',
    supplierId: 'sup-1',
    supplierName: 'Nhà cung cấp A',
    sourceType: 'Supplier',
    sourceName: null,
    sourceReference: null,
    status: 'PendingApproval',
    expectedDate: null,
    createdBy: 'user-1',
    createdByName: 'Người tạo',
    createdAt: '2026-09-30T00:00:00Z',
    approvedBy: null,
    approvedByName: null,
    modifiedAt: null,
    submittedAt: null,
    approvedAt: null,
    rejectionReason: null,
    supplierEmail: 'ncc@example.com',
    supplierEmailSentAt: null,
    supplierEmailSentTo: null,
    supplierEmailSentByName: null,
    lines: [],
    history: [],
    ...overrides,
  } as InboundRequestDetailType
}

function renderDetail(
  inboundRequest: InboundRequestDetailType,
  allowedActions: readonly InboundRequestAction[]
) {
  const handlers = {
    onSubmit: vi.fn().mockResolvedValue(true),
    onApprove: vi.fn().mockResolvedValue(true),
    onApproveAndSend: vi.fn().mockResolvedValue(true),
    onSendToSupplier: vi.fn().mockResolvedValue(true),
    onAcceptSupplierProposedDate: vi.fn().mockResolvedValue(true),
    onReject: vi.fn().mockResolvedValue(true),
    onReconcile: vi.fn().mockResolvedValue(true),
    onAssignReceiving: vi.fn(),
  }
  render(
    <InboundRequestDetail
      inboundRequest={inboundRequest}
      allowedActions={allowedActions}
      selfApprovalRequired={false}
      isPending={false}
      {...handlers}
    />
  )
  return handlers
}

describe('inbound document information disclosure', () => {
  it('keeps progress and correction instructions visible while the shared toggle hides metadata', async () => {
    const user = userEvent.setup()
    render(
      <InboundRequestOverview request={request({ rejectionReason: 'Kiểm tra lại đơn vị nhập' })} />
    )
    const toggle = screen.getByRole('button', { name: 'Thông tin phiếu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Người tạo')).toBeVisible()
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Người tạo')).not.toBeInTheDocument()
    expect(screen.getByText('Nhà cung cấp A → Kho A')).toBeVisible()
    expect(screen.getByText('Tiến độ nhận')).toBeVisible()
    expect(screen.getByText('Kiểm tra lại đơn vị nhập')).toBeVisible()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Người tạo')).toBeVisible()
  })

  it('preserves collapse on refresh and resets for another inbound request', async () => {
    const user = userEvent.setup()
    const value = request()
    const view = render(<InboundRequestOverview request={value} />)
    await user.click(screen.getByRole('button', { name: 'Thông tin phiếu' }))
    view.rerender(
      <InboundRequestOverview request={{ ...value, createdByName: 'Người tạo cập nhật' }} />
    )
    expect(screen.getByRole('button', { name: 'Thông tin phiếu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    view.rerender(<InboundRequestOverview request={{ ...value, id: 'other-request' }} />)
    expect(screen.getByRole('button', { name: 'Thông tin phiếu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })
})

describe('InboundRequestDetail supplier email actions', () => {
  it('lets the warehouse manager open assignment when the server permits it', async () => {
    const handlers = renderDetail(request({ status: 'Approved', receivingAssignedTo: null }), [
      'AssignReceivingTask',
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Phân công nhân viên' }))
    expect(handlers.onAssignReceiving).toHaveBeenCalledOnce()
  })
  it('does not advertise assignment without the backend action', () => {
    renderDetail(request({ status: 'Approved' }), [])
    expect(screen.queryByRole('button', { name: 'Phân công nhân viên' })).not.toBeInTheDocument()
  })
  it('shows code-only edit when operational content is locked', () => {
    renderDetail(request({ status: 'Received' }), ['UpdateCode'])
    expect(screen.getByRole('link', { name: 'Đổi mã yêu cầu' })).toHaveAttribute(
      'href',
      '/inbound-requests/ir-1/edit'
    )
    expect(screen.queryByRole('link', { name: 'Chỉnh sửa' })).not.toBeInTheDocument()
  })
  it('distinguishes requested packaging from requested base quantity and received quantity', () => {
    render(
      <InboundRequestLines
        lines={[
          {
            id: 'line',
            productId: 'beer',
            productSKU: 'BEER',
            productName: 'Bia',
            baseUnitId: 'can',
            unitName: 'Lon',
            enteredUnitId: 'carton',
            enteredUnitName: 'Thùng',
            unitQuantityPrecision: 0,
            enteredUnitQuantityPrecision: 0,
            enteredQuantity: 4,
            conversionFactorSnapshot: 24,
            quantity: 96,
            receivedQuantity: 48,
            closedQuantity: 0,
            remainingQuantity: 48,
          },
        ]}
      />
    )
    const table = screen.getByRole('table')
    expect(
      within(table).getByRole('columnheader', { name: 'SL yêu cầu (đơn vị nhập)' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('columnheader', { name: 'SL yêu cầu (ĐVT)' })
    ).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'SL thực nhận' })).toBeInTheDocument()
    expect(within(table).getByText('4 Thùng')).toBeInTheDocument()
    expect(within(table).getByText('96 Lon')).toBeInTheDocument()
    expect(within(table).getByText('1 Thùng = 24 Lon')).toBeInTheDocument()
    expect(screen.queryByText('Số lượng đơn vị chính')).not.toBeInTheDocument()
    expect(screen.queryByText('Số lượng nhập')).not.toBeInTheDocument()
  })
  it('fills the shared workspace without an extra centered width limit', () => {
    renderDetail(request(), [])
    const workspace = screen
      .getByRole('heading', { name: 'IR-001' })
      .closest('header')?.parentElement
    expect(workspace).toHaveClass('w-full', 'min-w-0')
    expect(workspace?.className).not.toMatch(/mx-auto|max-w-/)
  })

  it('offers approve-only and approve-and-send when the request is pending approval', () => {
    renderDetail(request(), ['Approve', 'ApproveAndSend'])

    expect(screen.getByRole('button', { name: /Chỉ phê duyệt/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Duyệt và gửi mail/ })).toBeEnabled()
  })

  it('disables approve-and-send when the supplier has no email', () => {
    renderDetail(request({ supplierEmail: null }), ['Approve', 'ApproveAndSend'])

    const sendButton = screen.getByRole('button', { name: /Duyệt và gửi mail/ })
    expect(sendButton).toBeDisabled()
    expect(sendButton).toHaveAccessibleDescription(/chưa có email/)
    expect(screen.getByRole('note')).toHaveTextContent(/cập nhật email của nhà cung cấp/)
    expect(screen.getByRole('button', { name: /Chỉ phê duyệt/ })).toBeEnabled()
  })

  it('hides the email buttons for requests without a supplier', () => {
    renderDetail(request({ supplierId: null, supplierEmail: null }), ['Approve', 'ApproveAndSend'])

    expect(screen.queryByRole('button', { name: /Duyệt và gửi mail/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chỉ phê duyệt/ })).toBeEnabled()
  })

  it('confirms with the recipient address before approving and sending', async () => {
    const user = userEvent.setup()
    const handlers = renderDetail(request(), ['Approve', 'ApproveAndSend'])

    await user.click(screen.getByRole('button', { name: /Duyệt và gửi mail/ }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/ncc@example\.com/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))

    expect(handlers.onApproveAndSend).toHaveBeenCalledTimes(1)
    expect(handlers.onApprove).not.toHaveBeenCalled()
  })

  it('labels the send button as resend once the order email was already sent', () => {
    renderDetail(
      request({
        status: 'Approved',
        supplierEmailSentAt: '2026-09-30T01:00:00Z',
        supplierEmailSentTo: 'ncc@example.com',
        supplierEmailSentByName: 'Người duyệt',
      }),
      ['SendToSupplier']
    )

    expect(screen.getByRole('button', { name: /Gửi lại mail/ })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Gửi mail nhà cung cấp/ })).not.toBeInTheDocument()
  })

  it('shows the supplier proposal and accepts the proposed date after confirmation', async () => {
    const handlers = renderDetail(
      request({
        status: 'Approved',
        supplierEmailSentAt: '2026-09-30T01:00:00Z',
        supplierEmailSentTo: 'ncc@example.com',
        supplierResponse: 'ProposedNewDate',
        supplierRespondedAt: '2026-10-01T01:00:00Z',
        supplierProposedDate: '2026-10-10T00:00:00Z',
        supplierResponseNote: 'Kẹt xe tải',
      }),
      ['AcceptSupplierProposedDate']
    )

    expect(screen.getByText(/Nhà cung cấp đề xuất giao ngày/)).toBeInTheDocument()
    expect(screen.getByText('Kẹt xe tải')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Chấp nhận ngày đề xuất' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))

    expect(handlers.onAcceptSupplierProposedDate).toHaveBeenCalledTimes(1)
  })

  it('shows the supplier rejection reason', () => {
    renderDetail(
      request({
        status: 'Approved',
        supplierEmailSentAt: '2026-09-30T01:00:00Z',
        supplierResponse: 'Rejected',
        supplierResponseNote: 'Hết hàng',
      }),
      []
    )

    expect(screen.getByText('Nhà cung cấp từ chối đơn')).toBeInTheDocument()
    expect(screen.getByText('Hết hàng')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chấp nhận ngày đề xuất' })).not.toBeInTheDocument()
  })
})
