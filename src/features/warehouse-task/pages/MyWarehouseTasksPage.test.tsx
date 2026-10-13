import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { P } from '@/config/permissionCodes'
import type { MyWarehouseTaskQuery } from '../types/warehouse-task.types'
import MyWarehouseTasksPage from './MyWarehouseTasksPage'

const { query, retryList, retryQueue } = vi.hoisted(() => ({
  query: vi.fn(),
  retryList: vi.fn(),
  retryQueue: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
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
  useManageMyWarehouseTaskMutation: () => ({}),
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
  getTaskRoute: vi.fn(),
  WarehouseTaskDirectory: ({
    headerAction,
    onPageChange,
    page,
    onRetry,
  }: {
    headerAction: ReactNode
    onPageChange: (page: number) => void
    page: number
    onRetry: () => void
  }) => (
    <div>
      {headerAction}
      <span>Trang {page}</span>
      <button onClick={() => onPageChange(2)}>Trang tiếp</button>
      <button onClick={onRetry}>Tải lại</button>
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
})
