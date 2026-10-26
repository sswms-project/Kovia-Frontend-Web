import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InboundRequestDetailPage from './InboundRequestDetailPage'
import { toast } from 'sonner'

const fixture = vi.hoisted(() => ({
  detail: {
    id: 'request-a',
    warehouseId: 'warehouse-a',
    warehouseName: 'Kho A',
    inboundRequestCode: 'NK-A',
    version: 'AQ==',
    receivingAssignedTo: null as string | null,
  },
  actions: ['AssignReceivingTask'],
  target: null as { id: string } | null,
  open: vi.fn(),
  submit: vi.fn(),
  reconcile: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock('../hooks/use-inbound-requests', () => ({
  useInboundRequestQuery: () => ({ data: fixture.detail }),
  useInboundRequestAllowedActionsQuery: () => ({ data: { allowedActions: fixture.actions } }),
  ...Object.fromEntries(
    [
      'useAcceptSupplierProposedDateMutation',
      'useApproveAndSendInboundRequestMutation',
      'useApproveInboundRequestMutation',
      'useRejectInboundRequestMutation',
      'useReconcileInboundRequestMutation',
      'useSendInboundRequestToSupplierMutation',
      'useSubmitInboundRequestMutation',
    ].map((name) => [name, () => ({ isPending: false })])
  ),
  useReconcileInboundRequestMutation: () => ({ isPending: false, mutateAsync: fixture.reconcile }),
}))
vi.mock('@/features/inbound/hooks/use-assign-warehouse-task', () => ({
  useAssignWarehouseTask: () => ({
    target: fixture.target,
    open: fixture.open,
    onSubmit: fixture.submit,
  }),
}))
vi.mock('../components/InboundRequestDetailPage', () => ({
  InboundRequestDetail: ({
    onAssignReceiving,
    onReconcile,
  }: {
    onAssignReceiving: () => void
    onReconcile: (action: 'CloseRemaining', reason: string) => Promise<boolean>
  }) => (
    <>
      <button onClick={onAssignReceiving}>Open assignment</button>
      <button onClick={() => void onReconcile('CloseRemaining', 'Không nhận bù')}>
        Close remaining
      </button>
    </>
  ),
}))
vi.mock('@/features/inbound/components/TaskAssignment', () => ({
  AssignWarehouseTaskDialog: ({
    target,
    onSubmit,
  }: {
    target: { id: string } | null
    onSubmit: () => void
  }) => (target ? <button onClick={onSubmit}>Assign staff</button> : null),
}))
beforeEach(() => {
  vi.clearAllMocks()
  fixture.detail.id = 'request-a'
  fixture.detail.receivingAssignedTo = null
  fixture.actions = ['AssignReceivingTask']
  fixture.target = null
})
afterEach(cleanup)
describe('inbound detail assignment wiring', () => {
  it('shows the actual API refusal instead of masking the reason when closing', async () => {
    fixture.reconcile.mockRejectedValueOnce({
      statusCode: 409,
      message: 'Còn phiếu nhận hàng đang xử lý.',
    })
    render(<InboundRequestDetailPage inboundRequestId="request-a" />)
    await userEvent.click(screen.getByText('Close remaining'))
    expect(fixture.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({
        inboundRequestId: 'request-a',
        action: 'closeRemaining',
        expectedVersion: 'AQ==',
        reason: 'Không nhận bù',
      })
    )
    expect(toast.error).toHaveBeenCalledWith('Còn phiếu nhận hàng đang xử lý.')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('opens the existing assignment form scoped to the exact request and warehouse', async () => {
    render(<InboundRequestDetailPage inboundRequestId="request-a" />)
    await userEvent.click(screen.getByText('Open assignment'))
    expect(fixture.open).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'Receiving',
        id: 'request-a',
        warehouseId: 'warehouse-a',
        currentAssigneeId: null,
        referenceCode: 'NK-A',
      })
    )
  })
  it.each(['denied', 'assigned'])(
    'does not open stale first-assignment intent: %s',
    async (reason) => {
      if (reason === 'denied') fixture.actions = []
      else fixture.detail.receivingAssignedTo = 'other-staff'
      render(<InboundRequestDetailPage inboundRequestId="request-a" />)
      await userEvent.click(screen.getByText('Open assignment'))
      expect(fixture.open).not.toHaveBeenCalled()
    }
  )
  it('does not keep or submit a dialog for another request after navigation', async () => {
    fixture.target = { id: 'request-a' }
    const view = render(<InboundRequestDetailPage inboundRequestId="request-a" />)
    await userEvent.click(screen.getByText('Assign staff'))
    expect(fixture.submit).toHaveBeenCalledOnce()
    fixture.detail.id = 'request-b'
    view.rerender(<InboundRequestDetailPage inboundRequestId="request-b" />)
    expect(screen.queryByText('Assign staff')).not.toBeInTheDocument()
  })
})
