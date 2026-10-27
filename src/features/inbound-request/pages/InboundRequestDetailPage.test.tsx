import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState } from '@/features/task-splitting/components/task-splitting.fixtures'
import type { InboundRequestDetail } from '../components/InboundRequestDetailPage'
import InboundRequestDetailPage from './InboundRequestDetailPage'

const splitApi = vi.hoisted(() => ({ getState: vi.fn() }))
vi.mock('@/features/task-splitting/services/task-splitting.service', () => ({
  taskSplittingService: splitApi,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('../hooks/use-inbound-requests', () => {
  const mutation = () => ({ isPending: false, mutateAsync: vi.fn() })
  return {
    useAcceptSupplierProposedDateMutation: mutation,
    useApproveAndSendInboundRequestMutation: mutation,
    useApproveInboundRequestMutation: mutation,
    useRejectInboundRequestMutation: mutation,
    useReconcileInboundRequestMutation: mutation,
    useSendInboundRequestToSupplierMutation: mutation,
    useSubmitInboundRequestMutation: mutation,
    useDeleteInboundRequestMutation: mutation,
    useInboundRequestQuery: () => ({
      data: { id: 'request-1', warehouseId: 'warehouse-1', receivingAssignedTo: null },
      isLoading: false,
      isError: false,
    }),
    useInboundRequestAllowedActionsQuery: () => ({
      data: { allowedActions: ['AssignReceivingTask'], selfApprovalRequired: false },
      isLoading: false,
      isError: false,
    }),
  }
})
vi.mock('@/features/inbound/hooks/use-assign-warehouse-task', () => ({
  useAssignWarehouseTask: () => ({ isPending: false, target: null, open: vi.fn() }),
}))
vi.mock('@/features/inbound/components/TaskAssignment', () => ({
  AssignWarehouseTaskDialog: () => null,
}))
vi.mock('../components/InboundRequestDetailPage', () => ({
  InboundRequestDetail: ({
    onAssignReceiving,
    taskSplitAction,
    taskSplitSection,
  }: ComponentProps<typeof InboundRequestDetail>) => (
    <div>
      {onAssignReceiving ? <button type="button">Phân công nhân viên</button> : null}
      {taskSplitAction}
      {taskSplitSection}
    </div>
  ),
}))

const splitState = buildState({ isSplit: true, parts: [buildPart({})] })

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <InboundRequestDetailPage inboundRequestId="request-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => splitApi.getState.mockReset())
afterEach(cleanup)

describe('InboundRequestDetailPage task splitting', () => {
  it('renders reminder and parts panel when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phần việc' })).toBeInTheDocument()
    expect(screen.getByText(/Việc lớn \(điểm 42, ngưỡng 30\)/)).toBeInTheDocument()
    expect(splitApi.getState).toHaveBeenCalledWith('Receiving', 'request-1')
  })

  it('hides single assignee picker when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    await screen.findByRole('heading', { name: 'Phần việc' })
    expect(screen.queryByRole('button', { name: 'Phân công nhân viên' })).not.toBeInTheDocument()
  })

  it('keeps the single assignee picker and offers splitting before a split', async () => {
    splitApi.getState.mockResolvedValue(buildState({ splitSuggested: false }))
    renderPage()

    expect(await screen.findByRole('button', { name: 'Chia việc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phân công nhân viên' })).toBeInTheDocument()
  })
})
