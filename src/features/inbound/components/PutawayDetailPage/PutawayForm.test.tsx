import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PutawayFormValues } from '../../schemas/inbound.schema'
import type { GoodsReceiptDetail, GoodsReceiptItem } from '../../types/inbound.types'
import { PutawayForm, type SlotOption } from './PutawayForm'

const baseUnitId = '10000000-0000-4000-8000-000000000003'
const cartonUnitId = '10000000-0000-4000-8000-000000000004'
const itemId = '10000000-0000-4000-8000-000000000002'
const slotId = '10000000-0000-4000-8000-000000000001'
const otherSlotId = '10000000-0000-4000-8000-000000000009'
const receipt: GoodsReceiptDetail = {
  id: 'receipt',
  receiptCode: 'GR-QA',
  inboundRequestId: 'request',
  inboundRequestCode: 'IR-QA',
  warehouseId: 'warehouse',
  warehouseName: 'Kho QA',
  warehouseCode: 'QA',
  status: 'Approved',
  createdBy: 'staff',
  createdByName: 'QA',
  createdAt: '',
  approvedBy: null,
  approvedByName: null,
  modifiedAt: null,
  submittedAt: null,
  approvedAt: null,
  rejectionReason: null,
  arrivalConfirmedBy: null,
  arrivalConfirmedAt: null,
  receivingAssignedTo: null,
  receivingAssignedToName: null,
  putAwayAssignedTo: 'staff',
  putAwayAssignedToName: 'QA',
  putAwayAssignedAt: null,
  putAwayTaskPriority: 'Normal',
  putAwayTaskDueAt: null,
  putAwayTaskExecutionStatus: 'Queued',
  putAwayTaskCancelledAt: null,
  putAwayTaskCancellationReason: null,
  putAwayTaskRequiresReconciliation: false,
  putAwayTaskReconciledAt: null,
  putAwayTaskReconciliationNote: null,
  putAwayPlanUpdatedAt: null,
  version: 'AQ==',
  history: [],
  items: [
    {
      id: itemId,
      inboundRequestItemId: 'request-item',
      productId: 'product',
      productSKU: 'BEER',
      productName: 'Bia',
      baseUnitId,
      baseUnitName: 'Lon',
      enteredUnitId: cartonUnitId,
      conversionFactorSnapshot: 24,
      allowedUnits: [
        {
          unitId: baseUnitId,
          unitName: 'Lon',
          unitCode: 'LON',
          quantityPrecision: 0,
          conversionFactor: 1,
        },
        {
          unitId: cartonUnitId,
          unitName: 'Thùng',
          unitCode: 'THUNG',
          quantityPrecision: 0,
          conversionFactor: 24,
        },
      ],
      lotId: null,
      lotNumber: null,
      manufacturedDate: null,
      expiryDate: null,
      orderedQuantity: 240,
      receivedQuantity: 240,
      damagedQuantity: 0,
      usableQuantity: 240,
      putAwayQuantity: 0,
      remainingPutAwayQuantity: 240,
      exceptionReason: null,
      putAwayDetails: [],
      putAwayPlan: [],
    },
  ],
}
const slots: SlotOption[] = [
  {
    id: slotId,
    code: 'A01',
    name: 'A01',
    zoneId: 'zone',
    zoneLabel: 'Khu A',
    hierarchy: 'Khu A / A01',
    capacityLabel: '8 / 20 Thùng',
    allowsMixedProducts: true,
  },
]

const plan = [
  {
    id: 'plan-1',
    slotId,
    slotCode: 'A-01',
    rackCode: 'KE-01',
    isSystemDefaultSlot: false,
    quantity: 96,
  },
]

afterEach(cleanup)

