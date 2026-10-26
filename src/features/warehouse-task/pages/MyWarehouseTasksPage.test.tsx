import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { P } from '@/config/permissionCodes'
import type { MyWarehouseTask, MyWarehouseTaskQuery } from '../types/warehouse-task.types'
import MyWarehouseTasksPage from './MyWarehouseTasksPage'

vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: () => ({ canExport: false, buttonProps: { isPending: false, onExport: vi.fn() } }),
}))

const { query, retryList, retryQueue, mutation, push, toastError } = vi.hoisted(() => ({
  query: vi.fn(),
  retryList: vi.fn(),
  retryQueue: vi.fn(),
  mutation: vi.fn(),
  push: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({
    data: { id: 'staff', permissions: [P.WAREHOUSE_TASKS_VIEW_OWN], assignedWarehouses: [] },
  }),
}))
vi.mock('@/features/transfer/hooks/use-transfer-realtime', () => ({ useTransferRealtime: vi.fn() }))
vi.mock('@/features/inventory/hooks/use-inventory', () => ({
  useInventoryQuery: () => ({}),
  useInventoryWarehouseOptionsQuery: () => ({}),
}))
vi.mock('@/features/staff/hooks/use-staff', () => ({ useStaffListQuery: () => ({}) }))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLocationsQuery: () => ({}),
}))
vi.mock('../hooks/use-warehouse-task', () => ({
  useMyWarehouseTasksQuery: query,
  useManageMyWarehouseTaskMutation: () => ({ mutateAsync: mutation }),
  useCreateWarehouseTaskMutation: () => ({}),
  useAssignWarehouseTaskMutation: () => ({}),
  useExecuteWarehouseRelocationMutation: () => ({}),
  useUpdateWarehouseTaskScheduleMutation: () => ({}),
  useWarehouseTaskDetailQuery: () => ({}),
  useWarehouseTaskRecommendationsQuery: () => ({}),
}))
vi.mock('../components/WarehouseTaskDirectory', () => ({
  CreateRelocationTaskDialog: () => null,
  RelocationTaskDialog: () => null,
  WarehouseTaskScheduleDialog: () => null,
  getTaskRoute: () => '/tasks/transfers/transfer/shipments/shipment/putaway',
  WarehouseTaskDirectory: ({
    headerAction,
    onPageChange,
    page,
    onRetry,
    items,
    onAction,
  }: {
    headerAction: ReactNode
    onPageChange: (page: number) => void
    page: number
    onRetry: () => void
    items: MyWarehouseTask[]
    onAction: (task: MyWarehouseTask, action: 'Start') => void
  }) => (
    <div>
      {headerAction}
      <span>Trang {page}</span>
      <button onClick={() => onPageChange(2)}>Trang tiếp</button>
      <button onClick={onRetry}>Tải lại</button>
      {items.map((task) => (
        <button key={task.id} onClick={() => onAction(task, 'Start')}>
          Bắt đầu công việc
        </button>
      ))}
    </div>
  ),
}))
vi.mock('../components/MyWorkQueue', () => ({ MyWorkQueue: () => null }))

describe('MyWarehouseTasksPage filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    query.mockImplementation((params: MyWarehouseTaskQuery) => ({
      data: { items: [], totalCount: 0 },
      refetch: params.recentlyAssignedFirst ? retryQueue : retryList,
    }))
    mutation.mockResolvedValue(undefined)
  })

  it('filters both task lists, resets pagination, and asks for the newest assignments before pagination', () => {
    render(<MyWarehouseTasksPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Trang tiếp' }))
    expect(screen.getByText('Trang 2')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Lọc theo loại công việc'), {
      target: { value: 'TransferPick' },
    })
    fireEvent.change(screen.getByLabelText('Lọc theo trạng thái'), { target: { value: 'Queued' } })
    fireEvent.change(screen.getByLabelText('Lọc theo hạn hoàn thành'), {
      target: { value: 'NoDeadline' },
    })

    expect(screen.getByText('Trang 1')).toBeInTheDocument()
    const filters = {
      taskType: 'TransferPick',
      executionStatus: 'Queued',
      deadlineStatus: 'NoDeadline',
    }
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ ...filters, pageNumber: 1, pageSize: 20 }),
      'mine'
    )
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        ...filters,
        pageNumber: 1,
        pageSize: 6,
        recentlyAssignedFirst: true,
      }),
      'mine',
      true
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(retryList).toHaveBeenCalledOnce()
    expect(retryQueue).toHaveBeenCalledOnce()
  })

  const putAwayTask: MyWarehouseTask = {
    id: 'task',
    taskType: 'TransferPutAway',
    referenceCode: 'PDC-01',
    title: 'Cất hàng',
    warehouseId: 'warehouse',
    warehouseName: 'Kho nhận',
    status: 'AwaitingPutAway',
    executionStatus: 'Queued',
    priority: 'Normal',
    dueAt: null,
    deadlineStatus: 'NoDeadline',
    startedAt: null,
    completedAt: null,
    itemCount: 1,
    completedItemCount: 0,
    totalQuantity: 10,
    completedQuantity: 0,
    progressPercentage: 0,
    workSummary: '',
    pauseReason: null,
    assignedTo: 'staff',
    assignedToName: 'Nhân viên',
    assignedAt: null,
    updatedAt: '',
    transferId: 'transfer',
    transferShipmentId: 'shipment',
  }
  function showPutAwayTask() {
    query.mockImplementation(() => ({
      data: { items: [putAwayTask], totalCount: 1 },
      refetch: retryList,
    }))
    render(<MyWarehouseTasksPage />)
  }

  it('starts put-away and opens the staff put-away screen', async () => {
    showPutAwayTask()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu công việc' }))
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/tasks/transfers/transfer/shipments/shipment/putaway')
    )
    expect(mutation).toHaveBeenCalledWith({
      taskType: 'TransferPutAway',
      taskId: 'task',
      action: 'Start',
      reason: undefined,
    })
    expect(screen.getByRole('option', { name: 'Cất hàng điều chuyển' })).toBeInTheDocument()
  })

  it('guards repeated starts before mutation state can rerender', async () => {
    let finish: (() => void) | undefined
    mutation.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      })
    )
    showPutAwayTask()
    const start = screen.getByRole('button', { name: 'Bắt đầu công việc' })
    fireEvent.click(start)
    fireEvent.click(start)
    expect(mutation).toHaveBeenCalledOnce()
    await act(async () => finish?.())
    await waitFor(() => expect(push).toHaveBeenCalledOnce())
  })

  it('shows the actual rejection, does not navigate, and unlocks for a deliberate retry', async () => {
    const message = 'Bạn đang thực hiện một công việc khác. Hãy tạm dừng trước.'
    mutation.mockRejectedValueOnce({ statusCode: 409, message })
    showPutAwayTask()
    const start = screen.getByRole('button', { name: 'Bắt đầu công việc' })
    fireEvent.click(start)
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(message))
    expect(push).not.toHaveBeenCalled()
    fireEvent.click(start)
    await waitFor(() => expect(push).toHaveBeenCalledOnce())
    expect(mutation).toHaveBeenCalledTimes(2)
  })
})
