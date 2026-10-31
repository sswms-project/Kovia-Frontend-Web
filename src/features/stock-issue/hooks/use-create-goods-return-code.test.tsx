import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCreateGoodsReturn } from './use-create-goods-return'

const mocks = vi.hoisted(() => ({ create: vi.fn(), next: vi.fn() }))
vi.mock('../services/stock-issue.service', () => ({
  stockIssueService: { getNextGoodsReturnCode: mocks.next },
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLocationsQuery: () => ({ data: { items: [] } }),
}))
vi.mock('@/hooks/use-return-document-editing', () => ({
  useSaveReturnDocument: () => ({ isPending: false }),
}))
vi.mock('./use-stock-issue-requests', () => ({
  useCreateGoodsReturnRequestMutation: () => ({ mutateAsync: mocks.create, isPending: false }),
  useGoodsReturnSlotSuggestionsQuery: () => ({ data: [] }),
  useStockIssueRequestQuery: (id: string | null) => ({
    data: id
      ? {
          id,
          warehouseId: 'warehouse',
          items: [
            {
              productName: 'Test product',
              pickDetails: [
                {
                  id: 'pick',
                  issuedAt: '2026-10-31',
                  returnableQuantity: 2,
                },
              ],
            },
          ],
        }
      : null,
  }),
}))

it('hydrates the source without losing the suggestion and sends a custom customer-return code', async () => {
  mocks.next.mockResolvedValue({ data: 'KTH000001' })
  mocks.create.mockResolvedValue({ data: 'created' })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { result } = renderHook(() => useCreateGoodsReturn(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  act(() => result.current.picker.onSelect('source'))
  await waitFor(() =>
    expect(result.current.dialog.form.getValues('goodsReturnRequestCode')).toBe('KTH000001')
  )
  act(() => {
    result.current.dialog.onCodeChange()
    result.current.dialog.form.setValue('goodsReturnRequestCode', 'CUSTOM-009')
    result.current.dialog.form.setValue('lines.0.quantity', 1)
  })
  await act(async () => result.current.dialog.onSubmit(result.current.dialog.form.getValues()))
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      stockIssueRequestId: 'source',
      request: expect.objectContaining({ goodsReturnRequestCode: 'CUSTOM-009' }),
    })
  )
})
