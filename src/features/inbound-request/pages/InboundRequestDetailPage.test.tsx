import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InboundRequestDetailPage from './InboundRequestDetailPage'

const fixture = vi.hoisted(() => ({
  actions: ['Submit', 'UpdateAndSelfApprove'],
  detail: {
    id: 'draft',
    inboundRequestCode: 'NK-TEST',
    status: 'Draft',
    version: 'AQ==',
    warehouseId: 'warehouse',
    supplierId: 'supplier',
    supplierName: 'Nhà cung cấp',
    supplierEmail: null,
    sourceType: 'Supplier',
    sourceName: null,
    sourceReference: 'Tham chiếu gốc',
    expectedDate: '2026-12-01T08:00:00+07:00',
    lines: [{ productId: 'product', enteredQuantity: 5, enteredUnitId: 'carton', quantity: 120 }],
    history: [],
  },
  update: vi.fn().mockResolvedValue({}),
  submit: vi.fn().mockResolvedValue({}),
  other: vi.fn().mockResolvedValue({}),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
vi.mock('@/features/inbound/hooks/use-assign-warehouse-task', () => ({
  useAssignWarehouseTask: () => ({ target: null }),
}))
vi.mock('@/features/inbound/components/TaskAssignment', () => ({
  AssignWarehouseTaskDialog: () => null,
}))
vi.mock('../components/InboundRequestDetailPage/InboundRequestOverview', () => ({
  InboundRequestOverview: () => null,
}))
vi.mock('../components/InboundRequestDetailPage/InboundRequestLines', () => ({
  InboundRequestLines: () => null,
}))
vi.mock('../hooks/use-inbound-requests', () => ({
  useInboundRequestQuery: () => ({ data: fixture.detail }),
  useInboundRequestAllowedActionsQuery: () => ({
    data: { allowedActions: fixture.actions, selfApprovalRequired: false },
  }),
  useUpdateInboundRequestMutation: () => ({ mutateAsync: fixture.update }),
  useSubmitInboundRequestMutation: () => ({ mutateAsync: fixture.submit }),
  useDeleteInboundRequestMutation: () => ({ mutateAsync: fixture.other }),
  useApproveInboundRequestMutation: () => ({ mutateAsync: fixture.other }),
  useApproveAndSendInboundRequestMutation: () => ({ mutateAsync: fixture.other }),
  useSendInboundRequestToSupplierMutation: () => ({ mutateAsync: fixture.other }),
  useAcceptSupplierProposedDateMutation: () => ({ mutateAsync: fixture.other }),
  useRejectInboundRequestMutation: () => ({ mutateAsync: fixture.other }),
  useReconcileInboundRequestMutation: () => ({ mutateAsync: fixture.other }),
}))

describe('inbound draft detail action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fixture.actions = ['Submit', 'UpdateAndSelfApprove']
    fixture.detail.version = 'AQ=='
  })

  it('lets the authorized Owner confirm Create directly, preserving the entered unit and date', async () => {
    render(<InboundRequestDetailPage inboundRequestId="draft" />)
    expect(screen.queryByRole('button', { name: 'Gửi duyệt' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }))
    expect(fixture.update).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Tạo yêu cầu nhập kho?')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo' }))
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    expect(fixture.update).toHaveBeenCalledWith({
      inboundRequestId: 'draft',
      request: {
        inboundRequestCode: 'NK-TEST',
        warehouseId: 'warehouse',
        supplierId: 'supplier',
        sourceType: 'Supplier',
        sourceName: null,
        sourceReference: 'Tham chiếu gốc',
        expectedDate: '2026-12-01T08:00:00+07:00',
        expectedVersion: 'AQ==',
        selfApprovalAcknowledged: true,
        lines: [{ productId: 'product', quantity: 5, unitId: 'carton' }],
      },
    })
    expect(fixture.submit).not.toHaveBeenCalled()
    expect(fixture.other).not.toHaveBeenCalled()
  })

  it('keeps Send for approval for a caller without Owner finalization capability', async () => {
    fixture.actions = ['Submit']
    render(<InboundRequestDetailPage inboundRequestId="draft" />)
    expect(screen.queryByRole('button', { name: 'Tạo' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Gửi duyệt' }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận' })
    )
    await waitFor(() => expect(fixture.submit).toHaveBeenCalledWith('draft'))
    expect(fixture.update).not.toHaveBeenCalled()
  })

  it('keeps the reviewed version if detail refreshes while confirmation is open', async () => {
    const view = render(<InboundRequestDetailPage inboundRequestId="draft" />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }))
    fixture.detail.version = 'Ag=='
    view.rerender(<InboundRequestDetailPage inboundRequestId="draft" />)
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Tạo' }))
    await waitFor(() => expect(fixture.update).toHaveBeenCalledOnce())
    expect(fixture.update.mock.calls[0]?.[0].request.expectedVersion).toBe('AQ==')
    expect(fixture.submit).not.toHaveBeenCalled()
  })
})
