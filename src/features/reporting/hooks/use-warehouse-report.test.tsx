import type { ReactNode } from 'react'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/lib/axios'
import { useWarehouseReport, useWarehouseReportOptions } from './use-warehouse-report'

const auth = vi.hoisted(() => ({ user: { tenantId: 'tenant-1', id: 'user-1' } }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => auth.user }))
vi.mock('@/lib/axios', () => ({ axiosClient: { get: vi.fn() } }))

const options = {
  warehouses: [{ id: 'w1', name: 'Kho A' }],
  products: [{ id: 'p2', sku: 'NEW', name: 'Mặt hàng mới', unit: 'Cái' }],
  categories: [],
  assignees: [],
  productsTruncated: false,
}
const report = {
  reportType: 'inventory-balance',
  schemaVersion: '1',
  generatedAt: '2026-10-22T00:00:00Z',
  timeBasis: 'Kỳ',
  dataQuality: 'Complete',
  warnings: [],
  appliedFilters: {
    warehouseIds: ['w1'],
    dateFrom: null,
    dateTo: null,
    productId: null,
    search: null,
    status: null,
    assigneeId: null,
    taskType: null,
    deadline: null,
  },
  columns: [],
  items: [],
  totalCount: 0,
  pageNumber: 2,
  pageSize: 25,
}

let client: QueryClient
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 300_000 } } })
  auth.user = { tenantId: 'tenant-1', id: 'user-1' }
})
afterEach(() => {
  cleanup()
  client.clear()
})

describe('report request lifecycle (mock HTTP)', () => {
  it('aborts obsolete options through Axios and shows the latest search results', async () => {
    let obsoleteSignal: AbortSignal | undefined
    vi.mocked(axiosClient.get)
      .mockImplementationOnce((_url, config) => {
        obsoleteSignal = config?.signal instanceof AbortSignal ? config.signal : undefined
        return new Promise((_resolve, reject) => {
          obsoleteSignal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          )
        })
      })
      .mockResolvedValue({ data: { data: options } })
    const hook = renderHook(
      ({ search }) => useWarehouseReportOptions(true, 'reports:view', 'w1', search, 'c1'),
      { wrapper: Wrapper, initialProps: { search: 'old' } }
    )
    await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(1))
    hook.rerender({ search: 'new' })
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(obsoleteSignal?.aborted).toBe(true)
    expect(hook.result.current.data?.products[0]?.sku).toBe('NEW')
    expect(axiosClient.get).toHaveBeenLastCalledWith(
      '/reports/filter-options',
      expect.objectContaining({
        params: { warehouseIds: ['w1'], search: 'new', categoryId: 'c1' },
        signal: expect.any(AbortSignal),
      })
    )
  })

  it('aborts an abandoned report page without showing a report error', async () => {
    let obsoleteSignal: AbortSignal | undefined
    vi.mocked(axiosClient.get)
      .mockImplementationOnce((_url, config) => {
        obsoleteSignal = config?.signal instanceof AbortSignal ? config.signal : undefined
        return new Promise((_resolve, reject) => {
          obsoleteSignal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          )
        })
      })
      .mockResolvedValue({ data: { data: report } })
    const hook = renderHook(
      ({ pageNumber }) =>
        useWarehouseReport('inventory-balance', { pageNumber, pageSize: 25 }, true, 'reports:view'),
      { wrapper: Wrapper, initialProps: { pageNumber: 1 } }
    )
    await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(1))
    hook.rerender({ pageNumber: 2 })
    await waitFor(() => expect(hook.result.current.data?.pageNumber).toBe(2))
    expect(obsoleteSignal?.aborted).toBe(true)
    expect(hook.result.current.isError).toBe(false)
  })

  it('does not reuse options across a changed tenant or effective permissions', async () => {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { data: options } })
    const hook = renderHook(({ permissionKey }) => useWarehouseReportOptions(true, permissionKey), {
      wrapper: Wrapper,
      initialProps: { permissionKey: 'first-permissions' },
    })
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    auth.user = { tenantId: 'tenant-2', id: 'user-2' }
    hook.rerender({ permissionKey: 'second-permissions' })
    expect(hook.result.current.data).toBeUndefined()
    await waitFor(() => expect(axiosClient.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
  })
})
