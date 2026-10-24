import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferPickSheetLine } from '../../types/transfer.types'
import { INITIAL_PICK_SCAN_STATE, type PickScanState } from '../../utils/transfer-scan'
import { PickEntryDialog } from './PickEntryDialog'

let reportCode: ((code: string) => void) | undefined
let cameraActive = false

vi.mock('./InlineCameraScanner', () => ({
  InlineCameraScanner: (props: { active: boolean; onCode: (code: string) => void }) => {
    reportCode = props.onCode
    cameraActive = props.active
    return props.active ? <div data-testid="camera" /> : null
  },
}))
vi.mock('@/lib/camera-scan', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/camera-scan')>()),
  isCameraScanSupported: () => true,
}))

afterEach(() => {
  cleanup()
  reportCode = undefined
  cameraActive = false
})

const line = {
  lineId: 'l1',
  sku: 'SKU-1',
  productName: 'Bia Tiger',
  baseUnitName: 'Thùng',
  remainingQuantity: 6,
  suggestions: [],
  picks: [],
} as unknown as TransferPickSheetLine

function renderDialog(
  scan: PickScanState,
  handlers = { slot: vi.fn(), product: vi.fn() },
  eachUnit = false
) {
  const props = {
    line,
    scan,
    quantity: 6,
    maximumQuantity: 6,
    quantityError: null,
    isPending: false,
    eachUnit,
    onScanSlot: handlers.slot,
    onScanProduct: handlers.product,
    onQuantityChange: vi.fn(),
    onUseAlternative: vi.fn(),
    onRescan: vi.fn(),
    onConfirm: vi.fn(),
    onOpenChange: vi.fn(),
  }
  const view = render(<PickEntryDialog {...props} />)
  return {
    ...handlers,
    updateScan: (next: PickScanState) => view.rerender(<PickEntryDialog {...props} scan={next} />),
  }
}

describe('PickEntryDialog camera', () => {
  it('keeps camera focus after the location, then focuses quantity after the product', async () => {
    const view = renderDialog(INITIAL_PICK_SCAN_STATE)
    await userEvent.click(screen.getByRole('button', { name: /Bật camera quét/ }))
    const cameraButton = screen.getByRole('button', { name: /Tắt camera quét/ })
    expect(cameraButton).toHaveFocus()
    view.updateScan({ ...INITIAL_PICK_SCAN_STATE, step: 'product', slotCode: 'A07' })
    expect(cameraButton).toHaveFocus()
    expect(screen.getByTestId('camera')).toBeInTheDocument()
    view.updateScan({
      ...INITIAL_PICK_SCAN_STATE,
      step: 'ready',
      slotCode: 'A07',
      productCode: 'SKU-1',
    })
    expect(screen.getByLabelText('3. Số lượng lấy')).toHaveFocus()
    expect(screen.queryByTestId('camera')).not.toBeInTheDocument()
  })

  it('keeps the camera in each-unit mode and restores product input focus when camera is turned off', async () => {
    const view = renderDialog(INITIAL_PICK_SCAN_STATE, undefined, true)
    await userEvent.click(screen.getByRole('button', { name: /Bật camera quét/ }))
    const cameraButton = screen.getByRole('button', { name: /Tắt camera quét/ })
    view.updateScan({ ...INITIAL_PICK_SCAN_STATE, step: 'product', slotCode: 'A07' })
    expect(cameraButton).toHaveFocus()
    await userEvent.click(cameraButton)
    expect(screen.getByLabelText('2. Quét mã hàng')).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: /Bật camera quét/ }))
    view.updateScan({
      ...INITIAL_PICK_SCAN_STATE,
      step: 'ready',
      slotCode: 'A07',
      productCode: 'SKU-1',
    })
    expect(screen.getByRole('button', { name: /Tắt camera quét/ })).toHaveFocus()
    expect(screen.getByTestId('camera')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Tắt camera quét/ }))
    expect(screen.getByLabelText('2. Quét mã hàng')).toHaveFocus()
  })

  it('uses a wheel-safe quantity field and preserves the decimal separator while typing', async () => {
    renderDialog({ ...INITIAL_PICK_SCAN_STATE, step: 'ready' })
    const input = screen.getByRole('textbox', { name: '3. Số lượng lấy' })
    fireEvent.wheel(input, { deltaY: 100 })
    expect(input).toHaveValue('6')
    await userEvent.clear(input)
    await userEvent.type(input, '1.25')
    expect(input).toHaveValue('1.25')
  })
  it('sends camera codes to the location step first, then to the product step', async () => {
    const handlers = renderDialog(INITIAL_PICK_SCAN_STATE)
    await userEvent.click(screen.getByRole('button', { name: /Bật camera quét/ }))
    expect(screen.getByTestId('camera')).toBeInTheDocument()

    act(() => reportCode?.('A07'))
    expect(handlers.slot).toHaveBeenCalledWith('A07')
    expect(handlers.product).not.toHaveBeenCalled()
  })

  it('routes camera codes to the product step once the location is confirmed', async () => {
    const handlers = renderDialog({ ...INITIAL_PICK_SCAN_STATE, step: 'product' })
    await userEvent.click(screen.getByRole('button', { name: /Bật camera quét/ }))

    act(() => reportCode?.('SKU-1'))
    expect(handlers.product).toHaveBeenCalledWith('SKU-1')
    expect(handlers.slot).not.toHaveBeenCalled()
  })

  it('pauses the camera when both codes are scanned so the quantity can be entered', async () => {
    renderDialog({ ...INITIAL_PICK_SCAN_STATE, step: 'ready', productCode: 'SKU-1' })
    expect(
      screen.getByText(
        'Đã quét đủ. Camera tạm dừng để bạn nhập số lượng; bấm Quét lại để quét tiếp.'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bật camera quét/ })).toBeDisabled()
    expect(cameraActive).toBe(false)
    expect(screen.queryByTestId('camera')).not.toBeInTheDocument()
  })
  it('shows a camera frame and a full-width start action before asking for permission', () => {
    renderDialog(INITIAL_PICK_SCAN_STATE)
    expect(screen.getByText('Khung quét mã QR / mã vạch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bật camera quét/ })).toHaveClass('h-11', 'w-full')
    expect(screen.queryByTestId('camera')).not.toBeInTheDocument()
  })
})
