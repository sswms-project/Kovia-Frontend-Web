import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { FormActions } from './FormActions'

it('labels auto-approved creation as Tạo without changing its action', async () => {
  const save = vi.fn()
  render(<FormActions autoApprove isPending={false} onSaveDraft={save} />)
  await userEvent.click(screen.getByRole('button', { name: /^Tạo$/ }))
  expect(save).toHaveBeenCalledOnce()
  expect(screen.queryByText('Tạo và duyệt')).not.toBeInTheDocument()
  expect(screen.queryByText('Lưu và gửi duyệt')).not.toBeInTheDocument()
})
