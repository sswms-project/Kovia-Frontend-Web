import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferReceiptFormValues } from '../../schemas/transfer-fulfillment.schema'
import { ReceiveEntryCard } from './ReceiveEntryCard'
import type { ReceiptPlanState } from '../../utils/transfer-receive-plan'

afterEach(cleanup)

function Harness({
  suggestedSlotLabel,
  suggestedSlotId,
  slotLabel,
  destinationSlotId = '',
  scannedSlotCode = 'A07',
  planState,
  onSplitExcess = vi.fn(),
}: {
  suggestedSlotLabel?: string
  suggestedSlotId?: string
  slotLabel?: string
  destinationSlotId?: string
  scannedSlotCode?: string
  planState?: ReceiptPlanState
  onSplitExcess?: (index: number) => void
}) {
  const form = useForm<TransferReceiptFormValues>({
    defaultValues: {
      entries: [
        {
          lineId: 'l1',
          lotId: null,
          productLabel: 'SKU-1',
          destinationSlotId,
          scannedSlotCode,
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
      planState={planState}
      onSplitExcess={onSplitExcess}
    />
  )
}

describe('ReceiveEntryCard', () => {
  it('does not show a prefilled location as scan-confirmed and keeps the optional product scan collapsed', () => {
    render(<Harness destinationSlotId="slot-1" scannedSlotCode="" slotLabel="Khu K01 / Kệ A07" />)
    expect(screen.getByLabelText('Quét mã vị trí cất hàng')).toBeInTheDocument()
    expect(screen.queryByLabelText('Quét mã hàng (không bắt buộc)')).not.toBeInTheDocument()
  })

  it('shows the reason panel and can split a partially overflowing allocation', () => {
    const split = vi.fn()
    render(
      <Harness
        planState={{
          isPlanned: true,
          isOffPlan: true,
          budgetBefore: 10,
          withinPlan: 10,
          excess: 10,
        }}
        onSplitExcess={split}
      />
    )
    expect(screen.getByLabelText('Nhóm lý do')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nhóm lý do'), { target: { value: 'Other' } })
    expect(screen.getByLabelText('Mô tả lý do')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tách phần vượt kế hoạch' }))
    expect(split).toHaveBeenCalledWith(0)
  })

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
