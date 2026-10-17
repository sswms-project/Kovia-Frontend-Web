import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpeningStockApprovalDialog } from './OpeningStockApprovalDialog'
import { OpeningStockActions } from './OpeningStocksPage/OpeningStockActions'
import type { OpeningStockRecord } from '../types/inventory.types'

afterEach(cleanup)
const record: OpeningStockRecord = {
  id: 'record',
  code: 'TDK-01',
  warehouseId: 'warehouse',
  warehouseName: 'Kho QA',
  status: 'Draft',
  revision: 1,
  createdByUserId: 'maker',
  createdByName: 'Người lập',
  createdAt: '2026-10-17T00:00:00Z',
  submittedByUserId: null,
  submittedAt: null,
  approvedByUserId: null,
  approvedAt: null,
  decisionReason: null,
  version: 'v1',
  effectiveDate: '2026-10-17',
  evidence: [],
  lines: [
    {
      id: 'line',
      productId: 'product',
      sku: 'SP-01',
      productName: 'Hàng QA',
      slotId: 'slot',
      slotCode: 'A-01',
      lotId: null,
      lotNumber: null,
      lotNumberSnapshot: 'LOT-01',
      manufacturedDateSnapshot: '2026-10-01',
      expiryDateSnapshot: '2027-10-01',
      qualityStatus: 'Good',
      eligibilityStatus: 'Available',
      quantity: 24,
      enteredUnitId: 'unit',
      enteredUnitName: 'Thùng',
      enteredQuantity: 2,
      conversionFactorSnapshot: 12,
      baseQuantity: 24,
    },
  ],
}

describe('opening-stock approval actions', () => {
  it.each([
    { canApprove: true, canSelfApprove: true, currentUserId: 'maker', direct: true },
    { canApprove: false, canSelfApprove: true, currentUserId: 'maker', direct: false },
    { canApprove: true, canSelfApprove: false, currentUserId: 'maker', direct: false },
    { canApprove: true, canSelfApprove: true, currentUserId: 'other', direct: false },
    { canApprove: true, canSelfApprove: true, currentUserId: null, direct: false },
  ])('offers direct approval only with both permissions on own draft: %j', (scope) => {
    const onApprove = vi.fn()
    const onAction = vi.fn()
    render(
      <OpeningStockActions
        item={record}
        canCreate
        isPending={false}
        {...scope}
        onEdit={vi.fn()}
        onReview={vi.fn()}
        onApprove={onApprove}
        onAction={onAction}
      />
    )
    if (scope.direct) {
      expect(screen.queryByRole('button', { name: 'Gửi duyệt' })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Duyệt & ghi sổ' }))
      expect(onApprove).toHaveBeenCalledWith(record)
      expect(onAction).not.toHaveBeenCalled()
    } else {
      expect(screen.queryByRole('button', { name: 'Duyệt & ghi sổ' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Gửi duyệt' })).toBeInTheDocument()
    }
  })

  it('retains independent approval for a submitted document without self-approval permission', () => {
    render(
      <OpeningStockActions
        item={{ ...record, status: 'PendingApproval' }}
        currentUserId="other"
        canCreate={false}
        canApprove
        canSelfApprove={false}
        isPending={false}
        onEdit={vi.fn()}
        onReview={vi.fn()}
        onApprove={vi.fn()}
        onAction={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Duyệt & ghi sổ' })).toBeInTheDocument()
  })

  it.each(['Posted', 'Cancelled', 'Rejected', 'Returned'] as const)(
    'never directly approves %s',
    (status) => {
      render(
        <OpeningStockActions
          item={{ ...record, status }}
          currentUserId="maker"
          canCreate
          canApprove
          canSelfApprove
          isPending={false}
          onEdit={vi.fn()}
          onReview={vi.fn()}
          onApprove={vi.fn()}
          onAction={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: 'Duyệt & ghi sổ' })).not.toBeInTheDocument()
    }
  )
})

it('shows separate table columns, correct entered/base quantities and requires explicit acknowledgement', async () => {
  const onConfirm = vi.fn().mockResolvedValue(undefined)
  render(
    <OpeningStockApprovalDialog
      item={record}
      currentUserId="maker"
      pending={false}
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />
  )
  const dialog = screen.getByRole('dialog')
  const table = within(dialog).getByRole('table')
  expect(within(table).getAllByRole('columnheader')).toHaveLength(11)
  const cells = within(within(table).getByRole('row', { name: /SP-01/ })).getAllByRole('cell')
  expect(cells[3]).toHaveTextContent(/^2$/)
  expect(cells[4]).toHaveTextContent('Thùng')
  expect(cells[5]).toHaveTextContent(/^24$/)
  expect(within(table).getByText('Sẽ tạo lô khi duyệt')).toBeInTheDocument()
  const confirm = within(dialog).getByRole('button', { name: 'Xác nhận duyệt & ghi sổ' })
  expect(confirm).toBeDisabled()
  fireEvent.click(within(dialog).getByRole('checkbox'))
  fireEvent.click(confirm)
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(true))
})