function TestForm({
  pending = false,
  uncertain = false,
  remaining = 240,
  unitsAvailable = true,
  plan = [],
  offPlan = false,
  canPlan = false,
  withSuggestion = false,
  suggestedSlotId = otherSlotId,
  requireScan = false,
  planning = false,
  onSuggest = vi.fn(),
  onApplySuggestion = vi.fn(),
  onPlan = vi.fn(),
  onApplyPlan = vi.fn(),
  onSubmit = vi.fn(),
}: {
  readonly plan?: GoodsReceiptItem['putAwayPlan']
  readonly offPlan?: boolean
  readonly canPlan?: boolean
  readonly withSuggestion?: boolean
  readonly suggestedSlotId?: string
  readonly requireScan?: boolean
  readonly planning?: boolean
  readonly onSuggest?: () => void
  readonly onApplySuggestion?: (itemId: string, slotId: string) => void
  readonly onPlan?: () => void
  readonly onApplyPlan?: () => void
  readonly pending?: boolean
  readonly uncertain?: boolean
  readonly remaining?: number
  readonly unitsAvailable?: boolean
  readonly onSubmit?: (values: PutawayFormValues) => void
}) {
  const form = useForm<PutawayFormValues>({
    defaultValues: {
      lines: [
        { goodsReceiptItemId: itemId, slotId, enteredQuantity: 4, enteredUnitId: cartonUnitId },
      ],
    },
  })
  const fieldArray = useFieldArray({ control: form.control, name: 'lines' })
  const watchedLines = useWatch({ control: form.control, name: 'lines' })
  const confirmed = watchedLines.filter((line) => line.confirmedSlotCode).length
  return (
    <PutawayForm
      receipt={{
        ...receipt,
        items: receipt.items.map((item) => ({
          ...item,
          remainingPutAwayQuantity: remaining,
          allowedUnits: unitsAvailable ? item.allowedUnits : [],
          putAwayPlan: plan,
        })),
      }}
      form={form}
      fields={fieldArray.fields}
      slots={slots}
      isPending={pending}
      hasUncertainSubmission={uncertain}
      planDeviation={{ offPlanRows: new Set(offPlan ? [0] : []), requiresReason: offPlan }}
      evidence={{
        items: [],
        isUploading: false,
        error: null,
        onAdd: vi.fn(),
        onRemove: vi.fn(),
      }}
      onApplyPlan={onApplyPlan}
      planning={
        planning
          ? {
              assigneeName: 'An',
              isSaving: false,
              canSavePlan: true,
              canAssign: true,
              onSavePlan: vi.fn(),
              onAssign: vi.fn(),
            }
          : undefined
      }
      scan={
        requireScan
          ? { requiredCount: 1, confirmedCount: confirmed, skipRequested: false, onSkip: vi.fn() }
          : undefined
      }
      canPlan={canPlan}
      suggestion={
        withSuggestion
          ? {
              suggestions: {
                isAiAssisted: true,
                aiNotice: null,
                summary: 'Dồn toàn bộ vào một vị trí.',
                risks: ['A-01 sẽ gần đầy sau khi cất.'],
                heldSlots: [],
                items: [
                  {
                    goodsReceiptItemId: itemId,
                    remainingQuantity: 240,
                    unallocatedQuantity: 0,
                    suggestions: [
                      {
                        slotId: suggestedSlotId,
                        slotCode: 'A-01',
                        rackCode: 'KE',
                        zoneName: 'Khu A',
                        score: 80,
                        reason: 'Đang chứa cùng sản phẩm',
                        source: 'Ai',
                        warnings: [],
                        suggestedQuantity: 240,
                        availableQuantity: null,
                      },
                    ],
                  },
                ],
              },
              isSuggesting: false,
              onSuggest: onSuggest,
              onApply: onApplySuggestion,
              onApplyBest: vi.fn(),
              onClear: vi.fn(),
            }
          : undefined
      }
      onPlan={onPlan}
      canCancel={false}
      onAdd={() =>
        fieldArray.append({
          goodsReceiptItemId: '',
          slotId: '',
          enteredQuantity: 1,
          enteredUnitId: '',
        })
      }
      onRemove={fieldArray.remove}
      onCancel={vi.fn()}
      onSubmit={() => onSubmit(form.getValues())}
    />
  )
}

