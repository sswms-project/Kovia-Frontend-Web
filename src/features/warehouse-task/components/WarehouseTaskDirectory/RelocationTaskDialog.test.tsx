import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { ExecuteWarehouseRelocationFormValues } from '../../schemas/warehouse-relocation.schema'
import type { WarehouseTaskDetail } from '../../types/warehouse-task.types'
import { RelocationTaskDialog } from './RelocationTaskDialog'

const detail: WarehouseTaskDetail = {
  id: 'task-1',
  taskCode: 'RLC-001',
  taskType: 'Relocation',
  warehouseId: 'warehouse-1',
  warehouseName: 'Kho A',
  executionStatus: 'Cancelled',
  priority: 'Normal',
  reason: 'Gom hàng',
  dueAt: null,
  assignedTo: null,
  assignedToName: null,
  assignedAt: null,
  rowVersion: 'AQ==',
  cancelledAt: '2026-11-16T08:00:00Z',
  cancelledBy: 'manager-1',
  cancellationReason: 'Thay đổi kế hoạch',
  lines: [
    {
      id: 'line-1',
      productId: 'product-1',
      sku: 'SKU-1',
      productName: 'Sản phẩm A',
      sourceInventoryStockId: 'stock-1',
      sourceSlotId: 'slot-1',
      sourceSlotCode: 'A-01',
      proposedDestinationSlotId: 'slot-2',
      proposedDestinationSlotCode: 'A-02',
      quantity: 5,
      completedQuantity: 2,
      remainingQuantity: 3,
    },
  ],
  executions: [
    {
      id: 'execution-1',
      warehouseTaskLineId: 'line-1',
      sourceSlotId: 'slot-1',
      sourceSlotCode: 'A-01',
      destinationSlotId: 'slot-2',
      destinationSlotCode: 'A-02',
      quantity: 2,
      performedBy: 'staff-1',
      recommendationRank: 1,
      recommendationScore: 100,
      recommendationReasons: null,
      overrideReason: null,
      executedAt: '2026-11-16T07:00:00Z',
    },
  ],
}

function Harness({
  status = 'Cancelled',
  canCancel = true,
  scope = 'managed',
}: {
  status?: WarehouseTaskDetail['executionStatus']
  canCancel?: boolean
  scope?: 'mine' | 'managed'
}) {
  const form = useForm<ExecuteWarehouseRelocationFormValues>({
    defaultValues: { lineId: 'line-1' },
  })
  return (
    <RelocationTaskDialog
      open
      detail={{ ...detail, executionStatus: status }}
      isLoading={false}
      isError={false}
      scope={scope}
      canAssign={true}
      canExecute={true}
      canOverrideDestination={false}
      staffOptions={[]}
      assignmentStaffId=""
      assignmentReason=""
      recommendations={[]}
      recommendationsLoading={false}
      executeForm={form}
      isAssigning={false}
      isExecuting={false}
      canCancel={canCancel}
      onCancel={vi.fn()}
      onOpenChange={vi.fn()}
      onRetry={vi.fn()}
      onAssignmentStaffChange={vi.fn()}
      onAssignmentReasonChange={vi.fn()}
      onAssign={vi.fn()}
      onLineChange={vi.fn()}
      onExecute={vi.fn()}
    />
  )
}

describe('Relocation cancellation', () => {
  it('shows the cancellation reason and time alongside preserved partial execution history', () => {
    render(<Harness />)
    expect(screen.getByRole('region', { name: 'Thông tin hủy công việc' })).toBeInTheDocument()
    expect(screen.getByText('Thay đổi kế hoạch')).toBeInTheDocument()
    expect(screen.getByText('Thời điểm hủy').nextElementSibling?.textContent).not.toBe('Không đặt')
    expect(screen.getByText('Lịch sử đã điều chuyển')).toBeInTheDocument()
    expect(screen.getByText('Còn 3/5')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hủy công việc' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Phân công công việc' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ghi nhận điều chuyển' })).not.toBeInTheDocument()
  })

  it.each(['Queued', 'Paused'] as const)('allows cancellation of managed %s tasks', (status) => {
    render(<Harness status={status} />)
    expect(screen.getByRole('button', { name: 'Hủy công việc' })).toBeEnabled()
  })

  it.each(['InProgress', 'Completed', 'Cancelled'] as const)(
    'hides cancellation for %s tasks',
    (status) => {
      render(<Harness status={status} />)
      expect(screen.queryByRole('button', { name: 'Hủy công việc' })).not.toBeInTheDocument()
    }
  )

  it('hides cancellation without management capability or in the employee view', () => {
    const view = render(<Harness status="Queued" canCancel={false} />)
    expect(screen.queryByRole('button', { name: 'Hủy công việc' })).not.toBeInTheDocument()
    view.rerender(<Harness status="Queued" scope="mine" />)
    expect(screen.queryByRole('button', { name: 'Hủy công việc' })).not.toBeInTheDocument()
  })
})
