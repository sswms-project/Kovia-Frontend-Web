import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { GoodsReceiptFormValues } from '../../schemas/inbound.schema'
import type { ReceivingTask } from '../../types/inbound.types'
import { ReceiveGoodsDialog } from './ReceiveGoodsDialog'

const task: ReceivingTask = {
  version: 'AQ==',
  inboundRequestId: 'request',
  inboundRequestCode: 'IR000001',
  warehouseId: 'warehouse',
  warehouseCode: 'WH01',
  warehouseName: 'Đà Nẵng',
  supplierId: 'supplier',
  supplierCode: 'NCC001',
  supplierName: 'Nhà cung cấp A',
  expectedDate: null,
  orderedQuantity: 240,
  receivedQuantity: 0,
  remainingQuantity: 240,
  activeDocumentImportId: null,
  activeGoodsReceiptId: null,
  activeGoodsReceiptStatus: null,
  assignedTo: null,
  assignedToName: null,
  assignedAt: null,
  executionStatus: 'Queued',
  priority: 'Normal',
  dueAt: null,
  lines: [
    {
      inboundRequestItemId: 'line',
      productId: 'beer',
      productSKU: 'BIA',
      productName: 'Bia',
      barcodeValue: null,
      isLotTracked: false,
      orderedQuantity: 240,
      receivedQuantity: 0,
      remainingQuantity: 240,
      baseUnitId: 'lon',
      baseUnitName: 'Lon',
      enteredUnitId: 'thung',
      enteredUnitName: 'Thùng',
      conversionFactorSnapshot: 24,
      baseUnitQuantityPrecision: 0,
      enteredUnitQuantityPrecision: 0,
    },
  ],
}

function ReceiptForm({
  correction = false,
  receivingTask = task,
  codeSuggestionError = false,
  pending = false,
}: {
  readonly correction?: boolean
  readonly receivingTask?: ReceivingTask
  readonly codeSuggestionError?: boolean
  readonly pending?: boolean
}) {
  const form = useForm<GoodsReceiptFormValues>({
    defaultValues: {
      inboundRequestId: 'request',
      receiptCode: 'PN000001',
      lines: [
        {
          inboundRequestItemId: 'line',
          enteredUnitId: 'thung',
          receivedQty: 4,
          damagedQty: 1,
          exceptionReason: 'Hỏng',
          isLotTracked: false,
          lotNumber: '',
          manufacturedDate: '',
          expiryDate: '',
        },
      ],
    },
  })
  return (
    <ReceiveGoodsDialog
      task={receivingTask}
      mode={correction ? 'edit' : 'create'}
      canEditReceivedQuantity={!correction}
      form={form}
      isPending={pending}
      isCodeSuggestionError={codeSuggestionError}
      onOpenChange={vi.fn()}
      onSaveDraft={vi.fn()}
      onSaveAndSubmit={vi.fn()}
    />
  )
}

