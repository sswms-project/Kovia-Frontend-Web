import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CrossDockAllocations } from './CrossDockAllocations'

const allocation = {
  itemId: 'item',
  productId: 'product',
  inventoryStockId: 'stock-a',
  slotId: 'slot-a',
  lotId: null,
  lotNumber: null,
  expiryDate: null,
  quantity: 20,
  directFromReceiving: false,
  reason: 'FIFO trong nhóm nguồn không có hạn dùng; chưa đủ bằng chứng cross-docking.',
  sku: 'SKU00001',
  productName: 'Kềm A3',
  sourcePath: 'K01 / A04',
}

describe('picking allocation presentation', () => {
  it('keeps separate sources as separate table rows with explicit base quantities', () => {
    render(
      <CrossDockAllocations
        allocations={[
          allocation,
          {
            ...allocation,
            inventoryStockId: 'stock-b',
            slotId: 'slot-b',
            sourcePath: 'K01 / A05',
            quantity: 5,
            lotId: 'lot',
            lotNumber: 'LOT-01',
            expiryDate: '2026-12-31',
            directFromReceiving: true,
          },
        ]}
      />
    )
    const table = screen.getByRole('table', { name: 'Nguồn hàng đề xuất' })
    expect(within(table).getAllByRole('columnheader')).toHaveLength(6)
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]!).getByText('20')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('đơn vị cơ sở')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('K01 / A04')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('FIFO')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Không áp dụng')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('LOT-01')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('FEFO')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Đi thẳng từ khu nhận')).toBeInTheDocument()
  })

  it('keeps the full explanation behind a keyboard-accessible disclosure', async () => {
    render(<CrossDockAllocations allocations={[allocation]} />)
    const table = screen.getByRole('table', { name: 'Nguồn hàng đề xuất' })
    const summary = within(table).getByText('Chi tiết phân bổ')
    const details = summary.closest('details')
    expect(details).not.toHaveAttribute('open')
    await userEvent.click(summary)
    expect(details).toHaveAttribute('open')
    expect(within(details!).getByText(allocation.reason)).toBeInTheDocument()
    const mobile = screen.getByRole('list', { name: 'Nguồn hàng đề xuất trên điện thoại' })
    expect(within(mobile).getByText('20 đơn vị cơ sở')).toBeInTheDocument()
    expect(within(mobile).getByText('K01 / A04')).toBeInTheDocument()
  })

  it('explains an empty plan without rendering an empty table', () => {
    render(<CrossDockAllocations allocations={[]} />)
    expect(
      screen.getByText('Chưa có nguồn hàng được đề xuất trong kế hoạch này.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
