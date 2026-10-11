import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PutAwaySlotsDialog, type PutAwayItemRow } from './PutAwaySlotsDialog'

vi.mock('../TransferFormPage/TransferSlotMapDialog', () => ({
  TransferSlotMapDialog: () => null,
}))

afterEach(cleanup)

const ITEMS: PutAwayItemRow[] = [
  { id: 'i1', label: 'SKU-1 · Bia', locked: false },
  {
    id: 'i2',
    label: 'SKU-2 · Sữa',
    slot: { value: 'slot-2', label: 'Khu K01 / Kệ A07 / A-01' },
    locked: false,
  },
  { id: 'i3', label: 'SKU-3 · Nước', locked: true },
]

function renderDialog(onSubmit = vi.fn()) {
  render(
    <PutAwaySlotsDialog
      open
      warehouseId="w1"
      items={ITEMS}
      slotOptions={[{ value: 'slot-1', label: 'Khu K02 / Kệ B01 / B-01' }]}
      isLoadingSlots={false}
      isPending={false}
      onSlotSearchChange={vi.fn()}
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
    />
  )
  return onSubmit
}

describe('PutAwaySlotsDialog', () => {
  it('cannot be saved until a line changes, and sends only the changed lines', () => {
    const onSubmit = renderDialog()
    expect(screen.getByRole('button', { name: 'Lưu vị trí cất' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ vị trí cất SKU-2 · Sữa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu vị trí cất' }))

    expect(onSubmit).toHaveBeenCalledWith([{ itemId: 'i2', destinationSlotId: null }])
  })

  it('shows the saved slot and explains why a line that started receiving is locked', () => {
    renderDialog()
    expect(screen.getByDisplayValue('Khu K01 / Kệ A07 / A-01')).toBeInTheDocument()
    expect(screen.getByText('Đã bắt đầu nhận hàng, không đổi được vị trí cất.')).toBeInTheDocument()
  })
})
