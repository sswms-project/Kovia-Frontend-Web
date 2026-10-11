import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MyWarehouseTask } from '../../types/warehouse-task.types'
import { MyWorkQueue } from './MyWorkQueue'

afterEach(cleanup)

function buildTask(overrides: Partial<MyWarehouseTask>): MyWarehouseTask {
  return {
    id: 'task-1',
    taskType: 'TransferPick',
    referenceCode: 'DC-0001 · Đợt 1',
    title: 'Lấy hàng điều chuyển kho',
    warehouseId: 'w1',
    warehouseName: 'Kho nguồn',
    status: 'Picking',
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
    workSummary: 'Kho nguồn → Kho đích · 1 mặt hàng · còn lấy 10',
    pauseReason: null,
    assignedTo: 'u1',
    assignedToName: 'Nhân viên',
    assignedAt: null,
    updatedAt: '2026-10-11T01:00:00Z',
    transferId: 'tr1',
    transferShipmentId: 'sh1',
    ...overrides,
  }
}

describe('MyWorkQueue', () => {
  it('says so when nothing is assigned', () => {
    render(<MyWorkQueue tasks={[]} isLoading={false} />)
    expect(screen.getByText('Chưa có việc nào được giao cho bạn.')).toBeInTheDocument()
  })

  it('lists transfer, stock issue, receiving and cycle count work together with a link to each screen', () => {
    render(
      <MyWorkQueue
        isLoading={false}
        tasks={[
          buildTask({}),
          buildTask({
            id: 'task-2',
            taskType: 'TransferReceive',
            referenceCode: 'DC-0001 · Đợt 1',
            status: 'InTransit',
          }),
          buildTask({ id: 'issue-1', taskType: 'Picking', referenceCode: 'PX-0001' }),
          buildTask({ id: 'inbound-1', taskType: 'Receiving', referenceCode: 'NK-0001' }),
          buildTask({ id: 'count-1', taskType: 'CycleCount', referenceCode: 'KK-0001' }),
        ]}
      />
    )
    expect(screen.getByText('Lấy hàng điều chuyển')).toBeInTheDocument()
    expect(screen.getByText('Nhận hàng điều chuyển')).toBeInTheDocument()
    expect(screen.getByText('Lấy hàng xuất kho')).toBeInTheDocument()
    expect(screen.getByText('Nhận hàng')).toBeInTheDocument()
    expect(screen.getByText('Kiểm kê')).toBeInTheDocument()
    expect(screen.getAllByText('Kho nguồn → Kho đích · 1 mặt hàng · còn lấy 10')).not.toHaveLength(
      0
    )
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(links).toContain('/tasks/transfers/tr1/shipments/sh1/pick')
    expect(links).toContain('/tasks/transfers/tr1/shipments/sh1/receive')
  })

  it('ignores finished work, flags overdue and urgent items, and caps the list', () => {
    const tasks = [
      buildTask({ id: 'done', referenceCode: 'DA-XONG', executionStatus: 'Completed' }),
      buildTask({
        id: 'late',
        referenceCode: 'TRE-HAN',
        deadlineStatus: 'Overdue',
        priority: 'Urgent',
      }),
      ...Array.from({ length: 7 }, (_, index) =>
        buildTask({ id: `t${index}`, referenceCode: `DC-${index}` })
      ),
    ]
    render(<MyWorkQueue tasks={tasks} isLoading={false} />)
    expect(screen.queryByText('DA-XONG')).not.toBeInTheDocument()
    expect(screen.getByText('Quá hạn')).toBeInTheDocument()
    expect(screen.getByText('Gấp')).toBeInTheDocument()
    expect(screen.getByText('Còn 2 việc khác trong danh sách bên dưới.')).toBeInTheDocument()
  })
})
