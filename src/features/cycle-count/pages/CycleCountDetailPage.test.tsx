import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState } from '@/features/task-splitting/components/task-splitting.fixtures'
import type { CycleCountDetailView } from '../components/CycleCountDetailPage'
import CycleCountDetailPage from './CycleCountDetailPage'

const splitApi = vi.hoisted(() => ({ getState: vi.fn() }))
vi.mock('@/features/task-splitting/services/task-splitting.service', () => ({
  taskSplittingService: splitApi,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'manager', permissions: [] } }),
}))
vi.mock('../hooks/use-cycle-count', () => {
  const mutation = () => ({ isPending: false, mutateAsync: vi.fn() })
  return {
    useCancelCycleCountMutation: mutation,
    useCreateStockAdjustmentVoucherMutation: mutation,
    useFinalizeCycleCountMutation: mutation,
    useRecordCycleCountItemsMutation: mutation,
    useRequestRecountMutation: mutation,
    useConfirmCycleCountDamageMutation: mutation,
    useStartCycleCountMutation: mutation,
    useUploadCycleCountEvidenceMutation: mutation,
    useSubmitCycleCountMutation: mutation,
    useCycleCountQuery: () => ({
      data: { id: 'count-1', code: 'KK-001', warehouseId: 'warehouse-1' },
      isLoading: false,
      isError: false,
    }),
    useCycleCountAllowedActionsQuery: () => ({
      data: { allowedActions: [] },
      isLoading: false,
      isError: false,
    }),
  }
})
vi.mock('../components/CycleCountDetailPage', () => ({
  CycleCountDetailView: ({
    taskSplitAction,
    taskSplitSection,
  }: ComponentProps<typeof CycleCountDetailView>) => (
    <div>
      {taskSplitAction}
      {taskSplitSection}
    </div>
  ),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CycleCountDetailPage cycleCountId="count-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => splitApi.getState.mockReset())
afterEach(cleanup)

describe('CycleCountDetailPage task splitting', () => {
  it('renders reminder and parts panel when split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'CycleCount', isSplit: true, parts: [buildPart({})] })
    )
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phần việc' })).toBeInTheDocument()
    expect(screen.getByText(/Việc lớn \(điểm 42, ngưỡng 30\)/)).toBeInTheDocument()
    expect(splitApi.getState).toHaveBeenCalledWith('CycleCount', 'count-1')
  })

  it('offers splitting before a split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'CycleCount', splitSuggested: false })
    )
    renderPage()

    expect(await screen.findByRole('button', { name: 'Chia việc' })).toBeInTheDocument()
  })
})
