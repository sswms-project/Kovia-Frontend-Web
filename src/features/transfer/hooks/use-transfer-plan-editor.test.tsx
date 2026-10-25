import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTransfer, buildTransferItem } from '../utils/transfer-test-fixtures'
import type { TransferPutAwayPlanSuggestions } from '../types/transfer.types'
import { buildTransferPlanDraft } from '../utils/transfer-putaway-plan'
import { planLine, SLOT_A, SLOT_B } from '../utils/transfer-plan-test-fixtures'
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
function automaticSuggestions(itemIds: string[]): TransferPutAwayPlanSuggestions {
  return {
    items: itemIds.map((itemId) => ({
      itemId,
      remaining: 10,
      unallocatedQuantity: 0,
      suggestions: [
        {
          slotId: SLOT_B,
          slotCode: 'B01',
          rackCode: 'B',
          zoneName: 'B',
          path: 'Khu B / B01',
          suggestedQuantity: 10,
          available: 10,
          reason: 'Quy tắc kho',
          warnings: [],
        },
      ],
    })),
    isAiAssisted: false,
    notice: null,
    summary: null,
    risks: [],
  }
}

function mixedTransfer() {
  return buildTransfer({
    items: [
      buildTransferItem({ destinationSlotId: SLOT_A, destinationSlotPath: 'Khu A / A01' }),
      buildTransferItem({ id: '20000000-0000-4000-8000-000000000002' }),
      buildTransferItem({ id: '20000000-0000-4000-8000-000000000003', putAwayPlan: [planLine()] }),
      buildTransferItem({
        id: '20000000-0000-4000-8000-000000000004',
        receivedPutAwayLocations: [{ slotId: SLOT_A, path: 'Khu A / A01', receivedQuantity: 2 }],
      }),
    ],
  })
}

describe('useTransferPlanEditor', () => {
  it.each([true, false])(
    'seeds blank items beside a request destination while protecting saved plans and actual putaway (manage=%s)',
    (canManage) => {
      const transfer = mixedTransfer()
      const hook = renderHook(() => useTransferPlanEditor(transfer, new Map(), canManage))
      act(() => hook.result.current.open())
      const initial = hook.result.current.draft
      act(() =>
        hook.result.current.seedSuggestions(
          automaticSuggestions(transfer.items.map((item) => item.id))
        )
      )
      const draft = hook.result.current.draft
      expect(draft[0]).toEqual(initial[0])
      expect(draft[2]).toEqual(initial[2])
      expect(hook.result.current.isDirty).toBe(canManage)
      if (canManage) {
        expect(draft[1]!.lines).toEqual([{ slotId: SLOT_B, path: 'Khu B / B01', plannedTotal: 10 }])
        expect(draft[3]!.lines).toEqual([
          { slotId: SLOT_A, path: 'Khu A / A01', plannedTotal: 2 },
          { slotId: SLOT_B, path: 'Khu B / B01', plannedTotal: 8 },
        ])
      } else expect(draft).toEqual(initial)
      expect(mocks.save).not.toHaveBeenCalled()
    }
  )
  it('blocks a late automatic response immediately after user edits and resets that guard when reopened', () => {
    const transfer = mixedTransfer()
    const hook = renderHook(() => useTransferPlanEditor(transfer, new Map(), true))
    act(() => hook.result.current.open())
    const edited = buildTransferPlanDraft(transfer.items)
    edited[1]!.lines = [{ slotId: SLOT_A, path: 'Khu A / A01', plannedTotal: 4 }]
    act(() => {
      hook.result.current.change(edited)
      hook.result.current.seedSuggestions(
        automaticSuggestions(transfer.items.map((item) => item.id))
      )
    })
    expect(hook.result.current.draft).toEqual(edited)
    act(() => hook.result.current.close())
    act(() => hook.result.current.open())
    act(() => hook.result.current.seedSuggestions(automaticSuggestions([transfer.items[1]!.id])))
    expect(hook.result.current.draft[1]!.lines[0]!.slotId).toBe(SLOT_B)
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it('keeps the draft for review after reload rather than automatically replacing it', () => {
    const transfer = mixedTransfer()
    const hook = renderHook(() => useTransferPlanEditor(transfer, new Map(), true))
    act(() => hook.result.current.open())
    const initial = hook.result.current.draft
    act(() => hook.result.current.rebase({ ...transfer, version: 'v2' }))
    act(() => hook.result.current.seedSuggestions(automaticSuggestions([transfer.items[1]!.id])))
    expect(hook.result.current.draft).toEqual(initial)
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it.each([false, true])(
    'keeps the request destination when automatic suggestions arrive and saves explicitly (edit=%s)',
    async (edit) => {
      const transfer = buildTransfer()
      transfer.items[0]!.destinationSlotId = SLOT_A
      transfer.items[0]!.destinationSlotPath = 'Khu A / Kệ A / A01'
      const hook = renderHook(() => useTransferPlanEditor(transfer, new Map(), true))
      act(() => hook.result.current.open())
      expect(hook.result.current.isDirty).toBe(true)
      act(() =>
        hook.result.current.seedSuggestions({
          items: [
            {
              itemId: transfer.items[0]!.id,
              remaining: 10,
              unallocatedQuantity: 0,
              suggestions: [
                {
                  slotId: SLOT_B,
                  slotCode: 'B01',
                  rackCode: 'B',
                  zoneName: 'B',
                  path: 'Khu B / B01',
                  suggestedQuantity: 10,
                  available: 10,
                  reason: 'Gợi ý',
                  warnings: [],
                },
              ],
            },
          ],
          isAiAssisted: false,
          notice: null,
          summary: null,
          risks: [],
        })
      )
      expect(hook.result.current.draft[0]!.lines[0]!.slotId).toBe(SLOT_A)
      expect(mocks.save).not.toHaveBeenCalled()
      if (edit)
        act(() =>
          hook.result.current.change([
            {
              itemId: transfer.items[0]!.id,
              lines: [{ slotId: SLOT_B, path: 'Khu B / B01', plannedTotal: 10 }],
            },
          ])
        )
      mocks.save.mockResolvedValue(undefined)
      await act(async () => {
        await hook.result.current.submit()
      })
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            expectedVersion: transfer.version,
            items: [
              {
                itemId: transfer.items[0]!.id,
                lines: [{ slotId: edit ? SLOT_B : SLOT_A, plannedTotal: 10 }],
              },
            ],
          }),
        })
      )
    }
  )
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
  it('loads the saved server plan without a misleading conflict/review warning', async () => {
    const { hook, transfer } = setup()
    mocks.save.mockResolvedValue(undefined)
    await act(async () => {
      await hook.result.current.submit()
    })
    act(() => hook.result.current.rebase({ ...transfer, version: 'v2' }, 'saved'))
    expect(hook.result.current.draft).toEqual(buildTransferPlanDraft(transfer.items))
    expect(hook.result.current.errorMessage).toBeNull()
    expect(hook.result.current.isDirty).toBe(false)
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
