import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GoodsReturnRequestsPage from './GoodsReturnRequestsPage'
import type {
  GoodsReturnRequestSummary,
  GoodsReturnRestockOptions,
} from '../types/stock-issue.types'

interface MockState {
  detail: GoodsReturnRequestSummary | null
  options: GoodsReturnRestockOptions | null
  fetching: boolean
  mutate: ReturnType<typeof vi.fn>
}
const state = vi.hoisted<MockState>(() => ({
  detail: null,
  options: null,
  fetching: false,
  mutate: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/use-return-list-state', () => ({
  useReturnListState: () => ({
    page: 1,
    pageSize: 10,
    searchText: '',
    listHref: '/goods-return-requests',
    detailHref: (id: string) => `/goods-return-requests/${id}`,
  }),
}))
vi.mock('@/hooks/use-return-document-editing', () => ({
  useReturnDocumentEditing: () => ({ dialog: {}, isPending: false }),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'staff', permissions: [] }, isFetching: false }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: () => ({ data: { items: [] } }),
}))
vi.mock('../hooks/use-create-goods-return', () => ({
  useCreateGoodsReturn: () => ({ picker: {}, dialog: {}, openPicker: vi.fn() }),
}))
vi.mock('@/components/operations/ReturnDocumentActions', () => ({
  ReturnDocumentActions: () => null,
  ReturnDocumentActionDialog: () => null,
}))
vi.mock('../hooks/use-stock-issue-requests', () => ({
  useGoodsReturnRequestsQuery: () => ({
    data: { items: state.detail ? [state.detail] : [], totalCount: 1 },
  }),
  useGoodsReturnRequestQuery: (id: string | null) => ({
    data: id ? state.detail : undefined,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useApproveGoodsReturnRequestMutation: () => ({ isPending: false }),
  useRejectGoodsReturnRequestMutation: () => ({ isPending: false }),
  useRestockGoodsReturnRequestMutation: () => ({ isPending: false, mutateAsync: state.mutate }),
}))
vi.mock('../hooks/use-goods-return-restock-options', () => ({
  useGoodsReturnRestockOptionsQuery: () => ({
    data: state.options,
    isFetching: state.fetching,
    isError: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('../components/GoodsReturnRequestsPage', async () => ({
  RestockReturnDialog: (await import('../components/GoodsReturnRequestsPage/RestockReturnDialog'))
    .RestockReturnDialog,
  GoodsReturnRequestDirectory: ({
    onRestock,
  }: {
    onRestock: (item: GoodsReturnRequestSummary) => void
  }) => (
    <button
      onClick={() => {
        if (state.detail) onRestock(state.detail)
      }}
    >
      Nhập lại
    </button>
  ),
  GoodsReturnRequestDetail: () => null,
  CreateGoodsReturnRequestDialog: () => null,
  RejectGoodsReturnRequestDialog: () => null,
  SelectStockIssueForReturnDialog: () => null,
  SelfApproveGoodsReturnDialog: () => null,
}))

beforeEach(() => {
  state.mutate.mockReset().mockResolvedValue({})
  state.fetching = false
  state.detail = {
    id: '11111111-1111-4111-8111-111111111111',
    goodsReturnRequestCode: 'RTN-1',
    version: 'AQ==',
    stockIssueRequestId: 'issue-1',
    stockIssueRequestCode: 'XK-1',
    reason: 'Trả hàng',
    status: 'Approved',
    createdAt: '',
    createdBy: 'maker',
    approvedBy: 'approver',
    approvedAt: '',
    rejectionReason: null,
    items: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        stockIssuePickDetailId: 'pick',
        productId: 'product',
        productName: 'Bia',
        sku: 'SKU-1',
        quantity: 2,
        condition: 'Good',
        restockSlotId: null,
        lotId: null,
        lotNumber: null,
      },
    ],
  }
  state.options = {
    version: 'AQ==',
    items: [
      {
        returnItemId: '22222222-2222-4222-8222-222222222222',
        options: ['3', '4'].map((digit) => ({
          slotId: `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`,
          slotCode: digit,
          path: `Khu K01 / Kệ ${digit}`,
          suggestedQuantity: 2,
          availableQuantity: 10,
          isOriginalSlot: digit === '3',
          reason: 'Hợp lệ',
          warnings: [],
        })),
      },
    ],
  }
})
afterEach(cleanup)
function openPage() {
  const view = render(<GoodsReturnRequestsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Nhập lại' }))
  return view
}
it('autofills the original location, preserves a manual alternative on background refresh, and sends only actual placement', async () => {
  const view = openPage()
  const original = state.options?.items[0]?.options[0]?.slotId
  const alternative = state.options?.items[0]?.options[1]?.slotId
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Vị trí nhập Bia' })).toHaveValue(original)
  )
  fireEvent.change(screen.getByRole('combobox', { name: 'Vị trí nhập Bia' }), {
    target: { value: alternative },
  })
  if (state.detail) state.detail = { ...state.detail }
  state.fetching = true
  view.rerender(<GoodsReturnRequestsPage />)
  state.fetching = false
  if (state.options) state.options = { ...state.options }
  view.rerender(<GoodsReturnRequestsPage />)
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Vị trí nhập Bia' })).toHaveValue(alternative)
  )
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập lại kho' }))
  await waitFor(() =>
    expect(state.mutate).toHaveBeenCalledWith({
      goodsReturnRequestId: state.detail?.id,
      request: {
        expectedVersion: 'AQ==',
        items: [{ returnItemId: state.detail?.items[0]?.id, restockSlotId: alternative }],
      },
    })
  )
})
it('prefers a saved location over the original suggestion when it is still valid', async () => {
  const saved = state.options?.items[0]?.options[1]?.slotId ?? null
  if (state.detail)
    state.detail = {
      ...state.detail,
      items: state.detail.items.map((line) => ({ ...line, restockSlotId: saved })),
    }
  openPage()
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Vị trí nhập Bia' })).toHaveValue(saved)
  )
})
it('blocks confirmation when the options belong to a different document version', () => {
  if (state.options) state.options = { ...state.options, version: 'Ag==' }
  openPage()
  expect(screen.getByRole('alert')).toHaveTextContent('Phiếu đã thay đổi')
  expect(screen.getByRole('button', { name: 'Xác nhận nhập lại kho' })).toBeDisabled()
})
