import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducer } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferPickSheetLine } from '../../types/transfer.types'
import { INITIAL_PICK_SCAN_STATE, pickScanReducer } from '../../utils/transfer-scan'
import { PickEntryDialog } from './PickEntryDialog'
import { ScanInput } from './ScanInput'

afterEach(cleanup)

const line = {
  lineId: 'l1',
  sku: 'SKU-1',
  productName: 'Bia Tiger',
  productBarcode: '893',
  baseUnitName: 'Thùng',
  remainingQuantity: 4,
  suggestions: [
    {
      inventoryStockId: 's1',
      slotId: 'sl1',
      slotCode: '__SYSTEM_DEFAULT__',
      slotBarcode: null,
      lotId: null,
      lotNumber: null,
      expiryDate: null,
      suggestedQuantity: 4,
      reservedQuantity: 4,
      rackCode: 'A07',
      isSystemDefaultSlot: true,
    },
  ],
} as unknown as TransferPickSheetLine

function Harness({ onConfirm }: { readonly onConfirm: () => void }) {
  const [scan, dispatch] = useReducer(pickScanReducer, INITIAL_PICK_SCAN_STATE)
  return (
    <PickEntryDialog
      line={line}
      scan={scan}
      quantity={4}
      maximumQuantity={4}
      quantityError={null}
      isPending={false}
      onScanSlot={(code) =>
        dispatch({ type: 'scan-slot', code, suggestions: line.suggestions, alternatives: [], line })
      }
      onScanProduct={(code) => dispatch({ type: 'scan-product', code, line })}
      onQuantityChange={vi.fn()}
      onUseAlternative={vi.fn()}
      onRescan={() => dispatch({ type: 'reset' })}
      onConfirm={onConfirm}
      onOpenChange={vi.fn()}
    />
  )
}

describe('scanner keystrokes without touching the mouse', () => {
  it('moves from slot to product to quantity and confirms with Enter', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<Harness onConfirm={onConfirm} />)

    // Máy quét gõ mã rồi Enter vào ô đang focus; không có thao tác chuột nào.
    await user.keyboard('A07{Enter}')
    expect(screen.getByLabelText(/2\. Quét mã hàng/)).toHaveFocus()

    await user.keyboard('SKU-1{Enter}')
    expect(screen.getByLabelText(/3\. Số lượng lấy/)).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('tells the user when a product code is scanned into the slot step and vice versa', async () => {
    const user = userEvent.setup()
    render(<Harness onConfirm={vi.fn()} />)

    await user.keyboard('SKU-1{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Đây là mã hàng. Hãy quét mã vị trí trước.')
    expect(screen.getByLabelText(/1\. Quét mã vị trí/)).toHaveFocus()

    await user.keyboard('A07{Enter}')
    await user.keyboard('A07{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Đây là mã vị trí. Hãy quét mã hàng.')
    expect(screen.getByLabelText(/2\. Quét mã hàng/)).toHaveFocus()
  })
})

describe('ScanInput terminators', () => {
  it('treats Tab as end of scan only when a code was typed', async () => {
    const onScan = vi.fn()
    const user = userEvent.setup()
    render(<ScanInput id="s" label="Quét" autoFocus onScan={onScan} />)
    await user.keyboard('{Tab}')
    expect(onScan).not.toHaveBeenCalled()
    await user.click(screen.getByLabelText('Quét'))
    await user.keyboard('A-01{Tab}')
    expect(onScan).toHaveBeenCalledExactlyOnceWith('A-01')
  })
})
