import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expect, it, vi } from 'vitest'
import { SupplierReturnDeliveryLine } from './SupplierReturnDeliveryLine'
import {
  confirmSupplierReturnDeliverySchema,
  type ConfirmSupplierReturnDeliveryFormValues,
} from '../../schemas/supplier-return.schema'
import type { SupplierReturnItem } from '../../types/supplier-return.types'

vi.mock('@/components/operations/scanning', () => ({
  CameraScanControl: ({
    onCode,
    disabled,
  }: {
    onCode: (code: string) => boolean
    disabled: boolean
  }) => (
    <div>
      <button type="button" disabled={disabled} onClick={() => onCode('KOVIA:LOC:RACK:rack')}>
        Camera vị trí
      </button>
      <button type="button" disabled={disabled} onClick={() => onCode('BARCODE-MILK')}>
        Camera hàng
      </button>
    </div>
  ),
}))

const line = {
  inventoryStockId: 'stock',
  productId: 'product',
  lotId: null,
  lotNumber: null,
  qualityStatus: 'Good',
  eligibilityStatus: 'Available',
  deliveredQuantity: null,
  id: 'line',
  productName: 'Sữa',
  sku: 'SUA',
  unit: 'Thùng',
  quantity: 3,
  slotId: 'slot',
  slotCode: '__SYSTEM_DEFAULT__',
  quantityPrecision: 0,
  sourceLocation: 'Khu K01 - Kho hàng / Kệ A04 - Kệ sữa',
  sourceScanCodes: ['A04', 'KOVIA:LOC:RACK:rack'],
  productScanCodes: ['SUA', 'BARCODE-MILK'],
} as SupplierReturnItem

function Harness({
  disabled = false,
  precision = 0,
  onDelivered = () => {},
}: {
  disabled?: boolean
  precision?: number
  onDelivered?: (values: ConfirmSupplierReturnDeliveryFormValues) => void
}) {
  const form = useForm<ConfirmSupplierReturnDeliveryFormValues>({
    resolver: zodResolver(confirmSupplierReturnDeliverySchema),
    defaultValues: {
      items: [
        {
          itemId: 'line',
          approvedQuantity: 3,
          deliveredQuantity: 3,
          quantityPrecision: precision,
          scannedSlotCode: '',
          scannedProductCode: '',
        },
      ],
    },
  })
  return (
    <>
      <SupplierReturnDeliveryLine
        line={{ ...line, quantityPrecision: precision }}
        index={0}
        form={form}
        disabled={disabled}
      />
      <button type="button" onClick={form.handleSubmit(onDelivered)}>
        Xác nhận giao
      </button>
    </>
  )
}

