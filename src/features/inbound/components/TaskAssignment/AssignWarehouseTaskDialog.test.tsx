import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { AssignWarehouseTaskFormValues } from '../../schemas/inbound.schema'
import type { AssignableWarehouseStaff } from '../../types/inbound.types'
import {
  AssignWarehouseTaskDialog,
  type AssignWarehouseTaskTarget,
} from './AssignWarehouseTaskDialog'

const CURRENT_ID = 'staff-1'

function person(id: string, fullName: string): AssignableWarehouseStaff {
  return {
    id,
    fullName,
    email: `${id}@sswms.local`,
    openReceivingTasks: 0,
    openPutAwayTasks: 0,
    hasTaskInProgress: false,
  }
}

function target(overrides: Partial<AssignWarehouseTaskTarget> = {}): AssignWarehouseTaskTarget {
  return {
    kind: 'Receiving',
    id: 'ir-1',
    referenceCode: 'IR-001',
    warehouseId: 'wh-1',
    warehouseName: 'Kho A',
    currentAssigneeId: CURRENT_ID,
    currentAssigneeName: 'Warehouse Staff',
    currentPriority: 'Normal',
    currentDueAt: null,
    ...overrides,
  }
}

function Harness({
  task,
  staff,
  onUnassign,
}: {
  readonly task: AssignWarehouseTaskTarget
  readonly staff: readonly AssignableWarehouseStaff[]
  readonly onUnassign?: () => void
}) {
  const form = useForm<AssignWarehouseTaskFormValues>({
    defaultValues: { staffId: '', priority: 'Normal', dueAt: '', reason: '' },
  })
  return (
    <AssignWarehouseTaskDialog
      target={task}
      form={form}
      staff={staff}
      isLoadingStaff={false}
      isErrorStaff={false}
      isFetchingStaff={false}
      onRetryStaff={vi.fn()}
      isPending={false}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
      onUnassign={onUnassign}
    />
  )
}

describe('AssignWarehouseTaskDialog unassign', () => {
  it('labels a first transfer assignment as an optional note, not reassignment', () => {
    render(
      <Harness
        task={target({
          kind: 'TransferReceive',
          currentAssigneeId: null,
          currentAssigneeName: null,
        })}
        staff={[person(CURRENT_ID, 'Nhân viên A')]}
      />
    )
    expect(screen.getByLabelText('Ghi chú giao việc (nếu có)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Lý do đổi người nhận việc (nếu có)')).not.toBeInTheDocument()
  })
  it('allows the current transfer worker to keep their assignment and change its schedule', () => {
    render(
      <Harness
        task={target({ kind: 'TransferPick' })}
        staff={[person(CURRENT_ID, 'Nhân viên A')]}
      />
    )
    expect(screen.getByRole('radio')).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lưu giao việc' })).not.toBeDisabled()
    expect(screen.getByLabelText('Mức ưu tiên')).toBeInTheDocument()
    expect(screen.getByLabelText('Hạn hoàn thành')).toBeInTheDocument()
  })
  it('offers "Hủy giao việc" for an assigned receiving task and calls the handler', async () => {
    const onUnassign = vi.fn()
    render(
      <Harness
        task={target()}
        staff={[person(CURRENT_ID, 'Warehouse Staff')]}
        onUnassign={onUnassign}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /Hủy giao việc/ }))

    expect(onUnassign).toHaveBeenCalledTimes(1)
  })

  it('explains there is nobody else to reassign to instead of showing a locked list', () => {
    render(
      <Harness
        task={target()}
        staff={[person(CURRENT_ID, 'Warehouse Staff')]}
        onUnassign={vi.fn()}
      />
    )

    expect(screen.getByText(/chưa có Nhân viên kho nào khác để giao lại/)).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giao lại' })).toBeDisabled()
  })

  it('lists other staff for reassignment when they exist', () => {
    render(
      <Harness
        task={target()}
        staff={[person(CURRENT_ID, 'Warehouse Staff'), person('staff-2', 'Nhân viên B')]}
        onUnassign={vi.fn()}
      />
    )

    expect(screen.getByText('Nhân viên B')).toBeInTheDocument()
    expect(screen.queryByText(/chưa có Nhân viên kho nào khác/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Mức ưu tiên')).toBeInTheDocument()
    expect(screen.getByLabelText('Hạn hoàn thành')).toBeInTheDocument()
  })

  it('does not offer unassign for a task that is not assigned yet or for put-away', () => {
    const { unmount } = render(
      <Harness
        task={target({ currentAssigneeId: null, currentAssigneeName: null })}
        staff={[person('staff-2', 'Nhân viên B')]}
        onUnassign={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /Hủy giao việc/ })).not.toBeInTheDocument()
    unmount()

    render(
      <Harness
        task={target({ kind: 'PutAway' })}
        staff={[person(CURRENT_ID, 'A')]}
        onUnassign={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /Hủy giao việc/ })).not.toBeInTheDocument()
  })
})

describe('AssignWarehouseTaskDialog workload', () => {
  it('shows the workload score, every open task kind and the recommended badge', () => {
    render(
      <Harness
        task={target({ currentAssigneeId: null, currentAssigneeName: null })}
        staff={[
          {
            ...person('staff-2', 'Nhân viên B'),
            openReceivingTasks: 1,
            openWarehouseTasks: 2,
            openCycleCounts: 1,
            workloadScore: 12.5,
            isRecommended: true,
          },
        ]}
      />
    )

    expect(screen.getByText('Đề xuất')).toBeInTheDocument()
    expect(screen.getByText('Điểm tải 12,5')).toBeInTheDocument()
    expect(screen.getByText('1 nhận · 0 cất · 2 việc kho · 1 kiểm kê')).toBeInTheDocument()
  })
})
