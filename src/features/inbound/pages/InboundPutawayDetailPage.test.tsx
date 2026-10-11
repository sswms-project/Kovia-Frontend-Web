import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PutawayForm } from '../components/PutawayDetailPage'
import type { PutAwayHeldSlot, PutawayRequest } from '../types/inbound.types'
import InboundPutawayDetailPage from './InboundPutawayDetailPage'

const fixtures = vi.hoisted(() => {
  const itemId = '10000000-0000-4000-8000-000000000001'
  const slotId = '10000000-0000-4000-8000-000000000002'
  const baseId = '10000000-0000-4000-8000-000000000003'
  const cartonId = '10000000-0000-4000-8000-000000000004'
  return {
    itemId,
    slotId,
    cartonId,
    receipt: {
      id: 'receipt',
      receiptCode: 'PN-1',
      warehouseName: 'Kho 1',
      version: 'v1',
      warehouseId: 'warehouse',
      putAwayAssignedTo: 'staff-user' as string | null,
      putAwayAssignedToName: 'Trần Văn An' as string | null,
      putAwayTaskExecutionStatus: 'InProgress',
      items: [
        {
          id: itemId,
          inboundRequestItemId: 'request-item',
          productId: 'product',
          baseUnitId: baseId,
          enteredUnitId: cartonId,
          baseUnitName: 'Lon',
          remainingPutAwayQuantity: 240,
          putAwayPlan: [] as { slotId: string; quantity: number }[],
          allowedUnits: [
            { unitId: baseId, conversionFactor: 1, quantityPrecision: 0 },
            { unitId: cartonId, conversionFactor: 24, quantityPrecision: 0 },
          ],
        },
      ],
    },
    heldSlots: [] as PutAwayHeldSlot[],
    allowedActions: [] as string[],
    currentUserId: { value: 'staff-user' as string | null },
    savePlan: vi.fn(),
    openAssign: vi.fn(),
    mutate: vi.fn(),
    upload: vi.fn(),
    refetch: vi.fn(),
    push: vi.fn(),
  }
})
let renderedForm: ComponentProps<typeof PutawayForm>
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: fixtures.push }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [] } }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLayoutQuery: () => ({ data: [], refetch: vi.fn() }),
}))
vi.mock('../utils/putaway-slot-options', () => ({
  getPutawaySlotOptions: () => [{ id: fixtures.slotId, code: 'A01' }],
}))
vi.mock('../hooks/use-putaway-form-suggestions', () => ({
  usePutawayFormSuggestions: () => ({
    suggestions: null,
    isSuggesting: false,
    onSuggest: vi.fn(),
    onApply: vi.fn(),
    onApplyBest: vi.fn(),
    onClear: vi.fn(),
  }),
}))
vi.mock('../hooks/use-putaway-plan-editor', () => ({
  usePutawayPlanEditor: () => ({ isOpen: false, open: vi.fn() }),
}))
vi.mock('../components/ReceiptDetailPage', () => ({ PutawayPlanSheet: () => null }))
vi.mock('../components/TaskAssignment', () => ({ AssignWarehouseTaskDialog: () => null }))
vi.mock('../hooks/use-assign-warehouse-task', () => ({
  useAssignWarehouseTask: () => ({ target: null, open: fixtures.openAssign, close: vi.fn() }),
}))
vi.mock('../hooks/use-warehouse-task-assignment-access', () => ({
  useWarehouseTaskAssignmentAccess: () => ({
    currentUserId: fixtures.currentUserId.value,
    canAssign: true,
  }),
}))
vi.mock('../hooks/use-inbound', () => ({
  useGoodsReceiptQuery: () => ({ data: fixtures.receipt, refetch: fixtures.refetch }),
  useInboundAllowedActionsQuery: () => ({ data: { allowedActions: fixtures.allowedActions } }),
  useUploadPutawayEvidenceMutation: () => ({ mutateAsync: fixtures.upload, isPending: false }),
  useSavePutawayPlanMutation: () => ({ mutateAsync: fixtures.savePlan, isPending: false }),
  usePutawayHeldSlotsQuery: () => ({ data: fixtures.heldSlots }),
  usePutawayMutation: () => ({ mutateAsync: fixtures.mutate, isPending: false }),
  useCancelPutawayTaskMutation: () => ({ isPending: false }),
  useReconcilePutawayCancellationMutation: () => ({ isPending: false }),
}))
vi.mock('../components/PutawayDetailPage', () => ({
  CancelPutawayDialog: () => null,
  PutawayForm: (props: ComponentProps<typeof PutawayForm>) => {
    renderedForm = props
    return <button onClick={props.onSubmit}>Submit</button>
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  fixtures.receipt.version = 'v1'
  fixtures.receipt.items[0]!.remainingPutAwayQuantity = 240
  fixtures.receipt.items[0]!.putAwayPlan = []
  fixtures.heldSlots.length = 0
  fixtures.allowedActions.length = 0
  fixtures.currentUserId.value = 'staff-user'
  fixtures.receipt.putAwayAssignedTo = 'staff-user'
  fixtures.receipt.putAwayAssignedToName = 'Trần Văn An'
  fixtures.savePlan.mockResolvedValue(undefined)
  fixtures.refetch.mockResolvedValue(undefined)
})
afterEach(cleanup)

function scanSlot() {
  act(() => renderedForm.form.setValue('lines.0.confirmedSlotCode', 'A01', { shouldDirty: true }))
}

function prepareAllocation() {
  act(() => {
    renderedForm.form.setValue('lines.0.slotId', fixtures.slotId, { shouldDirty: true })
    renderedForm.form.setValue('lines.0.enteredQuantity', 4, { shouldDirty: true })
  })
}

describe('put-away command retry safety', () => {
  it('replays the immutable command after a committed response is lost, even when refreshed stock cannot fit it', async () => {
    const user = userEvent.setup()
    const commands = new Set<string>()
    let posted = 0
    fixtures.mutate.mockImplementation(async ({ request }: { request: PutawayRequest }) => {
      if (!commands.has(request.commandId)) {
        commands.add(request.commandId)
        posted += request.lines[0]!.enteredQuantity * 24
        throw { statusCode: 500, message: 'Response lost after commit' }
      }
    })
    fixtures.refetch.mockImplementation(async () => {
      fixtures.receipt.version = 'v2'
      fixtures.receipt.items[0]!.remainingPutAwayQuantity = 0
    })
    const view = render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(renderedForm.hasUncertainSubmission).toBe(true))
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    const original = structuredClone(fixtures.mutate.mock.calls[0]![0].request)
    view.rerender(<InboundPutawayDetailPage receiptId="other-receipt" />)
    act(() => renderedForm.form.setValue('lines.0.enteredQuantity', 1))
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(fixtures.push).toHaveBeenCalledOnce())
    expect(fixtures.mutate.mock.calls[1]![0].request).toEqual(original)
    expect(fixtures.mutate.mock.calls[1]![0].receiptId).toBe('receipt')
    expect(original.expectedVersion).toBe('v1')
    expect(posted).toBe(96)
    expect(commands.size).toBe(1)
    const resolvedUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(resolvedUnload)
    expect(resolvedUnload.defaultPrevented).toBe(false)
  })

  it('guards rapid duplicate submits while the first network request is still pending', async () => {
    let complete: (() => void) | undefined
    fixtures.mutate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve
        })
    )
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    act(() => {
      renderedForm.onSubmit()
      renderedForm.onSubmit()
    })
    await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledOnce())
    await act(async () => complete?.())
    expect(fixtures.push).toHaveBeenCalledOnce()
  })

  it.each([400, 409])(
    'allows a corrected new command after a definitive initial %s rejection',
    async (statusCode) => {
      const user = userEvent.setup()
      fixtures.mutate
        .mockRejectedValueOnce({ statusCode, message: 'Rejected' })
        .mockResolvedValueOnce(undefined)
      render(<InboundPutawayDetailPage receiptId="receipt" />)
      prepareAllocation()
      await user.click(screen.getByRole('button', { name: 'Submit' }))
      await waitFor(() => expect(fixtures.refetch).toHaveBeenCalled())
      expect(renderedForm.hasUncertainSubmission).toBe(false)
      act(() => renderedForm.form.setValue('lines.0.enteredQuantity', 2))
      await user.click(screen.getByRole('button', { name: 'Submit' }))
      await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledTimes(2))
      expect(fixtures.mutate.mock.calls[1]![0].request.commandId).not.toBe(
        fixtures.mutate.mock.calls[0]![0].request.commandId
      )
      expect(fixtures.mutate.mock.calls[1]![0].request.lines[0].enteredQuantity).toBe(2)
    }
  )

  it('does not unlock an uncertain command when its retry conflicts', async () => {
    const user = userEvent.setup()
    fixtures.mutate
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValue({ statusCode: 409, message: 'Version changed' })
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    for (let attempt = 1; attempt <= 3; attempt++) {
      await user.click(screen.getByRole('button', { name: 'Submit' }))
      await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledTimes(attempt))
    }
    expect(renderedForm.hasUncertainSubmission).toBe(true)
    for (const [call] of fixtures.mutate.mock.calls)
      expect(call.request).toEqual(fixtures.mutate.mock.calls[0]![0].request)
  })
})