describe('ReceiveGoodsDialog operational context', () => {
  it('allows replacing the suggested code with a tenant-specific code', async () => {
    const user = userEvent.setup()
    render(<ReceiptForm />)
    const input = screen.getByLabelText('Mã phiếu nhận *')
    await user.clear(input)
    await user.type(input, 'DN-PN0099')
    expect(input).toHaveValue('DN-PN0099')
    expect(input).toHaveAttribute('maxlength', '100')
    expect(input).toHaveAttribute('aria-describedby', 'receipt-code-help')
  })
  it('shows an accessible suggestion error without blocking manual entry', async () => {
    const user = userEvent.setup()
    render(<ReceiptForm codeSuggestionError />)
    const input = screen.getByLabelText('Mã phiếu nhận *')
    expect(input).not.toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Bạn có thể nhập mã thủ công.')
    await user.clear(input)
    await user.type(input, 'CUSTOM01')
    expect(input).toHaveValue('CUSTOM01')
  })
  it('locks the code while saving without blocking focus, then allows correction', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ReceiptForm pending />)
    const input = screen.getByLabelText('Mã phiếu nhận *')
    expect(input).not.toBeDisabled()
    expect(input).toHaveAttribute('readonly')
    input.focus()
    expect(input).toHaveFocus()
    await user.type(input, '9')
    expect(input).toHaveValue('PN000001')
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lưu và gửi duyệt' })).toBeDisabled()

    rerender(<ReceiptForm />)
    expect(input).not.toHaveAttribute('readonly')
    await user.clear(input)
    await user.type(input, 'PN000002')
    expect(input).toHaveValue('PN000002')
  })
  it('keeps correction received quantity and unit fixed while allowing damage edits', async () => {
    const user = userEvent.setup()
    render(<ReceiptForm correction />)
    expect(screen.getByLabelText('Đơn vị nhận')).toBeDisabled()
    expect(screen.getByLabelText('Mã phiếu nhận *')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveAttribute('readonly')
    await user.type(screen.getByLabelText('Số lượng thực nhận'), '9')
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(4)
    await user.clear(screen.getByLabelText('Số lượng hỏng'))
    await user.type(screen.getByLabelText('Số lượng hỏng'), '2')
    expect(screen.getByLabelText('Số lượng hỏng')).toHaveValue(2)
  })
  it('receive-all sends a normalized quantity instead of binary division noise', async () => {
    const user = userEvent.setup()
    render(
      <ReceiptForm
        receivingTask={{
          ...task,
          lines: task.lines.map((line) => ({
            ...line,
            remainingQuantity: 0.3,
            conversionFactorSnapshot: 0.1,
          })),
        }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Nhận toàn bộ còn lại' }))
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(3)
  })
  it('fills every line in one tap when the whole delivery arrived in full', async () => {
    const user = userEvent.setup()
    render(<ReceiptForm />)
    await user.click(screen.getByRole('button', { name: 'Nhận đủ tất cả' }))
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(10)
  })
  it('adds one per scan, stops at the remaining quantity and rejects foreign goods', async () => {
    const user = userEvent.setup()
    render(
      <ReceiptForm
        receivingTask={{
          ...task,
          lines: task.lines.map((line) => ({
            ...line,
            barcodeValue: '8930001',
            remainingQuantity: 120,
          })),
        }}
      />
    )
    const scanner = screen.getByLabelText('Quét mã hàng vừa nhận')
    await user.type(scanner, '8930001{Enter}')
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(5)
    expect(screen.getByRole('status')).toHaveTextContent('Bia: 5/5 Thùng.')
    await user.type(scanner, 'bia{Enter}')
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(5)
    expect(screen.getByRole('alert')).toHaveTextContent('đã đủ số lượng còn lại')
    await user.type(scanner, 'LA-KHAC{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('không thuộc yêu cầu nhập này')
  })
  it('hides quick receiving while correcting an inspected receipt', () => {
    render(<ReceiptForm correction />)
    expect(screen.queryByLabelText('Quét mã hàng vừa nhận')).not.toBeInTheDocument()
  })
  it('identifies receipt, source and warehouse and previews snapshot conversion', () => {
    render(<ReceiptForm />)
    expect(screen.getByLabelText('Mã phiếu nhận *')).toHaveValue('PN000001')
    expect(screen.getByText('Mã được gợi ý, có thể chỉnh sửa.')).toBeInTheDocument()
    expect(screen.getByText('NCC001 — Nhà cung cấp A')).toBeInTheDocument()
    expect(screen.getByText('WH01 — Đà Nẵng')).toBeInTheDocument()
    expect(screen.getByText(/Hàng đạt: 3 Thùng/)).toHaveTextContent('Quy đổi: 96 Lon')
  })
  it('fills all remaining in packaging and avoids reinterpreting quantities when changing unit', async () => {
    const user = userEvent.setup()
    render(<ReceiptForm />)
    await user.click(screen.getByRole('button', { name: 'Nhận toàn bộ còn lại' }))
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(10)
    await user.selectOptions(screen.getByLabelText('Đơn vị nhận'), 'lon')
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(0)
    expect(screen.getByLabelText('Số lượng hỏng')).toHaveValue(0)
    await user.click(screen.getByRole('button', { name: 'Nhận toàn bộ còn lại' }))
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveValue(240)
  })
})
