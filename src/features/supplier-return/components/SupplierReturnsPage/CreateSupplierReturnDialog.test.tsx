import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import {
  createSupplierReturnSchema,
  type CreateSupplierReturnFormValues,
} from '../../schemas/supplier-return.schema'
import { buildStock } from './fixtures'
import { CreateSupplierReturnDialog } from './CreateSupplierReturnDialog'

const stocks = [
  buildStock(),
  buildStock({
    id: 'stock-2',
    slotId: 'slot-2',
    slotCode: 'A-02',
    qualityStatus: 'Damaged',
    eligibilityStatus: 'DamageHold',
    quantityOnHand: 4,
    reservedQuantity: 0,
  }),
]

function Harness({
  onSubmit,
  stockPage = 1,
  stockPageCount = 1,
  onStockPageChange = vi.fn(),
}: {
  readonly onSubmit: (values: CreateSupplierReturnFormValues) => void
  readonly stockPage?: number
  readonly stockPageCount?: number
  readonly onStockPageChange?: (page: number) => void
}) {
  const form = useForm<CreateSupplierReturnFormValues>({
    resolver: zodResolver(createSupplierReturnSchema),
    defaultValues: {
      warehouseId: 'warehouse-1',
      supplierId: 'supplier-1',
      reason: '',
      negotiationNote: '',
      lines: [],
    },
  })
  return (
    <CreateSupplierReturnDialog
      open
      form={form}
      warehouses={[{ id: 'warehouse-1', label: 'Kho trung tâm' }]}
      suppliers={[{ id: 'supplier-1', label: 'Nhà cung cấp A' }]}
      stocks={stocks}
      stockSearch=""
      isStocksLoading={false}
      isPending={false}
      onStockSearchChange={vi.fn()}
      stockPage={stockPage}
      stockPageCount={stockPageCount}
      onStockPageChange={onStockPageChange}
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
    />
  )
}

async function addStock(slotCode: string) {
  const user = userEvent.setup()
  const picker = screen.getByLabelText(/Chọn vị trí tồn/)
  const option = within(picker).getByRole('option', { name: new RegExp(slotCode) })
  await user.selectOptions(picker, option)
  await user.click(screen.getByRole('button', { name: /Thêm dòng/ }))
}

describe('CreateSupplierReturnDialog', () => {
  it('searches stock by product name or SKU only', () => {
    render(<Harness onSubmit={vi.fn()} />)
    const search = screen.getByLabelText('Tìm hàng tồn')
    expect(search).toHaveAttribute('placeholder', 'Tên hoặc SKU sản phẩm…')
    expect(screen.queryByRole('button', { name: 'Trang tồn sau' })).not.toBeInTheDocument()
  })

  it('pages through stock rows beyond the first page', async () => {
    const onStockPageChange = vi.fn()
    render(
      <Harness
        onSubmit={vi.fn()}
        stockPage={1}
        stockPageCount={3}
        onStockPageChange={onStockPageChange}
      />
    )
    expect(screen.getByText('Trang 1/3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trang tồn trước' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trang tồn sau' }))
    expect(onStockPageChange).toHaveBeenCalledWith(2)
  })

  it('shows returnable quantity as on hand minus reserved, including held stock', () => {
    render(<Harness onSubmit={vi.fn()} />)
    expect(screen.getByRole('option', { name: /A-01.*có thể trả 7/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /A-02.*có thể trả 4/ })).toBeInTheDocument()
  })

  it('requires a reason', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await addStock('A-01')
    await userEvent.setup().click(screen.getByRole('button', { name: /Lập phiếu/ }))
    expect(await screen.findByText('Vui lòng nhập lý do trả hàng.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not offer a stock position that is already on the form', async () => {
    render(<Harness onSubmit={vi.fn()} />)
    await addStock('A-01')
    const picker = screen.getByLabelText(/Chọn vị trí tồn/)
    expect(within(picker).queryByRole('option', { name: /A-01/ })).not.toBeInTheDocument()
    expect(within(picker).getByRole('option', { name: /A-02/ })).toBeInTheDocument()
  })

  it('submits a valid return', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)
    await addStock('A-01')
    await user.type(screen.getByLabelText(/Lý do/), 'Hàng lỗi')
    const quantity = screen.getByLabelText(/Số lượng trả/)
    await user.clear(quantity)
    await user.type(quantity, '5')
    await user.click(screen.getByRole('button', { name: /Lập phiếu/ }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })
})
