import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordStockPickingDialog } from './RecordStockPickingDialog'
import {
  recordStockPickingSchema,
  type RecordStockPickingFormValues,
} from '../../schemas/stock-issue.schema'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { setScanPreferences } from '@/features/transfer/utils/scan-preferences'

vi.mock('@/features/transfer/components/TransferWork/CameraScanPanel', () => ({
  CameraScanPanel: ({
    open,
    onOpenChange,
    onCode,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCode: (code: string) => unknown
  }) => (
    <div>
      Camera dùng chung
      <button onClick={() => onOpenChange(!open)}>{open ? 'Tắt camera' : 'Bật camera'}</button>
      {open && (
        <>
          <button onClick={() => onCode('Z1-R1')}>Camera vị trí</button>
          <button onClick={() => onCode('BAR')}>Camera mã hàng</button>
        </>
      )}
    </div>
  ),
}))
const save = vi.fn<(values: RecordStockPickingFormValues) => Promise<void>>(async () => {})
const close = vi.fn()
const source = {
  inventoryStockId: 'stock',
  slotId: 'slot',
  slotCode: '__SYSTEM_DEFAULT__',
  zoneCode: 'Z1',
  rackCode: 'R1',
  lotId: null,
  lotNumber: null,
  expiryDate: null,
  reservedQuantity: 20,
}
// Rendering reads only identity and source mapping from the order.
const order = {
  id: 'order',
  stockIssueRequestCode: 'XK01',
  warehouseName: 'Kho A',
  recipientName: 'Khách',
  items: [{ id: 'item', pickLocations: [source] }],
} as StockIssueRequestSummary
function Harness({ uncertain = false }: { uncertain?: boolean }) {
  const form = useForm<RecordStockPickingFormValues>({
    resolver: zodResolver(recordStockPickingSchema),
    defaultValues: {
      lines: [
        {
          stockIssueRequestItemId: 'item',
          productId: 'product',
          inventoryStockId: 'stock',
          productName: 'Hàng',
          sku: 'SKU',
          barcode: 'BAR',
          availableQuantity: 2,
          remainingQuantity: 2,
          pickedQuantity: 0,
          unitName: 'Hộp',
          unitFactor: 10,
          slotCode: 'R1',
          slotPath: 'Khu Z1 / Kệ R1',
          destinationStagingSlotId: 'staging',
          stagingPath: 'ZX / XUAT-01',
        },
      ],
    },
  })
  return (
    <RecordStockPickingDialog
      order={order}
      form={form}
      isPending={false}
      isUncertain={uncertain}
      onOpenChange={close}
      onSubmit={save}
    />
  )
}
function scan(label: string, code: string) {
  const input = screen.getByLabelText(label)
  fireEvent.change(input, { target: { value: code } })
  fireEvent.keyDown(input, { key: 'Enter' })
}
beforeEach(() => {
  vi.clearAllMocks()
  setScanPreferences({ feedback: false, eachUnit: false })
})
describe('outbound picking workspace', () => {
  it.each([false, true])('keeps camera focus between codes, each-unit=%s', (eachUnit) => {
    setScanPreferences({ eachUnit })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Bật camera' }))
    const camera = screen.getByRole('button', { name: 'Tắt camera' })
    camera.focus()
    fireEvent.click(screen.getByRole('button', { name: 'Camera vị trí' }))
    expect(camera).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Camera mã hàng' }))
    if (eachUnit) {
      expect(camera).toHaveFocus()
      expect(screen.getByLabelText('3. Số lượng lấy (Hộp)')).toHaveValue('1')
      fireEvent.click(camera)
      expect(screen.getByLabelText('2. Quét mã hàng')).toHaveFocus()
    } else {
      expect(screen.getByLabelText('3. Số lượng lấy (Hộp)')).toHaveFocus()
    }
  })

  it('persists one source immediately on confirm, without staging scan or final batch save', async () => {
    render(<Harness />)
    expect(screen.getByText('Camera dùng chung')).toBeInTheDocument()
    const list = screen.getByRole('region', { name: 'Hàng cần lấy' })
    expect(list).toHaveClass('flex-none', 'lg:flex-1')
    expect(list.querySelector('article')).not.toHaveClass('border')
    expect(list.querySelector('[data-slot="operational-list-body"]')).toHaveClass(
      'divide-y',
      'content-start'
    )
    expect(screen.queryByLabelText(/chờ xuất đích/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lưu kết quả lấy hàng' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('2. Quét mã hàng')).toBeDisabled()
    scan('1. Quét mã vị trí', 'Z1-R1')
    expect(screen.getByLabelText('2. Quét mã hàng')).toHaveFocus()
    scan('2. Quét mã hàng', 'WRONG')
    expect(screen.getByRole('button', { name: 'Xác nhận & tiếp tục' })).toBeDisabled()
    scan('2. Quét mã hàng', 'BAR')
    expect(screen.getByLabelText('3. Số lượng lấy (Hộp)')).toHaveFocus()
    fireEvent.change(screen.getByLabelText('3. Số lượng lấy (Hộp)'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận & tiếp tục' }))
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    expect(save.mock.calls[0]?.[0]).toMatchObject({
      lines: [
        {
          pickedQuantity: 1,
          scannedSlotCode: 'Z1-R1',
          scannedBarcode: 'BAR',
          destinationStagingSlotId: 'staging',
        },
      ],
    })
  })
  it('locks source scans and closing when a previous commit result is uncertain', () => {
    render(<Harness uncertain />)
    expect(screen.getByLabelText('1. Quét mã vị trí')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeDisabled()
    expect(screen.getByText(/Chưa xác định kết quả lưu/)).toBeInTheDocument()
  })
})
