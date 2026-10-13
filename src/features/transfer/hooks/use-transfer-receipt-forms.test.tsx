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
  it('blocks a stale receiving state and preserves counts until explicitly reloaded', async () => {
    mock.submit.mockRejectedValueOnce({
      statusCode: 409,
      message: 'Hãy bắt đầu nhận hàng trước khi nộp phiếu kiểm hàng.',
    })
    const sheet = receiptFixture()
    const { result } = renderHook(() => useTransferCountForm(sheet, true))
    await waitFor(() => expect(result.current.fields).toHaveLength(1))
    act(() => {
      result.current.form.setValue('entries.0.goodQuantity', 8)
      result.current.form.setValue('entries.0.missingQuantity', 2)
      result.current.form.setValue('entries.0.reasonCode', 'Lost')
    })
    await act(async () => {
      await result.current.confirm()
    })
    expect(result.current.reloadRequired).toBe(true)
    expect(result.current.blocked).toBe(true)
    expect(result.current.notice).toContain('tải lại')
    expect(result.current.form.getValues('entries.0.goodQuantity')).toBe(8)
    await act(async () => {
      await result.current.confirm()
    })
    expect(mock.submit).toHaveBeenCalledOnce()
    act(() => result.current.acceptFresh({ ...sheet, version: 'Ag==' }))
    expect(result.current.blocked).toBe(false)
    expect(result.current.form.getValues('entries.0.missingQuantity')).toBe(2)
  })
})
describe('Cất hàng an toàn', () => {
  it('automatically adopts a new plan only when the form is untouched', async () => {
    const sheet = putAwayFixture()
    sheet.rows.forEach((row) => (row.planBudgets = []))
    const { result } = renderHook(() => useTransferPutAwayForm(sheet, 'warehouse', true))
    await waitFor(() => expect(result.current.fields).toHaveLength(2))
    expect(result.current.form.getValues('entries.0.plannedSlotId')).toBe('')
    act(() => result.current.acceptFresh(putAwayFixture({ planVersion: 'new-plan' })))
    expect(result.current.form.getValues('entries.0.plannedSlotId')).toBe(RECEIPT_SLOT)
    expect(result.current.planUpdateAvailable).toBe(false)
    expect(mock.putAway).not.toHaveBeenCalled()
  })
  it('preserves an edited or scanned draft until applying the new plan explicitly', async () => {
    const sheet = putAwayFixture()
    const { result } = renderHook(() => useTransferPutAwayForm(sheet, 'warehouse', true))
    await waitFor(() => expect(result.current.fields).toHaveLength(3))
    act(() => {
      result.current.form.setValue('entries.0.quantity', 4, { shouldDirty: true })
      result.current.form.setValue('entries.0.scannedSlotCode', 'A-01', { shouldDirty: true })
    })
    const fresh = putAwayFixture({ planVersion: 'new-plan' })
    fresh.rows.forEach((row) => row.planBudgets.forEach((budget) => (budget.remainingBudget = 5)))
    act(() => result.current.acceptFresh(fresh))
    expect(result.current.form.getValues('entries.0.quantity')).toBe(4)
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('A-01')
    expect(result.current.planUpdateAvailable).toBe(true)
    act(() => result.current.applyPlan())
    expect(result.current.form.getValues('entries.0.quantity')).toBe(5)
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('')
    expect(result.current.planUpdateAvailable).toBe(false)
  })
  it('does not rebuild an untouched-looking form while a write result remains unknown', async () => {
    mock.putAway.mockRejectedValue(new Error('Network Error'))
    const sheet = putAwayFixture()
    const { result } = renderHook(() => useTransferPutAwayForm(sheet, 'warehouse', true))
    await waitFor(() => expect(result.current.fields).toHaveLength(3))
    act(() => {
      result.current.form.setValue('entries.0.scannedSlotCode', 'A-01')
      result.current.form.setValue('entries.1.quantity', 0)
      result.current.form.setValue('entries.2.quantity', 0)
    })
    await act(async () => {
      await result.current.confirm()
    })
    act(() => result.current.acceptFresh(putAwayFixture({ planVersion: 'new-plan' })))
    expect(result.current.unknownResult).toBe(true)
    expect(result.current.blocked).toBe(true)
    act(() => result.current.applyPlan())
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('A-01')
    await act(async () => {
      await result.current.retryUnknown()
    })
    expect(mock.putAway.mock.calls[1]![0]).toEqual(mock.putAway.mock.calls[0]![0])
  })
  it('does not require a reload for a capacity-conversion business 409', async () => {
    mock.putAway.mockRejectedValueOnce({
      statusCode: 409,
      message:
        'Sản phẩm SKU00001 chưa có quy đổi đang hoạt động sang đơn vị sức chứa của vị trí A1-03.',
    })
    const { result } = await ready()
    await act(async () => {
      await result.current.confirm()
    })
    expect(result.current.reloadRequired).toBe(false)
    expect(result.current.blocked).toBe(false)
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('A-01')
    await act(async () => {
      await result.current.scanSlot(0, 'A03')
    })
    expect(mock.findSlot).toHaveBeenCalledOnce()
  })
  async function ready() {
    const sheet = putAwayFixture()
    const hook = renderHook(() => useTransferPutAwayForm(sheet, 'warehouse', true))
    await waitFor(() => expect(hook.result.current.fields).toHaveLength(3))
    act(() => {
      hook.result.current.form.setValue('entries.0.scannedSlotCode', 'A-01', { shouldDirty: true })
      hook.result.current.form.setValue('entries.1.quantity', 0, { shouldDirty: true })
      hook.result.current.form.setValue('entries.2.quantity', 0, { shouldDirty: true })
    })
    return { ...hook, sheet }
  }
  it('blocks a stale awaiting-put-away state while keeping quantities and scans', async () => {
    mock.putAway.mockRejectedValueOnce({
      statusCode: 409,
      message: 'Đợt xuất chưa có phiếu kiểm hàng đang chờ cất.',
    })
    const { result, sheet } = await ready()
    await act(async () => {
      await result.current.confirm()
    })
    expect(result.current.reloadRequired).toBe(true)
    expect(result.current.blocked).toBe(true)
    expect(result.current.notice).toContain('tải lại')
    expect(result.current.form.getValues('entries.0.quantity')).toBe(6)
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('A-01')
    await act(async () => {
      await result.current.confirm()
    })
    expect(mock.putAway).toHaveBeenCalledOnce()
    act(() =>
      result.current.acceptFresh({ ...sheet, receipt: { ...sheet.receipt, version: 'Ag==' } })
    )
    expect(result.current.blocked).toBe(false)
    expect(result.current.form.getValues('entries.0.scannedSlotCode')).toBe('A-01')
  })
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
