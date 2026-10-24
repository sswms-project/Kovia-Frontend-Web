import { render, screen, within, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { StockIssueGoodsPreview } from './StockIssueGoodsPreview'
import { StockIssueRequestTable } from './StockIssueRequestTable'
import { TooltipProvider } from '@/components/ui/tooltip'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const order: StockIssueRequestSummary = {
  id: 'request',
  stockIssueRequestCode: 'XK000001',
  stockRecipientId: 'recipient',
  stockRecipientName: 'Recipient',
  recipientCode: 'KH01',
  warehouseId: 'warehouse',
  warehouseName: 'Kho A',
  purpose: null,
  referenceCode: null,
  issueDate: null,
  note: null,
  recipientName: 'Recipient',
  recipientPhone: '',
  recipientEmail: null,
  recipientAddress: '',
  status: 'Picking',
  createdAt: '2026-10-23T08:00:00Z',
  dispatchAuthorizedByUserId: null,
  dispatchAuthorizedAt: null,
  dispatchedAt: null,
  assignedStaffId: null,
  assignedStaffName: null,
  version: 'v1',
  attachments: [],
  items: [
    {
      id: 'item',
      productId: 'product',
      productName: 'Kềm A3',
      sku: 'SKU1',
      quantity: 20,
      pickedQuantity: 10,
      returnedQuantity: 0,
      returnableQuantity: 0,
      note: null,
      barcode: null,
      enteredQuantity: 2,
      enteredUnitId: 'box',
      enteredUnitName: 'Hộp',
      conversionFactor: 10,
      pickDetails: [],
      pickLocations: [
        {
          inventoryStockId: 'stock',
          slotId: 'slot',
          slotCode: '__SYSTEM_DEFAULT__',
          zoneCode: 'K01',
          rackCode: 'A04',
          isSystemDefaultSlot: true,
          lotId: null,
          lotNumber: null,
          expiryDate: null,
          reservedQuantity: 10,
        },
      ],
    },
  ],
}

describe('outbound goods preview', () => {
  it('keeps entered-unit quantities separate from base-unit source reservations', () => {
    render(
      <StockIssueGoodsPreview
        selected
        order={order}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />
    )
    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')
    expect(cells[5]).toHaveTextContent('2')
    expect(cells[6]).toHaveTextContent('1')
    expect(cells[7]).toHaveTextContent('1')
    expect(cells[8]).toHaveTextContent('Khu K01 / Kệ A04')
    expect(cells[8]).toHaveTextContent('10 đơn vị cơ sở còn giữ')
    expect(screen.queryByText(/__SYSTEM_DEFAULT__/)).not.toBeInTheDocument()
  })
  it('hides cached goods when loading, rejected, or no longer selected; permits retry', () => {
    const onRetry = vi.fn()
    const view = render(
      <StockIssueGoodsPreview selected order={order} isLoading isError={false} onRetry={onRetry} />
    )
    expect(screen.queryByText('SKU1')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Đang tải chi tiết hàng hóa')).toBeInTheDocument()
    view.rerender(
      <StockIssueGoodsPreview selected order={order} isLoading={false} isError onRetry={onRetry} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.queryByText('SKU1')).not.toBeInTheDocument()
    view.rerender(
      <StockIssueGoodsPreview
        selected={false}
        order={order}
        isLoading={false}
        isError={false}
        onRetry={onRetry}
      />
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
  it('paginates goods independently and resets when document key changes', () => {
    const many = {
      ...order,
      items: Array.from({ length: 11 }, (_, index) => ({
        ...order.items[0]!,
        id: String(index),
        sku: `SKU-${index}`,
      })),
    }
    const view = render(
      <StockIssueGoodsPreview
        key="a"
        selected
        order={many}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(screen.getByText('SKU-10')).toBeInTheDocument()
    view.rerender(
      <StockIssueGoodsPreview
        key="b"
        selected
        order={many}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />
    )
    expect(screen.queryByText('SKU-10')).not.toBeInTheDocument()
    expect(screen.getByText('SKU-0')).toBeInTheDocument()
  })
  it('selects a row by mouse or keyboard without intercepting the detail link', () => {
    const onPreview = vi.fn()
    render(
      <TooltipProvider>
        <StockIssueRequestTable
          items={[order]}
          previewId={order.id}
          onPreview={onPreview}
          capabilities={{
            canCreate: false,
            canAssignPicker: false,
            canPick: false,
            canAuthorizeDispatch: false,
            canDispatch: false,
            canCancel: false,
          }}
          handlers={{
            onReleaseForPicking: vi.fn(),
            onRecordStockPicking: vi.fn(),
            onReportPickIssue: vi.fn(),
            onAuthorizeDispatch: vi.fn(),
            onConfirmDispatch: vi.fn(),
            onCancel: vi.fn(),
          }}
        />
      </TooltipProvider>
    )
    const row = screen.getByRole('row', { name: /XK000001/ })
    fireEvent.click(within(row).getByText('Recipient'))
    expect(onPreview).toHaveBeenCalledExactlyOnceWith(order)
    fireEvent.keyDown(row, { key: ' ' })
    expect(onPreview).toHaveBeenCalledTimes(2)
    expect(within(row).getByRole('link')).toHaveAttribute('href', '/stock-issue-requests/request')
    expect(within(row).getByRole('link').parentElement).not.toHaveClass('truncate')
    expect(within(row).getByRole('link').parentElement).toHaveClass(
      'wrap-anywhere',
      'whitespace-normal'
    )
    expect(row).toHaveAttribute('data-state', 'selected')
  })
})
