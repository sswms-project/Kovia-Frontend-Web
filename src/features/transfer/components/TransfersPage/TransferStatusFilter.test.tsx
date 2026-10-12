import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TransferStatusFilter } from './TransferStatusFilter'

afterEach(cleanup)
describe('TransferStatusFilter', () => {
  it('renders real links and the active status/count, retaining the other URL filters', () => {
    render(
      <TransferStatusFilter
        status="InProgress"
        query="page=2&search=milk"
        counts={{
          all: 12,
          draft: 2,
          inProgress: 6,
          awaitingResolution: 1,
          completed: 3,
          cancelled: 4,
        }}
      />
    )
    const active = screen.getByRole('link', { name: /Đang thực hiện.*6/ })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveAttribute('href', '/transfers?search=milk&status=InProgress')
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
  it('does not show false zero counts before the server returns data', () => {
    render(<TransferStatusFilter status="" query="" />)
    expect(screen.getByRole('link', { name: /Tất cả.*—/ })).toHaveAttribute('aria-current', 'page')
  })
})
