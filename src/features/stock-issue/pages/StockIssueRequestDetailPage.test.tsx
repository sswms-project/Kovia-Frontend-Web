import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPart, buildState } from '@/features/task-splitting/components/task-splitting.fixtures'
import type { StockIssueRequestDetail } from '../components/StockIssueRequestDetailPage'
import StockIssueRequestDetailPage from './StockIssueRequestDetailPage'

const splitApi = vi.hoisted(() => ({ getState: vi.fn() }))
vi.mock('@/features/task-splitting/services/task-splitting.service', () => ({
  taskSplittingService: splitApi,
}))
vi.mock('../hooks/use-stock-issue-requests', () => ({
  useStockIssueRequestQuery: () => ({
    data: { id: 'issue-1', version: 'v1', warehouseId: 'warehouse-1' },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../hooks/use-stock-issue-workflow', () => ({
  useStockIssueWorkflow: () => ({
    capabilities: { canAssignPicker: true },
    handlers: {},
    pickerOptions: [],
    isAssigningPicker: false,
    isRemovingPick: false,
  }),
}))
vi.mock('../hooks/use-stock-issue-editing', () => ({
  useStockIssueEditingActions: () => ({ data: { allowedActions: [] }, isFetching: false }),
  useWithdrawStockIssue: () => ({ open: vi.fn(), dialog: { isPending: false } }),
}))
vi.mock('../components/StockIssueWorkflow', () => ({ StockIssueWorkflowDialogs: () => null }))
vi.mock('../components/CrossDockPanel', () => ({ CrossDockSection: () => null }))
vi.mock('@/components/operations/ReturnDocumentActions', () => ({
  ReturnDocumentActionDialog: () => null,
}))
vi.mock('../components/StockIssueRequestDetailPage', () => ({
  StockIssueRequestDetail: ({
    isSplit,
    editingActions,
    taskSplitSection,
  }: ComponentProps<typeof StockIssueRequestDetail>) => (
    <div>
      {isSplit ? null : <button type="button">Đổi người</button>}
      {editingActions}
      {taskSplitSection}
    </div>
  ),
}))

const splitState = buildState({
  sourceType: 'StockIssuePick',
  isSplit: true,
  parts: [buildPart({})],
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <StockIssueRequestDetailPage stockIssueRequestId="issue-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => splitApi.getState.mockReset())
afterEach(cleanup)

describe('StockIssueRequestDetailPage task splitting', () => {
  it('renders reminder and parts panel when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phần việc' })).toBeInTheDocument()
    expect(screen.getByText(/Việc lớn \(điểm 42, ngưỡng 30\)/)).toBeInTheDocument()
    expect(splitApi.getState).toHaveBeenCalledWith('StockIssuePick', 'issue-1')
  })

  it('hides single assignee picker when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    await screen.findByRole('heading', { name: 'Phần việc' })
    expect(screen.queryByRole('button', { name: 'Đổi người' })).not.toBeInTheDocument()
  })

  it('keeps the single assignee picker and offers splitting before a split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'StockIssuePick', splitSuggested: false })
    )
    renderPage()

    expect(await screen.findByRole('button', { name: 'Chia việc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đổi người' })).toBeInTheDocument()
  })
})
