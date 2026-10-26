import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import { refreshTransferAfterWrite } from './use-transfers'

describe('post-write transfer refresh scope', () => {
  it('refreshes the current document and required sheet once, leaving auxiliary queries stale', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    })
    const keys = [
      queryKeys.transfers.detail('t1'),
      queryKeys.transfers.pickSheet('t1', 's1'),
      queryKeys.transfers.list({ pageNumber: 1, pageSize: 10 }),
      queryKeys.transfers.detail('t2'),
      queryKeys.transfers.assignableStaff('w1', 'TransferPick'),
      queryKeys.transfers.putAwayPlanSuggestions('t1', 's1'),
      queryKeys.inventory.all,
      ['warehouse-tasks'],
    ]
    const reads = keys.map(() => vi.fn().mockResolvedValue({ fresh: true }))
    const unsubscribes = keys.map((queryKey, index) => {
      client.setQueryData(queryKey, { fresh: false })
      return new QueryObserver(client, { queryKey, queryFn: reads[index] }).subscribe(
        () => undefined
      )
    })
    try {
      await refreshTransferAfterWrite(client, 't1', 's1')
      reads.slice(0, 3).forEach((read) => expect(read).toHaveBeenCalledTimes(1))
      reads.slice(3).forEach((read) => expect(read).not.toHaveBeenCalled())
      keys.slice(3).forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true))
    } finally {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
      client.clear()
    }
  })
})
