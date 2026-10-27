import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { buildPart, buildState } from '@/features/task-splitting/components/task-splitting.fixtures'
import type { RelocationTaskDialog } from '../components/WarehouseTaskDirectory'
import MyWarehouseTasksPage from './MyWarehouseTasksPage'

const splitApi = vi.hoisted(() => ({ getState: vi.fn() }))
const me = vi.hoisted(() => ({ permissions: [] as string[] }))
// Stable references: the page resets its forms whenever these change.
const taskData = vi.hoisted(() => ({
  detail: { id: 'task-1', taskType: 'Relocation', warehouseId: 'warehouse-1', lines: [] },
  recommendations: [],
}))
vi.mock('@/features/task-splitting/services/task-splitting.service', () => ({
  taskSplittingService: splitApi,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'manager', permissions: me.permissions } }),
}))
vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: () => ({ canExport: false }),
}))
vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useInventoryQuery: () => ({ data: undefined }),
  useInventoryWarehouseOptionsQuery: () => ({ data: [] }),
}))
vi.mock('@/features/staff/hooks/use-staff', () => ({
  useStaffListQuery: () => ({ data: undefined }),
}))
vi.mock('@/features/transfer/hooks/use-transfer-realtime', () => ({ useTransferRealtime: vi.fn() }))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLocationsQuery: () => ({ data: undefined }),
}))
vi.mock('../hooks/use-warehouse-task', () => {
  const mutation = () => ({ isPending: false, mutateAsync: vi.fn() })
  return {
    useAssignWarehouseTaskMutation: mutation,
    useCreateWarehouseTaskMutation: mutation,
    useExecuteWarehouseRelocationMutation: mutation,
    useManageMyWarehouseTaskMutation: mutation,
    useUpdateWarehouseTaskScheduleMutation: mutation,
    useMyWarehouseTasksQuery: () => ({ data: undefined, isLoading: false, isError: false }),
    useWarehouseTaskRecommendationsQuery: () => ({
      data: taskData.recommendations,
      isLoading: false,
    }),
    useWarehouseTaskDetailQuery: () => ({
      data: taskData.detail,
      isLoading: false,
      isError: false,
    }),
  }
})
vi.mock('../components/MyWorkQueue', () => ({ MyWorkQueue: () => null }))
vi.mock('../components/WarehouseTaskDirectory', () => ({
  WarehouseTaskDirectory: () => null,
  CreateRelocationTaskDialog: () => null,
  WarehouseTaskScheduleDialog: () => null,
  getTaskRoute: vi.fn(),
  RelocationTaskDialog: ({
    open,
    canAssign,
    taskSplitAction,
    taskSplitSection,
  }: ComponentProps<typeof RelocationTaskDialog>) =>
    open ? (
      <div>
        {canAssign ? <button type="button">Phân công</button> : null}
        {taskSplitAction}
        {taskSplitSection}
      </div>
    ) : null,
}))

const splitState = buildState({ sourceType: 'Relocation', isSplit: true, parts: [buildPart({})] })

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MyWarehouseTasksPage initialTaskId="task-1" />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  splitApi.getState.mockReset()
  me.permissions = [P.WAREHOUSE_TASKS_VIEW_ALL, P.WAREHOUSE_TASKS_ASSIGN]
})
afterEach(cleanup)

describe('MyWarehouseTasksPage relocation task splitting', () => {
  it('renders reminder and parts panel when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Phần việc' })).toBeInTheDocument()
    expect(screen.getByText(/Việc lớn \(điểm 42, ngưỡng 30\)/)).toBeInTheDocument()
    expect(splitApi.getState).toHaveBeenCalledWith('Relocation', 'task-1')
  })

  it('hides single assignee picker when split', async () => {
    splitApi.getState.mockResolvedValue(splitState)
    renderPage()

    await screen.findByRole('heading', { name: 'Phần việc' })
    expect(screen.queryByRole('button', { name: 'Phân công' })).not.toBeInTheDocument()
  })

  it('keeps the single assignee picker and offers splitting before a split', async () => {
    splitApi.getState.mockResolvedValue(
      buildState({ sourceType: 'Relocation', splitSuggested: false })
    )
    renderPage()

    expect(await screen.findByRole('button', { name: 'Chia việc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phân công' })).toBeInTheDocument()
  })
})
