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
  slotCodeUnreadable = false,
  onMarkUnreadable,
  onSearchSlots,
}: {
  suggestedSlotLabel?: string
  suggestedSlotId?: string
  slotLabel?: string
  destinationSlotId?: string
  scannedSlotCode?: string
  planState?: ReceiptPlanState
  onSplitExcess?: (index: number) => void
  slotCodeUnreadable?: boolean
  onMarkUnreadable?: (index: number, option: { value: string; label: string } | null) => void
  onSearchSlots?: (value: string) => void
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
          slotCodeUnreadable,
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
      slotOptions={[{ value: 'slot-2', label: 'Khu K01 / Kệ A07 / S02' }]}
      onMarkUnreadable={onMarkUnreadable}
      onSearchSlots={onSearchSlots}
    />
  )
}

describe('ReceiveEntryCard', () => {
  it('offers a way out when the slot label cannot be scanned, and asks for a label or other reason', () => {
    const search = vi.fn()
    const first = render(<Harness onMarkUnreadable={vi.fn()} onSearchSlots={search} />)
    fireEvent.click(screen.getByRole('button', { name: 'Không quét được mã vị trí?' }))
    expect(search).toHaveBeenCalledWith('')
    expect(screen.getByLabelText('Vị trí cất hàng khi không quét được mã')).toBeInTheDocument()
    first.unmount()
    render(
      <Harness
        slotCodeUnreadable
        destinationSlotId="slot-2"
        scannedSlotCode=""
        onMarkUnreadable={vi.fn()}
      />
    )
    const options = screen.getByLabelText('Nhóm lý do')
    expect(Array.from(options.querySelectorAll('option')).map((option) => option.value)).toEqual([
      '',
      'LabelMismatch',
      'Other',
    ])
    expect(screen.getByLabelText('Quét mã vị trí cất hàng')).toBeInTheDocument()
  })

  it('hides the way out when no slot list is wired in', () => {
    render(<Harness />)
    expect(
      screen.queryByRole('button', { name: 'Không quét được mã vị trí?' })
    ).not.toBeInTheDocument()
  })

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
