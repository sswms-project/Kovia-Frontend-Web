import { cleanup, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferReceiptFormValues } from '../../schemas/transfer-fulfillment.schema'
import { ReceiveEntryCard } from './ReceiveEntryCard'

afterEach(cleanup)

function Harness({
  suggestedSlotLabel,
  suggestedSlotId,
  slotLabel,
  destinationSlotId = '',
}: {
  suggestedSlotLabel?: string
  suggestedSlotId?: string
  slotLabel?: string
  destinationSlotId?: string
}) {
  const form = useForm<TransferReceiptFormValues>({
    defaultValues: {
      entries: [
        {
          lineId: 'l1',
          lotId: null,
          productLabel: 'SKU-1',
          destinationSlotId,
          scannedSlotCode: 'A07',
          scannedProductCode: '',
          goodQuantity: 20,
          damagedQuantity: 0,
          missingQuantity: 0,
          reasonCode: '',
          note: '',
        },
      ],
    },
  })
  return (
    <ReceiveEntryCard
      index={0}
      form={form}
      heading="SKU-1 · Bia"
      lotLabel="Không theo lô"
      dispatchedQuantity={20}
      baseUnitName="Thùng"
      canRemove={false}
      slotLabel={slotLabel}
      suggestedSlotLabel={suggestedSlotLabel}
      suggestedSlotId={suggestedSlotId}
      disabled={false}
      isFindingSlot={false}
      onScanSlot={vi.fn()}
      onScanProduct={vi.fn()}
      onSplit={vi.fn()}
      onRemove={vi.fn()}
    />
  )
}

describe('ReceiveEntryCard', () => {
  it('shows where the warehouse manager wants the goods put away', () => {
    render(<Harness suggestedSlotLabel="Khu K01 / Kệ A07" />)
    expect(screen.getByText('Cất vào')).toBeInTheDocument()
    expect(screen.getByText('Khu K01 / Kệ A07')).toBeInTheDocument()
  })

  it('shows no hint when nothing was suggested', () => {
    render(<Harness />)
    expect(screen.queryByText('Cất vào')).not.toBeInTheDocument()
  })

  it('warns, without blocking, when a different slot than the suggested one was scanned', () => {
    const first = render(
      <Harness
        suggestedSlotLabel="Khu K01 / Kệ A07"
        suggestedSlotId="slot-1"
        destinationSlotId="slot-1"
        slotLabel="Khu K01 / Kệ A07"
      />
    )
    expect(screen.queryByText(/khác ô quản lý chọn/)).not.toBeInTheDocument()

    first.unmount()
    render(
      <Harness
        suggestedSlotLabel="Khu K01 / Kệ A07"
        suggestedSlotId="slot-1"
        destinationSlotId="slot-2"
        slotLabel="Khu K02 / Kệ B01"
      />
    )
    expect(screen.getByText(/khác ô quản lý chọn/)).toBeInTheDocument()
  })

  it('shows the full location once the slot has been scanned', () => {
    render(<Harness destinationSlotId="slot-1" slotLabel="Khu K01 / Kệ A07" />)
    expect(screen.getByText('Khu K01 / Kệ A07')).toBeInTheDocument()
  })
})
