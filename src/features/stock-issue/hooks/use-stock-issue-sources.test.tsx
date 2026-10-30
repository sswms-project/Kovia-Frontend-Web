import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useStockIssueSources } from './use-stock-issue-sources'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'

const mocks = vi.hoisted(() => ({ adjust: vi.fn(), refresh: vi.fn(), warning: vi.fn() }))
vi.mock('../services/stock-issue.service', () => ({
  stockIssueService: { adjustSources: mocks.adjust },
}))
vi.mock('./use-stock-issue-requests', () => ({ refreshStockIssueAfterWrite: mocks.refresh }))
vi.mock('@/components/operations/use-import-navigation', () => ({
  useImportNavigation: () => ({ discardOpen: false }),
}))
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: mocks.warning } }))
vi.mock('@/lib/api-error', () => ({
  logApiError: vi.fn(),
  isApiErrorResponse: (error: unknown) =>
    !!error && typeof error === 'object' && 'statusCode' in error,
  getApiErrorMessage: () => 'Chưa lưu',
}))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.adjust.mockResolvedValue({})
  mocks.refresh.mockResolvedValue(undefined)
})
afterEach(cleanup)
const order = {
  id: 'order',
  version: 'v1',
  status: 'Pending',
  items: [{ id: 'item', quantity: 20, pickedQuantity: 0, conversionFactor: 10 }],
} as StockIssueRequestSummary
const seed = [
  { itemId: 'item', inventoryStockId: 'source', quantity: 20, sourcePath: 'Khu A / Kệ 1' },
]
const values = {
  reason: 'Đổi kệ',
  allocations: [{ itemId: 'item', inventoryStockId: 'other', quantity: 2, path: 'Khu B / Kệ 2' }],
}
function wrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  )
}
it('pending selection stores a draft without reserving or calling the write API', async () => {
  const onDraft = vi.fn()
  const { result } = renderHook(() => useStockIssueSources(order, seed, null, onDraft), { wrapper })
  act(() => result.current.begin())
  expect(result.current.form.getValues('allocations.0.quantity')).toBe(2)
  await act(() => result.current.save(values))
  expect(mocks.adjust).not.toHaveBeenCalled()
  expect(onDraft).toHaveBeenCalledWith(
    expect.objectContaining({
      version: 'v1',
      allocations: [{ itemId: 'item', inventoryStockId: 'other', quantity: 20 }],
    })
  )
})
it('blocks a form opened against an older document version', async () => {
  const onDraft = vi.fn()
  const { result, rerender } = renderHook(
    ({ version }) =>
      useStockIssueSources({ ...order, status: 'Picking', version }, seed, null, onDraft),
    { wrapper, initialProps: { version: 'v1' } }
  )
  act(() => result.current.begin())
  rerender({ version: 'v2' })
  await act(() => result.current.save(values))
  expect(result.current.stale).toBe(true)
  expect(mocks.adjust).not.toHaveBeenCalled()
})
it('retries an uncertain write with the exact original payload and command ID even after the document changes', async () => {
  mocks.adjust.mockRejectedValueOnce({ statusCode: 500 }).mockResolvedValueOnce({})
  const { result, rerender } = renderHook(
    ({ status, version }) =>
      useStockIssueSources({ ...order, status, version }, seed, null, vi.fn()),
    {
      wrapper,
      initialProps: { status: 'Picking' as StockIssueRequestSummary['status'], version: 'v1' },
    }
  )
  act(() => result.current.begin())
  await act(() => result.current.save(values))
  await waitFor(() => expect(result.current.uncertain).toBe(true))
  const original = mocks.adjust.mock.calls[0]
  act(() => result.current.close())
  expect(result.current.open).toBe(true)
  rerender({ status: 'Pending', version: 'v2' })
  await act(() => result.current.save({ ...values, reason: 'Nội dung mới không được gửi' }))
  expect(mocks.adjust.mock.calls[1]).toEqual(original)
  expect(result.current.uncertain).toBe(false)
  expect(mocks.refresh).toHaveBeenCalledTimes(1)
})
it('ignores a second submit while the first write is in flight', async () => {
  let finish!: (value: unknown) => void
  mocks.adjust.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const { result } = renderHook(
    () => useStockIssueSources({ ...order, status: 'Picking' }, seed, null, vi.fn()),
    { wrapper }
  )
  act(() => result.current.begin())
  let first!: Promise<void>
  act(() => {
    first = result.current.save(values)
    void result.current.save(values)
  })
  await waitFor(() => expect(mocks.adjust).toHaveBeenCalledTimes(1))
  await act(async () => {
    finish({})
    await first
  })
})
