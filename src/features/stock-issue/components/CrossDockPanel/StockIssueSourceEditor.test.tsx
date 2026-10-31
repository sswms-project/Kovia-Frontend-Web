import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { StockIssueSourceEditor } from './StockIssueSourceEditor'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'

const mocks = vi.hoisted(() => ({ adjust: vi.fn() }))
vi.mock('../../services/stock-issue.service', () => ({
  stockIssueService: { adjustSources: mocks.adjust },
}))
vi.mock('../../hooks/use-stock-issue-requests', () => ({ refreshStockIssueAfterWrite: vi.fn() }))
vi.mock('@/components/operations/use-import-navigation', () => ({
  useImportNavigation: () => ({ discardOpen: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), info: vi.fn() } }))
vi.mock('./StockIssueSourceRow', () => ({ StockIssueSourceRow: () => <p>Nguồn đã chọn</p> }))
afterEach(cleanup)
it('keeps the uncertain-write retry available after realtime disables further source editing', async () => {
  mocks.adjust.mockRejectedValueOnce({ statusCode: 500 }).mockResolvedValueOnce({})
  const order = {
    id: 'order',
    status: 'Picking',
    version: 'v1',
    stockIssueRequestCode: 'XK-1',
    items: [
      {
        id: 'item',
        sku: 'A',
        productName: 'Hàng A',
        quantity: 10,
        pickedQuantity: 3,
        conversionFactor: 1,
        enteredUnitName: 'Cái',
      },
    ],
  } as StockIssueRequestSummary
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const draw = (supported: boolean, version: string) => (
    <QueryClientProvider client={client}>
      <StockIssueSourceEditor
        order={{ ...order, version }}
        scope="tenant-user"
        seed={[
          { itemId: 'item', inventoryStockId: 'source', quantity: 7, sourcePath: 'Khu A / Kệ 1' },
        ]}
        draft={null}
        onDraft={vi.fn()}
        disabled={!supported}
        supported={supported}
      />
    </QueryClientProvider>
  )
  const view = render(draw(true, 'v1'))
  fireEvent.click(screen.getByRole('button', { name: 'Đổi nguồn lấy hàng' }))
  expect(screen.getByText('Đang phân bổ 7 / 7 Cái')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Lý do chọn nguồn khác'), { target: { value: 'Đổi kệ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu nguồn chưa lấy' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Thử lại thao tác' })).toBeVisible()
  )
  const first = mocks.adjust.mock.calls[0]
  view.rerender(draw(false, 'v2'))
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại thao tác' }))
  await waitFor(() => expect(mocks.adjust).toHaveBeenCalledTimes(2))
  expect(mocks.adjust.mock.calls[1]).toEqual(first)
})
