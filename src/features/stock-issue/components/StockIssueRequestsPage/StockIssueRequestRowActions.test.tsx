import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  StockIssueCapabilities,
  StockIssueRequestSummary,
  StockIssueRowActionHandlers,
} from '../../types/stock-issue.types'
import { StockIssueRequestRowActions } from './StockIssueRequestRowActions'

const capabilities: StockIssueCapabilities = {
  currentUserId: 'picker-1',
  canCreate: false,
  canAssignPicker: false,
  canPick: true,
  canAuthorizeDispatch: false,
  canDispatch: false,
  canCancel: false,
}

const handlers: StockIssueRowActionHandlers = {
  onReleaseForPicking: vi.fn(),
  onRecordStockPicking: vi.fn(),
  onReportPickIssue: vi.fn(),
  onAuthorizeDispatch: vi.fn(),
  onConfirmDispatch: vi.fn(),
  onCancel: vi.fn(),
}

function order(assignedStaffId: string | null): StockIssueRequestSummary {
  return {
    id: 'o1',
    stockIssueRequestCode: 'SI-001',
    status: 'Picking',
    assignedStaffId,
    assignedStaffName: 'Picker',
  } as StockIssueRequestSummary
}

async function openMenu(assignedStaffId: string | null) {
  render(
    <StockIssueRequestRowActions
      order={order(assignedStaffId)}
      capabilities={capabilities}
      handlers={handlers}
    />
  )
  await userEvent.click(screen.getByRole('button', { name: /SI-001/ }))
}

describe('StockIssueRequestRowActions', () => {
  it('hiện thao tác lấy hàng cho người được giao', async () => {
    await openMenu('picker-1')
    expect(await screen.findByText('Quét & lấy hàng')).toBeInTheDocument()
    expect(screen.getByText('Báo hàng lỗi')).toBeInTheDocument()
  })

  it('ẩn thao tác lấy hàng với người không được giao', async () => {
    await openMenu('picker-2')
    expect(await screen.findByText('Xem chi tiết')).toBeInTheDocument()
    expect(screen.queryByText('Quét & lấy hàng')).not.toBeInTheDocument()
    expect(screen.queryByText('Báo hàng lỗi')).not.toBeInTheDocument()
  })
})
