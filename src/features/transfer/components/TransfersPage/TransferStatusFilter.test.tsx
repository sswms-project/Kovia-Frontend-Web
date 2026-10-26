import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TransferStatusFilter, TransferStatusStats } from './TransferStatusFilter'

afterEach(cleanup)
const counts = {
  all: 12,
  draft: 2,
  inProgress: 6,
  awaitingResolution: 1,
  completed: 3,
  cancelled: 4,
  pendingSourceAcceptance: 5,
  rejected: 7,
}

describe('transfer status summary and filter', () => {
  it('renders request decisions and fulfillment counts with responsive wrapping', () => {
    render(<TransferStatusStats counts={counts} />)
    const summary = screen.getByRole('region', {
      name: 'Thống kê phiếu điều chuyển theo trạng thái',
    })
    expect(summary).toHaveClass('grid', 'xl:grid-cols-7')
    expect(summary.children).toHaveLength(7)
    expect(within(summary).queryByRole('link')).not.toBeInTheDocument()
    expect(within(summary).queryByRole('button')).not.toBeInTheDocument()
    expect(within(summary).queryByRole('tab')).not.toBeInTheDocument()
    expect(within(summary).queryByText('Tất cả')).not.toBeInTheDocument()
    for (const value of [2, 6, 1, 3, 4, 5, 7])
      expect(within(summary).getByText(String(value))).toBeInTheDocument()
  })
  it('does not invent zero counts before data or after an error', () => {
    const view = render(<TransferStatusStats />)
    expect(screen.getAllByText('—')).toHaveLength(7)
    view.rerender(<TransferStatusStats counts={counts} isError />)
    expect(screen.getAllByText('—')).toHaveLength(7)
  })
  it('uses loading skeletons instead of actionable tiles', () => {
    render(<TransferStatusStats isLoading />)
    const summary = screen.getByRole('region')
    expect(summary).toHaveAttribute('aria-busy', 'true')
    expect(summary.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(7)
  })
  it('filters only through the separate status dropdown and allows returning to all', () => {
    const onChange = vi.fn()
    render(<TransferStatusFilter status="InProgress" onChange={onChange} />)
    const filter = screen.getByRole('combobox', { name: 'Lọc trạng thái điều chuyển' })
    expect(filter).toHaveValue('InProgress')
    expect(within(filter).getAllByRole('option')).toHaveLength(8)
    fireEvent.change(filter, { target: { value: 'PendingSourceAcceptance' } })
    expect(onChange).toHaveBeenLastCalledWith('PendingSourceAcceptance')
    fireEvent.change(filter, { target: { value: 'Rejected' } })
    expect(onChange).toHaveBeenLastCalledWith('Rejected')
    fireEvent.change(filter, { target: { value: 'Completed' } })
    expect(onChange).toHaveBeenLastCalledWith('Completed')
    fireEvent.change(filter, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})