it('validates source before product without jumping focus, focuses quantity after the product and permits rescan', async () => {
  render(<Harness />)
  expect(screen.getByText(`Lấy tại: ${line.sourceLocation}`)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Camera hàng' }))
  expect(screen.getByRole('alert').textContent).toContain('vị trí chưa khớp')
  const input = screen.getByLabelText('Hoặc nhập mã vị trí')
  act(() => input.focus())
  fireEvent.change(input, { target: { value: ' a04 ' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(screen.getByLabelText('Hoặc nhập mã hàng')).toBe(document.activeElement)
  fireEvent.click(screen.getByRole('button', { name: 'Camera hàng' }))
  expect(screen.getByText('Đã kiểm tra vị trí và hàng hóa')).toBeTruthy()
  expect(screen.getByLabelText('Số lượng giao')).toBe(document.activeElement)
  expect(screen.getByLabelText('Số lượng giao')).toHaveAttribute('step', 'any')
  fireEvent.click(screen.getByRole('button', { name: 'Quét lại' }))
  expect(screen.getByLabelText('Hoặc nhập mã vị trí')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Số lượng giao'), { target: { value: '0' } })
  expect(screen.getByText('Không giao dòng này; lượng giữ sẽ được giải phóng.')).toBeTruthy()
  await waitFor(() => expect(screen.getByText('Chưa giao: 3 Thùng')).toBeTruthy())
})

it('locks camera, manual entry and quantity while a command is pending or uncertain', () => {
  render(<Harness disabled />)
  expect(
    (screen.getByRole('button', { name: 'Camera vị trí' }) as HTMLButtonElement).disabled
  ).toBe(true)
  expect((screen.getByLabelText('Hoặc nhập mã vị trí') as HTMLInputElement).disabled).toBe(true)
  expect((screen.getByLabelText('Số lượng giao') as HTMLInputElement).disabled).toBe(true)
})

it('requires both scan codes only for positive quantities and preserves quantity bounds', () => {
  const scanned = {
    itemId: 'a',
    approvedQuantity: 3,
    deliveredQuantity: 2,
    quantityPrecision: 0,
    scannedSlotCode: 'A04',
    scannedProductCode: 'SUA',
  }
  expect(
    confirmSupplierReturnDeliverySchema.safeParse({
      items: [scanned, { itemId: 'b', approvedQuantity: 2, deliveredQuantity: 0 }],
    }).success
  ).toBe(true)
  expect(
    confirmSupplierReturnDeliverySchema.safeParse({ items: [{ ...scanned, scannedSlotCode: '' }] })
      .success
  ).toBe(false)
  expect(
    confirmSupplierReturnDeliverySchema.safeParse({
      items: [{ ...scanned, scannedProductCode: '' }],
    }).success
  ).toBe(false)
  expect(
    confirmSupplierReturnDeliverySchema.safeParse({ items: [{ ...scanned, deliveredQuantity: 4 }] })
      .success
  ).toBe(false)
  expect(
    confirmSupplierReturnDeliverySchema.safeParse({
      items: [{ ...scanned, deliveredQuantity: 0.5 }],
    }).success
  ).toBe(false)
})

it.each([
  { precision: 0, value: '0.5', error: 'Số lượng phải là số nguyên.' },
  { precision: 2, value: '0.123', error: 'Tối đa 2 chữ số thập phân.' },
  { precision: 2, value: '4', error: 'Số lượng giao không được vượt quá số lượng đã duyệt.' },
  { precision: 2, value: '-1', error: 'Số lượng không được âm.' },
])(
  'blocks invalid delivery on submit: precision=$precision, quantity=$value',
  async ({ precision, value, error }) => {
    const delivered = vi.fn()
    render(<Harness precision={precision} onDelivered={delivered} />)
    fireEvent.click(screen.getByRole('button', { name: 'Camera vị trí' }))
    fireEvent.click(screen.getByRole('button', { name: 'Camera hàng' }))
    fireEvent.change(screen.getByLabelText('Số lượng giao'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận giao' }))
    await waitFor(() => expect(screen.getByText(error)).toBeInTheDocument())
    expect(delivered).not.toHaveBeenCalled()
  }
)

it.each([
  { precision: 0, value: '3', expected: 3 },
  { precision: 2, value: '0.5', expected: 0.5 },
  { precision: 2, value: '0.01', expected: 0.01 },
])(
  'submits a valid delivery: precision=$precision, quantity=$value',
  async ({ precision, value, expected }) => {
    const delivered = vi.fn()
    render(<Harness precision={precision} onDelivered={delivered} />)
    fireEvent.click(screen.getByRole('button', { name: 'Camera vị trí' }))
    fireEvent.click(screen.getByRole('button', { name: 'Camera hàng' }))
    fireEvent.change(screen.getByLabelText('Số lượng giao'), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận giao' }))
    await waitFor(() => expect(delivered).toHaveBeenCalledOnce())
    expect(delivered.mock.calls[0]?.[0].items[0]).toMatchObject({
      deliveredQuantity: expected,
      quantityPrecision: precision,
      scannedSlotCode: 'KOVIA:LOC:RACK:rack',
      scannedProductCode: 'BARCODE-MILK',
    })
  }
)
