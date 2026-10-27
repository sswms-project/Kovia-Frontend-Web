import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import { RestockReturnDialog } from './RestockReturnDialog'
import type { RestockReturnFormValues } from '../../schemas/restock-return.schema'
import type {
  GoodsReturnRequestSummary,
  GoodsReturnRestockOptions,
} from '../../types/stock-issue.types'

afterEach(cleanup)
const item: GoodsReturnRequestSummary = {
  id: 'return-1',
  goodsReturnRequestCode: 'RTN-1',
  stockIssueRequestId: 'issue-1',
  stockIssueRequestCode: 'XK-1',
  reason: 'Trả hàng',
  status: 'Approved',
  createdAt: '2026-10-27T00:00:00Z',
  createdBy: 'maker',
  approvedBy: 'approver',
  approvedAt: '2026-10-27T01:00:00Z',
  rejectionReason: null,
  items: [
    {
      id: 'line-1',
      stockIssuePickDetailId: 'pick-1',
      productId: 'product-1',
      productName: 'Bia',
      sku: 'SKU-1',
      quantity: 2,
      condition: 'Good',
      restockSlotId: 'slot-A',
      lotId: null,
      lotNumber: null,
    },
  ],
}
const options: GoodsReturnRestockOptions['items'] = [
  {
    returnItemId: 'line-1',
    options: ['A', 'B'].map((code) => ({
      slotId: `slot-${code}`,
      slotCode: code,
      path: `Khu K01 / Kệ ${code}`,
      suggestedQuantity: 2,
      availableQuantity: 10,
      isOriginalSlot: code === 'A',
      reason: 'Đủ chỗ',
      warnings: [],
    })),
  },
]
options.forEach((line) => {
  line.conditionOptions = [
    { condition: 'Good', options: line.options },
    {
      condition: 'Damaged',
      options: [
        {
          slotId: 'isolation',
          slotCode: 'CL',
          path: 'Khu CL / CACH-LY-01',
          isOriginalSlot: false,
          suggestedQuantity: 2,
          availableQuantity: 10,
          reason: 'Điểm cách ly',
          warnings: [],
        },
      ],
    },
    { condition: 'Expired', options: [] },
    { condition: 'Scrap', options: [] },
  ]
})
function Harness({
  loading = false,
  error = null,
  empty = false,
  pending = false,
  onSubmit = vi.fn(),
  onRetry = vi.fn(),
  scrap = false,
}: {
  loading?: boolean
  error?: string | null
  empty?: boolean
  pending?: boolean
  onSubmit?: (value: RestockReturnFormValues) => void
  onRetry?: () => void
  scrap?: boolean
}) {
  const condition = scrap ? 'Scrap' : 'Good'
  const form = useForm<RestockReturnFormValues>({
    defaultValues: {
      items: [{ returnItemId: 'line-1', condition, restockSlotId: scrap ? null : 'slot-A' }],
    },
  })
  return (
    <RestockReturnDialog
      item={{ ...item, items: item.items.map((line) => ({ ...line, condition })) }}
      form={form}
      options={empty ? [] : options}
      isLoading={loading}
      error={error}
      isPending={pending}
      onOpenChange={vi.fn()}
      onRetry={onRetry}
      onSubmit={onSubmit}
    />
  )
}
it('lets staff change actual destination without changing the approved condition or quantity', async () => {
  const onSubmit = vi.fn()
  render(<Harness onSubmit={onSubmit} />)
  expect(screen.getByRole('columnheader', { name: 'Tình trạng thực tế' })).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: /Tình trạng/ })).toHaveValue('Good')
  fireEvent.change(screen.getByRole('combobox', { name: 'Vị trí nhập Bia' }), {
    target: { value: 'slot-B' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập lại kho' }))
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(
      { items: [{ returnItemId: 'line-1', condition: 'Good', restockSlotId: 'slot-B' }] },
      expect.anything()
    )
  )
})
it.each([{ loading: true }, { error: 'Lỗi tải vị trí' }, { empty: true }, { pending: true }])(
  'blocks confirmation while data is unsafe: %j',
  (props) => {
    render(<Harness {...props} />)
    expect(
      screen.getByRole('button', { name: /Xác nhận nhập lại kho|Đang nhập kho/ })
    ).toBeDisabled()
  }
)
it('shows a retry action instead of treating failed data as an empty warehouse', () => {
  const onRetry = vi.fn()
  render(<Harness error="Lỗi tải vị trí" onRetry={onRetry} />)
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(onRetry).toHaveBeenCalledOnce()
})
it('does not require a destination for approved scrap', () => {
  render(<Harness scrap empty />)
  expect(screen.getByText('Không nhập kho')).toBeVisible()
  expect(screen.queryByRole('combobox', { name: 'Vị trí nhập Bia' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Xác nhận nhập lại kho' })).toBeEnabled()
})

it('switches to isolation options for actual damaged goods and records that actual condition', async () => {
  const onSubmit = vi.fn()
  render(<Harness onSubmit={onSubmit} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Tình trạng thực tế Bia' }), {
    target: { value: 'Damaged' },
  })
  expect(screen.getByRole('combobox', { name: 'Vị trí nhập Bia' })).toHaveValue('isolation')
  expect(screen.queryByRole('option', { name: 'Khu K01 / Kệ B' })).not.toBeInTheDocument()
  expect(screen.getByText('Đã duyệt: Còn tốt')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nhập lại kho' }))
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(
      { items: [{ returnItemId: 'line-1', condition: 'Damaged', restockSlotId: 'isolation' }] },
      expect.anything()
    )
  )
})

it('blocks expired stock without an isolation candidate, and scrap removes the destination', () => {
  render(<Harness />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Tình trạng thực tế Bia' }), {
    target: { value: 'Expired' },
  })
  expect(screen.getByText(/Chưa có điểm cách ly phù hợp/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Xác nhận nhập lại kho' })).toBeDisabled()
  fireEvent.change(screen.getByRole('combobox', { name: 'Tình trạng thực tế Bia' }), {
    target: { value: 'Scrap' },
  })
  expect(screen.getByText('Không nhập kho')).toBeVisible()
  expect(screen.queryByRole('combobox', { name: 'Vị trí nhập Bia' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Xác nhận nhập lại kho' })).toBeEnabled()
})