describe('put-away against the manager plan', () => {
  const otherSlotId = '10000000-0000-4000-8000-000000000099'

  it('sends the reason and uploaded photos when the slot differs from the plan', async () => {
    const user = userEvent.setup()
    fixtures.receipt.items[0]!.putAwayPlan = [{ slotId: otherSlotId, quantity: 240 }]
    fixtures.upload.mockResolvedValue({ data: { id: 'evidence-1', fileName: 'ke-day.png' } })
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    scanSlot()
    act(() => renderedForm.form.setValue('overrideReason', '  Kệ trong kế hoạch đã đầy '))
    await act(async () =>
      renderedForm.evidence.onAdd(new File(['x'], 'ke-day.png', { type: 'image/png' }))
    )
    await waitFor(() => expect(renderedForm.evidence.items).toHaveLength(1))
    expect(renderedForm.planDeviation.requiresReason).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledOnce())
    expect(fixtures.mutate.mock.calls[0]![0].request).toMatchObject({
      overrideReason: 'Kệ trong kế hoạch đã đầy',
      evidenceIds: ['evidence-1'],
    })
  })

  it('does not submit a deviating put-away without a reason', async () => {
    const user = userEvent.setup()
    fixtures.receipt.items[0]!.putAwayPlan = [{ slotId: otherSlotId, quantity: 240 }]
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(fixtures.mutate).not.toHaveBeenCalled()
  })

  it('does not require or send a reason when the put-away follows the plan', async () => {
    const user = userEvent.setup()
    fixtures.receipt.items[0]!.putAwayPlan = [{ slotId: fixtures.slotId, quantity: 240 }]
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    expect(renderedForm.planDeviation.requiresReason).toBe(false)
    // Vị trí do quản lý giao: chưa quét mã thì chưa ghi nhận cất hàng.
    expect(renderedForm.scan).toMatchObject({ requiredCount: 1, confirmedCount: 0 })
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(fixtures.mutate).not.toHaveBeenCalled()

    scanSlot()
    expect(renderedForm.scan).toMatchObject({ requiredCount: 1, confirmedCount: 1 })
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledOnce())
    expect(fixtures.mutate.mock.calls[0]![0].request.lines[0]).toMatchObject({
      confirmedSlotCode: 'A01',
    })
    expect(fixtures.mutate.mock.calls[0]![0].request).not.toHaveProperty('overrideReason')
    expect(fixtures.mutate.mock.calls[0]![0].request).not.toHaveProperty('evidenceIds')
  })
})

