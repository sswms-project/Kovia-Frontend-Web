import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferAllocationOption } from '../../types/transfer.types'
import { AdjustAllocationDialog } from './AdjustAllocationDialog'

afterEach(cleanup)

const HELD: TransferAllocationOption = {
  inventoryStockId: 'a',
  location: 'Khu K01 / Kệ A07 / A-01',
  lotNumber: 'L-EARLY',
  expiryDate: '2026-11-01',
  availableQuantity: 0,
  reservedForItem: 10,
  movableQuantity: 10,
}
const LATER: TransferAllocationOption = {
  inventoryStockId: 'b',
  location: 'Khu K01 / Kệ A07 / B-01',
  lotNumber: 'L-LATE',
  expiryDate: '2027-02-01',
  availableQuantity: 20,
  reservedForItem: 0,
  movableQuantity: 0,
}

function renderDialog(onSubmit = vi.fn().mockResolvedValue(true)) {
  render(
    <AdjustAllocationDialog
      open
      items={[{ id: 'item-1', label: 'SKU-1 · Bia' }]}
      itemId="item-1"
      options={[HELD, LATER]}
      isLoading={false}
      isError={false}
      isPending={false}
      onSelectItem={vi.fn()}
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
    />
  )
  return onSubmit
}

describe('AdjustAllocationDialog', () => {
  it('cannot be saved until something changes', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Lưu phân bổ' })).toBeDisabled()
  })

  it('sends the move and the optional reason, and warns when the lot is outside FEFO', () => {
    const onSubmit = renderDialog()
    fireEvent.change(screen.getByLabelText('Phân bổ mới tại Khu K01 / Kệ A07 / A-01'), {
      target: { value: '4' },
    })
    fireEvent.change(screen.getByLabelText('Phân bổ mới tại Khu K01 / Kệ A07 / B-01'), {
      target: { value: '6' },
    })
    expect(screen.getByText('Lấy ngoài FEFO')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Lý do (không bắt buộc)'), {
      target: { value: 'Kệ A đang kiểm kê' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phân bổ' }))

    expect(onSubmit).toHaveBeenCalledWith(
      [{ itemId: 'item-1', fromInventoryStockId: 'a', toInventoryStockId: 'b', quantity: 6 }],
      'Kệ A đang kiểm kê'
    )
  })

  it('lets the field be cleared while typing instead of forcing a zero', () => {
    renderDialog()
    const input = screen.getByLabelText('Phân bổ mới tại Khu K01 / Kệ A07 / A-01')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue(null)
    fireEvent.change(input, { target: { value: '7' } })
    expect(input).toHaveValue(7)
  })

  it('blocks a change that does not keep the total', () => {
    const onSubmit = renderDialog()
    fireEvent.change(screen.getByLabelText('Phân bổ mới tại Khu K01 / Kệ A07 / A-01'), {
      target: { value: '4' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Tổng số lượng phải giữ nguyên')
    expect(screen.getByRole('button', { name: 'Lưu phân bổ' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
