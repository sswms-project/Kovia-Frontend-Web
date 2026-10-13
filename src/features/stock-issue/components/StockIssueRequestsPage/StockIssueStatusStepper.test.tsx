import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StockIssueStatusStepper } from './StockIssueStatusStepper'

describe('StockIssueStatusStepper', () => {
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
