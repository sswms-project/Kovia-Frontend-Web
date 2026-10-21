import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TransferRequestDecisionPanel } from './TransferRequestDecisionPanel'
import { buildTransfer } from '../../utils/transfer-test-fixtures'

afterEach(cleanup)
const props = () => ({
  transfer: buildTransfer({ status: 'PendingSourceAcceptance' }),
  canDecide: false,
  canWithdraw: false,
  disabled: false,
  uncertain: false,
  onAcceptAndPrepare: vi.fn(),
  onAccept: vi.fn(),
  onReject: vi.fn(),
  onWithdraw: vi.fn(),
  onVerify: vi.fn(),
})

describe('Transfer request decision panel', () => {
  it('shows a waiting message without source actions to the destination viewer', () => {
    render(<TransferRequestDecisionPanel {...props()} canWithdraw />)
    expect(
      screen.queryByRole('button', { name: 'Chấp nhận & chuẩn bị xuất' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thu hồi để sửa' })).toBeEnabled()
    expect(screen.getByText(/Hàng hóa chưa được giữ chỗ/)).toBeInTheDocument()
  })
  it('exposes each explicit source action and disables them while another operation is pending', () => {
    const values = props()
    const view = render(<TransferRequestDecisionPanel {...values} canDecide />)
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận & chuẩn bị xuất' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chỉ chấp nhận' }))
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }))
    expect(values.onAcceptAndPrepare).toHaveBeenCalledOnce()
    expect(values.onAccept).toHaveBeenCalledOnce()
    expect(values.onReject).toHaveBeenCalledOnce()
    view.rerender(<TransferRequestDecisionPanel {...values} canDecide disabled />)
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  })
  it('shows only read-only recovery after a lost response, and displays a rejection reason', () => {
    const values = props()
    const view = render(<TransferRequestDecisionPanel {...values} canDecide uncertain />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra thao tác trước' }))
    expect(values.onVerify).toHaveBeenCalledOnce()
    view.rerender(
      <TransferRequestDecisionPanel
        {...values}
        transfer={buildTransfer({ status: 'Rejected', rejectionReason: 'Kho thiếu hàng' })}
      />
    )
    expect(screen.getByText('Kho thiếu hàng')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
