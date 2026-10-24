import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InboundGoodsPreview } from './InboundGoodsPreview'
import type { InboundGoodsPreviewRow } from '../../utils/inbound-goods-preview'
import { TooltipProvider } from '@/components/ui/tooltip'

const row: InboundGoodsPreviewRow = {
  id: 'beer-lot-1',
  sku: 'BEER',
  name: 'Bia',
  unit: 'Lon',
  conversion: '1 Thùng = 24 Lon',
  requested: 240,
  received: 240,
  locations: [
    { id: 'a', label: 'A01', quantity: 96 },
    { id: 'b', label: 'A02', quantity: 144 },
  ],
  lotNumber: 'LOT-01',
  expiryDate: '2027-10-05',
}

afterEach(cleanup)

describe('inbound goods preview', () => {
  it.each([
    ['ĐVT', 'Đơn vị tính chính'],
    ['ĐVQĐ', 'Đơn vị quy đổi'],
    ['SL yêu cầu', 'Số lượng yêu cầu'],
    ['SL thực nhận', 'Số lượng thực nhận'],
  ])('explains %s on hover', async (label, fullName) => {
    const user = userEvent.setup()
    render(<InboundGoodsPreview selected rows={[row]} />)
    const trigger = screen.getByLabelText(fullName)
    expect(trigger).toHaveTextContent(label)
    await user.hover(trigger)
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(fullName))
  })
  it('explains abbreviated headers on keyboard focus', async () => {
    render(<InboundGoodsPreview selected rows={[row]} />)
    fireEvent.focus(screen.getByLabelText('Đơn vị tính chính'))
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Đơn vị tính chính'))
  })
  it('shows separate lot and expiry columns, preserving one quantity row per receipt item', () => {
    render(
      <InboundGoodsPreview
        selected
        rows={[row, { ...row, id: 'beer-lot-2', lotNumber: 'LOT-02', received: 24, locations: [] }]}
        isReceipt
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Vị trí cất' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Số lô' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Hạn sử dụng' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('A01 · 96 Lon')).toBeInTheDocument()
    expect(screen.getByText('A02 · 144 Lon')).toBeInTheDocument()
    expect(screen.getByText('LOT-01')).toBeInTheDocument()
    expect(screen.getByText('LOT-02')).toBeInTheDocument()
    expect(screen.getAllByText('5 thg 10, 2027')).toHaveLength(2)
  })
  it('never displays stale goods while loading another selected document or when selection is cleared', () => {
    const view = render(<InboundGoodsPreview selected rows={[row]} isReceipt />)
    view.rerender(<InboundGoodsPreview selected rows={[row]} isLoading />)
    expect(screen.queryByText('LOT-01')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Đang tải chi tiết hàng hóa')).toBeInTheDocument()
    view.rerender(<InboundGoodsPreview selected={false} rows={[row]} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Chọn chứng từ để xem hàng hóa')).toBeInTheDocument()
  })
  it('supports retry without showing cached goods on error', async () => {
    const retry = vi.fn()
    render(<InboundGoodsPreview selected rows={[row]} isError onRetry={retry} />)
    expect(screen.queryByText('LOT-01')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledOnce()
  })
  it('does not infer actual lots or positions from an inbound request', () => {
    render(
      <InboundGoodsPreview
        selected
        rows={[
          { ...row, locations: [], lotNumber: null, expiryDate: null, closed: 10, remaining: 20 },
        ]}
      />
    )
    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')
    expect(screen.queryByRole('columnheader', { name: 'Vị trí cất' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Số lô' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Đã đóng' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Còn chờ nhận' })).toBeInTheDocument()
    expect(cells[7]).toHaveTextContent('10')
    expect(cells[8]).toHaveTextContent('20')
  })
  it('uses the shared footer to page goods and resets when the document key changes', async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      ...row,
      id: `item-${index}`,
      sku: `ITEM-${index + 1}`,
    }))
    const view = render(
      <TooltipProvider>
        <InboundGoodsPreview key="a" selected rows={rows} />
      </TooltipProvider>
    )
    expect(screen.getByText('Tổng số:')).toHaveTextContent('Tổng số: 25')
    expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toHaveTextContent('10')
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.queryByText('ITEM-11')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(screen.getByText('ITEM-11')).toBeInTheDocument()
    expect(screen.queryByText('ITEM-1')).not.toBeInTheDocument()
    view.rerender(
      <TooltipProvider>
        <InboundGoodsPreview key="b" selected rows={rows} />
      </TooltipProvider>
    )
    expect(screen.getByText('ITEM-1')).toBeInTheDocument()
    expect(screen.queryByText('ITEM-11')).not.toBeInTheDocument()
  })
  it('allows changing the goods page size without changing document data', async () => {
    const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    try {
      const rows = Array.from({ length: 25 }, (_, index) => ({ ...row, id: `item-${index}` }))
      render(
        <TooltipProvider>
          <InboundGoodsPreview selected rows={rows} />
        </TooltipProvider>
      )
      fireEvent.keyDown(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }), {
        key: 'Enter',
      })
      fireEvent.keyDown(screen.getByRole('option', { name: '20' }), { key: 'Enter' })
      expect(screen.getAllByRole('row')).toHaveLength(21)
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
    } finally {
      if (originalScroll)
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    }
  })
})