describe('put-away when the assigned slot cannot be scanned', () => {
  it('asks for a reason instead of the scan and sends it for the manager to review', async () => {
    const user = userEvent.setup()
    fixtures.receipt.items[0]!.putAwayPlan = [{ slotId: fixtures.slotId, quantity: 240 }]
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()

    act(() => renderedForm.scan!.onSkip())
    expect(renderedForm.planDeviation.requiresReason).toBe(true)
    expect(renderedForm.deviationTitle).toContain('Chưa quét mã cho 1 vị trí')
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(fixtures.mutate).not.toHaveBeenCalled()

    act(() => renderedForm.form.setValue('overrideReasonCode', 'LabelMismatch'))
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledOnce())
    expect(fixtures.mutate.mock.calls[0]![0].request).toMatchObject({
      overrideReasonCode: 'LabelMismatch',
    })
    expect(fixtures.mutate.mock.calls[0]![0].request.lines[0]).not.toHaveProperty(
      'confirmedSlotCode'
    )
  })

  it('does not ask for scans when no location was assigned', () => {
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()

    expect(renderedForm.scan).toBeUndefined()
  })
})

describe('put-away into slots kept for incoming stock', () => {
  const heldSlot = (heldQuantity: number | null): PutAwayHeldSlot => ({
    slotId: fixtures.slotId,
    slotCode: 'A01',
    productId: 'incoming-product',
    sku: 'WINE',
    productName: 'Rượu',
    heldQuantity,
    expectedDate: '2026-10-10T03:00:00+00:00',
    inboundRequestCode: 'YC-1',
  })

  it('asks for a reason when the slot is fully kept and accepts a reason group alone', async () => {
    const user = userEvent.setup()
    fixtures.heldSlots.push(heldSlot(null))
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    expect(renderedForm.planDeviation.requiresReason).toBe(true)
    expect(renderedForm.heldWarnings?.get(0)).toContain('WINE')

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(fixtures.mutate).not.toHaveBeenCalled()

    act(() => renderedForm.form.setValue('overrideReasonCode', 'Consolidation'))
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledOnce())
    expect(fixtures.mutate.mock.calls[0]![0].request).toMatchObject({
      overrideReason: '',
      overrideReasonCode: 'Consolidation',
    })
  })

  it('only warns on a partly kept slot until the server says the put-away eats into it', async () => {
    const user = userEvent.setup()
    fixtures.heldSlots.push(heldSlot(40))
    fixtures.mutate.mockRejectedValueOnce({
      statusCode: 400,
      message: 'Vị trí A01 đang chừa cho WINE dự kiến về 10/10.',
      errors: { code: ['PUTAWAY_HELD_SLOT_REASON_REQUIRED'] },
    })
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    expect(renderedForm.planDeviation.requiresReason).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(renderedForm.planDeviation.requiresReason).toBe(true))
    expect(renderedForm.deviationTitle).toContain('đang chừa cho WINE')
  })

  it('sends the slot code the staff scanned to confirm the location', async () => {
    const user = userEvent.setup()
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    act(() => renderedForm.form.setValue('lines.0.confirmedSlotCode', 'A01'))

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(fixtures.mutate).toHaveBeenCalledOnce())
    expect(fixtures.mutate.mock.calls[0]![0].request.lines[0]).toMatchObject({
      confirmedSlotCode: 'A01',
    })
  })
})