describe('AI slot suggestion on the put-away form', () => {
  it('puts the AI button next to "Chia sang vị trí khác" and lists suggestions', async () => {
    const onSuggest = vi.fn()
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<TestForm withSuggestion onSuggest={onSuggest} onApplySuggestion={onApply} />)

    const aiButton = screen.getByRole('button', { name: 'Gợi ý vị trí bằng AI' })
    await user.click(aiButton)
    expect(onSuggest).toHaveBeenCalledOnce()

    expect(screen.getByText('Đang chứa cùng sản phẩm', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dùng vị trí này' }))
    expect(onApply).toHaveBeenCalledWith(itemId, otherSlotId)
  })

  it('collapses the suggestions once every proposed slot is in the allocation', async () => {
    const user = userEvent.setup()
    render(<TestForm withSuggestion suggestedSlotId={slotId} />)

    expect(screen.getByText(/Đã điền 1 vị trí theo gợi ý/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dùng vị trí này' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Áp dụng phân bổ gợi ý' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xem lại gợi ý' }))
    expect(screen.getByText('Đã dùng')).toBeInTheDocument()
  })

  it('groups allocation rows under their product and does not flag untouched rows', () => {
    render(<TestForm />)

    const product = screen.getByRole('article', { name: /BEER/ })
    expect(within(product).getByLabelText('Cất vào vị trí')).toBeInTheDocument()
    expect(within(product).queryByLabelText('Sản phẩm')).not.toBeInTheDocument()
    expect(screen.getByText('Đã phân bổ đủ 0/1 sản phẩm')).toBeInTheDocument()
  })

  it('does not render the AI button when suggestions are not available', () => {
    render(<TestForm />)

    expect(screen.queryByRole('button', { name: 'Gợi ý vị trí bằng AI' })).not.toBeInTheDocument()
  })
})

describe('put-away location plan', () => {
  it('shows the configure button in the header only when the user may plan', async () => {
    const onPlan = vi.fn()
    const user = userEvent.setup()
    const { unmount } = render(<TestForm />)
    expect(screen.queryByRole('button', { name: 'Cấu hình vị trí cất' })).not.toBeInTheDocument()
    unmount()

    render(<TestForm canPlan onPlan={onPlan} />)
    await user.click(screen.getByRole('button', { name: 'Cấu hình vị trí cất' }))
    expect(onPlan).toHaveBeenCalledOnce()
  })

  it('shows the manager plan and lets the staff reset to it', async () => {
    const applyPlan = vi.fn()
    const user = userEvent.setup()
    render(<TestForm plan={plan} onApplyPlan={applyPlan} />)

    expect(screen.getByText('Vị trí cất do quản lý cấu hình')).toBeInTheDocument()
    expect(screen.getByText('Theo kế hoạch')).toBeInTheDocument()
    expect(screen.queryByText('Bạn đang cất khác kế hoạch của quản lý')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Làm theo kế hoạch' }))
    expect(applyPlan).toHaveBeenCalledOnce()
  })

  it('requires a reason before confirming a put-away that differs from the plan', async () => {
    const submit = vi.fn()
    const user = userEvent.setup()
    render(<TestForm plan={plan} offPlan onSubmit={submit} />)

    expect(screen.getByText('Bạn đang cất khác kế hoạch của quản lý')).toBeInTheDocument()
    expect(screen.getByText('Khác kế hoạch')).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Xác nhận cất hàng' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText('Mô tả lý do'), 'Kệ A-01 đã đầy')
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(submit).toHaveBeenCalledOnce()
  })

  it('accepts a preset reason group without a written note', async () => {
    const user = userEvent.setup()
    render(<TestForm plan={plan} offPlan />)
    const confirm = screen.getByRole('button', { name: 'Xác nhận cất hàng' })

    await user.selectOptions(screen.getByLabelText('Nhóm lý do'), 'SlotFull')

    expect(confirm).toBeEnabled()
    expect(screen.getByLabelText('Ghi chú thêm (tùy chọn)')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Nhóm lý do'), 'Other')
    expect(confirm).toBeDisabled()
  })

  it('confirms the location by a typed or scanned slot code', async () => {
    const user = userEvent.setup()
    render(<TestForm />)
    await user.click(screen.getByRole('button', { name: 'Quét mã vị trí' }))
    const input = screen.getByLabelText('Quét hoặc nhập mã vị trí để xác nhận')

    // Vị trí đã chọn sẵn: mã lạ được coi là mã vạch riêng của vị trí, máy chủ sẽ đối chiếu.
    await user.type(input, '8930001{Enter}')
    expect(screen.getByText(/Đã xác nhận bằng mã/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bỏ xác nhận' }))
    expect(screen.getByRole('button', { name: 'Quét mã vị trí' })).toBeInTheDocument()
  })
})

describe('scanning the assigned slot as evidence', () => {
  it('blocks confirmation until the slot code is scanned and rejects a wrong location', async () => {
    const user = userEvent.setup()
    render(<TestForm plan={plan} requireScan />)
    const confirm = screen.getByRole('button', { name: 'Xác nhận cất hàng' })
    const scanner = screen.getByLabelText('Quét mã vị trí vừa cất')

    expect(confirm).toBeDisabled()
    expect(screen.getByText('Chưa quét mã')).toBeInTheDocument()

    await user.type(scanner, 'B99{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Không có vị trí nào mang mã B99')
    expect(confirm).toBeDisabled()

    await user.type(scanner, 'a01{Enter}')
    expect(screen.getByText('Đã xác nhận vị trí A01.')).toBeInTheDocument()
    expect(screen.queryByText('Chưa quét mã')).not.toBeInTheDocument()
    expect(confirm).toBeEnabled()
  })

  it('has no scan control while a manager is fixing the locations', () => {
    render(<TestForm plan={plan} planning />)

    expect(screen.queryByRole('button', { name: 'Quét mã vị trí' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Quét mã vị trí vừa cất')).not.toBeInTheDocument()
  })
})

describe('put-away operational-unit form', () => {
  it('locks allocation and cancellation but allows exact retry even after the remainder changes', async () => {
    const submit = vi.fn()
    const user = userEvent.setup()
    render(<TestForm uncertain remaining={0} onSubmit={submit} />)
    expect(screen.getByLabelText('Số lượng cất')).toBeDisabled()
    expect(screen.getByLabelText('Đơn vị cất')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Chia sang vị trí khác' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Xóa phân bổ 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Quay lại danh sách' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    await user.click(screen.getByRole('button', { name: 'Gửi lại an toàn' }))
    expect(submit).toHaveBeenCalledOnce()
  })
  it('shows conversion, preserves physical amount when switching unit and submits explicit entered fields', async () => {
    const user = userEvent.setup()
    const submit = vi.fn()
    render(<TestForm onSubmit={submit} />)
    expect(screen.getByText('= 96 Lon')).toBeInTheDocument()
    expect(screen.getByText('1 Thùng = 24 Lon')).toBeInTheDocument()
    expect(screen.getByLabelText('Đơn vị cất')).toHaveAccessibleDescription('1 Thùng = 24 Lon')
    await user.selectOptions(screen.getByLabelText('Đơn vị cất'), baseUnitId)
    await waitFor(() => expect(screen.getByLabelText('Số lượng cất')).toHaveValue(96))
    await user.selectOptions(screen.getByLabelText('Đơn vị cất'), cartonUnitId)
    await waitFor(() => expect(screen.getByLabelText('Số lượng cất')).toHaveValue(4))
    await user.click(screen.getByRole('button', { name: 'Xác nhận cất hàng' }))
    expect(submit).toHaveBeenCalledWith({
      lines: [
        { goodsReceiptItemId: itemId, slotId, enteredQuantity: 4, enteredUnitId: cartonUnitId },
      ],
    })
    expect(submit.mock.calls[0]?.[0].lines[0]).not.toHaveProperty('quantity')
    await user.click(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' }))
    await waitFor(() => expect(screen.getByLabelText('Số lượng cất')).toHaveValue(10))
    expect(screen.getByText('= 240 Lon')).toBeInTheDocument()
  })
  it('visibly switches to base UOM for an indivisible remainder', async () => {
    const user = userEvent.setup()
    render(<TestForm remaining={145} />)
    await user.click(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' }))
    await waitFor(() => expect(screen.getByLabelText('Đơn vị cất')).toHaveValue(baseUnitId))
    expect(screen.getByLabelText('Số lượng cất')).toHaveValue(145)
    expect(screen.getByText('= 145 Lon')).toBeInTheDocument()
  })
  it('blocks an over-allocation and prevents editing during submission', async () => {
    const user = userEvent.setup()
    const result = render(<TestForm />)
    const input = screen.getByLabelText('Số lượng cất')
    await user.clear(input)
    await user.type(input, '11')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Xác nhận cất hàng' })).toBeDisabled()
    )
    expect(input).toHaveAttribute('aria-invalid', 'true')
    result.unmount()
    render(<TestForm pending />)
    expect(screen.getByRole('button', { name: 'Đang xử lý…' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Đang xử lý…' })).toBeDisabled()
    expect(screen.getByLabelText('Số lượng cất')).toBeDisabled()
    expect(screen.getByLabelText('Đơn vị cất')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' })).toBeDisabled()
  })
  it('supports keyboard focus and filling the remaining quantity without a pointer', async () => {
    const user = userEvent.setup()
    render(<TestForm />)
    screen.getByLabelText('Số lượng cất').focus()
    await user.tab()
    expect(screen.getByLabelText('Đơn vị cất')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Số lượng cất')).toHaveValue(10)
    expect(screen.getByText('= 240 Lon')).toHaveAttribute('aria-live', 'polite')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Xóa phân bổ 1' })).toHaveFocus()
  })
  it('requires correction instead of rounding when the chosen unit cannot represent the physical quantity', async () => {
    const user = userEvent.setup()
    render(<TestForm remaining={145} />)
    await user.click(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' }))
    await user.selectOptions(screen.getByLabelText('Đơn vị cất'), cartonUnitId)
    expect(screen.getByLabelText('Đơn vị cất')).toHaveValue(cartonUnitId)
    expect(screen.getByLabelText('Số lượng cất')).toHaveValue(null)
    expect(screen.getByRole('button', { name: 'Xác nhận cất hàng' })).toBeDisabled()
    expect(screen.getByLabelText('Số lượng cất')).toHaveAttribute('aria-invalid', 'true')
    await user.click(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' }))
    expect(screen.getByLabelText('Đơn vị cất')).toHaveValue(baseUnitId)
    expect(screen.getByLabelText('Số lượng cất')).toHaveValue(145)
    expect(screen.getByRole('button', { name: 'Xác nhận cất hàng' })).toBeEnabled()
  })
  it('keeps the first allocation when adding and removing an incomplete split', async () => {
    const user = userEvent.setup()
    const submit = vi.fn()
    render(<TestForm onSubmit={submit} />)
    await user.click(screen.getByRole('button', { name: 'Chia sang vị trí khác' }))
    expect(screen.getAllByLabelText('Số lượng cất')).toHaveLength(2)
    expect(screen.getAllByLabelText('Số lượng cất')[0]).toHaveValue(4)
    expect(screen.getByRole('button', { name: 'Xác nhận cất hàng' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Xóa phân bổ 2' }))
    expect(screen.getAllByLabelText('Số lượng cất')).toHaveLength(1)
    expect(screen.getByLabelText('Số lượng cất')).toHaveValue(4)
    await user.click(screen.getByRole('button', { name: 'Xác nhận cất hàng' }))
    expect(submit).toHaveBeenCalledWith({
      lines: [
        { goodsReceiptItemId: itemId, slotId, enteredQuantity: 4, enteredUnitId: cartonUnitId },
      ],
    })
  })
  it('explains unavailable unit metadata and never allows a guessed base-unit submission', () => {
    render(<TestForm unitsAvailable={false} />)
    expect(screen.getByRole('button', { name: 'Xác nhận cất hàng' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cất toàn bộ còn lại' })).toBeDisabled()
    expect(screen.getByLabelText('Đơn vị cất')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Đơn vị cất')).toHaveAccessibleDescription(
      'Đơn vị cất không khả dụng. Vui lòng tải lại dữ liệu hoặc chọn đơn vị khác.'
    )
  })
})
