import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ReturnGoodsPreview } from './ReturnGoodsPreview'

afterEach(cleanup)
const props = {
  id: 'panel',
  anchorId: 'anchor',
  expanded: true,
  selected: true,
  referenceCode: 'RTN-1',
  columns: ['Mã hàng', 'Tên hàng', 'SL trả'],
  rows: Array.from({ length: 12 }, (_, index) => ({
    id: `item-${index}`,
    cells: [`SKU-${index}`, `Hàng ${index}`, '1'],
  })),
  isLoading: false,
  isError: false,
  onRetry: vi.fn(),
}
it('paginates goods and keeps pagination outside the body', () => {
  render(<ReturnGoodsPreview {...props} />)
  const table = screen.getByRole('table')
  expect(within(table).getAllByRole('row')).toHaveLength(11)
  fireEvent.click(screen.getByRole('button', { name: /Trang sau/ }))
  expect(within(table).getAllByRole('row')).toHaveLength(3)
  expect(within(table).queryByText('SKU-0')).not.toBeInTheDocument()
})
it('masks cached rows on error and retries, then masks them on empty selection', () => {
  const view = render(<ReturnGoodsPreview {...props} isError />)
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(props.onRetry).toHaveBeenCalled()
  view.rerender(<ReturnGoodsPreview {...props} selected={false} />)
  expect(screen.getByText('Chọn phiếu để xem hàng hóa')).toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
