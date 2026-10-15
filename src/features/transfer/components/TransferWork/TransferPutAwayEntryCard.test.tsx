import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransferPutAwayFormValues } from '../../schemas/transfer-putaway.schema'
import type { TransferPutAwaySheetRow } from '../../types/transfer-receipt.types'
import { TransferPutAwayEntryCard } from './TransferPutAwayEntryCard'

const { startCameraScan, isCameraScanSupported, stop } = vi.hoisted(() => ({
  startCameraScan: vi.fn(),
  isCameraScanSupported: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('../../utils/camera-scan', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/camera-scan')>()),
  startCameraScan,
  isCameraScanSupported,
}))
vi.mock('../../utils/scan-feedback', () => ({ playScanFeedback: vi.fn() }))
// Exercise the real dialog without Next.js's asynchronous chunk loader in jsdom.
vi.mock('next/dynamic', async () => {
  const { CameraScanDialog } = await import('./CameraScanDialog')
  return { default: () => CameraScanDialog }
})

const row: TransferPutAwaySheetRow = {
  lineId: '11111111-1111-1111-1111-111111111111',
  itemId: '22222222-2222-2222-2222-222222222222',
  productId: '33333333-3333-3333-3333-333333333333',
  sku: 'SKU00002',
  productName: 'Pin AA',
  baseUnitName: 'Cái',
  baseQuantityPrecision: 0,
  lotId: null,
  lotNumber: null,
  qualityStatus: 'Good',
  actualQuantity: 16,
  putAwayQuantity: 0,
  remainingQuantity: 16,
  planMode: 'Planned',
  planBudgets: [],
}
const onScanSlot = vi.fn()
const onScanProduct = vi.fn()

function TestCard({ disabled = false, pendingScan = false }) {
  const form = useForm<TransferPutAwayFormValues>({
    defaultValues: {
      entries: [
        {
          lineId: row.lineId,
          lotId: null,
          qualityStatus: 'Good',
          destinationSlotId: '',
          slotLabel: '',
          plannedSlotId: '',
          plannedSlotLabel: '',
          quantity: 16,
          scannedSlotCode: '',
          scannedProductCode: '',
          deviationReasonCode: '',
          note: '',
          slotCodeUnreadable: false,
        },
      ],
    },
  })
  return (
    <TransferPutAwayEntryCard
      index={0}
      row={row}
      form={form}
      disabled={disabled}
      pendingScan={pendingScan}
      planChanged={false}
      canRemove={false}
      slotOptions={[]}
      loadingSlots={false}
      onSearchSlots={vi.fn()}
      onMarkUnreadable={vi.fn()}
      onChangeSlot={vi.fn()}
      onScanSlot={onScanSlot}
      onScanProduct={onScanProduct}
      onSplit={vi.fn()}
      onSplitExcess={vi.fn()}
      onRemove={vi.fn()}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  isCameraScanSupported.mockReturnValue(true)
  startCameraScan.mockResolvedValue({ stop })
  onScanSlot.mockResolvedValue(true)
  onScanProduct.mockReturnValue(true)
})
afterEach(cleanup)

describe('TransferPutAwayEntryCard camera scanning', () => {
  it('opens the slot camera, validates the decoded code for this entry and focuses quantity', async () => {
    const user = userEvent.setup()
    render(<TestCard />)
    await user.click(
      screen.getByRole('button', { name: 'Quét bằng camera: Quét mã vị trí cất hàng' })
    )
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Quét mã vị trí cất hàng')
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))

    await act(async () => startCameraScan.mock.calls[0]?.[1]('A07'))

    expect(onScanSlot).toHaveBeenCalledExactlyOnceWith(0, 'A07')
    expect(onScanProduct).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('spinbutton', { name: 'Số lượng cất (Cái)' })).toHaveFocus()
    )
    expect(stop).toHaveBeenCalled()
  })

  it('routes the optional product camera to product validation rather than slot validation', async () => {
    const user = userEvent.setup()
    render(<TestCard />)
    await user.click(screen.getByRole('button', { name: 'Quét mã hàng (tùy chọn)' }))
    await user.click(
      screen.getByRole('button', { name: 'Quét bằng camera: Quét mã hàng (không bắt buộc)' })
    )
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))

    await act(async () => startCameraScan.mock.calls[0]?.[1]('SKU00002'))

    expect(onScanProduct).toHaveBeenCalledExactlyOnceWith(0, 'SKU00002')
    expect(onScanSlot).not.toHaveBeenCalled()
  })

  it('does not open the slot camera while resolving a scan', async () => {
    const user = userEvent.setup()
    render(<TestCard pendingScan />)
    const camera = screen.getByRole('button', { name: 'Quét bằng camera: Quét mã vị trí cất hàng' })
    expect(camera).toBeDisabled()
    await user.click(camera)
    expect(startCameraScan).not.toHaveBeenCalled()
  })

  it('disables both cameras when the form is blocked or saving', async () => {
    const user = userEvent.setup()
    render(<TestCard disabled />)
    await user.click(screen.getByRole('button', { name: 'Quét mã hàng (tùy chọn)' }))
    for (const camera of screen.getAllByRole('button', { name: /Quét bằng camera:/ })) {
      expect(camera).toBeDisabled()
      await user.click(camera)
    }
    expect(startCameraScan).not.toHaveBeenCalled()
  })

  it('keeps manual entry available when camera access is unsupported', () => {
    isCameraScanSupported.mockReturnValue(false)
    render(<TestCard />)
    expect(screen.queryByRole('button', { name: /Quét bằng camera:/ })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Quét mã vị trí cất hàng' })).toBeEnabled()
  })

  it('leaves a rejected code to the existing validation without advancing focus', async () => {
    const user = userEvent.setup()
    onScanSlot.mockResolvedValue(false)
    render(<TestCard />)
    await user.click(
      screen.getByRole('button', { name: 'Quét bằng camera: Quét mã vị trí cất hàng' })
    )
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))
    await act(async () => startCameraScan.mock.calls[0]?.[1]('WRONG-SLOT'))
    expect(onScanSlot).toHaveBeenCalledExactlyOnceWith(0, 'WRONG-SLOT')
    expect(screen.getByRole('spinbutton', { name: 'Số lượng cất (Cái)' })).not.toHaveFocus()
  })
})
