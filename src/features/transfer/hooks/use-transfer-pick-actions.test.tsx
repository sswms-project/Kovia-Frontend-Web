import type { ReactNode } from 'react'
import { isCancelledError, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransferPickSheet, TransferPickSheetLine } from '../types/transfer.types'
import { useTransferPickActions } from './use-transfer-pick-actions'

const mock = vi.hoisted(() => ({ pick: vi.fn(), read: vi.fn() }))
vi.mock('../services/transfer.service', () => ({ transferService: { getPickSheet: mock.read } }))
vi.mock('./use-transfer-fulfillment', () => ({
  useRecordTransferPickMutation: () => ({ mutateAsync: mock.pick, isPending: false }),
  useCompleteTransferPickingMutation: () => ({}),
  useEscalateTransferPickMutation: () => ({}),
  useReturnTransferPickMutation: () => ({}),
  useSwitchTransferPickMutation: () => ({}),
  useTransferPickAlternativesQuery: () => ({ data: [], isLoading: false }),
}))
vi.mock('../utils/scan-preferences', () => ({ useScanPreferences: () => [{ eachUnit: false }] }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function line(id: string, overrides: Partial<TransferPickSheetLine> = {}): TransferPickSheetLine {
  return {
    lineId: id,
    itemId: id,
    productId: id,
    sku: id,
    productName: id,
    productBarcode: null,
    baseUnitName: 'Cái',
    plannedQuantity: 5,
    pickedQuantity: 0,
    remainingQuantity: 5,
    pendingReturnQuantity: 0,
    status: 'Pending',
    picks: [],
    exceptions: [],
    suggestions: [
      {
        inventoryStockId: 'stock',
        slotId: 'slot',
        slotCode: 'A1',
        slotBarcode: 'A1',
        lotId: null,
        lotNumber: null,
        expiryDate: null,
        suggestedQuantity: 5,
        reservedQuantity: 5,
        rackCode: null,
        isSystemDefaultSlot: false,
      },
    ],
    ...overrides,
  }
}
const first = line('SKU-1')
function sheet(lines: TransferPickSheetLine[]): TransferPickSheet {
  return {
    transferId: 'transfer',
    shipmentId: 'shipment',
    shipmentNumber: 1,
    transferCode: 'DC-1',
    sourceWarehouseId: 'source',
    sourceWarehouseName: 'Nguồn',
    destinationWarehouseId: 'dest',
    destinationWarehouseName: 'Đích',
    shipmentStatus: 'Picking',
    version: 'AQ==',
    lines,
  }
}
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.pick.mockResolvedValue({})
  mock.read.mockResolvedValue({ data: sheet([]) })
})

