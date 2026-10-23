import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import { refreshStockIssueAfterWrite } from './use-stock-issue-requests'

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }))

describe('outbound committed refresh', () => {
  it('waits only for the active document version, not a slow list or unrelated inventory', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    let resolveDetail!: (value: { version: string }) => void
    const detailFn = vi.fn(
      () =>
        new Promise<{ version: string }>((resolve) => {
          resolveDetail = resolve
        })
    )
    const listFn = vi.fn(() => new Promise<never>(() => {}))
    const inventoryFn = vi.fn(async () => [])
    const detailKey = queryKeys.stockIssueRequests.detail('request')
    const observers = [
      new QueryObserver(client, {
        queryKey: detailKey,
        queryFn: detailFn,
        initialData: { version: 'old' },
      }),
      new QueryObserver(client, {
        queryKey: [...queryKeys.stockIssueRequests.all, 'list'],
        queryFn: listFn,
        initialData: [],
      }),
      new QueryObserver(client, {
        queryKey: [...queryKeys.inventory.all, 'list'],
        queryFn: inventoryFn,
        initialData: [],
      }),
    ]
    const stop = observers.map((observer) => observer.subscribe(() => {}))
    try {
      const refreshed = refreshStockIssueAfterWrite(client, 'request', true)
      await vi.waitFor(() => expect(detailFn).toHaveBeenCalledOnce())
      resolveDetail({ version: 'new' })
      await refreshed
      expect(client.getQueryData(detailKey)).toEqual({ version: 'new' })
      expect(listFn).toHaveBeenCalledOnce()
      expect(inventoryFn).not.toHaveBeenCalled()
    } finally {
      stop.forEach((unsubscribe) => unsubscribe())
      client.clear()
    }
  })
  it('does not turn an already committed mutation into a retry when refresh fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    const detailKey = queryKeys.stockIssueRequests.detail('request')
    const observer = new QueryObserver(client, {
      queryKey: detailKey,
      queryFn: async () => {
        throw new Error('offline')
      },
      initialData: { version: 'old' },
    })
    const stop = observer.subscribe(() => {})
    try {
      await expect(refreshStockIssueAfterWrite(client, 'request')).resolves.toBeUndefined()
      expect(client.getQueryState(detailKey)?.status).toBe('error')
    } finally {
      stop()
      client.clear()
    }
  })
})
