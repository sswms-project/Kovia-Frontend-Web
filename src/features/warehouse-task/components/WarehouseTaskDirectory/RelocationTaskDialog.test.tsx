import { cleanup, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExecuteWarehouseRelocationFormValues } from '../../schemas/warehouse-relocation.schema'
import type {
  WarehousePlacementRecommendation,
  WarehouseTaskDetail,
} from '../../types/warehouse-task.types'
import { RelocationTaskDialog } from './RelocationTaskDialog'

const sourceSlotId = '11111111-1111-1111-1111-111111111111'
const destinationSlotId = '22222222-2222-2222-2222-222222222222'
const lineId = '33333333-3333-3333-3333-333333333333'

const detail: WarehouseTaskDetail = {
  id: '44444444-4444-4444-4444-444444444444',
  taskCode: 'REL-001',
  taskType: 'Relocation',
  warehouseId: '55555555-5555-5555-5555-555555555555',
  warehouseName: 'Kho trung tâm',
  executionStatus: 'InProgress',
  priority: 'Normal',
  reason: 'Sắp xếp lại hàng',
  dueAt: null,
  assignedTo: '66666666-6666-6666-6666-666666666666',
  assignedToName: 'Nhân viên kho',
  assignedAt: '2026-10-07T00:00:00Z',
  rowVersion: 'version',
  lines: [
    {
      id: lineId,
      productId: '77777777-7777-7777-7777-777777777777',
      sku: 'SKU-001',
      productName: 'Bu lông',
      sourceInventoryStockId: '88888888-8888-8888-8888-888888888888',
      sourceSlotId,
      sourceSlotCode: 'A-01',
      proposedDestinationSlotId: destinationSlotId,
      proposedDestinationSlotCode: 'B-02',
      quantity: 10,
      completedQuantity: 0,
      remainingQuantity: 10,
    },
  ],
  executions: [],
}

const recommendations: WarehousePlacementRecommendation[] = [
  {
    slotId: destinationSlotId,
    slotCode: 'B-02',
    slotName: 'Kệ B-02',
    zoneCode: 'ZONE-B',
    rackCode: 'RACK-02',
    rank: 1,
    score: 95,
    remainingCapacity: 100,
    capacityUnitName: 'cái',
    reasons: ['Cùng khu hàng ngũ kim.'],
  },
  {
    slotId: '99999999-9999-9999-9999-999999999999',
    slotCode: 'C-03',
    slotName: 'Kệ C-03',
    zoneCode: 'ZONE-C',
    rackCode: 'RACK-03',
    rank: 2,
    score: 80,
    remainingCapacity: 80,
    capacityUnitName: 'cái',
    reasons: ['Còn sức chứa.'],
  },
]

function StaffDialog() {
  const executeForm = useForm<ExecuteWarehouseRelocationFormValues>({
    defaultValues: {
      lineId,
      destinationSlotId,
      quantity: 10,
      overrideReason: '',
    },
  })

  return (
    <RelocationTaskDialog
      open
      detail={detail}
      isLoading={false}
      isError={false}
      scope="mine"
      canAssign={false}
      canExecute
      canOverrideDestination={false}
      staffOptions={[]}
      assignmentStaffId=""
      assignmentReason=""
      recommendations={recommendations}
      recommendationsLoading={false}
      executeForm={executeForm}
      isAssigning={false}
      isExecuting={false}
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

describe('RelocationTaskDialog', () => {
  afterEach(cleanup)

  it('shows the assigned destination to staff without destination override controls', () => {
    render(<StaffDialog />)

    expect(screen.getByTestId('assigned-destination')).toHaveTextContent('B-02')
    expect(screen.getByText('Vị trí do quản lý chỉ định.')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Lý do chọn vị trí khác')).not.toBeInTheDocument()
  })
})
