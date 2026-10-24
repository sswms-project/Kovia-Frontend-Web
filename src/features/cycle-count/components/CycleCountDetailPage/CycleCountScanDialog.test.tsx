import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CycleCountItem } from '../../types/cycle-count.types'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import { CycleCountScanDialog } from './CycleCountScanDialog'

vi.mock('@/features/transfer/components/TransferWork/CameraScanPanel', () => ({
  CameraScanPanel: ({
    open,
    onOpenChange,
    onCode,
    disabled,
    repeatGuardMs,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCode: (code: string) => boolean
    disabled: boolean
    repeatGuardMs?: number
  }) => (
    <div data-testid="camera-panel" data-repeat-guard={repeatGuardMs}>
      <button onClick={() => onOpenChange(!open)}>Camera</button>
      {open && (
        <input
          aria-label="Camera code"
          disabled={disabled}
          onChange={(event) => onCode(event.target.value)}
        />
      )}
    </div>
  ),
}))

const item: CycleCountItem = {
  id: 'item-1',
  productId: 'product-1',
  productName: 'Bia Tiger',
  productSku: 'SKU000005',
  slotId: 'slot-1',
  slotCode: '__SYSTEM_DEFAULT__',
  rackCode: 'A03',
  rackId: 'rack-1',
  zoneCode: 'K01',
  zoneName: 'Hàng tiêu dùng',
  rackName: 'Kệ 03',
  isSystemDefaultSlot: true,
  systemQuantity: null,
  countedQuantity: null,
  countedDamagedQuantity: null,
  difference: null,
  countedBy: null,
  countedAt: null,
  requestedRecountRound: null,
  activeAdjustmentId: null,
  activeAdjustmentStatus: null,
  countHistory: [],
  lotId: null,
  lotNumber: null,
  qualityStatus: 'Good',
  unitName: 'Lon',
  expiryDate: null,
  countedByName: null,
  note: null,
  countMethod: 'Manual',
  scannedBarcode: null,
  productBarcode: '893TEST',
  slotBarcode: null,
  damageReason: null,
  damageEvidence: [],
  damageConfirmedAt: null,
  damageCaseId: null,
  damageCaseStatus: null,
}

