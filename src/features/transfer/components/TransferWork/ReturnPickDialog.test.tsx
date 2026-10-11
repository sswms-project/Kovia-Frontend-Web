import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferPickReturnFormValues } from '../../schemas/transfer-fulfillment.schema'
import type { TransferPickDetail, TransferPickSheetLine } from '../../types/transfer.types'
import { ReturnPickDialog } from './ReturnPickDialog'

afterEach(cleanup)

const line = { lineId: 'l1', sku: 'SKU-1', productName: 'Bia Tiger', baseUnitName: 'Thùng' }
const picks = [
  {
    id: 'p1',
    inventoryStockId: 's1',
    slotCode: '__SYSTEM_DEFAULT__',
    lotId: null,
    lotNumber: null,
    pickedQuantity: 6,
    returnedQuantity: 0,
    dispatchedQuantity: 0,
    pickedAt: '2026-10-09T01:00:00Z',
    rackCode: 'A07',
    isSystemDefaultSlot: true,
    rackId: 'rack-1',
    zoneCode: 'K01',
  },
] as TransferPickDetail[]

function Harness({ onScanSlot }: { onScanSlot: (code: string) => void }) {
  const form = useForm<TransferPickReturnFormValues>({
    defaultValues: { pickDetailId: 'p1', quantity: 1, scannedSlotCode: '' },
  })
  return (
    <ReturnPickDialog
      line={line as unknown as TransferPickSheetLine}
      form={form}
      picks={picks}
      isPending={false}
      scannedSlotError={null}
      onScanSlot={onScanSlot}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
    />
  )
}

describe('ReturnPickDialog scan', () => {
  it('tells the user which location to scan and rejects another location immediately', async () => {
    const onScanSlot = vi.fn()
    render(<Harness onScanSlot={onScanSlot} />)
    expect(screen.getByText('Quét mã của Khu K01 / Kệ A07')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Quét mã vị trí để trả/), 'A-01{Enter}')

    expect(onScanSlot).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Mã A-01 không khớp. Hãy quét mã của Khu K01 / Kệ A07.'
    )
  })

  it('accepts the short code, the zone-qualified label and the printed label of the chosen pick', async () => {
    const onScanSlot = vi.fn()
    render(<Harness onScanSlot={onScanSlot} />)
    const input = screen.getByLabelText(/Quét mã vị trí để trả/)

    await userEvent.type(input, 'A07{Enter}')
    await userEvent.type(input, 'k01-a07{Enter}')
    await userEvent.type(input, 'KOVIA:LOC:RACK:rack-1{Enter}')

    expect(onScanSlot).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
