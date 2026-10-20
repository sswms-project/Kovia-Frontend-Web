import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import {
  aiDraftQuantitiesSchema,
  aiStockIssueDraftQuantitiesSchema,
  type AiDraftQuantitiesForm,
} from '../../schemas/ai-draft-quantities.schema'
import { isAiDraftWithoutDate, type AiCard } from '../../types/ai-assistant.types'
import { AiActionConfirmationCard } from './AiActionConfirmationCard'

const editableCard: AiCard = {
  type: 'action_confirmation',
  draftId: 'd1',
  action: 'create_inbound_request',
  summary: 'Tạo yêu cầu nhập kho 1 mặt hàng từ Thiện Group cho Đà Nẵng',
  details: [
    { label: 'Kho nhận', value: 'Đà Nẵng (DN-01)' },
    { label: 'Nhà cung cấp', value: 'Thiện Group' },
    { label: 'Ngày dự kiến nhận', value: '30/12/2099', dateValue: '2099-12-30' },
    {
      label: 'SKU000005 · Bia Tiger',
      value: '27 Thùng',
      productId: 'p-5',
      quantity: 27,
      unit: 'Thùng',
    },
  ],
}

function Card({
  card = editableCard,
  onSave = vi.fn(),
}: {
  readonly card?: AiCard
  readonly onSave?: (values: AiDraftQuantitiesForm) => void
}) {
  // Mirrors AiAssistantPanel: the orchestrator owns the form and the "which draft is open" state.
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const form = useForm<AiDraftQuantitiesForm>({
    resolver: zodResolver(
      isAiDraftWithoutDate(card.action)
        ? aiStockIssueDraftQuantitiesSchema
        : aiDraftQuantitiesSchema
    ),
    defaultValues: { lines: [] },
  })
  return (
    <AiActionConfirmationCard
      card={card}
      status="Pending"
      resultEntityId={null}
      isProcessing={false}
      isLocked={false}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      onNavigate={vi.fn()}
      quantityEdit={{
        editingDraftId,
        form,
        isSaving: false,
        onStart: (draftId, values) => {
          form.reset(values)
          setEditingDraftId(draftId)
        },
        onCancel: () => setEditingDraftId(null),
        onSubmit: form.handleSubmit(onSave),
      }}
    />
  )
}

const stockIssueCard: AiCard = {
  type: 'action_confirmation',
  draftId: 'd2',
  action: 'create_stock_issue_request',
  summary: 'Tạo phiếu xuất kho 5 Thùng PA-MI từ Kho test cho Công ty A',
  details: [
    { label: 'Kho xuất', value: 'Kho test (KHO-PA-01)' },
    { label: 'Người nhận', value: 'Công ty A (KH000001)' },
    { label: 'PA-MI · Mì gói', value: '5 Thùng', productId: 'p-mi', quantity: 5, unit: 'Thùng' },
  ],
}

const supplierReturnCard: AiCard = {
  type: 'action_confirmation',
  draftId: 'd3',
  action: 'create_supplier_return',
  summary: 'Tạo phiếu trả NCC 5 Thùng PA-MI cho Thiện Group',
  details: [
    { label: 'Nhà cung cấp', value: 'Thiện Group' },
    { label: 'PA-MI · Mì gói', value: '5 Thùng', productId: 'p-mi', quantity: 5, unit: 'Thùng' },
  ],
}

describe('AiActionConfirmationCard quantity editing', () => {
  it('edits the quantity of a supplier return draft without asking for a date', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Card card={supplierReturnCard} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    expect(screen.queryByLabelText(/Ngày dự kiến hàng về/)).not.toBeInTheDocument()
    const input = screen.getByLabelText(/PA-MI · Mì gói/)
    await user.clear(input)
    await user.type(input, '3')
    await user.click(screen.getByRole('button', { name: 'Lưu số lượng' }))

    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      lines: [{ productId: 'p-mi', quantity: 3 }],
    })
  })

  it('edits the quantity of a stock issue draft without asking for a date', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Card card={stockIssueCard} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    expect(screen.queryByLabelText(/Ngày dự kiến hàng về/)).not.toBeInTheDocument()
    const input = screen.getByLabelText(/PA-MI · Mì gói/)
    await user.clear(input)
    await user.type(input, '12')
    await user.click(screen.getByRole('button', { name: 'Lưu số lượng' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      lines: [{ productId: 'p-mi', quantity: 12 }],
    })
  })

  it('lets the user raise the suggested quantity and saves the lines with the expected date', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Card onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    const input = screen.getByLabelText('SKU000005 · Bia Tiger')
    expect(input).toHaveValue(27)
    // Confirming while the numbers are being changed would create the request with the old ones.
    expect(screen.queryByRole('button', { name: 'Xác nhận' })).not.toBeInTheDocument()
    expect(screen.getByText('Thiện Group')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, '40')
    await user.click(screen.getByRole('button', { name: 'Lưu số lượng' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls.at(0)?.[0]).toEqual({
      expectedDate: '2099-12-30',
      lines: [{ productId: 'p-5', quantity: 40 }],
    })
  })

  it('moves the expected date and refuses a date in the past', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Card onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    const date = screen.getByLabelText(/Ngày dự kiến hàng về/)
    expect(date).toHaveValue('2099-12-30')

    fireEvent.change(date, { target: { value: '2020-01-01' } })
    await user.click(screen.getByRole('button', { name: 'Lưu số lượng' }))
    expect(
      await screen.findByText('Ngày dự kiến hàng về không được ở quá khứ.')
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.change(date, { target: { value: '2099-12-31' } })
    await user.click(screen.getByRole('button', { name: 'Lưu số lượng' }))
    expect(onSave.mock.calls.at(0)?.[0]).toMatchObject({ expectedDate: '2099-12-31' })
  })

  it('requires a date for an old draft that never had one', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <Card
        onSave={onSave}
        card={{
          ...editableCard,
          details: editableCard.details?.filter((detail) => !detail.dateValue),
        }}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    await user.click(screen.getByRole('button', { name: 'Lưu số lượng' }))

    expect(await screen.findByText('Vui lòng chọn ngày dự kiến hàng về.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('refuses a quantity of zero and explains why', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<Card onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    await user.clear(screen.getByLabelText('SKU000005 · Bia Tiger'))
    await user.type(screen.getByLabelText('SKU000005 · Bia Tiger'), '0')
    await user.click(screen.getByRole('button', { name: 'Lưu số lượng' }))

    expect(await screen.findByText('Số lượng phải lớn hơn 0.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('returns to the confirm buttons when editing is dismissed', async () => {
    const user = userEvent.setup()
    render(<Card />)

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    await user.click(screen.getByRole('button', { name: 'Bỏ' }))

    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeInTheDocument()
    expect(screen.getByText('27 Thùng')).toBeInTheDocument()
  })

  it('offers no edit button for drafts without editable product lines', () => {
    render(
      <Card
        card={{
          ...editableCard,
          details: [{ label: 'Kho nguồn', value: 'Đà Nẵng' }],
        }}
      />
    )

    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeInTheDocument()
  })
})
