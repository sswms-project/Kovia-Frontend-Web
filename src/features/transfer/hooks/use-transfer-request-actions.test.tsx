import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTransfer } from '../utils/transfer-test-fixtures'
import { useTransferRequestActions } from './use-transfer-request-actions'

const mock = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('./use-transfer-action-runner', () => ({
  useTransferActionRunner: () => async (run: () => Promise<unknown>) => {
    try {
      await run()
      return true
    } catch {
      return false
    }
  },
}))
vi.mock('./use-transfer-fulfillment', () => ({
  useCreateTransferShipmentMutation: () => ({ mutateAsync: mock.create, isPending: false }),
  useCancelTransferShipmentMutation: () => ({ isPending: false }),
}))
vi.mock('./use-transfers', () => ({
  useAddTransferFeedbackMutation: () => ({}),
  useCancelTransferMutation: () => ({}),
  useReplyTransferFeedbackMutation: () => ({}),
  useStopTransferRemainingMutation: () => ({}),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mock.create.mockResolvedValue({ data: 'shipment' })
})

describe('Preparing a shipment', () => {
  it('closes stale preparation instead of repeatedly sending its old version', async () => {
    mock.create.mockRejectedValueOnce({
      statusCode: 409,
      message: 'Phiếu điều chuyển đã thay đổi. Vui lòng tải lại.',
      isSuccess: false,
    })
    const data = buildTransfer({ version: 'AQ==' })
    const { result, rerender } = renderHook(({ transfer }) => useTransferRequestActions(transfer), {
      initialProps: { transfer: data },
    })
    act(() => result.current.shipment.open())
    await act(() => result.current.shipment.submit(result.current.shipment.form.getValues()))
    expect(result.current.shipment.isOpen).toBe(false)
    rerender({ transfer: { ...data, version: 'Ag==' } })
    act(() => result.current.shipment.open())
    await act(() => result.current.shipment.submit(result.current.shipment.form.getValues()))
    expect(mock.create.mock.calls[1]![0].request.expectedVersion).toBe('Ag==')
  })

  it('never replays an uncertain preparation against another document', async () => {
    mock.create.mockRejectedValueOnce(new Error('Network Error'))
    const data = buildTransfer()
    const { result, rerender } = renderHook(({ transfer }) => useTransferRequestActions(transfer), {
      initialProps: { transfer: data },
    })
    act(() => result.current.shipment.open())
    await act(() => result.current.shipment.submit(result.current.shipment.form.getValues()))
    rerender({ transfer: { ...data, id: 'another-transfer' } })
    await act(() => result.current.shipment.submit(result.current.shipment.form.getValues()))
    expect(mock.create).toHaveBeenCalledTimes(1)
  })

  it('includes explicit acceptance in the single preparation command for a pending request', async () => {
    const { result } = renderHook(() =>
      useTransferRequestActions(
        buildTransfer({ status: 'PendingSourceAcceptance', version: 'AQ==' })
      )
    )
    act(() => result.current.shipment.open())
    await act(() => result.current.shipment.submit(result.current.shipment.form.getValues()))
    expect(mock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ acceptRequest: true, expectedVersion: 'AQ==' }),
      })
    )
  })
  it('defaults to all remaining quantities and submits assignment with the same command', async () => {
    const transfer = buildTransfer({ version: 'AQ==' })
    const { result } = renderHook(() => useTransferRequestActions(transfer))
    act(() => result.current.shipment.open())
    const values = result.current.shipment.form.getValues()
    expect(values.lines[0]).toMatchObject({ selected: true, quantity: 10, maximum: 10 })
    await act(async () => {
      await result.current.shipment.submit({ ...values, staffId: transfer.createdBy })
    })
    expect(mock.create).toHaveBeenCalledWith({
      transferId: transfer.id,
      request: {
        commandId: expect.any(String),
        expectedVersion: 'AQ==',
        staffId: transfer.createdBy,
        lines: [{ itemId: transfer.items[0]!.id, quantity: 10 }],
      },
    })
    expect(result.current.shipment.isOpen).toBe(false)
  })

  it('freezes uncertain payload across closing, reopening and retries', async () => {
    mock.create.mockRejectedValueOnce(new Error('Network Error'))
    const { result } = renderHook(() => useTransferRequestActions(buildTransfer()))
    act(() => result.current.shipment.open())
    const values = result.current.shipment.form.getValues()
    await act(async () => {
      await result.current.shipment.submit(values)
    })
    expect(result.current.shipment.uncertain).toBe(true)
    act(() => {
      result.current.shipment.onOpenChange(false)
      result.current.shipment.open()
    })
    await act(async () => {
      await result.current.shipment.submit({ ...values, staffId: 'changed', lines: [] })
    })
    expect(mock.create.mock.calls[1]![0]).toEqual(mock.create.mock.calls[0]![0])
    expect(result.current.shipment.uncertain).toBe(false)
  })

  it('prevents duplicate confirmation before the pending render', async () => {
    const { result } = renderHook(() => useTransferRequestActions(buildTransfer()))
    act(() => result.current.shipment.open())
    const values = result.current.shipment.form.getValues()
    await act(async () => {
      await Promise.all([
        result.current.shipment.submit(values),
        result.current.shipment.submit(values),
      ])
    })
    expect(mock.create).toHaveBeenCalledTimes(1)
  })
  it('keeps the version seen when opening the form instead of borrowing a later realtime version', async () => {
    const transfer = buildTransfer({ version: 'AQ==' })
    const { result, rerender } = renderHook(({ data }) => useTransferRequestActions(data), {
      initialProps: { data: transfer },
    })
    act(() => result.current.shipment.open())
    rerender({ data: { ...transfer, version: 'Ag==' } })
    await act(async () => {
      await result.current.shipment.submit(result.current.shipment.form.getValues())
    })
    expect(mock.create.mock.calls[0]![0].request.expectedVersion).toBe('AQ==')
  })
})
