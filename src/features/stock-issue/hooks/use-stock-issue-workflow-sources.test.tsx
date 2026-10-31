import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import type {
  StockIssueManualSourceDraft,
  StockIssueRequestSummary,
} from '../types/stock-issue.types'
import { useStockIssueWorkflow } from './use-stock-issue-workflow'

const staffId = '458c17bc-ec01-4516-bfa2-e22d700b35a3'
const mocks = vi.hoisted(() => ({
  release: vi.fn(),
  record: vi.fn(),
  current: null as StockIssueRequestSummary | null,
  detail: vi.fn(),
  destinations: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({
    isError: false,
    isFetching: false,
    data: {
      id: '458c17bc-ec01-4516-bfa2-e22d700b35a3',
      permissions: [P.STOCK_ISSUE_REQUESTS_PICK, P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER],
    },
  }),
}))
vi.mock('@/features/staff/hooks/use-staff', () => ({
  useStaffListQuery: () => ({
    data: {
      items: [
        {
          id: '458c17bc-ec01-4516-bfa2-e22d700b35a3',
          fullName: 'Nhân viên',
          status: 'Active',
          assignedWarehouseIds: ['warehouse'],
        },
      ],
    },
    isError: false,
    isLoading: false,
    isFetching: false,
  }),
}))
vi.mock('../services/stock-issue.service', () => ({
  stockIssueService: { getStockIssueRequest: mocks.detail },
}))
vi.mock('../services/cross-dock.service', () => ({
  crossDockService: { destinations: mocks.destinations },
}))
vi.mock('./use-stock-issue-requests', () => {
  const mutation = () => ({ isPending: false, mutateAsync: vi.fn() })
  return {
    useStockIssueRequestQuery: () => ({ data: mocks.current }),
    useReleaseStockIssueRequestMutation: () => ({ isPending: false, mutateAsync: mocks.release }),
    useRecordStockPickingMutation: () => ({ isPending: false, mutateAsync: mocks.record }),
    useAssignStockIssuePickerMutation: mutation,
    useAuthorizeStockDispatchMutation: mutation,
    useCancelStockIssueRequestMutation: mutation,
    useConfirmStockDispatchMutation: mutation,
    useRemovePickDetailMutation: mutation,
    useReportStockIssuePickIssueMutation: mutation,
  }
})
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  mocks.current = null
  mocks.release.mockResolvedValue({})
})
const order = {
  id: 'order',
  version: 'v1',
  status: 'Pending',
  warehouseId: 'warehouse',
  assignedStaffId: staffId,
  items: [],
} as unknown as StockIssueRequestSummary
const draft: StockIssueManualSourceDraft = {
  orderId: 'order',
  version: 'v1',
  allocationReason: 'Đổi kệ',
  allocations: [{ itemId: 'item', inventoryStockId: 'stock', quantity: 20 }],
}
function wrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}
it('includes the selected plan only at release, then clears it after success', async () => {
  const applied = vi.fn()
  const { result } = renderHook(() => useStockIssueWorkflow('warehouse', draft, applied), {
    wrapper,
  })
  act(() => result.current.handlers.onReleaseForPicking(order))
  act(() => result.current.release.onConfirm())
  await waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(1))
  expect(mocks.release.mock.calls[0]?.[0]).toMatchObject({
    allocations: draft.allocations,
    allocationReason: draft.allocationReason,
    expectedVersion: 'v1',
    assignedStaffId: staffId,
  })
  await waitFor(() => expect(applied).toHaveBeenCalledTimes(1))
})
it('keeps the legacy default allocation request unchanged when no manual plan is chosen', async () => {
  const { result } = renderHook(() => useStockIssueWorkflow('warehouse'), { wrapper })
  act(() => result.current.handlers.onReleaseForPicking(order))
  act(() => result.current.release.onConfirm())
  await waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(1))
  expect(mocks.release.mock.calls[0]?.[0]).not.toHaveProperty('allocations')
})
it('blocks release with a manual plan belonging to an older version', () => {
  const { result } = renderHook(
    () => useStockIssueWorkflow('warehouse', { ...draft, version: 'old' }),
    { wrapper }
  )
  act(() => result.current.handlers.onReleaseForPicking(order))
  expect(result.current.release.order).toBeNull()
  expect(mocks.release).not.toHaveBeenCalled()
})

