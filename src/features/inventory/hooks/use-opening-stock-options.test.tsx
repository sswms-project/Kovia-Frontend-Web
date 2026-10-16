import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOpeningStockOptions } from './use-opening-stock-options'
import { openingStockImportService } from '../services/opening-stock-import.service'
import type {
  OpeningStockFormOptions,
  OpeningStockLookupQuery,
} from '../types/opening-stock-import.types'

vi.mock('../services/opening-stock-import.service', () => ({
  openingStockImportService: { formOptions: vi.fn() },
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
const options: OpeningStockFormOptions = {
  products: [
    {
      id: 'product',
      sku: 'SP',
      productName: 'Hàng',
      unitId: 'unit',
      unitName: 'Cái',
      isLotTracked: false,
      quantityPrecision: 0,
    },
  ],
  locations: [{ id: 'slot', label: 'Kho A / Ô 1' }],
  lots: [],
  productCount: 1,
  locationCount: 1,
  lotCount: 0,
}
const params: OpeningStockLookupQuery = {
  warehouseId: 'warehouse-a',
  productId: '',
  productSearch: '',
  locationSearch: '',
  lotSearch: '',
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return renderHook((input: OpeningStockLookupQuery) => useOpeningStockOptions(input), {
    initialProps: params,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}
describe('opening stock lookup refresh', () => {
  it('keeps current warehouse options while loading a product-specific query', async () => {
    vi.mocked(openingStockImportService.formOptions)
      .mockResolvedValueOnce(options)
      .mockImplementationOnce(() => new Promise(() => {}))
    const hook = mount()
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    hook.rerender({ ...params, productId: 'product' })
    await waitFor(() => expect(hook.result.current.isFetching).toBe(true))
    expect(hook.result.current.data).toEqual(options)
    expect(hook.result.current.isPlaceholderData).toBe(true)
  })
  it('does not show locations from the previous warehouse while another warehouse loads', async () => {
    vi.mocked(openingStockImportService.formOptions)
      .mockResolvedValueOnce(options)
      .mockImplementationOnce(() => new Promise(() => {}))
    const hook = mount()
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    hook.rerender({ ...params, warehouseId: 'warehouse-b' })
    await waitFor(() => expect(hook.result.current.isFetching).toBe(true))
    expect(hook.result.current.data).toBeUndefined()
    expect(hook.result.current.isPlaceholderData).toBe(false)
  })
})
