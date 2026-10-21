import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { inventoryService } from '../services/inventory.service'
import { useWaitForForecastRun } from './use-inventory'
import type { ForecastRun, ForecastRunStatus } from '../types/inventory.types'

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('../services/inventory.service', () => ({
  inventoryService: { getForecastRun: vi.fn() },
}))

function response(status: ForecastRunStatus, failureReason: string | null = null) {
  return { success: true, data: { id: 'run-1', status, failureReason } as ForecastRun }
}

function renderWait() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useWaitForForecastRun(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('waiting for a forecast run started in the background', () => {
  it('polls while the run is running and resolves with the finished run', async () => {
    vi.mocked(inventoryService.getForecastRun)
      .mockResolvedValueOnce(response('Running') as never)
      .mockResolvedValueOnce(response('Running') as never)
      .mockResolvedValueOnce(response('Completed') as never)
    const hook = renderWait()

    let finished: ForecastRun | undefined
    await act(async () => {
      const waiting = hook.result.current('run-1').then((run) => (finished = run))
      await vi.advanceTimersByTimeAsync(3_000)
      await waiting
    })

    expect(finished?.status).toBe('Completed')
    expect(inventoryService.getForecastRun).toHaveBeenCalledTimes(3)
  })

  it('resolves with a failed run and its reason instead of waiting forever', async () => {
    vi.mocked(inventoryService.getForecastRun).mockResolvedValue(
      response('Failed', 'Dịch vụ dự báo không phản hồi.') as never
    )
    const hook = renderWait()

    let finished: ForecastRun | undefined
    await act(async () => {
      finished = await hook.result.current('run-1')
    })

    expect(finished?.status).toBe('Failed')
    expect(finished?.failureReason).toBe('Dịch vụ dự báo không phản hồi.')
    expect(inventoryService.getForecastRun).toHaveBeenCalledTimes(1)
  })
})