describe('Continuous picking', () => {
  it('rejects fractional quantities for integer units before sending a write', async () => {
    const integerLine = { ...first, baseQuantityPrecision: 0 }
    const { result } = renderHook(
      () => useTransferPickActions('transfer', 'shipment', sheet([integerLine])),
      { wrapper }
    )
    act(() => result.current.entry.open(integerLine))
    act(() => {
      result.current.entry.scanSlot('A1')
    })
    act(() => {
      result.current.entry.scanProduct(first.sku)
    })
    act(() => result.current.entry.changeQuantity(1.25))
    await act(() => result.current.entry.confirm())
    expect(result.current.entry.quantityError).toContain('số nguyên')
    expect(mock.pick).not.toHaveBeenCalled()
  })

  it('discards a read started before the write and advances only from a post-commit snapshot', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const key = queryKeys.transfers.pickSheet('transfer', 'shipment')
    client.setQueryData(key, sheet([first]))
    const oldRead = client
      .fetchQuery({ queryKey: key, queryFn: () => new Promise<TransferPickSheet>(() => undefined) })
      .catch((error: unknown) => {
        if (!isCancelledError(error)) throw error
      })
    mock.read.mockResolvedValue({
      data: sheet([{ ...first, remainingQuantity: 3, pickedQuantity: 2 }]),
    })
    const { result, unmount } = renderHook(
      () => useTransferPickActions('transfer', 'shipment', sheet([first])),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      }
    )
    act(() => result.current.entry.open(first))
    act(() => {
      result.current.entry.scanSlot('A1')
    })
    act(() => {
      result.current.entry.scanProduct(first.sku)
    })
    act(() => result.current.entry.changeQuantity(2))
    await act(() => result.current.entry.confirm())
    await oldRead
    expect(mock.read).toHaveBeenCalledTimes(1)
    expect(result.current.entry.line?.remainingQuantity).toBe(3)
    expect(result.current.entry.needsRefresh).toBe(false)
    unmount()
    client.clear()
  })
  it('advances only after confirmed recording and a fresh sheet, skipping manager-blocked lines', async () => {
    const second = line('SKU-2', { status: 'PendingManager' })
    const third = line('SKU-3')
    mock.read.mockResolvedValue({
      data: sheet([line(first.lineId, { remainingQuantity: 0 }), second, third]),
    })
    const { result } = renderHook(
      () => useTransferPickActions('transfer', 'shipment', sheet([first, second, third])),
      { wrapper }
    )
    act(() => result.current.entry.open(first))
    act(() => {
      result.current.entry.scanSlot('A1')
    })
    act(() => {
      result.current.entry.scanProduct(first.sku)
    })
    await act(async () => {
      await Promise.all([result.current.entry.confirm(), result.current.entry.confirm()])
    })
    expect(mock.pick).toHaveBeenCalledTimes(1)
    expect(result.current.entry.line?.lineId).toBe(third.lineId)
    expect(result.current.entry.scan.step).toBe('slot')
  })
  it('retains a partially picked line using fresh remaining quantities', async () => {
    mock.read.mockResolvedValue({
      data: sheet([line(first.lineId, { remainingQuantity: 3, pickedQuantity: 2 })]),
    })
    const { result } = renderHook(
      () => useTransferPickActions('transfer', 'shipment', sheet([first])),
      { wrapper }
    )
    act(() => result.current.entry.open(first))
    act(() => {
      result.current.entry.scanSlot('A1')
    })
    act(() => {
      result.current.entry.scanProduct(first.sku)
    })
    act(() => result.current.entry.changeQuantity(2))
    await act(async () => {
      await result.current.entry.confirm()
    })
    expect(result.current.entry.line?.remainingQuantity).toBe(3)
    expect(result.current.entry.scan.step).toBe('slot')
  })
  it('does not advance or allow new scan intent on an uncertain write, and retries the exact command', async () => {
    mock.pick.mockRejectedValueOnce(new Error('Network Error'))
    const { result } = renderHook(
      () => useTransferPickActions('transfer', 'shipment', sheet([first])),
      { wrapper }
    )
    act(() => result.current.entry.open(first))
    act(() => {
      result.current.entry.scanSlot('A1')
    })
    act(() => {
      result.current.entry.scanProduct(first.sku)
    })
    await act(async () => {
      await result.current.entry.confirm()
    })
    expect(result.current.entry.uncertain).toBe(true)
    expect(mock.read).not.toHaveBeenCalled()
    act(() => {
      result.current.entry.open(line('other'))
      result.current.entry.changeQuantity(1)
      result.current.entry.rescan()
    })
    expect(result.current.entry.line?.lineId).toBe(first.lineId)
    await act(async () => {
      await result.current.entry.confirm()
    })
    expect(mock.pick.mock.calls[1]![0]).toEqual(mock.pick.mock.calls[0]![0])
  })
  it('requires a successful refresh before new picking if the post-write read fails', async () => {
    mock.read.mockRejectedValue(new Error('Network Error'))
    const { result } = renderHook(
      () => useTransferPickActions('transfer', 'shipment', sheet([first])),
      { wrapper }
    )
    act(() => result.current.entry.open(first))
    act(() => {
      result.current.entry.scanSlot('A1')
    })
    act(() => {
      result.current.entry.scanProduct(first.sku)
    })
    await act(async () => {
      await result.current.entry.confirm()
    })
    expect(result.current.entry.line).toBeNull()
    expect(result.current.entry.needsRefresh).toBe(true)
    act(() => result.current.entry.open(first))
    expect(result.current.entry.line).toBeNull()
    act(() => result.current.entry.acceptFresh())
    expect(result.current.entry.needsRefresh).toBe(false)
  })
})