const pickingOrder = {
  ...order,
  status: 'ReleasedForPicking',
  items: [
    {
      id: 'item',
      sku: 'SKU-A',
      productName: 'Hàng A',
      productId: 'product',
      quantity: 10,
      pickedQuantity: 0,
      conversionFactor: 1,
      enteredUnitName: 'Cái',
      barcode: 'PRODUCT',
      pickDetails: [],
      pickLocations: [
        {
          inventoryStockId: 'stock',
          slotId: 'slot',
          slotCode: 'A01',
          zoneCode: 'K01',
          rackCode: 'A',
          reservedQuantity: 10,
        },
      ],
    },
  ],
} as unknown as StockIssueRequestSummary
function preparePicking() {
  mocks.detail.mockResolvedValue({ data: pickingOrder })
  mocks.destinations.mockResolvedValue([
    {
      stockIssueRequestId: order.id,
      warehouseId: order.warehouseId,
      inventoryStockId: 'stock',
      version: 'v1',
      slotId: 'out',
      slotCode: 'OUT',
      path: 'Khu chờ xuất',
    },
  ])
}
it('locks the existing picking form when realtime refresh finds a different order version', async () => {
  preparePicking()
  const { result, rerender } = renderHook(() => useStockIssueWorkflow('warehouse'), { wrapper })
  act(() => result.current.handlers.onRecordStockPicking(pickingOrder))
  await waitFor(() => expect(result.current.picking.order?.id).toBe(order.id))
  mocks.current = { ...pickingOrder, version: 'v2' }
  rerender()
  expect(result.current.picking.needsRefresh).toBe(true)
  await act(() => result.current.picking.onSubmit(result.current.picking.form.getValues()))
  expect(mocks.record).not.toHaveBeenCalled()
})
it('still permits exact replay of an uncertain pick after realtime reports a newer version', async () => {
  preparePicking()
  mocks.record.mockRejectedValueOnce({ statusCode: 500 }).mockResolvedValueOnce({})
  const { result, rerender } = renderHook(() => useStockIssueWorkflow('warehouse'), { wrapper })
  act(() => result.current.handlers.onRecordStockPicking(pickingOrder))
  await waitFor(() => expect(result.current.picking.order?.id).toBe(order.id))
  act(() => result.current.picking.form.setValue('lines.0.pickedQuantity', 1))
  await act(() => result.current.picking.onSubmit(result.current.picking.form.getValues()))
  expect(result.current.picking.isUncertain).toBe(true)
  mocks.current = { ...pickingOrder, version: 'v2' }
  rerender()
  expect(result.current.picking.needsRefresh).toBe(false)
  await act(() => result.current.picking.onSubmit(result.current.picking.form.getValues()))
  expect(mocks.record.mock.calls[1]).toEqual(mocks.record.mock.calls[0])
})
it('regression: uncertain release must keep the original command and plan until resolved', async () => {
  mocks.release.mockRejectedValueOnce({ statusCode: 500 }).mockResolvedValueOnce({})
  const { result, rerender } = renderHook(
    ({ reason }) => useStockIssueWorkflow('warehouse', { ...draft, allocationReason: reason }),
    { wrapper, initialProps: { reason: 'original' } }
  )
  act(() => result.current.handlers.onReleaseForPicking(order))
  act(() => result.current.release.onConfirm())
  await waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(mocks.release.mock.results[0]?.value).toBeTruthy())
  act(() => result.current.release.onClose())
  rerender({ reason: 'changed after unknown result' })
  act(() => result.current.handlers.onReleaseForPicking(order))
  act(() => result.current.release.onConfirm())
  await waitFor(() => expect(mocks.release).toHaveBeenCalledTimes(2))
  expect(mocks.release.mock.calls[1]?.[0]).toEqual(mocks.release.mock.calls[0]?.[0])
})
