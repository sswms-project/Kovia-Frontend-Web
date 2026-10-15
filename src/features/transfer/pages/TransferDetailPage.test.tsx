import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransferDetail } from '../types/transfer.types'
import { buildShipment, buildTransfer } from '../utils/transfer-test-fixtures'
import TransferDetailPage from './TransferDetailPage'

const mock = vi.hoisted<{ transfer?: TransferDetail }>(() => ({}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}))
vi.mock('../hooks/use-transfer-viewer', () => ({
  useTransferViewer: () => ({
    viewer: { permissions: [], currentUserId: 'staff', isTenantOwner: false },
  }),
}))
vi.mock('../hooks/use-transfers', () => ({
  useTransferQuery: () => ({ data: mock.transfer, isLoading: false, isError: false }),
}))
vi.mock('../hooks/use-transfer-realtime', () => ({ useTransferRealtime: () => ({}) }))
vi.mock('../hooks/use-transfer-start-receiving', () => ({
  useTransferStartReceiving: () => ({ notice: null, isPending: false }),
}))
vi.mock('../hooks/use-transfer-request-actions', () => ({
  useTransferRequestActions: () => ({
    closing: { kind: null },
    feedback: {},
    reply: {},
    shipment: {},
    cancelShipment: {},
  }),
}))
vi.mock('../hooks/use-transfer-resolution-actions', () => ({
  useTransferResolutionActions: () => ({
    departure: {},
    reopen: {},
    assign: { results: {} },
    escalation: {},
    discrepancy: { unknownResult: false },
  }),
}))
vi.mock('../hooks/use-transfer-allocation-actions', () => ({
  useTransferAllocationActions: () => ({ items: [] }),
}))
vi.mock('@/features/inbound/components/TaskAssignment', () => ({
  AssignWarehouseTaskDialog: () => null,
}))
vi.mock('@/components/operations/LifecycleTimeline', () => ({ LifecycleTimeline: () => null }))
vi.mock('../components/TransferGoods', () => ({ TransferGoodsTable: () => null }))
vi.mock('../components/TransferShared', () => ({
  TransferConfirmDialog: () => null,
  TransferReasonDialog: () => null,
  TransferUnsavedChanges: () => null,
}))
vi.mock('../components/TransferDetailPage', async () => {
  const { TransferShipmentsPanel } = await vi.importActual<
    typeof import('../components/TransferDetailPage/TransferShipmentsPanel')
  >('../components/TransferDetailPage/TransferShipmentsPanel')
  return {
    TransferShipmentsPanel,
    TransferDiscrepancyPanel: () => null,
    TransferFeedbackPanel: () => null,
    AddFeedbackDialog: () => null,
    AdjustAllocationDialog: () => null,
    CreateShipmentDialog: () => null,
    ReplyFeedbackDialog: () => null,
    ResolveDiscrepancyDialog: () => null,
    ResolveEscalationDialog: () => null,
    TransferOverview: () => null,
    TransferNextSteps: () => null,
  }
})

beforeEach(() => {
  mock.transfer = buildTransfer()
  window.history.replaceState(null, '', '/transfers/test?tab=putaway')
})
afterEach(cleanup)

describe('Transfer detail responsive tabs', () => {
  it('uses independent tab heights and a non-shrinking wrapping list for the empty staff view', () => {
    render(<TransferDetailPage transferId="test" />)
    const list = screen.getByRole('tablist', { name: 'Nội dung phiếu điều chuyển' })
    expect(list).toHaveClass(
      'h-auto',
      'w-full',
      'min-w-0',
      'shrink-0',
      'flex-wrap',
      'justify-start'
    )
    const tabs = within(list).getAllByRole('tab')
    expect(tabs).toHaveLength(6)
    for (const tab of tabs) expect(tab).toHaveClass('h-auto', 'min-h-11', 'flex-none')
    const active = within(list).getByRole('tab', { name: 'Chờ cất hàng (0)' })
    const panel = screen.getByRole('tabpanel', { name: 'Chờ cất hàng (0)' })
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(active).toHaveAttribute('aria-controls', panel.id)
    expect(within(panel).getByText('Chưa có đợt xuất')).toBeInTheDocument()
  })

  it('preserves tab routing, counts and panel associations with a put-away shipment', () => {
    mock.transfer = buildTransfer({
      shipments: [
        buildShipment({ status: 'AwaitingPutAway', receiptFlowVersion: 1, putAwayTaskId: 'task' }),
      ],
    })
    const view = render(<TransferDetailPage transferId="test" />)
    expect(screen.getByRole('tab', { name: 'Chờ cất hàng (1)' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('heading', { name: 'Đợt 1' })).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Lịch sử' }), { button: 0, ctrlKey: false })
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('history')
    view.rerender(<TransferDetailPage transferId="test" />)
    const historyTab = screen.getByRole('tab', { name: 'Lịch sử' })
    expect(historyTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Lịch sử' })).toHaveAttribute(
      'aria-labelledby',
      historyTab.id
    )
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Hàng hóa' }), {
      button: 0,
      ctrlKey: false,
    })
    view.rerender(<TransferDetailPage transferId="test" />)
    expect(screen.getByRole('tabpanel', { name: 'Hàng hóa' })).toHaveClass('min-h-64')
  })
})
