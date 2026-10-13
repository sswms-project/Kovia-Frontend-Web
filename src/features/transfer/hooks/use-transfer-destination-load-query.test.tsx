import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransferDestinationLoadQuery } from '../types/transfer.types'
import { useTransferDestinationLoadQuery } from './use-transfer-destination-load-query'

const mock = vi.hoisted(() => ({ get: vi.fn(), log: vi.fn() }))
vi.mock('../services/transfer.service', () => ({
  transferService: { getDestinationLoad: mock.get },
}))
vi.mock('@/lib/logger', () => ({ logger: { warn: mock.log } }))

const counts = { inboundRequestCount: 1, transferCount: 1, total: 2, threshold: 2 }
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.get.mockResolvedValue({ data: counts })
})
afterEach(() => vi.useRealTimers())

describe('destination load query', () => {
  it.each([
    { warehouseId: '', date: '2026-10-20' },
    { warehouseId: 'warehouse-1', date: '' },
    { warehouseId: 'warehouse-1', date: '2026-02-30' },
  ])('does not request incomplete or invalid input: %j', (params) => {
    const hook = renderHook(() => useTransferDestinationLoadQuery(params), { wrapper })
    expect(mock.get).not.toHaveBeenCalled()
    expect(hook.result.current.data).toBeUndefined()
  })

  it('passes warehouse/day/excluded transfer and changes the query key when the warehouse changes', async () => {
    const params: TransferDestinationLoadQuery = {
      warehouseId: 'warehouse-1',
      date: '2026-10-20',
      excludeTransferId: 'edited',
    }
    const hook = renderHook(({ input }) => useTransferDestinationLoadQuery(input), {
      wrapper,
      initialProps: { input: params },
    })
    await waitFor(() => expect(hook.result.current.data).toEqual(counts))
    expect(mock.get).toHaveBeenCalledWith(params, expect.any(AbortSignal))
    let finish: (value: { data: typeof counts }) => void = () => undefined
    mock.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    hook.rerender({ input: { ...params, warehouseId: 'warehouse-2' } })
    expect(hook.result.current.data).toBeUndefined()
    await act(async () => finish({ data: { ...counts, total: 0 } }))
    await waitFor(() => expect(hook.result.current.data?.total).toBe(0))
    expect(mock.get).toHaveBeenLastCalledWith(
      { ...params, warehouseId: 'warehouse-2' },
      expect.any(AbortSignal)
    )
  })

  it('debounces changed dates and never exposes the old day while waiting', async () => {
    const input = { warehouseId: 'warehouse-1', date: '2026-10-20' }
    const hook = renderHook(({ params }) => useTransferDestinationLoadQuery(params), {
      wrapper,
      initialProps: { params: input },
    })
    await waitFor(() => expect(hook.result.current.data).toEqual(counts))
    vi.useFakeTimers()
    hook.rerender({ params: { ...input, date: '2026-10-21' } })
    hook.rerender({ params: { ...input, date: '2026-10-22' } })
    expect(hook.result.current.data).toBeUndefined()
    expect(mock.get).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(301)
    })
    expect(mock.get).toHaveBeenCalledTimes(2)
    expect(mock.get).toHaveBeenLastCalledWith(
      { ...input, date: '2026-10-22' },
      expect.any(AbortSignal)
    )
  })

  it('hides failed reads, logs once, and never retries a failed request automatically', async () => {
    const error = { statusCode: 503, message: 'QA error' }
    mock.get.mockRejectedValue(error)
    const hook = renderHook(
      () => useTransferDestinationLoadQuery({ warehouseId: 'w', date: '2026-10-20' }),
      { wrapper }
    )
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(hook.result.current.data).toBeUndefined()
    expect(mock.get).toHaveBeenCalledTimes(1)
    expect(mock.log).toHaveBeenCalledExactlyOnceWith(
      'Không thể tải cảnh báo tải kho nhập:',
      '[503] QA error'
    )
  })

  it('is disabled when create permission is absent', () => {
    renderHook(
      () => useTransferDestinationLoadQuery({ warehouseId: 'w', date: '2026-10-20' }, false),
      { wrapper }
    )
    expect(mock.get).not.toHaveBeenCalled()
  })
})
