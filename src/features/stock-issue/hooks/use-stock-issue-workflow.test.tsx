import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'
import { useStockIssueWorkflow } from './use-stock-issue-workflow'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

const fixture = vi.hoisted(() => ({
  release: vi.fn(),
  record: vi.fn(),
  dispatch: vi.fn(),
  fetchQuery: vi.fn(),
  getQueryData: vi.fn(),
  destinations: vi.fn(),
  push: vi.fn(),
  error: false,
  permissions: ['stock-issue-requests:assign-picker'],
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    fetchQuery: fixture.fetchQuery,
    getQueryData: fixture.getQueryData,
    getQueryState: () => ({ status: 'success' }),
  }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: fixture.push }) }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { id: 'actor', permissions: fixture.permissions } }),
}))
vi.mock('../services/cross-dock.service', () => ({
  crossDockService: { destinations: fixture.destinations },
}))
vi.mock('@/features/staff/hooks/use-staff', () => ({
  useStaffListQuery: () => ({
    data: {
      items: [
        {
          id: 'staff-a',
          fullName: 'Nhân viên A',
          email: 'a@example.invalid',
          status: 'Active',
          assignedWarehouseIds: ['wh-a'],
        },
        {
          id: 'staff-b',
          fullName: 'Nhân viên B',
          email: 'b@example.invalid',
          status: 'Active',
          assignedWarehouseIds: ['wh-b'],
        },
        {
          id: 'staff-disabled',
          fullName: 'Ngừng hoạt động',
          status: 'Inactive',
          assignedWarehouseIds: ['wh-a'],
        },
      ],
    },
    isError: fixture.error,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }))
vi.mock('./use-stock-issue-requests', () => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    useRecordStockPickingMutation: () => ({ mutateAsync: fixture.record, isPending: false }),
    useConfirmStockDispatchMutation: () => ({ mutateAsync: fixture.dispatch, isPending: false }),
    useAuthorizeStockDispatchMutation: mutation,
    useRemovePickDetailMutation: mutation,
    useCancelStockIssueRequestMutation: mutation,
    useAssignStockIssuePickerMutation: mutation,
    useReportStockIssuePickIssueMutation: mutation,
    useReleaseStockIssueRequestMutation: () => ({ mutateAsync: fixture.release, isPending: false }),
  }
})
const order: StockIssueRequestSummary = {
  id: 'order',
  stockIssueRequestCode: 'XK000001',
  warehouseId: 'wh-a',
  warehouseName: 'Kho A',
  stockRecipientId: 'recipient',
  stockRecipientName: 'Đơn vị nhận',
  recipientCode: 'REC',
  purpose: null,
  referenceCode: null,
  issueDate: null,
  note: null,
  recipientName: '',
  recipientPhone: '',
  recipientEmail: null,
  recipientAddress: '',
  status: 'Pending',
  createdAt: '',
  dispatchAuthorizedByUserId: null,
  dispatchAuthorizedAt: null,
  dispatchedAt: null,
  assignedStaffId: null,
  assignedStaffName: null,
  version: 'AQ==',
  items: [],
  attachments: [],
}
beforeEach(() => {
  vi.clearAllMocks()
  fixture.error = false
  fixture.permissions = ['stock-issue-requests:assign-picker']
  fixture.release.mockResolvedValue({})
  fixture.record.mockResolvedValue({})
  fixture.dispatch.mockResolvedValue({})
  fixture.getQueryData.mockReturnValue(undefined)
  fixture.fetchQuery.mockResolvedValue({ ...order, status: 'Picking' })
})

