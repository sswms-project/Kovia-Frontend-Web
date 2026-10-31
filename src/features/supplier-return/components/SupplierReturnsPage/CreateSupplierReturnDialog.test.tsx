import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { expect, it, vi } from 'vitest'
import { CreateSupplierReturnDialog } from './CreateSupplierReturnDialog'
import type { CreateSupplierReturnFormValues } from '../../schemas/supplier-return.schema'
import type { SupplierReturnStockOption } from '../../types/supplier-return.types'

const stock = {
  id: 'stock',
  productId: 'product',
  sku: 'SUA',
  productName: 'Sữa',
  slotCode: 'A01',
  zoneCode: 'K01',
  rackCode: 'A',
  lotId: null,
  qualityStatus: 'Good',
  eligibilityStatus: 'Available',
  returnableQuantity: 5,
  sourceRemainingQuantity: 5,
  unitName: 'Thùng',
  quantityPrecision: 0,
} as unknown as SupplierReturnStockOption
const noop = vi.fn()
function Harness({ auto = true, loading = false }: { auto?: boolean; loading?: boolean }) {
  const form = useForm<CreateSupplierReturnFormValues>({
    defaultValues: {
      warehouseId: 'warehouse',
      supplierId: 'supplier',
      sourceGoodsReceiptId: 'receipt',
      reason: '',
      negotiationNote: '',
      lines: [],
    },
  })
  return (
    <CreateSupplierReturnDialog
      open
      form={form}
      warehouses={[{ id: 'warehouse', label: 'Kho' }]}
      suppliers={[{ id: 'supplier', label: 'NCC' }]}
      receipts={[{ id: 'receipt', label: 'PN000005' }]}
      stocks={[stock]}
      autoSelectSingleStock={auto}
      isStocksLoading={loading}
      isReceiptsLoading={false}
      receiptsError={null}
      stocksError={null}
      isPending={false}
      onStockSearchChange={noop}
      onReceiptSearchChange={noop}
      stockPage={1}
      stockPageCount={1}
      receiptPage={1}
      receiptPageCount={1}
      onStockPageChange={noop}
      onReceiptPageChange={noop}
      onRetrySources={noop}
      onOpenChange={noop}
      onSubmit={noop}
    />
  )
}
it('selects the sole complete-source candidate but never pre-fills the whole return quantity', () => {
  render(<Harness />)
  expect((screen.getByLabelText('Số lượng trả') as HTMLInputElement).value).toBe('0')
  expect(screen.queryByRole('button', { name: 'Thêm dòng' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Bỏ dòng/ }))
  expect(screen.queryByLabelText('Số lượng trả')).toBeNull()
})
it('adds a manually selected stock immediately without an extra button', async () => {
  render(<Harness auto={false} />)
  expect(screen.queryByLabelText('Số lượng trả')).toBeNull()
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: 'Chọn hàng trả' }))
  await user.click(screen.getByRole('option', { name: /SUA - Sữa/ }))
  expect((screen.getByLabelText('Số lượng trả') as HTMLInputElement).value).toBe('0')
  fireEvent.change(screen.getByLabelText('Nhà cung cấp'), { target: { value: '' } })
  expect(screen.queryByLabelText('Số lượng trả')).toBeNull()
})
it('waits for current source data before selecting or adding a stock row', () => {
  render(<Harness loading />)
  expect(screen.queryByLabelText('Số lượng trả')).toBeNull()
})
