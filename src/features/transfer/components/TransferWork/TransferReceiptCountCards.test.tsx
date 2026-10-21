import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/button'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  createTransferCountSchema,
  type TransferCountFormValues,
} from '../../schemas/transfer-receipt.schema'
import {
  receiptFixture,
  RECEIPT_LINE,
  RECEIPT_LOT,
} from '../../utils/transfer-receipt-test-fixtures'
import { TransferReceiptCountCards } from './TransferReceiptCountCards'

function Harness({
  disabled = false,
  manyLots = false,
}: {
  disabled?: boolean
  manyLots?: boolean
}) {
  const sheet = receiptFixture()
  if (manyLots)
    sheet.lines[0]!.lots.push({
      ...sheet.lines[0]!.lots[0]!,
      lotId: RECEIPT_LOT,
      lotNumber: 'LO-02',
    })
  const form = useForm<TransferCountFormValues>({
    resolver: zodResolver(createTransferCountSchema(sheet)),
    defaultValues: {
      entries: sheet.lines[0]!.lots.map((lot) => ({
        lineId: RECEIPT_LINE,
        lotId: lot.lotId,
        goodQuantity: 8,
        damagedQuantity: 2,
        missingQuantity: 0,
        reasonCode: '',
        note: '',
      })),
    },
  })
  return (
    <OperationalListPanel aria-label="Kiểm hàng">
      <TransferReceiptCountCards form={form} sheet={sheet} disabled={disabled} />
      <Button onClick={() => void form.trigger()}>Kiểm tra</Button>
    </OperationalListPanel>
  )
}

describe('Kiểm hàng responsive', () => {
  it('renders a single set of good, damaged and missing fields per lot with no wide table', () => {
    render(<Harness manyLots />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: /^(SL thực nhận|Hỏng|Thiếu)/ })).toHaveLength(6)
    expect(screen.getAllByRole('textbox', { name: /^SL thực nhận/ })).toHaveLength(2)
    expect(screen.getAllByRole('textbox', { name: /^Hỏng/ })).toHaveLength(2)
    expect(screen.getAllByRole('textbox', { name: /^Thiếu/ })).toHaveLength(2)
    const ids = screen
      .getAllByRole('textbox', { name: /^(SL thực nhận|Hỏng|Thiếu)/ })
      .map((input) => input.id)
    expect(new Set(ids).size).toBe(6)
    expect(
      screen
        .getAllByRole('textbox', { name: /^(SL thực nhận|Hỏng|Thiếu)/ })
        .every((input) => input.classList.contains('h-11'))
    ).toBe(true)
  })
  it('keeps reasons and validation next to the affected lot', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    const card = screen.getByRole('group', { name: 'Hàng QA' })
    expect(
      await within(card).findByText('Hàng hỏng hoặc thiếu phải kèm nguyên nhân.')
    ).toBeInTheDocument()
    expect(within(card).getByLabelText('Nguyên nhân hỏng/thiếu')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(within(card).getByLabelText('Nguyên nhân hỏng/thiếu').parentElement).toHaveClass(
      '[&_select]:h-11'
    )
    await user.clear(within(card).getByRole('textbox', { name: /^SL thực nhận/ }))
    await user.type(within(card).getByRole('textbox', { name: /^SL thực nhận/ }), '7')
    expect(within(card).getByText('Chưa đủ / Vượt số xuất')).toBeInTheDocument()
  })
  it('disables the same controls in read-only history', () => {
    render(<Harness disabled />)
    for (const input of screen.getAllByRole('textbox', { name: /^(SL thực nhận|Hỏng|Thiếu)/ }))
      expect(input).toBeDisabled()
    expect(screen.getByLabelText('Nguyên nhân hỏng/thiếu')).toBeDisabled()
    expect(screen.getByLabelText('Ghi chú (tùy chọn)')).toBeDisabled()
  })
  it('announces only status changes, not every quantity edit', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    const card = screen.getByRole('group', { name: 'Hàng QA' })
    const status = within(card).getByRole('status')
    expect(status).toHaveTextContent('SKU-01 · Không theo lô: Có chênh lệch')
    expect(status).not.toHaveTextContent('Đã kiểm')
    const good = within(card).getByRole('textbox', { name: /^SL thực nhận/ })
    await user.clear(good)
    await user.type(good, '7')
    expect(status).toHaveTextContent('Chưa đủ / Vượt số xuất')
    const announcement = status.textContent
    await user.clear(good)
    await user.type(good, '6')
    expect(status.textContent).toBe(announcement)
    expect(status).not.toContainElement(within(card).getByText('Đã kiểm: 8'))
    await user.clear(good)
    await user.type(good, '8')
    expect(status).toHaveTextContent('Có chênh lệch')
    await user.clear(within(card).getByRole('textbox', { name: /^Hỏng/ }))
    await user.type(within(card).getByRole('textbox', { name: /^Hỏng/ }), '0')
    await user.clear(good)
    await user.type(good, '10')
    expect(status).toHaveTextContent('Khớp')
  })
  it('treats a cleared quantity as 0 instead of showing NaN', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    const card = screen.getByRole('group', { name: 'Hàng QA' })
    await user.clear(within(card).getByRole('textbox', { name: /^SL thực nhận/ }))
    expect(card).not.toHaveTextContent('NaN')
    expect(within(card).getByText('Đã kiểm: 2')).toBeInTheDocument()
    expect(within(card).getByRole('status')).toHaveTextContent('Chưa đủ / Vượt số xuất')
  })
})
