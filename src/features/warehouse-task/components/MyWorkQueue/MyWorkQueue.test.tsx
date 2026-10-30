import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MyWorkQueue } from './MyWorkQueue'
import type { MyWarehouseTask } from '../../types/warehouse-task.types'
import { APP_ROUTES } from '@/routes/app-routes'

afterEach(cleanup)
const task: MyWarehouseTask = {
  id: 'receive',
  taskType: 'TransferReceive',
  isCombinedTransferReceipt: true,
  referenceCode: 'PDC000015 · Đợt 1',
  title: 'Nhận hàng',
  warehouseId: 'warehouse',
  warehouseName: 'Đà Nẵng',
  status: 'InTransit',
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
  workSummary: 'Còn kiểm nhận 10',
  pauseReason: null,
  assignedTo: 'staff',
  assignedToName: 'Nhân viên',
  assignedAt: null,
  updatedAt: '2026-10-30T01:00:00Z',
  transferId: 'transfer',
  transferShipmentId: 'shipment',
}
it('shows one combined workflow and opens its current receiving or putaway phase', () => {
  const view = render(<MyWorkQueue tasks={[task]} isLoading={false} totalCount={1} />)
  expect(screen.getByText('Nhận và cất hàng điều chuyển')).toBeInTheDocument()
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    APP_ROUTES.transferReceiveTask('transfer', 'shipment')
  )
  view.rerender(
    <MyWorkQueue
      tasks={[{ ...task, id: 'putaway', taskType: 'TransferPutAway', status: 'AwaitingPutAway' }]}
      isLoading={false}
      totalCount={1}
    />
  )
  expect(screen.getAllByRole('link')).toHaveLength(1)
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    APP_ROUTES.transferPutAwayTask('transfer', 'shipment')
  )
})
