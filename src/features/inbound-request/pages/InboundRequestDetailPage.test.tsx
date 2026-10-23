import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InboundRequestDetailPage from './InboundRequestDetailPage'

const fixture = vi.hoisted(() => ({
  detail: {
    id: 'request-a',
    warehouseId: 'warehouse-a',
    warehouseName: 'Kho A',
    inboundRequestCode: 'NK-A',
    receivingAssignedTo: null as string | null,
  },
  actions: ['AssignReceivingTask'],
  target: null as { id: string } | null,
  open: vi.fn(),
  submit: vi.fn(),
}))
vi.mock('../hooks/use-inbound-requests', () => ({
  useInboundRequestQuery: () => ({ data: fixture.detail }),
  useInboundRequestAllowedActionsQuery: () => ({ data: { allowedActions: fixture.actions } }),
  ...Object.fromEntries(
    [
      'useApproveAndSendInboundRequestMutation',
      'useApproveInboundRequestMutation',
      'useRejectInboundRequestMutation',
      'useReconcileInboundRequestMutation',
      'useSendInboundRequestToSupplierMutation',
      'useSubmitInboundRequestMutation',
    ].map((name) => [name, () => ({ isPending: false })])
  ),
}))
vi.mock('@/features/inbound/hooks/use-assign-warehouse-task', () => ({
  useAssignWarehouseTask: () => ({
    target: fixture.target,
    open: fixture.open,
    onSubmit: fixture.submit,
  }),
}))
vi.mock('../components/InboundRequestDetailPage', () => ({
  InboundRequestDetail: ({ onAssignReceiving }: { onAssignReceiving: () => void }) => (
    <button onClick={onAssignReceiving}>Open assignment</button>
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
