import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { putAwayFixture } from '../../utils/transfer-receipt-test-fixtures'
import { TransferPutAwayStatus } from './TransferPutAwayStatus'

afterEach(cleanup)

describe('putaway status summary', () => {
  it('replaces zero remaining with one completion message and hides stock rules until requested', async () => {
    const sheet = putAwayFixture()
    sheet.receipt.status = 'Received'
    sheet.receipt.receiptFlowVersion = 2
    render(<TransferPutAwayStatus sheet={sheet} remaining={0} canResume={false} />)
    expect(screen.getByText('Đã hoàn tất cất hàng')).toBeInTheDocument()
    expect(screen.queryByText(/Còn cần cất:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/không tăng tồn lần nữa/)).not.toBeInTheDocument()
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Thông tin về tồn kho khi cất hàng' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toHaveTextContent('không tăng tồn lần nữa')
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('retains the continuation action for available stock kept at receiving', () => {
    const sheet = putAwayFixture()
    sheet.receipt.status = 'Received'
    sheet.receipt.keptAtReceiving = true
    render(
      <TransferPutAwayStatus sheet={sheet} remaining={2} canResume>
        <button>Tiếp tục cất vào kệ</button>
      </TransferPutAwayStatus>
    )
    expect(screen.getByText('Có thể cất từ khu nhận: 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp tục cất vào kệ' })).toBeInTheDocument()
    expect(screen.queryByText('Đã hoàn tất cất hàng')).not.toBeInTheDocument()
  })

  it('does not claim completion when kept stock is unavailable or reserved', () => {
    const sheet = putAwayFixture()
    sheet.receipt.status = 'Received'
    sheet.receipt.keptAtReceiving = true
    sheet.rows[0]!.keptAtReceivingQuantity = 2
    render(<TransferPutAwayStatus sheet={sheet} remaining={0} canResume={false} />)
    expect(screen.getByText('Không còn hàng khả dụng để cất')).toBeInTheDocument()
    expect(screen.queryByText('Đã hoàn tất cất hàng')).not.toBeInTheDocument()
  })

  it('does not mark an unfinished zero-balance task complete', () => {
    const sheet = putAwayFixture()
    sheet.receipt.status = 'AwaitingPutAway'
    render(<TransferPutAwayStatus sheet={sheet} remaining={0} canResume={false} />)
    expect(screen.getByText('Đã cất đủ hàng')).toBeInTheDocument()
    expect(screen.getByText(/Bấm Hoàn tất cất hàng/)).toBeInTheDocument()
    expect(screen.queryByText('Đã hoàn tất cất hàng')).not.toBeInTheDocument()
  })

  it.each(['InTransit', 'Receiving', 'Cancelled'] as const)(
    'does not claim completion for %s',
    (status) => {
      const sheet = putAwayFixture()
      sheet.receipt.status = status
      render(<TransferPutAwayStatus sheet={sheet} remaining={0} canResume={false} />)
      expect(screen.queryByText('Đã hoàn tất cất hàng')).not.toBeInTheDocument()
    }
  )

  it('shows the remaining quantity during putaway', () => {
    render(<TransferPutAwayStatus sheet={putAwayFixture()} remaining={2} canResume={false} />)
    expect(screen.getByText('Còn cần cất: 2')).toBeInTheDocument()
  })
})
