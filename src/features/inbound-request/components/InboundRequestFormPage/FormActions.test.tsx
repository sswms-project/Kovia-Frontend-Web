import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FormActions } from './FormActions'

describe('inbound request form actions', () => {
  it('lets the owner choose draft separately from Create', () => {
    const draft = vi.fn()
    const create = vi.fn()
    render(
      <FormActions autoApprove isPending={false} onSaveDraft={draft} onSaveAndSubmit={create} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    expect(draft).toHaveBeenCalledOnce()
    expect(create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo' }))
    expect(create).toHaveBeenCalledOnce()
    expect(screen.queryByText('Lưu và gửi duyệt')).not.toBeInTheDocument()
  })

  it('keeps draft and submit-for-approval for managers', () => {
    render(
      <FormActions
        autoApprove={false}
        isPending={false}
        onSaveDraft={vi.fn()}
        onSaveAndSubmit={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Lưu và gửi duyệt' })).toBeEnabled()
  })

  it('keeps the existing approved-edit action and blocks duplicate submissions', () => {
    render(<FormActions autoApprove={false} isApprovedEdit isPending onSaveDraft={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled()
    expect(screen.queryByText('Lưu nháp')).not.toBeInTheDocument()
  })
})
