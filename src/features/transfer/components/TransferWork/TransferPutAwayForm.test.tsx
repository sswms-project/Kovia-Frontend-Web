import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildTransferPutAwayEntries,
  transferPutAwayPlanStates,
} from '../../utils/transfer-putaway'
import { putAwayFixture, RECEIPT_SLOT } from '../../utils/transfer-receipt-test-fixtures'
import {
  createTransferPutAwaySchema,
  type TransferPutAwayFormValues,
} from '../../schemas/transfer-putaway.schema'
import { TransferPutAwayForm } from './TransferPutAwayForm'

const { startCameraScan, stop } = vi.hoisted(() => ({ startCameraScan: vi.fn(), stop: vi.fn() }))
vi.mock('../../utils/camera-scan', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/camera-scan')>()),
  startCameraScan,
  isCameraScanSupported: () => true,
}))

vi.mock('./ScanInput', () => ({
  ScanInput: ({ id, error }: { id: string; error?: string }) => (
    <>
      <label htmlFor={id}>Quét xác nhận vị trí</label>
      <input id={id} aria-invalid={Boolean(error)} />
      {error ? <p>{error}</p> : null}
    </>
  ),
}))
vi.mock('@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox', () => ({
  LookupCombobox: ({
    ariaLabel,
    selectedOption,
  }: {
    ariaLabel: string
    selectedOption?: { label: string }
  }) => <button aria-label={ariaLabel}>{selectedOption?.label ?? 'Chọn vị trí'}</button>,
}))
beforeEach(() => {
  vi.clearAllMocks()
  startCameraScan.mockResolvedValue({ stop })
})
afterEach(cleanup)
function TestForm() {
  const sheet = putAwayFixture()
  const form = useForm<TransferPutAwayFormValues>({
    defaultValues: { entries: buildTransferPutAwayEntries(sheet) },
  })
  const { fields } = useFieldArray({ control: form.control, name: 'entries' })
  const entries = useWatch({ control: form.control, name: 'entries' })
  return (
    <TransferPutAwayForm
      fields={fields}
      rows={sheet.rows}
      form={form}
      planStates={transferPutAwayPlanStates(sheet, entries)}
      changedLines={new Set()}
      disabled={false}
      pendingScan={false}
      slotOptions={[]}
      loadingSlots={false}
      onSearchSlots={vi.fn()}
      onChangeSlot={vi.fn()}
      onMarkUnreadable={vi.fn()}
      onScanSlot={vi.fn()}
      onScanProduct={vi.fn()}
      onSplit={vi.fn()}
      onSplitExcess={vi.fn()}
      onRemove={vi.fn()}
    />
  )
}
describe('Cất hàng theo hàng hóa/lô', () => {
  it('allows only one allocation camera at a time and stops it when the group collapses', async () => {
    const user = userEvent.setup()
    render(<TestForm />)
    const cameras = screen.getAllByRole('button', { name: /Bật camera quét:/ })
    expect(cameras).toHaveLength(2)
    await user.click(cameras[0]!)
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: /Bật camera quét:/ }))
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(2))
    expect(screen.getAllByLabelText('Hình ảnh từ camera')).toHaveLength(1)
    expect(stop).toHaveBeenCalledTimes(1)
    const toggle = screen.getByRole('button', { name: 'Mở/thu gọn phân bổ SKU-01' })
    await user.click(toggle)
    expect(screen.queryByLabelText('Hình ảnh từ camera')).not.toBeInTheDocument()
    expect(stop).toHaveBeenCalledTimes(2)
    await user.click(toggle)
    expect(screen.getAllByRole('button', { name: /Bật camera quét:/ })).toHaveLength(2)
    expect(startCameraScan).toHaveBeenCalledTimes(2)
  })
  it('expands only invalid collapsed groups, exposes errors and focuses the scan without losing edits', async () => {
    const user = userEvent.setup()
    render(<ValidationTestForm />)
    const quantity = screen.getAllByRole('textbox', { name: /Số lượng cất/ })[0]!
    await user.clear(quantity)
    await user.type(quantity, '3')
    const invalidToggle = screen.getByRole('button', { name: 'Mở/thu gọn phân bổ SKU-01' })
    const validToggle = screen.getByRole('button', { name: 'Mở/thu gọn phân bổ SKU-02' })
    await user.click(invalidToggle)
    await user.click(validToggle)
    await user.click(screen.getByRole('button', { name: 'Xác nhận cất hàng' }))
    await waitFor(() => expect(invalidToggle).toHaveAttribute('aria-expanded', 'true'))
    expect(validToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('alert', { name: 'Lỗi dữ liệu cất hàng' })).toHaveTextContent(
      'Hãy quét hoặc nhập mã vị trí để xác nhận.'
    )
    await waitFor(() => expect(document.getElementById('putaway-slot-0')).toHaveFocus())
    expect(screen.getAllByRole('textbox', { name: /Số lượng cất/ })[0]).toHaveValue('3')
    expect(screen.queryByText('Đã mở xác nhận')).not.toBeInTheDocument()
    await user.click(invalidToggle)
    await user.click(screen.getByRole('button', { name: 'Xác nhận cất hàng' }))
    await waitFor(() => expect(invalidToggle).toHaveAttribute('aria-expanded', 'true'))
    expect(screen.getAllByRole('textbox', { name: /Số lượng cất/ })[0]).toHaveValue('3')
  })
  it('groups prefilled allocations under one product and excludes damaged stock', () => {
    render(<TestForm />)
    expect(screen.getAllByRole('heading', { name: 'SKU-01 · Hàng QA' })).toHaveLength(1)
    expect(screen.getByText(/Thực nhận tốt 8/)).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: /Số lượng cất/ })).toHaveLength(2)
    expect(screen.queryByText('Hàng hỏng')).not.toBeInTheDocument()
  })
  it('preserves quantity edits after keyboard collapse and expand', async () => {
    const user = userEvent.setup()
    render(<TestForm />)
    const quantity = screen.getAllByRole('textbox', { name: /Số lượng cất/ })[0]!
    await user.clear(quantity)
    await user.type(quantity, '3')
    const toggle = screen.getByRole('button', { name: 'Mở/thu gọn phân bổ SKU-01' })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{Enter}')
    expect(screen.getAllByRole('textbox', { name: /Số lượng cất/ })[0]).toHaveValue('3')
  })
})

