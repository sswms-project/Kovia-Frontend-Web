import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import {
  useSupplierReturnSourceStocksQuery,
  useSupplierReturnSourcesQuery,
} from './use-supplier-returns'

const service = vi.hoisted(() => ({ stocks: vi.fn(), receipts: vi.fn() }))
vi.mock('../services/supplier-return.service', () => ({
  supplierReturnService: { getSourceStocks: service.stocks, getSourceReceipts: service.receipts },
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
it('never carries stock from supplier A or receipt A into the next source selection', async () => {
  service.stocks
    .mockResolvedValueOnce({ data: { items: [{ id: 'stock-A' }], totalCount: 1 } })
    .mockImplementationOnce(() => new Promise(() => {}))
  const view = renderHook(
    ({ supplierId, sourceGoodsReceiptId }) =>
      useSupplierReturnSourceStocksQuery(
        { warehouseId: 'W', supplierId, sourceGoodsReceiptId, search: '', page: 1 },
        true
      ),
    { wrapper: wrapper(), initialProps: { supplierId: 'A', sourceGoodsReceiptId: 'receipt-A' } }
  )
  await waitFor(() => expect(view.result.current.data?.items).toHaveLength(1))
  view.rerender({ supplierId: 'B', sourceGoodsReceiptId: 'receipt-B' })
  expect(view.result.current.data).toBeUndefined()
  expect(service.stocks).toHaveBeenLastCalledWith({
    warehouseId: 'W',
    supplierId: 'B',
    sourceGoodsReceiptId: 'receipt-B',
    search: '',
    page: 1,
  })
})
it('does not query receipts or stocks before their required context is selected', () => {
  renderHook(
    () =>
      useSupplierReturnSourcesQuery(
        { warehouseId: 'W', supplierId: '', search: '', page: 1 },
        true
      ),
    { wrapper: wrapper() }
  )
  renderHook(
    () =>
      useSupplierReturnSourceStocksQuery(
        { warehouseId: 'W', supplierId: 'A', sourceGoodsReceiptId: '', search: '', page: 1 },
        true
      ),
    { wrapper: wrapper() }
  )
  expect(service.receipts).not.toHaveBeenCalled()
  expect(service.stocks).not.toHaveBeenCalled()
})
it('keeps source errors visible rather than presenting them as zero stock', async () => {
  service.stocks.mockRejectedValueOnce({ statusCode: 403, message: 'Không có quyền kho' })
  const view = renderHook(
    () =>
      useSupplierReturnSourceStocksQuery(
        { warehouseId: 'W', supplierId: 'A', sourceGoodsReceiptId: 'R', search: '', page: 1 },
        true
      ),
    { wrapper: wrapper() }
  )
  await waitFor(() => expect(view.result.current.isError).toBe(true))
  expect(view.result.current.data).toBeUndefined()
  expect(service.stocks).toHaveBeenCalledOnce()
})
