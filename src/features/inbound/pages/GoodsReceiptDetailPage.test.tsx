import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GoodsReceiptDetailPage from './GoodsReceiptDetailPage'

const state = vi.hoisted(() => ({
  approve: vi.fn(),
  push: vi.fn(),
  received: 5,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('../hooks/use-inbound', () => ({
  useGoodsReceiptQuery: () => ({
    data: {
      id: 'receipt',
      version: 'AQ==',
      arrivalConfirmedAt: 'now',
      items: [{ receivedQuantity: state.received, orderedQuantity: 5 }],
    },
  }),
  useInboundAllowedActionsQuery: () => ({ data: { allowedActions: ['Approve'] } }),
  useApproveGoodsReceiptMutation: () => ({ mutateAsync: state.approve }),
  useSubmitGoodsReceiptMutation: () => ({}),
  useRejectGoodsReceiptMutation: () => ({}),
  useUpdateGoodsReceiptMutation: () => ({}),
}))
vi.mock('../hooks/use-legacy-receipt-stock', () => ({ useLegacyReceiptStock: () => ({}) }))
vi.mock('../hooks/use-receiving-location-selection', () => ({
  useReceivingLocationSelection: () => ({}),
}))
vi.mock('../hooks/use-receipt-damage-isolation', () => ({ useReceiptDamageIsolation: () => ({}) }))
vi.mock('../hooks/use-refusal-evidence', () => ({ useRefusalEvidence: () => ({}) }))
vi.mock('../hooks/use-putaway-plan-editor', () => ({ usePutawayPlanEditor: () => ({}) }))
vi.mock('../hooks/use-assign-warehouse-task', () => ({ useAssignWarehouseTask: () => ({}) }))
vi.mock('../components/LegacyReceiptStockDialog', () => ({ LegacyReceiptStockDialog: () => null }))
vi.mock('../components/ReceiptDamageIsolationDialog', () => ({
  ReceiptDamageIsolationDialog: () => null,
}))
vi.mock('../components/TaskAssignment', () => ({ AssignWarehouseTaskDialog: () => null }))
vi.mock('../components/ReceivingPage', () => ({ ReceiveGoodsDialog: () => null }))
vi.mock('../components/ReceiptDetailPage', () => ({
  PutawayPlanSheet: () => null,
  ReceiptDetail: ({ onApprove }: { onApprove: (keep: boolean) => Promise<boolean> }) => (
    <>
      <button onClick={() => void onApprove(false)}>Duyệt</button>
      <button onClick={() => void onApprove(true)}>Giữ tại nhận</button>
    </>
  ),
}))
beforeEach(() => {
  vi.clearAllMocks()
  state.received = 5
  state.approve.mockResolvedValue({})
})
afterEach(cleanup)
it('opens putaway detail only after successful approval', async () => {
  render(<GoodsReceiptDetailPage receiptId="receipt" />)
  await userEvent.click(screen.getByText('Duyệt'))
  await waitFor(() => expect(state.push).toHaveBeenCalledWith('/inbound/putaway/receipt'))
})
it.each(['failed', 'refused', 'keep'])(
  'stays on receipt when approval does not create putaway (%s)',
  async (scenario) => {
    if (scenario === 'failed') state.approve.mockRejectedValueOnce(new Error('failed'))
    if (scenario === 'refused') state.received = 0
    render(<GoodsReceiptDetailPage receiptId="receipt" />)
    await userEvent.click(screen.getByText(scenario === 'keep' ? 'Giữ tại nhận' : 'Duyệt'))
    await waitFor(() => expect(state.approve).toHaveBeenCalledTimes(1))
    expect(state.push).not.toHaveBeenCalled()
  }
)
