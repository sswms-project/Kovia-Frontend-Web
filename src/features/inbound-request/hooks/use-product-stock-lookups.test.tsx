import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useInboundProductAvailabilityQuery } from './use-inbound-requests'
import { useTransferSourceProductsQuery } from '@/features/transfer/hooks/use-transfers'

const api = vi.hoisted(() => ({ inbound: vi.fn(), transfer: vi.fn() }))
vi.mock('../services/inbound-request.service', () => ({
  inboundRequestService: { getProductAvailability: api.inbound },
}))
vi.mock('@/features/transfer/services/transfer.service', () => ({
  transferService: { getSourceProducts: api.transfer },
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

it('does not carry receiving-warehouse A quantities into warehouse B', async () => {
  api.inbound
    .mockResolvedValueOnce({ data: [{ productId: 'p', availableQuantity: 23 }] })
    .mockImplementationOnce(() => new Promise(() => {}))
  const view = renderHook(
    ({ warehouseId }) =>
      useInboundProductAvailabilityQuery({ warehouseId, productIds: ['p'] }, true),
    { wrapper: createWrapper(), initialProps: { warehouseId: 'A' } }
  )
  await waitFor(() => expect(view.result.current.data?.[0]?.availableQuantity).toBe(23))
  view.rerender({ warehouseId: 'B' })
  expect(view.result.current.data).toBeUndefined()
  expect(api.inbound).toHaveBeenLastCalledWith('B', ['p'])
})

it('keeps failed quantity data unknown rather than substituting zero', async () => {
  api.inbound.mockRejectedValue({ statusCode: 403, message: 'Không có quyền xem tồn' })
  const view = renderHook(
    () => useInboundProductAvailabilityQuery({ warehouseId: 'A', productIds: ['p'] }, true),
    { wrapper: createWrapper() }
  )
  await waitFor(() => expect(view.result.current.isError).toBe(true))
  expect(view.result.current.data).toBeUndefined()
  expect(api.inbound).toHaveBeenCalledTimes(1)
})

it('does not fetch stock without permission or a selected warehouse', () => {
  renderHook(
    () => useInboundProductAvailabilityQuery({ warehouseId: 'A', productIds: ['p'] }, false),
    { wrapper: createWrapper() }
  )
  renderHook(
    () => useInboundProductAvailabilityQuery({ warehouseId: '', productIds: ['p'] }, true),
    { wrapper: createWrapper() }
  )
  expect(api.inbound).not.toHaveBeenCalled()
})

it('does not carry source-warehouse A product quantities into transfer warehouse B', async () => {
  api.transfer
    .mockResolvedValueOnce({ data: [{ productId: 'p', availableQuantity: 23 }] })
    .mockImplementationOnce(() => new Promise(() => {}))
  const view = renderHook(
    ({ sourceWarehouseId }) =>
      useTransferSourceProductsQuery({
        sourceWarehouseId,
        destinationWarehouseId: 'D',
        pageSize: 20,
      }),
    { wrapper: createWrapper(), initialProps: { sourceWarehouseId: 'A' } }
  )
  await waitFor(() => expect(view.result.current.data?.[0]?.availableQuantity).toBe(23))
  view.rerender({ sourceWarehouseId: 'B' })
  expect(view.result.current.data).toBeUndefined()
})
