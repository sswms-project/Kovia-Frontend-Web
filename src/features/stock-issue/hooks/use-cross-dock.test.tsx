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
