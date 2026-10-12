import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildInitialReceiptEntries } from '../utils/transfer-receive'
import { plannedReceiveSheet, SLOT_A } from '../utils/transfer-plan-test-fixtures'
import { useTransferReceiveForm } from './use-transfer-receive-form'

const mocks = vi.hoisted(() => ({ receive: vi.fn(), find: vi.fn(), success: vi.fn() }))
vi.mock('./use-transfer-fulfillment', () => ({
  useReceiveTransferShipmentMutation: () => ({ mutateAsync: mocks.receive, isPending: false }),
  useFindReceivableSlotMutation: () => ({ mutateAsync: mocks.find, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: mocks.success } }))
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)
function setup() {
  const sheet = plannedReceiveSheet()
  const hook = renderHook(
    ({ current }) => useTransferReceiveForm(sheet.transferId, sheet.shipmentId, current),
    { initialProps: { current: sheet } }
  )
  act(() =>
    hook.result.current.form.setValue('entries', [
      {
        ...buildInitialReceiptEntries(sheet)[0]!,
        goodQuantity: 6,
        scannedSlotCode: 'A01',
        deviationReasonCode: 'SlotFull',
        note: 'Giữ ghi chú',
      },
    ])
  )
  return { hook, sheet }
}
describe('useTransferReceiveForm', () => {
  it('posts the snapshotted plan token once even with double-click', async () => {
    const { hook } = setup()
    let resolve!: () => void
    mocks.receive.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    await act(async () => {
      const first = hook.result.current.confirm()
      const second = hook.result.current.confirm()
      await vi.waitFor(() => expect(mocks.receive).toHaveBeenCalledTimes(1))
      resolve()
      await Promise.all([first, second])
    })
    expect(mocks.receive.mock.calls[0]![0].request).toMatchObject({
      expectedVersion: 'v1',
      planVersion: 'hash1',
    })
  })
  it('does not silently upgrade the token or reset quantities when the server changes the plan', () => {
    const { hook, sheet } = setup()
    const fresh = structuredClone(sheet)
    fresh.planVersion = 'hash2'
    fresh.lines[0]!.lots[0]!.plan![0]!.plannedQuantity = 3
    hook.rerender({ current: fresh })
    expect(hook.result.current.reloadRequired).toBe(true)
    expect(hook.result.current.form.getValues('entries.0.goodQuantity')).toBe(6)
    act(() => hook.result.current.acceptFresh(fresh))
    expect(hook.result.current.reloadRequired).toBe(false)
    expect(hook.result.current.changedLines.has(sheet.lines[0]!.lineId)).toBe(true)
    expect(hook.result.current.form.getValues('entries.0.note')).toBe('Giữ ghi chú')
  })
  it('closes an open confirmation as soon as the plan changes, instead of leaving a dead dialog', () => {
    const { hook, sheet } = setup()
    act(() => hook.result.current.setIsConfirmOpen(true))
    expect(hook.result.current.isConfirmOpen).toBe(true)
    const fresh = structuredClone(sheet)
    fresh.planVersion = 'hash2'
    hook.rerender({ current: fresh })
    expect(hook.result.current.reloadRequired).toBe(true)
    expect(hook.result.current.isConfirmOpen).toBe(false)
  })
  it('retains draft and blocks retries when receipt result is unknown', async () => {
    const { hook } = setup()
    mocks.receive.mockRejectedValue(new Error('Failed to fetch'))
    await act(async () => {
      await hook.result.current.confirm()
    })
    expect(hook.result.current.reloadRequired).toBe(true)
    expect(hook.result.current.form.getValues('entries.0.goodQuantity')).toBe(6)
    await act(async () => {
      await hook.result.current.confirm()
    })
    expect(mocks.receive).toHaveBeenCalledTimes(1)
  })
  it('confirms the planned allocation matching the scanned slot and blocks overlapping scans', async () => {
    const sheet = plannedReceiveSheet()
    const hook = renderHook(() => useTransferReceiveForm(sheet.transferId, sheet.shipmentId, sheet))
    let resolve!: (value: { id: string; code: string; path: string }) => void
    mocks.find.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    await act(async () => {
      const first = hook.result.current.scanSlot(1, 'A01')
      expect(await hook.result.current.scanSlot(1, 'A01')).toBe(false)
      resolve({ id: SLOT_A, code: 'A01', path: 'A01' })
      expect(await first).toBe(true)
    })
    expect(mocks.find).toHaveBeenCalledTimes(1)
    expect(hook.result.current.form.getValues('entries.0.scannedSlotCode')).toBe('A01')
    expect(hook.result.current.form.getValues('entries.1.scannedSlotCode')).toBe('')
  })

  it('lets a worker pick the slot from a list when the label is unreadable, and a later scan restores the normal path', async () => {
    const { hook } = setup()
    act(() =>
      hook.result.current.markSlotUnreadable(0, { value: SLOT_A, label: 'Khu K01 / Kệ A07' })
    )
    expect(hook.result.current.form.getValues('entries.0')).toMatchObject({
      slotCodeUnreadable: true,
      destinationSlotId: SLOT_A,
      scannedSlotCode: '',
      deviationReasonCode: '',
    })
    expect(hook.result.current.slotPathById[SLOT_A]).toBe('Khu K01 / Kệ A07')
    act(() => hook.result.current.form.setValue('entries.0.deviationReasonCode', 'LabelMismatch'))
    mocks.receive.mockResolvedValue({})
    await act(async () => {
      await hook.result.current.confirm()
    })
    expect(mocks.receive.mock.calls[0]![0].request.entries[0]).toMatchObject({
      slotCodeUnreadable: true,
      scannedSlotCode: null,
      deviationReasonCode: 'LabelMismatch',
    })
    mocks.find.mockResolvedValue({ id: SLOT_A, path: 'Khu K01 / Kệ A07' })
    await act(async () => {
      await hook.result.current.scanSlot(0, 'A01')
    })
    expect(hook.result.current.form.getValues('entries.0')).toMatchObject({
      slotCodeUnreadable: false,
      scannedSlotCode: 'A01',
    })
  })
})
