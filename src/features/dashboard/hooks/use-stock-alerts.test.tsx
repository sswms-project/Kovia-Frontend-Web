import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStockAlertsQuery } from './use-stock-alerts'

const { getAlerts, session } = vi.hoisted(() => ({
  getAlerts: vi.fn(),
  session: { tenantId: 'tenant-a', id: 'user-a' },
}))
vi.mock('../services/stock-alert.service', () => ({ stockAlertService: { getAlerts } }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (value: { user: typeof session }) => unknown) =>
    selector({ user: session }),
}))
beforeEach(() => {
  getAlerts.mockReset()
  session.tenantId = 'tenant-a'
  session.id = 'user-a'
})
afterEach(cleanup)

describe('stock alert query isolation', () => {
  it('does not reuse another warehouse, tenant or permission scope as placeholder data', async () => {
    getAlerts
      .mockResolvedValueOnce({ totalCount: 7 })
      .mockImplementation(() => new Promise(() => {}))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, rerender } = renderHook(
      ({ warehouseId, permissionKey }) =>
        useStockAlertsQuery(
          {
            kind: 'expired',
            warehouseId,
            pageNumber: 1,
            pageSize: 10,
          },
          true,
          permissionKey
        ),
      { wrapper, initialProps: { warehouseId: 'warehouse-a', permissionKey: 'dashboard' } }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender({ warehouseId: 'warehouse-b', permissionKey: 'dashboard' })
    expect(result.current.data).toBeUndefined()
    session.tenantId = 'tenant-b'
    rerender({ warehouseId: 'warehouse-a', permissionKey: 'changed-permissions' })
    expect(result.current.data).toBeUndefined()
    client.clear()
  })
  it('excludes the N-day window from the expired-stock cache key', async () => {
    getAlerts.mockResolvedValue({ totalCount: 7 })
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, rerender } = renderHook(
      ({ days }) =>
        useStockAlertsQuery(
          {
            kind: 'expired',
            expiringDays: days,
            pageNumber: 1,
            pageSize: 10,
          },
          true,
          'dashboard'
        ),
      { wrapper, initialProps: { days: 5 } }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender({ days: 30 })
    expect(getAlerts).toHaveBeenCalledOnce()
    client.clear()
  })
})
