import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpeningStockApprovalDialog } from './OpeningStockApprovalDialog'
import type { OpeningStockRecord } from '../types/inventory.types'

afterEach(cleanup)
const record: OpeningStockRecord = {
  id: 'record',
  code: 'OPEN-01',
  warehouseId: 'warehouse',
  warehouseName: 'Kho QA',
  effectiveDate: '2026-01-01',
  requiresV1Client: true,
  evidence: [],
  status: 'PendingApproval',
  revision: 1,
  createdByUserId: 'maker',
  createdByName: 'Người lập',
  submittedByUserId: 'maker',
  submittedAt: null,
  approvedByUserId: null,
  approvedAt: null,
  decisionReason: null,
  createdAt: '2026-01-02T12:00:00Z',
  version: 'version-1',
  lines: [
    {
      id: 'line',
      productId: 'product',
      sku: 'SP001',
      productName: 'Hàng theo lô',
      slotId: 'slot',
      slotCode: 'A-01',
      lotId: null,
      lotNumber: 'L-NEW',
      lotNumberSnapshot: 'L-NEW',
      manufacturedDateSnapshot: '2025-12-01',
      expiryDateSnapshot: '2027-01-01',
      qualityStatus: 'Good',
      eligibilityStatus: 'Available',
      quantity: 2,
      enteredUnitId: 'unit',
      enteredUnitName: 'Cái',
      enteredQuantity: 2,
      conversionFactorSnapshot: 1,
      baseQuantity: 2,
    },
  ],
}
describe('opening stock approval confirmation', () => {
  it('shows the effective date and pending lot before approving', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined)
    render(
      <OpeningStockApprovalDialog
        item={record}
        currentUserId="checker"
        pending={false}
        onClose={vi.fn()}
        onConfirm={confirm}
      />
    )
    expect(screen.getByText(/2026-01-01/)).toBeVisible()
    expect(screen.getByText(/L-NEW.*2025-12-01.*2027-01-01/)).toBeVisible()
    expect(screen.getByText('Sẽ tạo lô khi duyệt')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt & ghi sổ' }))
    await waitFor(() => expect(confirm).toHaveBeenCalledWith(false))
  })
  it('requires explicit self-approval and guards a double click', async () => {
    let finish: (() => void) | undefined
    const confirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    render(
      <OpeningStockApprovalDialog
        item={record}
        currentUserId="maker"
        pending={false}
        onClose={vi.fn()}
        onConfirm={confirm}
      />
    )
    const button = screen.getByRole('button', { name: 'Xác nhận duyệt & ghi sổ' })
    expect(button).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(button)
    fireEvent.click(button)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledWith(true)
    finish?.()
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked())
  })
})
