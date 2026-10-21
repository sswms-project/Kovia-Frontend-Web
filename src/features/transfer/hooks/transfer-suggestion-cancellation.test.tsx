import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePutAwayTransferShipmentMutation } from './use-transfer-receipt'
import {
  useSetTransferPutAwayPlanMutation,
  useTransferPutAwayRulesQuery,
} from './use-transfer-putaway-plan'

const mock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), put: vi.fn() }))
vi.mock('../services/transfer.service', () => ({
  transferService: {
    getPutAwayPlanSuggestions: mock.get,
    setPutAwayPlan: mock.set,
    putAwayShipment: mock.put,
  },
}))
beforeEach(() => vi.clearAllMocks())

describe('stale suggestion requests', () => {
  it.each(['plan', 'putaway'])(
    'aborts in-flight rules before sending the %s write',
    async (kind) => {
      let signal: AbortSignal | undefined
      mock.get.mockImplementation(
        (_transfer: string, _shipment: string, _ai: boolean, abort: AbortSignal) => {
          signal = abort
          return new Promise((_resolve, reject) =>
            abort.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          )
        }
      )
      const write = async () => {
        expect(signal?.aborted).toBe(true)
        return { data: null }
      }
      mock.set.mockImplementation(write)
      mock.put.mockImplementation(write)
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      )
      const hook = renderHook(
        () => ({
          rules: useTransferPutAwayRulesQuery('t1', 's1', 'v1', true),
          plan: useSetTransferPutAwayPlanMutation(),
          putaway: usePutAwayTransferShipmentMutation(),
        }),
        { wrapper }
      )
      try {
        await waitFor(() => expect(mock.get).toHaveBeenCalledTimes(1))
        await act(async () => {
          if (kind === 'plan')
            await hook.result.current.plan.mutateAsync({
              transferId: 't1',
              request: { expectedVersion: 'v1', items: [] },
            })
          else
            await hook.result.current.putaway.mutateAsync({
              transferId: 't1',
              shipmentId: 's1',
              request: { expectedVersion: 'v1', commandId: 'c1', planVersion: 'p1', entries: [] },
            })
        })
        expect(signal?.aborted).toBe(true)
        expect(hook.result.current.rules.isError).toBe(false)
        expect(mock.get).toHaveBeenCalledTimes(1)
        expect(kind === 'plan' ? mock.set : mock.put).toHaveBeenCalledTimes(1)
      } finally {
        hook.unmount()
        client.clear()
      }
    }
  )
})
