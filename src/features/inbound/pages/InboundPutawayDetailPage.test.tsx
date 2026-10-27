import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState } from '@/features/task-splitting/components/task-splitting.fixtures'
import type { PutawayForm } from '../components/PutawayDetailPage'
import InboundPutawayDetailPage from './InboundPutawayDetailPage'

const splitApi = vi.hoisted(() => ({ getState: vi.fn() }))
vi.mock('@/features/task-splitting/services/task-splitting.service', () => ({
  taskSplittingService: splitApi,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'manager', permissions: [] }, isLoading: false }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLayoutQuery: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('../hooks/use-inbound', () => {
  const mutation = () => ({ isPending: false, mutateAsync: vi.fn() })
  return {
    useCancelPutawayTaskMutation: mutation,
    usePutawayMutation: mutation,
    useReconcilePutawayCancellationMutation: mutation,
    useSavePutawayPlanMutation: mutation,
    useUploadPutawayEvidenceMutation: mutation,
    usePutawayHeldSlotsQuery: () => ({ data: undefined }),
    useGoodsReceiptQuery: () => ({
      data: {
        id: 'receipt-1',
        version: 'v1',
        status: 'Approved',
        putAwayTaskExecutionStatus: 'Queued',
        putAwayAssignedTo: null,
        putAwayAssignedToName: null,
        items: [],
      },
      isLoading: false,
      isError: false,
    }),
    useInboundAllowedActionsQuery: () => ({ data: { allowedActions: [] } }),
  }
})
vi.mock('../hooks/use-receipt-damage-isolation', () => ({ useReceiptDamageIsolation: () => ({}) }))
vi.mock('../hooks/use-assign-warehouse-task', () => ({
  useAssignWarehouseTask: () => ({ isPending: false, target: null, open: vi.fn() }),
}))
vi.mock('../hooks/use-warehouse-task-assignment-access', () => ({
  useWarehouseTaskAssignmentAccess: () => ({ currentUserId: 'manager', canAssign: true }),
}))
vi.mock('../hooks/use-putaway-form-suggestions', () => ({ usePutawayFormSuggestions: () => ({}) }))
vi.mock('../hooks/use-putaway-plan-editor', () => ({ usePutawayPlanEditor: () => ({}) }))
vi.mock('../components/ReceiptDamageIsolationDialog', () => ({
  ReceiptDamageIsolationDialog: () => null,
}))
vi.mock('../components/ReceiptDetailPage', () => ({ PutawayPlanSheet: () => null }))
vi.mock('../components/TaskAssignment', () => ({ AssignWarehouseTaskDialog: () => null }))
vi.mock('../components/PutawayDetailPage', () => ({
  CancelPutawayDialog: () => null,
  PutawayForm: ({
    planning,
    taskSplitAction,
    taskSplitSection,
  }: ComponentProps<typeof PutawayForm>) => (
    <div>
      {planning?.canAssign ? <button type="button">Giao nhân viên</button> : null}
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
      <InboundPutawayDetailPage receiptId="receipt-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => splitApi.getState.mockReset())
afterEach(cleanup)

describe('InboundPutawayDetailPage task splitting', () => {
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
    expect(screen.queryByRole('button', { name: 'Giao nhân viên' })).not.toBeInTheDocument()
  })

  it('keeps the single assignee picker and offers splitting before a split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'PutAway', splitSuggested: false })
    )
    renderPage()

    expect(await screen.findByRole('button', { name: 'Chia việc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giao nhân viên' })).toBeInTheDocument()
  })
})