describe('outbound shared assignment workflow', () => {
  it('does not open or post dispatch for another assigned picker', async () => {
    fixture.permissions = ['stock-issue-requests:dispatch']
    const { result } = renderHook(() => useStockIssueWorkflow())
    act(() =>
      result.current.handlers.onConfirmDispatch({
        ...order,
        status: 'AuthorizedForDispatch',
        assignedStaffId: 'someone-else',
        assignedStaffName: 'Nhân viên A',
      })
    )
    expect(result.current.dispatch.order).toBeNull()
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('Nhân viên A'),
      expect.any(Object)
    )
    act(() => result.current.dispatch.onConfirm())
    expect(fixture.dispatch).not.toHaveBeenCalled()
  })

  it('permits the assigned permission holder and rechecks permission before posting', async () => {
    fixture.permissions = ['stock-issue-requests:dispatch']
    const { result, rerender } = renderHook(() => useStockIssueWorkflow())
    act(() =>
      result.current.handlers.onConfirmDispatch({
        ...order,
        status: 'AuthorizedForDispatch',
        assignedStaffId: 'actor',
      })
    )
    expect(result.current.dispatch.order?.id).toBe(order.id)
    fixture.permissions = []
    rerender()
    act(() => result.current.dispatch.onConfirm())
    expect(fixture.dispatch).not.toHaveBeenCalled()
    fixture.permissions = ['stock-issue-requests:dispatch']
    rerender()
    await act(async () => result.current.dispatch.onConfirm())
    await waitFor(() => expect(fixture.dispatch).toHaveBeenCalledWith(order.id))
  })
  function executableOrder(version = 'AQ==', remaining = 2): StockIssueRequestSummary {
    return {
      ...order,
      version,
      status: 'Picking',
      items: [
        {
          id: 'item',
          productId: 'product',
          productName: 'Hàng',
          sku: 'SKU',
          barcode: 'BAR',
          quantity: 20,
          pickedQuantity: 20 - remaining * 10,
          returnedQuantity: 0,
          returnableQuantity: 0,
          note: null,
          enteredQuantity: 2,
          enteredUnitId: 'unit',
          enteredUnitName: 'Hộp',
          conversionFactor: 10,
          pickDetails: [],
          pickLocations: remaining
            ? [
                {
                  inventoryStockId: 'stock',
                  slotId: 'slot',
                  slotCode: 'A',
                  zoneCode: 'Z',
                  rackCode: 'R',
                  lotId: null,
                  lotNumber: null,
                  expiryDate: null,
                  reservedQuantity: remaining * 10,
                },
              ]
            : [],
        },
      ],
    }
  }
  function pickValues(quantity = 1) {
    return {
      lines: [
        {
          stockIssueRequestItemId: 'item',
          productId: 'product',
          productName: 'Hàng',
          sku: 'SKU',
          barcode: 'BAR',
          inventoryStockId: 'stock',
          pickedQuantity: quantity,
          remainingQuantity: 2,
          availableQuantity: 2,
          unitName: 'Hộp',
          unitFactor: 10,
          scannedSlotCode: 'A',
          scannedBarcode: 'BAR',
          destinationStagingSlotId: 'staging',
        },
      ],
    }
  }
  async function openExecutable() {
    fixture.permissions = ['stock-issue-requests:pick']
    const original = executableOrder()
    fixture.fetchQuery.mockResolvedValue(original)
    fixture.destinations.mockImplementation(async () => [
      {
        stockIssueRequestId: order.id,
        warehouseId: order.warehouseId,
        inventoryStockId: 'stock',
        slotId: 'staging',
        slotCode: 'X',
        path: 'ZX / X',
        version: original.version,
      },
    ])
    const hook = renderHook(() => useStockIssueWorkflow())
    await act(async () => hook.result.current.handlers.onRecordStockPicking(original))
    await waitFor(() => expect(hook.result.current.picking.order?.version).toBe('AQ=='))
    return hook
  }
  it('saves a partial pick immediately, advances with fresh version and reopens only the remainder', async () => {
    const { result } = await openExecutable()
    const fresh = executableOrder('Ag==', 1)
    fixture.fetchQuery.mockResolvedValue(fresh)
    fixture.destinations.mockResolvedValue([
      {
        stockIssueRequestId: order.id,
        warehouseId: order.warehouseId,
        inventoryStockId: 'stock',
        slotId: 'staging',
        slotCode: 'X',
        path: 'ZX / X',
        version: 'Ag==',
      },
    ])
    await act(async () => result.current.picking.onSubmit(pickValues()))
    expect(fixture.record).toHaveBeenCalledOnce()
    expect(fixture.record.mock.calls[0]?.[0].request).toMatchObject({
      expectedVersion: 'AQ==',
      items: [
        {
          pickedQuantity: 10,
          scannedSlotCode: 'A',
          scannedBarcode: 'BAR',
          destinationStagingSlotId: 'staging',
        },
      ],
    })
    expect(result.current.picking.order?.version).toBe('Ag==')
    expect(result.current.picking.form.getValues('lines.0')).toMatchObject({
      availableQuantity: 1,
      remainingQuantity: 1,
      pickedQuantity: 0,
    })
    act(() => result.current.picking.onOpenChange(false))
    await act(async () => result.current.handlers.onRecordStockPicking(executableOrder()))
    await waitFor(() => expect(result.current.picking.order?.version).toBe('Ag=='))
    expect(result.current.picking.form.getValues('lines.0.availableQuantity')).toBe(1)
    fixture.fetchQuery.mockResolvedValue({ ...executableOrder('Aw==', 0), status: 'Picked' })
    await act(async () => result.current.picking.onSubmit(pickValues()))
    expect(result.current.picking.order).toBeNull()
    expect(fixture.record.mock.calls[1]?.[0].request.expectedVersion).toBe('Ag==')
    expect(fixture.record.mock.calls[1]?.[0].request.commandId).not.toBe(
      fixture.record.mock.calls[0]?.[0].request.commandId
    )
  })
  it('retries an uncertain result with identical intent and blocks closing', async () => {
    const { result } = await openExecutable()
    fixture.record.mockRejectedValueOnce(new Error('network timeout'))
    await act(async () => result.current.picking.onSubmit(pickValues()))
    expect(result.current.picking.isUncertain).toBe(true)
    act(() => result.current.picking.onOpenChange(false))
    expect(result.current.picking.order).not.toBeNull()
    fixture.fetchQuery.mockResolvedValue({ ...executableOrder('Ag==', 0), status: 'Picked' })
    await act(async () => result.current.picking.onSubmit(pickValues(2)))
    expect(fixture.record.mock.calls[1]?.[0]).toEqual(fixture.record.mock.calls[0]?.[0])
    expect(result.current.picking.order).toBeNull()
  })
  it('does not repeat a committed POST when detail refresh fails; refresh alone recovers', async () => {
    const { result } = await openExecutable()
    fixture.fetchQuery.mockRejectedValue(new Error('read offline'))
    await act(async () => result.current.picking.onSubmit(pickValues()))
    expect(result.current.picking.needsRefresh).toBe(true)
    expect(result.current.picking.isUncertain).toBe(false)
    await act(async () => result.current.picking.onSubmit(pickValues()))
    expect(fixture.record).toHaveBeenCalledOnce()
    fixture.fetchQuery.mockResolvedValue({ ...executableOrder('Ag==', 0), status: 'Picked' })
    act(() => result.current.picking.onRefresh())
    await waitFor(() => expect(result.current.picking.order).toBeNull())
    expect(fixture.record).toHaveBeenCalledOnce()
  })
  it.each([false, true])(
    'warns about staging without opening picking and offers configuration only with permission (%s)',
    async (canConfigure) => {
      fixture.permissions = [
        'stock-issue-requests:pick',
        ...(canConfigure ? ['warehouses:view', 'warehouses:configure-layout'] : []),
      ]
      const rejection = {
        statusCode: 409,
        message: 'Kho chưa có điểm chờ xuất.',
        errors: { code: ['STOCK_ISSUE_STAGING_MISSING'] },
      }
      // One source is enough to request preparation; no pick mutation is sent.
      const pickOrder: StockIssueRequestSummary = {
        ...order,
        items: [
          {
            id: 'line',
            productId: 'product',
            productName: 'Hàng',
            sku: 'SKU',
            quantity: 1,
            pickedQuantity: 0,
            returnedQuantity: 0,
            returnableQuantity: 0,
            note: null,
            barcode: null,
            enteredQuantity: 1,
            enteredUnitId: 'unit',
            enteredUnitName: 'Cái',
            conversionFactor: 1,
            pickDetails: [],
            pickLocations: [
              {
                inventoryStockId: 'stock',
                slotId: 'slot',
                slotCode: 'A',
                zoneCode: 'Z',
                rackCode: 'R',
                lotId: null,
                lotNumber: null,
                expiryDate: null,
                reservedQuantity: 1,
              },
            ],
          },
        ],
      }
      fixture.destinations.mockRejectedValue(rejection)
      fixture.fetchQuery.mockResolvedValue({ ...pickOrder, status: 'Picking' })
      const { result } = renderHook(() => useStockIssueWorkflow())
      await act(async () => result.current.handlers.onRecordStockPicking(pickOrder))
      await waitFor(() => expect(toast.warning).toHaveBeenCalledOnce())
      expect(result.current.picking.order).toBeNull()
      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledOnce()
      const options = vi.mocked(toast.warning).mock.calls[0]?.[1]
      if (canConfigure) {
        expect(options?.action).toEqual({ label: 'Cấu hình kho', onClick: expect.any(Function) })
        const action = options?.action
        if (action && typeof action === 'object' && 'onClick' in action)
          action.onClick({} as React.MouseEvent<HTMLButtonElement>)
        expect(fixture.push).toHaveBeenCalledWith('/warehouse-layouts/wh-a/designer')
      } else {
        expect(options?.action).toBeUndefined()
        expect(options?.description).toContain('Liên hệ quản lý kho')
      }
      expect(toast.error).not.toHaveBeenCalled()
      vi.clearAllMocks()
      fixture.destinations.mockRejectedValue({ statusCode: 409, message: 'Phiếu đã đổi.' })
      await act(async () => result.current.handlers.onRecordStockPicking(pickOrder))
      await waitFor(() => expect(toast.warning).toHaveBeenCalledOnce())
      expect(vi.mocked(toast.warning).mock.calls[0]?.[1]?.action).toBeUndefined()
      expect(logger.error).not.toHaveBeenCalled()

      vi.clearAllMocks()
      fixture.destinations.mockRejectedValue({ statusCode: 500, message: 'Lỗi máy chủ.' })
      await act(async () => result.current.handlers.onRecordStockPicking(pickOrder))
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Lỗi máy chủ.'))
      expect(logger.error).toHaveBeenCalledOnce()
      expect(toast.warning).not.toHaveBeenCalled()
    }
  )
  it.each([false, true])(
    'prepares all sources in one call and rejects mismatched source mappings (%s)',
    async (mismatch) => {
      fixture.permissions = ['stock-issue-requests:pick']
      const pickOrder: StockIssueRequestSummary = {
        ...order,
        items: [
          {
            id: 'line',
            productId: 'product',
            productName: 'Hàng',
            sku: 'SKU',
            quantity: 2,
            pickedQuantity: 0,
            returnedQuantity: 0,
            returnableQuantity: 0,
            note: null,
            barcode: null,
            enteredQuantity: 2,
            enteredUnitId: 'unit',
            enteredUnitName: 'Cái',
            conversionFactor: 1,
            pickDetails: [],
            pickLocations: ['one', 'two'].map((inventoryStockId) => ({
              inventoryStockId,
              slotId: inventoryStockId,
              slotCode: inventoryStockId,
              zoneCode: 'Z',
              rackCode: 'R',
              lotId: null,
              lotNumber: null,
              expiryDate: null,
              reservedQuantity: 1,
            })),
          },
        ],
      }
      fixture.destinations.mockResolvedValue(
        ['one', mismatch ? 'wrong' : 'two'].map((inventoryStockId) => ({
          inventoryStockId,
          stockIssueRequestId: order.id,
          warehouseId: order.warehouseId,
          version: order.version,
          slotId: 'staging',
          slotCode: 'X',
          path: 'ZX / X',
        }))
      )
      fixture.fetchQuery.mockResolvedValue({ ...pickOrder, status: 'Picking' })
      const { result } = renderHook(() => useStockIssueWorkflow())
      await act(async () => result.current.handlers.onRecordStockPicking(pickOrder))
      await waitFor(() => expect(fixture.destinations).toHaveBeenCalledOnce())
      expect(fixture.destinations).toHaveBeenCalledWith(order.id, ['one', 'two'])
      await waitFor(() =>
        expect(result.current.picking.order?.id ?? null).toBe(mismatch ? null : order.id)
      )
    }
  )
  it('filters warehouse staff and preserves the release API contract', async () => {
    const { result } = renderHook(() => useStockIssueWorkflow())
    act(() => result.current.handlers.onReleaseForPicking(order))
    expect(result.current.pickerOptions.map((option) => option.id)).toEqual(['staff-a'])
    act(() => result.current.release.form.setValue('staffId', 'staff-a'))
    await act(async () => result.current.release.onConfirm())
    await waitFor(() => expect(fixture.release).toHaveBeenCalledTimes(1))
    expect(fixture.release.mock.lastCall?.[0]).toEqual({
      stockIssueRequestId: 'order',
      expectedVersion: 'AQ==',
      assignedStaffId: 'staff-a',
      commandId: expect.any(String),
    })
    expect(result.current.release.order).toBeNull()
  })

  it.each(['', 'staff-b'])(
    'does not send an unselected or cross-warehouse worker (%s)',
    async (staffId) => {
      const { result } = renderHook(() => useStockIssueWorkflow())
      act(() => result.current.handlers.onReleaseForPicking(order))
      act(() => result.current.release.form.setValue('staffId', staffId))
      await act(async () => result.current.release.onConfirm())
      expect(fixture.release).not.toHaveBeenCalled()
    }
  )

  it('retains the dialog and chosen worker after an API rejection', async () => {
    fixture.release.mockRejectedValue(new Error('conflict'))
    const { result } = renderHook(() => useStockIssueWorkflow())
    act(() => result.current.handlers.onReleaseForPicking(order))
    act(() => result.current.release.form.setValue('staffId', 'staff-a'))
    await act(async () => result.current.release.onConfirm())
    await waitFor(() => expect(fixture.release).toHaveBeenCalled())
    expect(result.current.release.order?.id).toBe('order')
    expect(result.current.release.form.getValues('staffId')).toBe('staff-a')
  })
})
