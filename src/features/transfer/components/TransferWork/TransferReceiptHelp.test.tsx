import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { TransferReceiptHelp } from './TransferReceiptHelp'

afterEach(cleanup)

describe('receiving instructions', () => {
  it.each([1, 2])(
    'keeps flow %s instructions behind a touch-accessible help button',
    async (version) => {
      const user = userEvent.setup()
      render(<TransferReceiptHelp receiptFlowVersion={version} />)
      expect(screen.queryByText('Tốt, hỏng và thiếu phải khớp số đã xuất.')).not.toBeInTheDocument()
      const trigger = screen.getByRole('button', { name: 'Hướng dẫn kiểm hàng trước khi cất' })
      expect(trigger).toHaveClass('min-h-11', 'min-w-11')
      await user.click(trigger)
      const help = screen.getByRole('dialog', { name: 'Hướng dẫn kiểm hàng' })
      expect(help).toHaveTextContent('Tốt, hỏng và thiếu phải khớp số đã xuất.')
      expect(help).toHaveTextContent(
        version === 1 ? 'nộp kiểm đếm chưa ghi tồn' : 'Thực nhận được ghi tồn một lần'
      )
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    }
  )
})
