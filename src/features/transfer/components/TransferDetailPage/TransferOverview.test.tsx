import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { buildTransfer } from '../../utils/transfer-test-fixtures'
import { TransferOverview } from './TransferOverview'
afterEach(cleanup)

describe('TransferOverview dates', () => {
  it('places the compact toggle after the warehouse route in the same non-wrapping header', () => {
    const transfer = buildTransfer({
      sourceWarehouseName: 'Đà Nẵng',
      destinationWarehouseName: 'Kho test cất hàng',
    })
    render(<TransferOverview transfer={transfer} />)
    const route = screen.getByText('Đà Nẵng → Kho test cất hàng')
    const toggle = screen.getByRole('button', { name: 'Thông tin phiếu' })
    expect(route.parentElement).toBe(toggle.closest('h2')?.parentElement)
    expect(route.parentElement).toHaveClass('flex', 'justify-between')
    expect(route.parentElement).not.toHaveClass('flex-wrap')
    expect(toggle).toHaveAttribute('data-variant', 'outline')
    expect(toggle).toHaveAttribute('data-size', 'sm')
    expect(toggle).not.toHaveClass('px-0')
    expect(route.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('labels both dates and distinguishes legacy date-only arrival from selected midnight', () => {
    render(
      <TransferOverview
        transfer={buildTransfer({
          plannedTransferDate: '2026-10-20T00:00:00+07:00',
          requiredBy: '2026-10-20T23:59:59.999+07:00',
        })}
      />
    )
    expect(screen.getByRole('button', { name: 'Thông tin phiếu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByRole('region', { name: 'Thông tin phiếu' })).toBeInTheDocument()
    expect(screen.getByText('Ngày dự kiến điều chuyển')).toBeInTheDocument()
    expect(screen.getByText('Ngày hàng dự kiến về kho nhập')).toBeInTheDocument()
    expect(screen.getByText('20/10/2026 00:00')).toBeInTheDocument()
    expect(screen.getByText('20/10/2026')).toBeInTheDocument()
    expect(screen.queryByText('Hạn cần hàng')).not.toBeInTheDocument()
  })
  it('collapses details without hiding route/status, preserves choice on refresh and opens for a new transfer', () => {
    const transfer = buildTransfer({ reason: 'Nội dung cần thu gọn' })
    const { rerender } = render(<TransferOverview transfer={transfer} />)
    const toggle = screen.getByRole('button', { name: 'Thông tin phiếu' })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Nội dung cần thu gọn')).not.toBeInTheDocument()
    expect(
      screen.getByText(`${transfer.sourceWarehouseName} → ${transfer.destinationWarehouseName}`)
    ).toBeVisible()
    rerender(<TransferOverview transfer={{ ...transfer, reason: 'Dữ liệu mới' }} />)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByText('Dữ liệu mới')).toBeVisible()
    fireEvent.click(toggle)
    rerender(<TransferOverview transfer={{ ...transfer, id: 'other-transfer' }} />)
    expect(screen.getByRole('button', { name: 'Thông tin phiếu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })
})
