import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState } from '@/features/task-splitting/components/task-splitting.fixtures'
import type { ReceiptDetail } from '../components/ReceiptDetailPage'
import GoodsReceiptDetailPage from './GoodsReceiptDetailPage'

const splitApi = vi.hoisted(() => ({ getState: vi.fn() }))
vi.mock('@/features/task-splitting/services/task-splitting.service', () => ({
  taskSplittingService: splitApi,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../hooks/use-inbound', () => {
  const mutation = () => ({ isPending: false, mutateAsync: vi.fn() })
  return {
    useApproveGoodsReceiptMutation: mutation,
    useRejectGoodsReceiptMutation: mutation,
    useSubmitGoodsReceiptMutation: mutation,
    useUpdateGoodsReceiptMutation: mutation,
    useGoodsReceiptQuery: () => ({
      data: {
        id: 'receipt-1',
        version: 'v1',
        status: 'Approved',
        arrivalConfirmedAt: '2026-10-27T00:00:00Z',
        arrivalStockPostedAt: '2026-10-27T00:00:00Z',
        items: [],
      },
      isLoading: false,
      isError: false,
    }),
    useInboundAllowedActionsQuery: () => ({
      data: { allowedActions: ['AssignPutAway'], selfApprovalRequired: false },
      isLoading: false,
      isError: false,
    }),
  }
})
vi.mock('../hooks/use-legacy-receipt-stock', () => ({ useLegacyReceiptStock: () => ({}) }))
vi.mock('../hooks/use-receiving-location-selection', () => ({
  useReceivingLocationSelection: () => ({ query: {} }),
}))
vi.mock('../hooks/use-receipt-damage-isolation', () => ({ useReceiptDamageIsolation: () => ({}) }))
vi.mock('../hooks/use-refusal-evidence', () => ({ useRefusalEvidence: () => ({}) }))
vi.mock('../hooks/use-putaway-plan-editor', () => ({ usePutawayPlanEditor: () => ({}) }))
vi.mock('../hooks/use-assign-warehouse-task', () => ({
  useAssignWarehouseTask: () => ({ isPending: false, target: null, open: vi.fn() }),
}))
vi.mock('../components/LegacyReceiptStockDialog', () => ({ LegacyReceiptStockDialog: () => null }))
vi.mock('../components/ReceiptDamageIsolationDialog', () => ({
  ReceiptDamageIsolationDialog: () => null,
}))
vi.mock('../components/ReceivingPage', () => ({ ReceiveGoodsDialog: () => null }))
vi.mock('../components/TaskAssignment', () => ({ AssignWarehouseTaskDialog: () => null }))
vi.mock('../components/ReceiptDetailPage', () => ({
  PutawayPlanSheet: () => null,
  ReceiptDetail: ({
    onAssignPutAway,
    taskSplitAction,
    taskSplitSection,
  }: ComponentProps<typeof ReceiptDetail>) => (
    <div>
      {onAssignPutAway ? <button type="button">Giao việc cất hàng</button> : null}
      {taskSplitAction}
      {taskSplitSection}
    </div>
  ),
}))

const splitState = buildState({ sourceType: 'PutAway', isSplit: true, parts: [buildPart({})] })

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <GoodsReceiptDetailPage receiptId="receipt-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => splitApi.getState.mockReset())
afterEach(cleanup)

describe('GoodsReceiptDetailPage task splitting', () => {
  it('renders reminder and parts panel when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phần việc' })).toBeInTheDocument()
    expect(screen.getByText(/Việc lớn \(điểm 42, ngưỡng 30\)/)).toBeInTheDocument()
    expect(splitApi.getState).toHaveBeenCalledWith('PutAway', 'receipt-1')
  })

  it('hides single assignee picker when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    await screen.findByRole('heading', { name: 'Phần việc' })
    expect(screen.queryByRole('button', { name: 'Giao việc cất hàng' })).not.toBeInTheDocument()
  })

  it('keeps the single assignee picker and offers splitting before a split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'PutAway', splitSuggested: false })
    )
    renderPage()

    expect(await screen.findByRole('button', { name: 'Chia việc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giao việc cất hàng' })).toBeInTheDocument()
  })
})
