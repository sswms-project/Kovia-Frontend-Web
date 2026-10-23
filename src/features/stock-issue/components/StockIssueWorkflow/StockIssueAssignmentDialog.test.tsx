import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { AssignWarehouseTaskDialog } from '@/features/inbound/components/TaskAssignment'
import {
  assignWarehouseTaskSchema,
  type AssignWarehouseTaskFormValues,
} from '@/features/inbound/schemas/inbound.schema'

function Harness({
  onSubmit,
  error = false,
}: {
  onSubmit: (value: AssignWarehouseTaskFormValues) => void
  error?: boolean
}) {
  const form = useForm<AssignWarehouseTaskFormValues>({
    resolver: zodResolver(assignWarehouseTaskSchema),
    defaultValues: { staffId: '', priority: 'Normal', dueAt: '', reason: '' },
  })
  return (
    <AssignWarehouseTaskDialog
      target={{
        kind: 'StockIssuePick',
        id: 'issue',
        referenceCode: 'XK000001',
        warehouseId: 'warehouse',
        warehouseName: 'Kho A',
        currentAssigneeId: null,
        currentAssigneeName: null,
        currentPriority: 'Normal',
        currentDueAt: null,
      }}
      form={form}
      staff={[{ id: 'staff', fullName: 'Nhân viên A', email: 'fixture@example.invalid' }]}
      isLoadingStaff={false}
      isErrorStaff={error}
      isFetchingStaff={false}
      onRetryStaff={vi.fn()}
      isPending={false}
      onOpenChange={vi.fn()}
      onSubmit={() => void form.handleSubmit(onSubmit)()}
    />
  )
}

describe('shared outbound assignment dialog', () => {
  it('shows the inbound selection layout without unsupported scheduling fields or invented workloads', () => {
    render(<Harness onSubmit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Giao việc lấy hàng' })).toBeInTheDocument()
    expect(screen.getByText(/XK000001/)).toBeInTheDocument()
    expect(screen.getByRole('radio')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mức ưu tiên')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Hạn hoàn thành')).not.toBeInTheDocument()
    expect(screen.queryByText(/0 nhận|undefined|Điểm tải/)).not.toBeInTheDocument()
  })

  it('requires a worker and submits the selected worker', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Giao việc' }))
    expect(await screen.findByText('Vui lòng chọn nhân viên nhận việc.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('radio'))
    await userEvent.click(screen.getByRole('button', { name: 'Giao việc' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        { staffId: 'staff', priority: 'Normal', dueAt: '', reason: '' },
        undefined
      )
    )
  })

  it('blocks submission while the staff list has an error', () => {
    render(<Harness onSubmit={vi.fn()} error />)
    expect(screen.getByText('Không thể tải danh sách nhân viên của kho.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giao việc' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
