import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import { invalidateTransferQueries } from './use-transfers'
import { useRecordTransferPickMutation } from './use-transfer-fulfillment'
import {
  useSetTransferPutAwayPlanMutation,
  useTransferPutAwayRulesQuery,
} from './use-transfer-putaway-plan'
import { transferService } from '../services/transfer.service'

vi.mock('../services/transfer.service', () => ({
  transferService: {
    recordPick: vi.fn().mockResolvedValue({ data: null }),
    setPutAwayPlan: vi.fn().mockResolvedValue({ data: null }),
    getPutAwayPlanSuggestions: vi.fn(),
  },
}))

describe('Transfer refresh ownership', () => {
  it('leaves the single post-save read to the plan workspace', async () => {
    const client = new QueryClient()
    const key = queryKeys.transfers.detail('transfer')
    client.setQueryData(key, { id: 'transfer', version: 'old' })
    const read = vi.fn().mockResolvedValue({ id: 'transfer', version: 'new' })
    const observer = new QueryObserver(client, {
      queryKey: key,
      queryFn: read,
      staleTime: Infinity,
    })
    const unsubscribe = observer.subscribe(() => undefined)
    const hook = renderHook(() => useSetTransferPutAwayPlanMutation(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(() =>
      hook.result.current.mutateAsync({
        transferId: 'transfer',
        request: { expectedVersion: 'old', items: [] },
      })
    )
    expect(read).not.toHaveBeenCalled()
    expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    await client.fetchQuery({ queryKey: key, queryFn: read })
    expect(read).toHaveBeenCalledTimes(1)
    unsubscribe()
    hook.unmount()
    client.clear()
  })

  it('cancels rule requests for obsolete versions instead of completing unnecessary reads', async () => {
    const signals: AbortSignal[] = []
    vi.mocked(transferService.getPutAwayPlanSuggestions).mockImplementation(
      (_id, _shipment, _useAi, signal) => {
        signals.push(signal!)
        return new Promise((_resolve, reject) =>
          signal!.addEventListener('abort', () =>
            reject(new DOMException('Cancelled', 'AbortError'))
          )
        )
      }
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const hook = renderHook(
      ({ version }) => useTransferPutAwayRulesQuery('transfer', 'shipment', version, true),
      {
        initialProps: { version: 'v1' },
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      }
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(signals).toHaveLength(1)
    hook.rerender({ version: 'v2' })
    expect(signals[0]?.aborted).toBe(true)
    expect(signals).toHaveLength(2)
    hook.unmount()
    client.clear()
    expect(signals[1]?.aborted).toBe(true)
  })
  it('marks scanner data stale without fetching it twice before the mandatory fresh read', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const key = queryKeys.transfers.pickSheet('transfer', 'shipment')
    const read = vi.fn().mockResolvedValue({ lines: [] })
    const observer = new QueryObserver(client, { queryKey: key, queryFn: read })
    const unsubscribe = observer.subscribe(() => undefined)
    await client.fetchQuery({ queryKey: key, queryFn: read })
    const hook = renderHook(() => useRecordTransferPickMutation(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(() =>
      hook.result.current.mutateAsync({
        transferId: 'transfer',
        shipmentId: 'shipment',
        request: {
          commandId: 'command',
          lineId: 'line',
          inventoryStockId: 'stock',
          quantity: 1,
          scannedSlotCode: 'A01',
          scannedProductCode: 'SKU',
        },
      })
    )
    expect(read).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    await client.fetchQuery({ queryKey: key, queryFn: read, staleTime: 0 })
    expect(read).toHaveBeenCalledTimes(2)
    unsubscribe()
    hook.unmount()
    client.clear()
  })

  it('still refreshes active detail screens when they do not own a manual post-write read', async () => {
    const client = new QueryClient()
    const key = queryKeys.transfers.detail('transfer')
    client.setQueryData(key, { id: 'transfer' })
    const read = vi.fn().mockResolvedValue({ id: 'transfer', version: 'new' })
    const observer = new QueryObserver(client, {
      queryKey: key,
      queryFn: read,
      staleTime: Infinity,
    })
    const unsubscribe = observer.subscribe(() => undefined)
    await invalidateTransferQueries(client)
    expect(read).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(key)).toEqual({ id: 'transfer', version: 'new' })
    unsubscribe()
    client.clear()
  })
})
