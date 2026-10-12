import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { TransferGoodsRow } from '../../utils/transfer-goods-rows'
import { TransferGoodsTable } from './TransferGoodsTable'

const row: TransferGoodsRow = {
  id: 'i1',
  sku: 'SKU-001',
  name: 'Sữa tươi',
  unit: 'Hộp',
  conversion: '1 Thùng = 12 Hộp',
  requested: 24,
  batched: 12,
  picked: 6,
  dispatched: 12,
  receivedGood: 9,
  damaged: 2,
  missing: 1,
  stopped: 0,
  unbatched: 12,
  discrepancy: 'open',
  destinationSlot: 'Khu K01 / Kệ A07',
  allocations: ['Khu Z-A / Kệ A-01: 24'],
}

function renderTable(props: Partial<React.ComponentProps<typeof TransferGoodsTable>> = {}) {
  return render(
    <TooltipProvider>
      <TransferGoodsTable selected rows={[row]} {...props} />
    </TooltipProvider>
  )
}

afterEach(cleanup)

describe('TransferGoodsTable', () => {
  it('shows the shipped, received, damaged and missing quantities of each line', () => {
    renderTable()
    const cells = screen.getAllByRole('row')[1]!
    expect(cells).toHaveTextContent('SKU-001')
    expect(cells).toHaveTextContent('Sữa tươi')
    expect(cells).toHaveTextContent('1 Thùng = 12 Hộp')
    expect(cells).toHaveTextContent('Chưa xử lý')
    expect(screen.getByRole('columnheader', { name: /Chênh lệch/ })).toBeInTheDocument()
    expect(screen.getByText('Tổng số:')).toHaveTextContent('Tổng số: 1')
  })

  it('asks for a transfer to be selected instead of showing stale goods', () => {
    renderTable({ selected: false })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Chọn phiếu để xem hàng hóa')).toBeInTheDocument()
  })

  it('shows loading and error states without cached rows and supports retry', async () => {
    const retry = vi.fn()
    const view = renderTable({ isLoading: true })
    expect(screen.queryByText('SKU-001')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Đang tải chi tiết hàng hóa')).toBeInTheDocument()
    view.rerender(
      <TooltipProvider>
        <TransferGoodsTable selected rows={[row]} isError onRetry={retry} />
      </TooltipProvider>
    )
    expect(screen.queryByText('SKU-001')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('pages goods through the shared pagination footer', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      ...row,
      id: `i${index}`,
      sku: `ITEM-${index + 1}`,
    }))
    renderTable({ rows })
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.queryByText('ITEM-11')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(screen.getByText('ITEM-11')).toBeInTheDocument()
  })

  it('tells the user when the transfer has no goods', () => {
    renderTable({ rows: [] })
    expect(screen.getByText('Phiếu chưa có hàng hóa')).toBeInTheDocument()
  })

  it('shows the picked-from and destination columns only to the people who may see them', () => {
    renderTable()
    expect(screen.queryByText('Phân bổ lấy hàng')).not.toBeInTheDocument()
    expect(screen.queryByText('Khu K01 / Kệ A07')).not.toBeInTheDocument()
    cleanup()

    renderTable({ showAllocation: true, showDestinationSlot: true })
    expect(screen.getByText('Phân bổ lấy hàng')).toBeInTheDocument()
    expect(screen.getByText('Khu Z-A / Kệ A-01: 24')).toBeInTheDocument()
    expect(screen.getByText('Khu K01 / Kệ A07')).toBeInTheDocument()
  })
})
