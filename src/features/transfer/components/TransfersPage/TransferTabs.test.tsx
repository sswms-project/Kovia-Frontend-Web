import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TransferTabs } from './TransferTabs'

describe('TransferTabs', () => {
  it('links the three business stages and marks only the active one as current', () => {
    render(<TransferTabs stage="transfer" openDiscrepancyCount={0} />)

    expect(screen.getByRole('link', { name: 'Yêu cầu điều chuyển' })).toHaveAttribute(
      'href',
      '/transfers?tab=request'
    )
    expect(screen.getByRole('link', { name: 'Điều chuyển' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Chờ xử lý chênh lệch' })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('shows the open discrepancy count only when there is something to handle', () => {
    const { rerender } = render(<TransferTabs stage="request" openDiscrepancyCount={0} />)
    expect(screen.getByRole('link', { name: 'Chờ xử lý chênh lệch' })).toHaveTextContent(
      /^Chờ xử lý chênh lệch$/
    )

    rerender(<TransferTabs stage="request" openDiscrepancyCount={3} />)
    expect(screen.getByRole('link', { name: /Chờ xử lý chênh lệch/ })).toHaveTextContent('3')
  })
})