function ValidationTestForm() {
  const [sheet] = useState(() => {
    const sheet = putAwayFixture()
    sheet.rows.push({
      ...sheet.rows[0]!,
      lineId: '10000000-0000-4000-8000-000000000011',
      itemId: '10000000-0000-4000-8000-000000000012',
      sku: 'SKU-02',
      remainingQuantity: 1,
      actualQuantity: 1,
      planMode: 'Legacy',
      planBudgets: [],
    })
    return sheet
  })
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const form = useForm<TransferPutAwayFormValues>({
    defaultValues: {
      entries: buildTransferPutAwayEntries(sheet).map((entry) =>
        entry.lineId === sheet.rows.at(-1)?.lineId
          ? { ...entry, destinationSlotId: RECEIPT_SLOT, scannedSlotCode: 'S-02' }
          : entry
      ),
    },
    resolver: zodResolver(createTransferPutAwaySchema(sheet)),
  })
  const { fields } = useFieldArray({ control: form.control, name: 'entries' })
  const entries = useWatch({ control: form.control, name: 'entries' })
  return (
    <>
      <TransferPutAwayForm
        fields={fields}
        rows={sheet.rows}
        form={form}
        planStates={transferPutAwayPlanStates(sheet, entries)}
        changedLines={new Set()}
        validationAttempt={validationAttempt}
        disabled={false}
        pendingScan={false}
        slotOptions={[]}
        loadingSlots={false}
        onSearchSlots={vi.fn()}
        onChangeSlot={vi.fn()}
        onMarkUnreadable={vi.fn()}
        onScanSlot={vi.fn()}
        onScanProduct={vi.fn()}
        onSplit={vi.fn()}
        onSplitExcess={vi.fn()}
        onRemove={vi.fn()}
      />
      <button
        onClick={() =>
          void form.handleSubmit(
            () => setConfirmed(true),
            () => setValidationAttempt((attempt) => attempt + 1)
          )()
        }
      >
        Xác nhận cất hàng
      </button>
      {confirmed ? <p>Đã mở xác nhận</p> : null}
    </>
  )
}
