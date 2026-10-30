import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useStockIssueSourceOptions } from './use-stock-issue-source-options'
import type { StockIssueRequestItem, StockIssueRequestSummary } from '../types/stock-issue.types'

const read = vi.hoisted(() => vi.fn())
vi.mock('../services/stock-issue.service', () => ({ stockIssueService: { sourceOptions: read } }))
afterEach(cleanup)
const order = { id: 'order', version: 'v1' } as StockIssueRequestSummary
const item = { id: 'item', conversionFactor: 10, enteredUnitName: 'Hộp' } as StockIssueRequestItem
function wrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}
it('keeps the selected stock lookup and converts its effective availability to entered units', async () => {
  read.mockResolvedValueOnce([
    {
      inventoryStockId: 'selected',
      path: 'Khu A / Kệ 1',
      lotNumber: null,
      expiryDate: null,
      freeQuantity: 30,
      ownUnpickedQuantity: 20,
      documentVersion: 'v1',
    },
  ])
  const { result } = renderHook(
    () => useStockIssueSourceOptions(order, item, 'tenant-user', 'selected'),
    { wrapper }
  )
  await waitFor(() => expect(result.current.sources.isSuccess).toBe(true))
  expect(result.current.options[0]?.description).toContain('Có thể chọn 5 Hộp')
  expect(read).toHaveBeenLastCalledWith('order', 'item', '', expect.any(AbortSignal), 'selected')
})
it('does not offer options fetched for a different document version', async () => {
  read.mockResolvedValueOnce([{ documentVersion: 'v2' }])
  const { result } = renderHook(() => useStockIssueSourceOptions(order, item, 'tenant-user'), {
    wrapper,
  })
  await waitFor(() => expect(result.current.sources.isError).toBe(true))
  expect(result.current.options).toEqual([])
})
