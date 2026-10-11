import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PutAwayDeviationReport } from '../../types/inbound.types'
import { PutawayDeviationReportSheet } from './PutawayDeviationReportSheet'

const report: PutAwayDeviationReport = {
  from: '2026-09-07T00:00:00+00:00',
  to: '2026-10-07T00:00:00+00:00',
  totalLines: 40,
  deviatedLines: 10,
  heldSlotLines: 2,
  codeConfirmedLines: 30,
  byReason: [
    { reasonCode: 'SlotFull', label: 'Vị trí đã đầy', count: 7 },
    { reasonCode: null, label: 'Chưa phân loại', count: 3 },
  ],
  byStaff: [{ userId: 'user-1', fullName: 'Trần Văn An', totalLines: 20, deviatedLines: 8 }],
  bySlot: [{ slotId: 'slot-a', slotCode: 'A-01', count: 6 }],
  recent: [
    {
      goodsReceiptId: 'receipt-1',
      receiptCode: 'PN000012',
      sku: 'BEER',
      productName: 'Bia',
      slotCode: 'B-02',
      quantity: 24,
      performedByName: 'Trần Văn An',
      putAwayAt: '2026-10-06T08:00:00+00:00',
      reasonCode: 'SlotFull',
      reason: 'Vị trí đã đầy — kệ A kín',
      usedHeldSlot: true,
    },
  ],
}

afterEach(cleanup)

function renderSheet(overrides: Partial<Parameters<typeof PutawayDeviationReportSheet>[0]> = {}) {
  const handlers = { onOpenChange: vi.fn(), onRangeChange: vi.fn(), onRetry: vi.fn() }
  render(
    <PutawayDeviationReportSheet
      open
      rangeDays={30}
      report={report}
      isLoading={false}
      isError={false}
      {...handlers}
      {...overrides}
    />
  )
  return handlers
}

describe('PutawayDeviationReportSheet', () => {
  it('shows rates, reasons, staff, slots and recent deviations', () => {
    renderSheet()

    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('7 · 70%')).toBeInTheDocument()
    expect(screen.getByText('8 / 20 · 40%')).toBeInTheDocument()
    expect(screen.getByText('A-01')).toBeInTheDocument()
    expect(screen.getByText('Vị trí đã đầy — kệ A kín')).toBeInTheDocument()
    expect(screen.getByText('Vị trí đang chừa')).toBeInTheDocument()
  })

  it('lets the manager change the period', async () => {
    const user = userEvent.setup()
    const handlers = renderSheet()

    await user.selectOptions(screen.getByLabelText('Khoảng thời gian'), '90')

    expect(handlers.onRangeChange).toHaveBeenCalledWith(90)
  })

  it('says so when every put-away followed the recommendation or nothing was put away', () => {
    renderSheet({
      report: { ...report, deviatedLines: 0, byReason: [], byStaff: [], bySlot: [], recent: [] },
    })
    expect(screen.getByText(/đều theo khuyến nghị/)).toBeInTheDocument()
    cleanup()

    renderSheet({ report: { ...report, totalLines: 0 } })
    expect(screen.getByText('Chưa có lần cất hàng nào')).toBeInTheDocument()
  })

  it('offers a retry when the report cannot be loaded', async () => {
    const user = userEvent.setup()
    const handlers = renderSheet({ report: undefined, isError: true })

    await user.click(screen.getByRole('button', { name: /Thử lại/ }))

    expect(handlers.onRetry).toHaveBeenCalledOnce()
  })
})
