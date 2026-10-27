import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState } from '@/features/task-splitting/components/task-splitting.fixtures'
import type { TransferShipmentsPanel } from '../components/TransferDetailPage'
import TransferDetailPage from './TransferDetailPage'

const splitApi = vi.hoisted(() => ({ getState: vi.fn(), getSuggestion: vi.fn() }))
vi.mock('@/features/task-splitting/services/task-splitting.service', () => ({
  taskSplittingService: splitApi,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('../hooks/use-transfer-viewer', () => ({
  useTransferViewer: () => ({ viewer: { permissions: [], currentUserId: 'manager' } }),
}))
vi.mock('../hooks/use-transfers', () => ({
  useTransferQuery: () => ({
    data: {
      id: 'transfer-1',
      transferCode: 'DC-001',
      status: 'InProgress',
      items: [],
      discrepancies: [],
      feedbacks: [],
      shipments: [
        {
          id: 'shipment-1',
          shipmentNumber: 1,
          status: 'Picking',
          pickTaskId: 'pick-1',
          pickTaskStatus: 'Queued',
          receiveTaskId: null,
          receiveTaskStatus: null,
          putAwayTaskId: null,
          lines: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../hooks/use-delete-transfer-draft', () => ({
  useDeleteTransferDraft: () => ({ open: vi.fn(), dialog: { isPending: false } }),
}))
vi.mock('../hooks/use-transfer-realtime', () => ({ useTransferRealtime: vi.fn() }))
vi.mock('../hooks/use-transfer-request-actions', () => ({
  useTransferRequestActions: () => ({
    shipment: { isOpen: false, isPending: false, uncertain: false },
    closing: { kind: null },
    feedback: {},
    reply: { target: null },
    cancelShipment: { target: null },
  }),
}))
vi.mock('../hooks/use-transfer-request-decision', () => ({
  useTransferRequestDecision: () => ({ isPending: false, uncertain: false, kind: null }),
}))
vi.mock('../hooks/use-transfer-receipt', () => ({ useTransferAssignableStaffQuery: () => ({}) }))
vi.mock('../hooks/use-transfer-resolution-actions', () => ({
  useTransferResolutionActions: () => ({
    departure: { shipment: null },
    reopen: { shipment: null },
    assign: { target: null, results: {}, destinationAssignees: {} },
    escalation: {},
    discrepancy: {},
  }),
}))
vi.mock('../hooks/use-transfer-allocation-actions', () => ({
  useTransferAllocationActions: () => ({}),
}))
vi.mock('../hooks/use-transfer-start-receiving', () => ({
  useTransferStartReceiving: () => ({ notice: null, isPending: false }),
}))
vi.mock('../utils/transfer-capabilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/transfer-capabilities')>()),
  getTransferCapabilities: () => ({}),
  getShipmentCapabilities: () => ({ canAssignPick: true }),
}))
vi.mock('../components/TransfersPage', () => ({ TransferStatusBadge: () => null }))
vi.mock('../components/TransferShared', () => ({
  TransferConfirmDialog: () => null,
  TransferReasonDialog: () => null,
  TransferUnsavedChanges: () => null,
}))
vi.mock('@/features/inbound/components/TaskAssignment', () => ({
  AssignWarehouseTaskDialog: () => null,
}))
vi.mock('../components/TransferDetailPage', () => ({
  AddFeedbackDialog: () => null,
  AdjustAllocationDialog: () => null,
  CreateShipmentDialog: () => null,
  ReplyFeedbackDialog: () => null,
  ResolveDiscrepancyDialog: () => null,
  ResolveEscalationDialog: () => null,
  TransferDiscrepancyPanel: () => null,
  TransferFeedbackPanel: () => null,
  TransferNextSteps: () => null,
  TransferOverview: () => null,
  TransferRequestDecisionPanel: () => null,
  TransferShipmentsPanel: ({
    shipments,
    capabilities,
    onSplitTask,
    renderTaskSplits,
  }: ComponentProps<typeof TransferShipmentsPanel>) => (
    <ul>
      {shipments.map((shipment) => (
        <li key={shipment.id}>
          {capabilities[shipment.id]?.canAssignPick ? (
            <button type="button">Giao việc lấy hàng</button>
          ) : null}
          {capabilities[shipment.id]?.canSplitPick ? (
            <button type="button" onClick={() => onSplitTask?.(shipment, 'pick')}>
              Chia việc lấy hàng
            </button>
          ) : null}
          {renderTaskSplits?.(shipment)}
        </li>
      ))}
    </ul>
  ),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <TransferDetailPage transferId="transfer-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  splitApi.getState.mockReset()
  splitApi.getSuggestion.mockReturnValue(new Promise(() => {}))
})
afterEach(cleanup)

describe('TransferDetailPage task splitting', () => {
  it('renders reminder and parts panel when split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'TransferPick', isSplit: true, parts: [buildPart({})] })
    )
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phần việc' })).toBeInTheDocument()
    expect(screen.getByText(/Việc lớn \(điểm 42, ngưỡng 30\)/)).toBeInTheDocument()
    expect(splitApi.getState).toHaveBeenCalledWith('TransferPick', 'pick-1')
  })

  it('hides single assignee picker when split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'TransferPick', isSplit: true, parts: [buildPart({})] })
    )
    renderPage()

    await screen.findByRole('heading', { name: 'Phần việc' })
    expect(screen.queryByRole('button', { name: 'Giao việc lấy hàng' })).not.toBeInTheDocument()
  })

  it('opens the split dialog of the chosen task before a split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'TransferPick', code: 'TPK-001', splitSuggested: false })
    )
    renderPage()

    expect(screen.getByRole('button', { name: 'Giao việc lấy hàng' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Chia việc lấy hàng' }))
    expect(await screen.findByRole('dialog', { name: 'Chia việc TPK-001' })).toBeInTheDocument()
  })
})
