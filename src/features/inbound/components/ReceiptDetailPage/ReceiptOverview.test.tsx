import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { GoodsReceiptDetail } from '../../types/inbound.types'
import { ReceiptOverview } from './ReceiptOverview'

// Only the receipt overview's read fields are needed; no actions or quantities are mutated here.
const receipt = {
  id: 'receipt',
  inboundRequestCode: 'NK000010',
  warehouseName: 'Kho nhận',
  status: 'Approved',
  receivingAssignedToName: 'Nhân viên nhận',
  createdByName: 'Người tạo phiếu',
  createdAt: '2026-10-25T08:00:00Z',
  putAwayAssignedToName: 'Nhân viên cất',
  approvedByName: 'Quản lý',
  receivingFlowVersion: 1,
  items: [],
  rejectionReason: 'Cần kiểm tra lại số lượng',
} as GoodsReceiptDetail

afterEach(cleanup)

describe('receipt document information disclosure', () => {
  it('uses the shared toggle while retaining correction instructions and document identity', async () => {
    const user = userEvent.setup()
    render(<ReceiptOverview receipt={receipt} />)
    const toggle = screen.getByRole('button', { name: 'Thông tin phiếu' })
    expect(screen.getByText('Nhân viên nhận')).toBeVisible()
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Nhân viên nhận')).not.toBeInTheDocument()
    expect(screen.getByText('NK000010 · Kho nhận')).toBeVisible()
    expect(screen.getByText('Cần kiểm tra lại số lượng')).toBeVisible()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Nhân viên cất')).toBeVisible()
  })

  it('retains the receipt-specific kept-at-receiving explanation when expanded', () => {
    render(<ReceiptOverview receipt={{ ...receipt, keptAtReceiving: true }} />)
    expect(
      screen.getByText('Giữ tại vị trí nhận · khả dụng theo FEFO, chưa phải đã cất kệ')
    ).toBeVisible()
    expect(screen.queryByText('Người cất hàng')).not.toBeInTheDocument()
  })
})
