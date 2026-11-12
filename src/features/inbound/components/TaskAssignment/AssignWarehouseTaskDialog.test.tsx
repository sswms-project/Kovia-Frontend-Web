import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { AssignWarehouseTaskFormValues } from '../../schemas/inbound.schema'
import { AssignWarehouseTaskDialog } from './AssignWarehouseTaskDialog'

function Harness() {
  const form = useForm<AssignWarehouseTaskFormValues>()
  return (
    <AssignWarehouseTaskDialog
      title="Giao việc nhận và cất hàng"
      target={{
        kind: 'TransferReceive',
        id: 't1',
        referenceCode: 'TR-001',
        warehouseId: 'w1',
        warehouseName: 'Kho A',
        currentAssigneeId: null,
        currentAssigneeName: null,
        currentPriority: 'Normal',
        currentDueAt: null,
      }}
      form={form}
      staff={Array.from({ length: 30 }, (_, i) => ({
        id: `s${i}`,
        fullName: `Nhân viên ${i}`,
        email: `s${i}@example.test`,
      }))}
      isLoadingStaff={false}
      isErrorStaff={false}
      isFetchingStaff={false}
      onRetryStaff={vi.fn()}
      isPending={false}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
    />
  )
}

describe('AssignWarehouseTaskDialog layout (H-10)', () => {
  it('caps the dialog to the viewport and keeps the save footer sticky', () => {
    render(<Harness />)
    const save = screen.getByRole('button', { name: /Lưu giao việc/ })
    const footer = save.closest('[data-slot="dialog-footer"]')
    const content = save.closest('[data-slot="dialog-content"]')
    expect(footer?.className).toContain('sticky')
    expect(content?.className).toContain('max-h-[calc(100dvh-2rem)]')
    expect(content?.className).toContain('overflow-y-auto')
  })
})
