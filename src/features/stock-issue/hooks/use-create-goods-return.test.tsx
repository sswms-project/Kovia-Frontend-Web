import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { GoodsReturnRequestSummary } from '../types/stock-issue.types'
import { useCreateGoodsReturn } from './use-create-goods-return'

const ids = vi.hoisted(() => ({
  original: '10000000-0000-4000-8000-000000000001',
  other: '10000000-0000-4000-8000-000000000002',
  slot: '20000000-0000-4000-8000-000000000001',
}))
const state = vi.hoisted(() => ({ save: vi.fn(), omitOriginal: false }))
vi.mock('@/hooks/use-return-document-editing', () => ({
  useSaveReturnDocument: () => ({ mutateAsync: state.save, isPending: false }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLocationsQuery: () => ({ data: { items: [] } }),
}))
vi.mock('./use-stock-issue-requests', () => ({
  useStockIssueRequestQuery: (id: string | null) => ({
    data: id
      ? {
          id,
          warehouseId: 'warehouse',
          items: [
            {
              productName: 'Sản phẩm',
              pickDetails: [
                ...(!state.omitOriginal
                  ? [
                      {
                        id: ids.original,
                        issuedAt: '2026-10-26T01:00:00Z',
                        returnableQuantity: 0,
                        lotNumber: null,
                      },
                    ]
                  : []),
                {
                  id: ids.other,
                  issuedAt: '2026-10-26T01:00:00Z',
                  returnableQuantity: 5,
                  lotNumber: null,
                },
              ],
            },
          ],
        }
      : null,
  }),
  useCreateGoodsReturnRequestMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGoodsReturnSlotSuggestionsQuery: () => ({ data: [] }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function draft(): GoodsReturnRequestSummary {
  return {
    id: 'draft',
    goodsReturnRequestCode: 'RTN-1',
    stockIssueRequestId: 'source',
    stockIssueRequestCode: 'XK-1',
    version: 'AQ==',
    allowedActions: ['Update'],
    reason: 'Nháp đã lưu',
    status: 'Draft',
    createdBy: 'creator',
    createdAt: '2026-10-26T01:00:00Z',
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    items: [ids.original, ids.other].map((pick, index) => ({
      id: `line-${index}`,
      stockIssuePickDetailId: pick,
      productId: 'product',
      productName: 'Sản phẩm đã lưu',
      sku: 'SKU',
      quantity: index === 0 ? 3 : 2,
      condition: 'Good',
      restockSlotId: ids.slot,
      lotId: null,
      lotNumber: null,
    })),
  }
}

beforeEach(() => {
  state.save.mockReset().mockResolvedValue({})
  state.omitOriginal = false
})

it.each([false, true])(
  'retains unavailable saved lines (source missing=%s) and blocks silent removal',
  async (missing) => {
    state.omitOriginal = missing
    const { result } = renderHook(() => useCreateGoodsReturn())
    act(() => result.current.openForEdit(draft()))
    await waitFor(() => expect(result.current.dialog.form.getValues('lines')).toHaveLength(2))
    const index = result.current.dialog.form
      .getValues('lines')
      .findIndex((line) => line.stockIssuePickDetailId === ids.original)
    expect(result.current.dialog.form.getValues(`lines.${index}.quantity`)).toBe(3)
    expect(result.current.dialog.form.getValues(`lines.${index}.returnableQuantity`)).toBe(0)
    await act(() => result.current.dialog.form.handleSubmit(result.current.dialog.onSubmit)())
    expect(state.save).not.toHaveBeenCalled()
    expect(result.current.dialog.form.getFieldState(`lines.${index}.quantity`).error).toBeDefined()

    // Only an explicit user change may remove the exhausted line from the saved contents.
    act(() =>
      result.current.dialog.form.setValue(`lines.${index}.quantity`, 0, { shouldDirty: true })
    )
    await act(() => result.current.dialog.form.handleSubmit(result.current.dialog.onSubmit)())
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 'AQ==',
        content: expect.objectContaining({
          items: [expect.objectContaining({ stockIssuePickDetailId: ids.other, quantity: 2 })],
        }),
      })
    )
  }
)

it('does not open a legacy draft with an unmapped source line', () => {
  const document = draft()
  document.items[0]!.stockIssuePickDetailId = null
  const { result } = renderHook(() => useCreateGoodsReturn())
  act(() => result.current.openForEdit(document))
  expect(result.current.dialog.order).toBeNull()
  expect(state.save).not.toHaveBeenCalled()
})
