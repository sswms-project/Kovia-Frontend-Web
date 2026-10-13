import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransferCountForm } from './use-transfer-count-form'
import { useTransferPutAwayForm } from './use-transfer-putaway-form'
import {
  putAwayFixture,
  receiptFixture,
  RECEIPT_SLOT,
} from '../utils/transfer-receipt-test-fixtures'

const mock = vi.hoisted(() => ({ submit: vi.fn(), putAway: vi.fn(), findSlot: vi.fn() }))
vi.mock('./use-transfer-receipt', () => ({
  useSubmitTransferReceiptMutation: () => ({ mutateAsync: mock.submit, isPending: false }),
  usePutAwayTransferShipmentMutation: () => ({ mutateAsync: mock.putAway, isPending: false }),
}))
vi.mock('./use-transfer-fulfillment', () => ({
  useFindReceivableSlotMutation: () => ({ mutateAsync: mock.findSlot, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  mock.submit.mockResolvedValue({})
  mock.putAway.mockResolvedValue({})
  mock.findSlot.mockResolvedValue({ id: RECEIPT_SLOT, path: 'A-01' })
})
describe('Nộp phiếu kiểm hàng an toàn', () => {
  it('does not submit automatically when opened', async () => {
    const { result } = renderHook(() => useTransferCountForm(receiptFixture(), true))
    await waitFor(() => expect(result.current.fields).toHaveLength(1))
    expect(mock.submit).not.toHaveBeenCalled()
  })
  it('blocks double confirmation even before the pending render', async () => {
    const sheet = receiptFixture()
    const { result } = renderHook(() => useTransferCountForm(sheet, true))
    await waitFor(() => expect(result.current.fields).toHaveLength(1))
    await act(async () => {
      await Promise.all([result.current.confirm(), result.current.confirm()])
    })
    expect(mock.submit).toHaveBeenCalledTimes(1)
    expect(mock.submit.mock.calls[0]![0]!.request.entries[0]!).not.toHaveProperty(
      'destinationSlotId'
    )
  })
  it('freezes payload and command ID for an explicitly requested network replay', async () => {
    mock.submit.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({})
    const sheet = receiptFixture()
    const { result } = renderHook(() => useTransferCountForm(sheet, true))
    await waitFor(() => expect(result.current.fields).toHaveLength(1))
    await act(async () => {
      await result.current.confirm()
    })
    expect(result.current.unknownResult).toBe(true)
    await act(async () => {
      result.current.form.setValue('entries.0.goodQuantity', 1)
      await result.current.confirm()
    })
    expect(mock.submit).toHaveBeenCalledTimes(1)
    await act(async () => {
      await result.current.retryUnknown()
    })
    expect(mock.submit.mock.calls[1]![0]!).toEqual(mock.submit.mock.calls[0]![0]!)
  })
  it('keeps counts after a 409 then updates the version only when explicitly reloaded', async () => {
    mock.submit.mockRejectedValueOnce({ statusCode: 409, message: 'Phiếu đã thay đổi.' })
    const sheet = receiptFixture()
    const { result } = renderHook(() => useTransferCountForm(sheet, true))
    await waitFor(() => expect(result.current.fields).toHaveLength(1))
    await act(async () => {
      result.current.form.setValue('entries.0.goodQuantity', 7)
      result.current.form.setValue('entries.0.damagedQuantity', 3)
      result.current.form.setValue('entries.0.reasonCode', 'Hàng hỏng')
      await result.current.confirm()
    })
    expect(result.current.reloadRequired).toBe(true)
    act(() => result.current.acceptFresh({ ...sheet, version: 'Ag==' }))
    expect(result.current.form.getValues('entries.0.goodQuantity')).toBe(7)
    await act(async () => {
      await result.current.confirm()
    })
    expect(mock.submit.mock.calls[1]![0]!.request.expectedVersion).toBe('Ag==')
  })
  it('does not allow writes without permission', async () => {
    const sheet = receiptFixture()
    const { result } = renderHook(() => useTransferCountForm(sheet, false))
    await waitFor(() => expect(result.current.fields).toHaveLength(1))
    await act(async () => {
      await result.current.confirm()
    })
    expect(mock.submit).not.toHaveBeenCalled()
  })
})
describe('Cất hàng an toàn', () => {
  async function ready() {
    const sheet = putAwayFixture()
    const hook = renderHook(() => useTransferPutAwayForm(sheet, 'warehouse', true))
    await waitFor(() => expect(hook.result.current.fields).toHaveLength(3))
    act(() => {
      hook.result.current.form.setValue('entries.0.scannedSlotCode', 'A-01')
      hook.result.current.form.setValue('entries.1.quantity', 0)
      hook.result.current.form.setValue('entries.2.quantity', 0)
    })
    return { ...hook, sheet }
  }
  it('blocks duplicate confirmation and submits only positive entries', async () => {
    const { result } = await ready()
    await act(async () => {
      await Promise.all([result.current.confirm(), result.current.confirm()])
    })
    expect(mock.putAway).toHaveBeenCalledTimes(1)
    expect(mock.putAway.mock.calls[0]![0]!.request.entries).toHaveLength(1)
  })
  it('replays the exact frozen command after an unknown result', async () => {
    mock.putAway.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({})
    const { result, sheet } = await ready()
    await act(async () => {
      await result.current.confirm()
    })
    act(() => result.current.acceptFresh({ ...sheet, planVersion: 'changed' }))
    expect(result.current.blocked).toBe(true)
    await act(async () => {
      await result.current.retryUnknown()
    })
    expect(mock.putAway.mock.calls[1]![0]!).toEqual(mock.putAway.mock.calls[0]![0]!)
  })
  it('keeps input on a plan conflict and marks changed rows', async () => {
    mock.putAway.mockRejectedValueOnce({ statusCode: 409, message: 'Kế hoạch đã thay đổi.' })
    const { result, sheet } = await ready()
    await act(async () => {
      await result.current.confirm()
    })
    act(() =>
      result.current.acceptFresh({
        ...sheet,
        planVersion: 'changed',
        rows: sheet.rows.map((row) => ({
          ...row,
          planBudgets: row.planBudgets.map((budget) => ({ ...budget, remainingBudget: 3 })),
        })),
      })
    )
    expect(result.current.form.getValues('entries.0.quantity')).toBe(6)
    expect(result.current.changedLines.size).toBe(1)
    await act(async () => {
      await result.current.confirm()
    })
    expect(mock.putAway).toHaveBeenCalledTimes(1) // Now exceeds the changed budget without a reason.
  })
  it('resets only after a successful partial write to the fresh remaining quantities', async () => {
    const { result, sheet } = await ready()
    await act(async () => {
      await result.current.confirm()
    })
    act(() =>
      result.current.acceptFresh({
        ...sheet,
        receipt: { ...sheet.receipt, version: 'Ag==' },
        rows: sheet.rows.map((row) =>
          row.qualityStatus === 'Good'
            ? { ...row, putAwayQuantity: 6, remainingQuantity: 2, planBudgets: [] }
            : row
        ),
      })
    )
    expect(result.current.form.getValues('entries').map((row) => row.quantity)).toEqual([2, 2])
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('')
  })
  it('clears an old scan when lookup fails and does not send a stale confirmation', async () => {
    mock.findSlot.mockResolvedValue(null)
    const { result } = await ready()
    await act(async () => {
      await result.current.scanSlot(0, 'Mã sai')
    })
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('')
    await act(async () => {
      await result.current.confirm()
    })
    expect(mock.putAway).not.toHaveBeenCalled()
  })
})
