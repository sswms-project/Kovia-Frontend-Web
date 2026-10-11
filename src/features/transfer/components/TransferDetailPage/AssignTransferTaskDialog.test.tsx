import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssignTransferTaskDialog, type AssignTransferTaskTarget } from './AssignTransferTaskDialog'

afterEach(cleanup)

const STAFF = [
  { id: 'staff-1', name: 'Nguyễn Lấy' },
  { id: 'staff-2', name: 'Trần Giao' },
]

const FIRST_ASSIGNMENT: AssignTransferTaskTarget = {
  title: 'Giao việc lấy hàng',
  description: 'Đợt 1 · Kho nguồn',
  currentAssigneeId: null,
  currentAssigneeName: null,
}

function renderDialog(target: AssignTransferTaskTarget | null, onSubmit = vi.fn()) {
  const view = (next: AssignTransferTaskTarget | null) => (
    <AssignTransferTaskDialog
      target={next}
      staff={STAFF}
      isLoadingStaff={false}
      isPending={false}
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
    />
  )
  const rendered = render(view(target))
  return {
    onSubmit,
    rerenderWith: (next: AssignTransferTaskTarget | null) => rendered.rerender(view(next)),
  }
}

describe('AssignTransferTaskDialog', () => {
  it('assigns the first person without asking for a reason', () => {
    const { onSubmit } = renderDialog(FIRST_ASSIGNMENT)
    fireEvent.change(screen.getByLabelText('Nhân viên nhận việc'), { target: { value: 'staff-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc' }))
    expect(onSubmit).toHaveBeenCalledWith({ staffId: 'staff-1', reason: null })
  })

  it('shows who has the task and requires a reason plus a different person to reassign', () => {
    const { onSubmit } = renderDialog({
      ...FIRST_ASSIGNMENT,
      currentAssigneeId: 'staff-1',
      currentAssigneeName: 'Nguyễn Lấy',
    })
    expect(screen.getByText('Nguyễn Lấy', { selector: 'strong' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nhân viên nhận việc'), { target: { value: 'staff-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Giao lại' }))
    expect(
      screen.getByText('Nhân viên này đang được giao việc. Hãy chọn người khác.')
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nhân viên nhận việc'), { target: { value: 'staff-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Giao lại' }))
    expect(screen.getByText('Vui lòng nhập lý do giao lại.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Lý do giao lại'), { target: { value: 'Đổi ca' } })
    fireEvent.click(screen.getByRole('button', { name: 'Giao lại' }))
    expect(onSubmit).toHaveBeenCalledWith({ staffId: 'staff-2', reason: 'Đổi ca' })
  })

  it('starts empty every time it opens instead of keeping the previous choice', () => {
    const { rerenderWith } = renderDialog(FIRST_ASSIGNMENT)
    fireEvent.change(screen.getByLabelText('Nhân viên nhận việc'), { target: { value: 'staff-1' } })
    expect(screen.getByLabelText('Nhân viên nhận việc')).toHaveValue('staff-1')

    rerenderWith(null)
    rerenderWith({
      ...FIRST_ASSIGNMENT,
      currentAssigneeId: 'staff-1',
      currentAssigneeName: 'Nguyễn Lấy',
    })

    expect(screen.getByLabelText('Nhân viên nhận việc')).toHaveValue('')
  })
})