function openScanner(items = [item]) {
  const onSave = vi.fn().mockResolvedValue(true)
  render(
    <CycleCountScanDialog
      open
      items={items}
      isPending={false}
      evidenceActions={{ onUpload: vi.fn(), onDownload: vi.fn() }}
      onOpenChange={vi.fn()}
      onSave={onSave}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Camera' }))
  return onSave
}

describe('cycle count location scanning', () => {
  it('shows zone before rack and hides the internal default slot', () => {
    expect(formatStockLocation(item)).toBe('Khu vực K01 · Hàng tiêu dùng / Kệ A03 · Kệ 03')
    expect(formatStockLocation({ ...item, isSystemDefaultSlot: false, slotCode: 'S01' })).toContain(
      '/ S01'
    )
  })

  it.each(['KOVIA:LOC:RACK:rack-1', 'KOVIA:LOC:SLOT:slot-1', 'K01-A03', ' a03 '])(
    'accepts location label %s, keeps the camera step stable, then records the product count',
    async (code) => {
      const onSave = openScanner()
      const camera = screen.getByLabelText('Camera code')
      camera.focus()
      fireEvent.change(camera, { target: { value: code } })
      expect(screen.getByText(/^Đã chọn vị trí/)).toHaveTextContent('Khu vực K01')
      expect(camera).toHaveFocus()
      fireEvent.change(camera, { target: { value: '893TEST' } })
      const quantity = screen.getByLabelText('Số đếm thực tế')
      expect(quantity).toHaveFocus()
      fireEvent.change(quantity, { target: { value: '3' } })
      fireEvent.click(screen.getByRole('button', { name: 'Lưu và quét tiếp' }))
      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith([
          expect.objectContaining({
            itemId: item.id,
            quantity: 3,
            countMethod: 'Scanned',
            scannedBarcode: '893TEST',
          }),
        ])
      )
    }
  )

  it('rejects duplicate raw rack codes, but accepts the unique rack QR', () => {
    openScanner([
      item,
      { ...item, id: 'item-2', slotId: 'slot-2', rackId: 'rack-2', zoneCode: 'K02' },
    ])
    fireEvent.change(screen.getByLabelText('Camera code'), { target: { value: 'A03' } })
    expect(screen.getByRole('alert')).toHaveTextContent('trùng ở nhiều vị trí')
    expect(screen.queryByLabelText('Mã hàng')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Camera code'), {
      target: { value: 'KOVIA:LOC:RACK:rack-2' },
    })
    expect(screen.getByText(/^Đã chọn vị trí/)).toHaveTextContent('K02')
  })

  it.each(['__SYSTEM_DEFAULT__', 'KOVIA:LOC:RACK:wrong-rack'])('rejects %s', (code) => {
    openScanner()
    fireEvent.change(screen.getByLabelText('Camera code'), { target: { value: code } })
    expect(screen.getByRole('alert')).toHaveTextContent('không nằm trong phiếu')
    expect(screen.queryByLabelText('Mã hàng')).not.toBeInTheDocument()
  })

  it('locks edits, Enter and closing synchronously until a save settles', async () => {
    let finish: (saved: boolean) => void = () => undefined
    const pending = new Promise<boolean>((resolve) => {
      finish = resolve
    })
    const onSave = vi.fn().mockReturnValue(pending)
    const onOpenChange = vi.fn()
    render(
      <CycleCountScanDialog
        open
        items={[item]}
        isPending={false}
        onSave={onSave}
        onOpenChange={onOpenChange}
        evidenceActions={{ onUpload: vi.fn(), onDownload: vi.fn() }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Camera' }))
    fireEvent.change(screen.getByLabelText('Camera code'), { target: { value: 'K01-A03' } })
    fireEvent.change(screen.getByLabelText('Camera code'), { target: { value: '893TEST' } })
    const quantity = screen.getByLabelText('Số đếm thực tế')
    fireEvent.change(quantity, { target: { value: '3' } })
    act(() => {
      // Both events arrive before the parent can repaint its mutation pending state.
      fireEvent.keyDown(quantity, { key: 'Enter' })
      fireEvent.keyDown(quantity, { key: 'Enter' })
    })
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(quantity).toBeDisabled()
    expect(screen.getByLabelText('Trong đó hỏng')).toBeDisabled()
    expect(screen.getByLabelText('Vị trí')).toBeDisabled()
    expect(screen.getByLabelText('Mã hàng')).toBeDisabled()
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeDisabled()
    fireEvent.keyDown(quantity, { key: 'Escape' })
    expect(onOpenChange).not.toHaveBeenCalled()
    await act(async () => finish(false))
    expect(quantity).toBeEnabled()
    expect(quantity).toHaveValue(3)
  })

  it('keeps manual location/product entry available and retains the count on a failed save', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(true)
    render(
      <CycleCountScanDialog
        open
        items={[item]}
        isPending={false}
        onSave={onSave}
        onOpenChange={vi.fn()}
        evidenceActions={{ onUpload: vi.fn(), onDownload: vi.fn() }}
      />
    )
    const slot = screen.getByLabelText('Vị trí')
    fireEvent.change(slot, { target: { value: 'K01-A03' } })
    fireEvent.keyDown(slot, { key: 'Enter' })
    const product = screen.getByLabelText('Mã hàng')
    fireEvent.change(product, { target: { value: item.productSku } })
    fireEvent.keyDown(product, { key: 'Enter' })
    const quantity = screen.getByLabelText('Số đếm thực tế')
    fireEvent.change(quantity, { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và quét tiếp' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Số đã nhập được giữ lại')
    )
    expect(quantity).toHaveValue(4)
    expect(quantity).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và quét tiếp' }))
    await waitFor(() => expect(screen.queryByLabelText('Số đếm thực tế')).not.toBeInTheDocument())
    expect(onSave).toHaveBeenCalledTimes(2)
    expect(onSave.mock.calls[1]?.[0]).toEqual([
      expect.objectContaining({ quantity: 4, scannedBarcode: item.productSku }),
    ])
  })

  it('uses the shared short camera guard only when counting individual units', () => {
    openScanner()
    expect(screen.getByTestId('camera-panel')).not.toHaveAttribute('data-repeat-guard')
    fireEvent.change(screen.getByLabelText('Camera code'), { target: { value: 'K01-A03' } })
    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByTestId('camera-panel')).toHaveAttribute('data-repeat-guard', '600')
    fireEvent.change(screen.getByLabelText('Camera code'), { target: { value: '893TEST' } })
    fireEvent.change(screen.getByLabelText('Camera code'), { target: { value: 'SKU000005' } })
    expect(screen.getByLabelText('Số đếm thực tế')).toHaveValue(2)
    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByTestId('camera-panel')).not.toHaveAttribute('data-repeat-guard')
  })
})