describe('a manager fixing the put-away locations for the assigned staff', () => {
  function asManager() {
    fixtures.allowedActions.push('PlanPutAway')
    fixtures.currentUserId.value = 'manager-user'
  }

  it('saves the chosen slots as the plan instead of recording a put-away', async () => {
    asManager()
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()
    expect(renderedForm.planning?.assigneeName).toBe('Trần Văn An')

    await act(async () => renderedForm.planning!.onSavePlan())

    expect(fixtures.mutate).not.toHaveBeenCalled()
    expect(fixtures.savePlan).toHaveBeenCalledWith({
      receiptId: 'receipt',
      request: {
        expectedVersion: 'v1',
        items: [
          {
            goodsReceiptItemId: fixtures.itemId,
            slots: [{ slotId: fixtures.slotId, quantity: 96 }],
          },
        ],
      },
    })
    expect(fixtures.openAssign).not.toHaveBeenCalled()
  })

  it('asks who should do the work when nobody holds the task yet', async () => {
    asManager()
    fixtures.receipt.putAwayAssignedTo = null
    fixtures.receipt.putAwayAssignedToName = null
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    prepareAllocation()

    await act(async () => renderedForm.planning!.onSavePlan())

    expect(fixtures.savePlan).toHaveBeenCalledOnce()
    expect(fixtures.openAssign).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'PutAway', id: 'receipt', currentAssigneeId: null })
    )
  })

  it('does not save an empty plan and leaves the assigned staff in put-away mode', async () => {
    asManager()
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    await act(async () => renderedForm.planning!.onSavePlan())
    expect(fixtures.savePlan).not.toHaveBeenCalled()
    cleanup()

    fixtures.currentUserId.value = 'staff-user'
    render(<InboundPutawayDetailPage receiptId="receipt" />)
    expect(renderedForm.planning).toBeUndefined()
  })

  it('still lets someone who can only assign tasks hand the work to a staff member', () => {
    fixtures.currentUserId.value = 'manager-user'
    render(<InboundPutawayDetailPage receiptId="receipt" />)

    expect(renderedForm.planning).toMatchObject({ canAssign: true, canSavePlan: false })
    act(() => renderedForm.planning!.onAssign())
    expect(fixtures.openAssign).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'PutAway', currentAssigneeName: 'Trần Văn An' })
    )
  })
})
