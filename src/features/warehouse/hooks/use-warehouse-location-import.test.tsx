import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import { warehouseLocationImportService as service } from '../services/warehouse-location-import.service'
import { useWarehouseLocationImport } from './use-warehouse-location-import'

vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }))
vi.mock('../services/warehouse-location-import.service', () => ({
  warehouseLocationImportService: { commit: vi.fn() },
}))

it('keeps a confirmed save successful if cache refresh fails and never retries it', async () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockRejectedValue(new Error('offline'))
  const saved = {
    createdCounts: { zones: 1, racks: 0, slots: 0 },
    created: [],
    referenceCounts: 0,
    unselectedCounts: 0,
    layoutNeedsArrangement: true,
  }
  vi.mocked(service.commit).mockResolvedValue(saved)
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useWarehouseLocationImport('warehouse'), { wrapper })
  await act(async () => {
    expect(
      await result.current.commit.mutateAsync({
        file: new File(['z'], 'zones.csv'),
        options: { mode: 'Zones', schemaVersion: 1, csvDelimiter: 'auto', tables: [] },
        selection: {
          expectedPreviewFingerprint: 'hash',
          selectedRowKeys: ['z'],
          acknowledgeIgnoredData: false,
        },
      })
    ).toEqual(saved)
  })
  expect(service.commit).toHaveBeenCalledTimes(1)
  expect(invalidate).toHaveBeenCalledWith(
    { queryKey: queryKeys.warehouses.detail('warehouse') },
    { throwOnError: true }
  )
  expect(toast.warning).toHaveBeenCalledOnce()
  await waitFor(() => expect(result.current.commit.isSuccess).toBe(true))
  client.clear()
})
