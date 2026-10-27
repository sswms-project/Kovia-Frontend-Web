import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { CreateSupplierReturnDialog } from './CreateSupplierReturnDialog'
import { buildStock } from './fixtures'
import type { CreateSupplierReturnFormValues } from '../../schemas/supplier-return.schema'
import type { SupplierReturnStockOption } from '../../types/supplier-return.types'

vi.mock('@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox', () => ({
  LookupCombobox: ({
    id,
    value,
    options,
    ariaLabel,
    onChange,
    disabled,
  }: {
    id: string
    value: string
    options: { value: string; label: string; description?: string }[]
    ariaLabel: string
    onChange: (value: string) => void
    disabled: boolean
  }) => (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value="">Chọn</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label} {option.description}
        </option>
      ))}
    </select>
  ),
}))
afterEach(cleanup)
const receiptId = '11111111-1111-4111-8111-111111111111'
const stocks: SupplierReturnStockOption[] = ['A', 'B'].map((code) => ({
  ...buildStock({
    id: code,
    sku: 'SKU000005',
    productName: 'Bia Tiger',
    zoneCode: 'K01',
    rackCode: code,
  }),
  sourceReceivedQuantity: 12,
  sourceRemainingQuantity: 12,
  returnableQuantity: 12,
  unattributedReturnedQuantity: 0,
}))
function Harness() {
  const form = useForm<CreateSupplierReturnFormValues>({
    defaultValues: {
      warehouseId: 'W',
      supplierId: 'S',
      sourceGoodsReceiptId: receiptId,
      reason: 'Trả hàng',
      negotiationNote: '',
      lines: [],
    },
  })
  return (
    <CreateSupplierReturnDialog
      open
      form={form}
      warehouses={[{ id: 'W', label: 'Kho W' }]}
      suppliers={[
        { id: 'S', label: 'NCC S' },
        { id: 'T', label: 'NCC T' },
      ]}
      receipts={[{ id: receiptId, label: 'PN-001' }]}
      stocks={stocks}
      isStocksLoading={false}
      isReceiptsLoading={false}
      receiptsError={null}
      stocksError={null}
      isPending={false}
      onStockSearchChange={vi.fn()}
      onReceiptSearchChange={vi.fn()}
      stockPage={1}
      stockPageCount={1}
      receiptPage={1}
      receiptPageCount={1}
      onStockPageChange={vi.fn()}
      onReceiptPageChange={vi.fn()}
      onRetrySources={vi.fn()}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
    />
  )
}
it('puts receiving-source and product selection before the reason and uses SKU - product labels', () => {
  render(<Harness />)
  const product = screen.getByRole('combobox', { name: 'Chọn hàng trả' })
  expect(
    product.compareDocumentPosition(screen.getByLabelText('Lý do trả hàng')) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
  expect(screen.getAllByRole('option', { name: /SKU000005 - Bia Tiger/ })).toHaveLength(2)
})
it('clears the receiving source and chosen lines when the supplier changes', () => {
  render(<Harness />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Chọn hàng trả' }), {
    target: { value: 'A' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Thêm dòng' }))
  expect(screen.getByRole('spinbutton', { name: 'Số lượng trả' })).toHaveValue(12)
  fireEvent.change(screen.getByLabelText('Nhà cung cấp'), { target: { value: 'T' } })
  expect(screen.getByRole('combobox', { name: 'Phiếu nhận hàng nguồn' })).toHaveValue('')
  expect(screen.getByRole('combobox', { name: 'Chọn hàng trả' })).toBeDisabled()
  expect(screen.queryByRole('spinbutton', { name: 'Số lượng trả' })).not.toBeInTheDocument()
})
it('reduces the next location default to the source remainder already selected on other lines', () => {
  render(<Harness />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Chọn hàng trả' }), {
    target: { value: 'A' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Thêm dòng' }))
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Số lượng trả' }), {
    target: { value: '7' },
  })
  fireEvent.change(screen.getByRole('combobox', { name: 'Chọn hàng trả' }), {
    target: { value: 'B' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Thêm dòng' }))
  const quantities = screen.getAllByRole('spinbutton', { name: 'Số lượng trả' })
  expect(quantities[0]).toHaveValue(7)
  expect(quantities[1]).toHaveValue(5)
})
