import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StockIssueStatusStepper } from './StockIssueStatusStepper'

describe('StockIssueStatusStepper', () => {
  it('offers an accessible mobile disclosure without changing the active step', async () => {
    const { container } = render(<StockIssueStatusStepper status="Picking" />)
    const trigger = screen.getByRole('button', { name: 'Xem các bước' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('li[aria-current="step"]')).toHaveTextContent('Đang lấy hàng')
  })

  it('keeps cancellation distinct from completed steps', () => {
    const { container } = render(<StockIssueStatusStepper status="Cancelled" />)
    expect(container.querySelector('li[aria-current="step"]')).toHaveTextContent('Đã hủy')
    expect(container.querySelectorAll('li svg.lucide-check')).toHaveLength(0)
  })
  it('marks every step done once the goods have left the warehouse', () => {
    const { container } = render(<StockIssueStatusStepper status="Dispatched" />)

    expect(container.querySelector('[aria-current="step"]')).toBeNull()
    // Six done steps, each with a check mark instead of its number.
    expect(container.querySelectorAll('li svg.lucide-check')).toHaveLength(6)
  })

  it('keeps the next step highlighted while the request is still moving', () => {
    const { container } = render(<StockIssueStatusStepper status="AuthorizedForDispatch" />)

    expect(container.querySelectorAll('li[aria-current="step"]')).toHaveLength(1)
    expect(container.querySelectorAll('li svg.lucide-check')).toHaveLength(4)
  })

  it('names who performs each step', () => {
    render(<StockIssueStatusStepper status="Pending" />)

    expect(screen.getByText('Quản lý kho giao việc')).toBeTruthy()
    expect(screen.getByText('Chủ doanh nghiệp cho phép')).toBeTruthy()
    expect(screen.getByText('Nhân viên kho xác nhận rời kho')).toBeTruthy()
  })
})
