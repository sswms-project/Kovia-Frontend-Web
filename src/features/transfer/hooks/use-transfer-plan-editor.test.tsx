import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTransfer } from '../utils/transfer-test-fixtures'
import { buildTransferPlanDraft } from '../utils/transfer-putaway-plan'
import { SLOT_A } from '../utils/transfer-plan-test-fixtures'
import { useTransferPlanEditor } from './use-transfer-plan-editor'

const mocks = vi.hoisted(() => ({ save: vi.fn(), success: vi.fn() }))
vi.mock('./use-transfer-putaway-plan', () => ({
  useSetTransferPutAwayPlanMutation: () => ({ mutateAsync: mocks.save, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { success: mocks.success } }))
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

function setup(canManage = true) {
  const transfer = buildTransfer()
  const hook = renderHook(() => useTransferPlanEditor(transfer, new Map(), canManage))
  act(() => hook.result.current.open())
  const draft = buildTransferPlanDraft(transfer.items)
  draft[0]!.lines = [{ slotId: SLOT_A, path: 'A01', plannedTotal: 10 }]
  act(() => hook.result.current.change(draft))
  return { hook, transfer, draft }
}
describe('useTransferPlanEditor', () => {
  it('cannot write without capability', async () => {
    const { hook } = setup(false)
    await act(async () => {
      await hook.result.current.submit()
    })
    expect(mocks.save).not.toHaveBeenCalled()
    expect(hook.result.current.isDirty).toBe(false)
  })
  it('guards double-click synchronously and never saves merely from editing', async () => {
    const { hook } = setup()
    expect(mocks.save).not.toHaveBeenCalled()
    let resolve!: () => void
    mocks.save.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done
        })
    )
    await act(async () => {
      const first = hook.result.current.submit()
      expect(await hook.result.current.submit()).toBe(false)
      resolve()
      await first
    })
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0]![0].request.expectedVersion).toBe('v1')
    expect(hook.result.current.isOpen).toBe(false)
  })
  it.each([
    { statusCode: 409, message: 'Kế hoạch đã thay đổi.' },
    new Error('Failed to fetch'),
    { statusCode: 503, message: 'Service unavailable' },
  ])('keeps draft and blocks resend after conflict/unknown result: %j', async (error) => {
    const { hook, transfer, draft } = setup()
    mocks.save.mockRejectedValue(error)
    await act(async () => {
      await hook.result.current.submit()
    })
    expect(hook.result.current.draft).toEqual(draft)
    expect(hook.result.current.isOpen).toBe(true)
    expect(hook.result.current.reloadRequired).toBe(true)
    await act(async () => {
      await hook.result.current.submit()
    })
    expect(mocks.save).toHaveBeenCalledTimes(1)
    act(() => hook.result.current.rebase({ ...transfer, version: 'v2' }))
    expect(hook.result.current.draft).toEqual(draft)
    mocks.save.mockResolvedValue(undefined)
    await act(async () => {
      await hook.result.current.submit()
    })
    expect(mocks.save.mock.calls[1]![0].request.expectedVersion).toBe('v2')
  })
})
