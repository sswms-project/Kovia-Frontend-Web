import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LocationBarcodeResponse } from '../../types/warehouse.types'
import { WarehouseLocationBarcodeView } from './WarehouseLocationBarcodeView'

const barcode = {
  locationType: 'Rack',
  locationCode: 'A01',
  barcodeValue: 'KOVIA-RACK-01a0f7e1-8500-7084-9ce8-6091b6b68d78',
  symbology: 'Code128',
  displayPath: 'Đà Nẵng / Khu vực K01 / Kệ A01',
} as LocationBarcodeResponse

describe('WarehouseLocationBarcodeView', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lets a long barcode shrink to its container instead of scrolling sideways', () => {
    render(<WarehouseLocationBarcodeView warehouseId="w1" barcode={barcode} />)
    const svg = screen.getByRole('img', { name: 'Mã vạch A01' })
    expect(svg).toHaveClass('max-w-full', 'h-auto')
    expect(svg.getAttribute('viewBox')).toBeTruthy()
  })

  it('prints through a dedicated layer attached to the body and removes it afterwards', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    render(<WarehouseLocationBarcodeView warehouseId="w1" barcode={barcode} />)

    await userEvent.click(screen.getByRole('button', { name: /In nhãn/ }))

    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    const layer = document.body.querySelector(':scope > [data-barcode-print-root]')
    expect(layer).not.toBeNull()
    expect(layer?.querySelector('svg')).not.toBeNull()
    expect(layer).toHaveTextContent('A01')

    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(document.body.querySelector('[data-barcode-print-root]')).toBeNull()
  })
})
