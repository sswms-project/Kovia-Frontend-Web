import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { MyWarehouseTask } from '../../types/warehouse-task.types'
import { WarehouseTaskDirectory } from './WarehouseTaskDirectory'

const push = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const task: MyWarehouseTask = {
  id: '11111111-1111-1111-1111-111111111111',
  taskType: 'Receiving',
  referenceCode: 'IR-001',
  title: 'Nhận hàng',
  warehouseId: '22222222-2222-2222-2222-222222222222',
  warehouseName: 'Kho trung tâm',
  status: 'Approved',
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
  workSummary: 'Nhận 10 thùng hàng',
  pauseReason: null,
  assignedTo: '33333333-3333-3333-3333-333333333333',
  assignedToName: 'Nhân viên kho',
  assignedAt: '2026-10-07T00:00:00Z',
  updatedAt: '2026-10-07T00:00:00Z',
  transferId: null,
  transferShipmentId: null,
}

function props(): ComponentProps<typeof WarehouseTaskDirectory> {
  return {
    title: 'Công việc của tôi',
    description: 'Công việc được giao.',
    items: [task],
    totalCount: 1,
    stats: {
      unassignedCount: 0,
      queuedCount: 1,
      inProgressCount: 0,
      pausedCount: 0,
      dueSoonCount: 0,
      overdueCount: 0,
    },
    statsMode: 'mine',
    page: 1,
    pageSize: 20,
    isLoading: false,
    isFetching: false,
    isError: false,
    currentUserId: task.assignedTo ?? undefined,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onRetry: vi.fn(),
  }
}

describe('WarehouseTaskDirectory', () => {
  beforeEach(() => push.mockReset())
  afterEach(cleanup)

  it('lays the list out with the shared panel: table and pagination are direct children of it', () => {
    render(<WarehouseTaskDirectory {...props()} />)
    const panel = screen.getByRole('region', { name: 'Công việc của tôi' })
    expect(panel).toHaveAttribute('data-slot', 'operational-list-panel')
    const slots = Array.from(panel.children).map((child) => child.getAttribute('data-slot'))
    expect(slots).toContain('table-container')
    expect(slots.filter((slot) => slot === 'operational-list-body')).toHaveLength(1)
  })

  it('opens task details when the task row is clicked or activated with Enter', () => {
    render(<WarehouseTaskDirectory {...props()} />)

    const taskLinks = screen.getAllByRole('link', { name: 'Mở công việc IR-001' })
    fireEvent.click(taskLinks[0]!)
    fireEvent.keyDown(taskLinks[1]!, { key: 'Enter' })

    expect(push).toHaveBeenCalledTimes(2)
    expect(push).toHaveBeenNthCalledWith(1, '/inbound?search=IR-001')
    expect(push).toHaveBeenNthCalledWith(2, '/inbound?search=IR-001')
  })

  it('runs the task action without also opening the task', () => {
    const onAction = vi.fn()
    render(<WarehouseTaskDirectory {...props()} canManage onAction={onAction} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Bắt đầu' })[0]!)

    expect(onAction).toHaveBeenCalledWith(task, 'Start')
    expect(push).not.toHaveBeenCalled()
  })
})
