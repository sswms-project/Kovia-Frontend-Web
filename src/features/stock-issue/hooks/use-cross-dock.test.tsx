import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { useCrossDock } from './use-cross-dock'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'

const service = vi.hoisted(() => ({
  plan: vi.fn(),
  demand: vi.fn(),
  summary: vi.fn(),
  pickers: vi.fn(),
}))
vi.mock('../services/cross-dock.service', () => ({ crossDockService: service }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({
    data: {
      id: 'user',
      tenantId: 'tenant',
      permissions: [P.STOCK_ISSUE_REQUESTS_VIEW, P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER],
    },
  }),
}))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  service.demand.mockResolvedValue(null)
  service.summary.mockResolvedValue({ products: [] })
  service.pickers.mockResolvedValue([])
})
afterEach(cleanup)

describe('cross-dock optional queries', () => {
  it.each([
    'ReleasedForPicking',
    'Picking',
    'Picked',
    'AuthorizedForDispatch',
    'Dispatched',
    'Cancelled',
  ] as const)(
    'loads historical demand once without background polling or root invalidation for %s',
    async (status) => {
      service.demand.mockResolvedValue({ completedAt: '2026-10-23T14:00:00Z' })
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const invalidate = vi.spyOn(client, 'invalidateQueries')
      const wrapper = ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      )
      const order = {
        id: 'order',
        warehouseId: 'warehouse',
        version: 'v1',
        status,
      } as StockIssueRequestSummary
      const { result, unmount } = renderHook(() => useCrossDock(order), { wrapper })
      try {
        await waitFor(() => expect(result.current.demand.isSuccess).toBe(true))
        expect(service.demand).toHaveBeenCalledOnce()
        expect(service.plan).not.toHaveBeenCalled()
        const demandQuery = client
          .getQueryCache()
          .getAll()
          .find((query) => query.queryKey[2] === 'demand')
        expect(demandQuery?.options).toMatchObject({
          refetchInterval: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        })
        expect(invalidate).not.toHaveBeenCalled()
        act(() => result.current.refresh())
        await waitFor(() => expect(service.demand).toHaveBeenCalledTimes(2))
      } finally {
        unmount()
        client.clear()
      }
    }
  )

  it('refreshes only the current detail when allocation completes while the order is still pending', async () => {
    service.plan.mockResolvedValue({ automationEnabled: false })
    service.demand.mockResolvedValue({ completedAt: '2026-10-23T14:00:00Z' })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const order = {
      id: 'order',
      warehouseId: 'warehouse',
      version: 'v1',
      status: 'Pending',
    } as StockIssueRequestSummary
    const { unmount } = renderHook(() => useCrossDock(order), { wrapper })
    try {
      await waitFor(() => expect(invalidate).toHaveBeenCalledOnce())
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['stock-issue-requests', 'detail', 'order'],
        exact: true,
      })
    } finally {
      unmount()
      client.clear()
    }
  })
  it.each([false, true])(
    'loads summary only when opened; picker query follows automation=%s',
    async (automationEnabled) => {
      service.plan.mockResolvedValue({
        automationEnabled,
        documentVersion: 'v1',
        stockIssueRequestId: 'order',
      })
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const wrapper = ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      )
      const order = {
        id: 'order',
        warehouseId: 'warehouse',
        version: 'v1',
        status: 'Pending',
      } as StockIssueRequestSummary
      const { result, unmount } = renderHook(() => useCrossDock(order), { wrapper })
      try {
        await waitFor(() => expect(result.current.plan.isSuccess).toBe(true))
        expect(service.summary).not.toHaveBeenCalled()
        if (automationEnabled) await waitFor(() => expect(service.pickers).toHaveBeenCalledOnce())
        else expect(service.pickers).not.toHaveBeenCalled()
        act(() => result.current.setSummaryOpen(true))
        await waitFor(() => expect(service.summary).toHaveBeenCalledOnce())
      } finally {
        unmount()
        client.clear()
      }
    }
  )
})
