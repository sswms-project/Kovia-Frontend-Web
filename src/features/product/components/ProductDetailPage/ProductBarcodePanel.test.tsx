import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductBarcodePanel } from './ProductBarcodePanel'

describe('ProductBarcodePanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('prints through a dedicated body-level layer and removes it after printing', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    // JsBarcode đo chữ bằng canvas khi in kèm giá trị; jsdom không có canvas nên giả lập.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      measureText: () => ({ width: 10 }),
    } as unknown as CanvasRenderingContext2D)
    render(
      <ProductBarcodePanel
        sku="SKU000005"
        barcodeValue="8930000000005"
        canGenerate={false}
        isGenerating={false}
        onGenerate={() => undefined}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /In nhãn/ }))

    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    const layer = document.body.querySelector(':scope > [data-barcode-print-root]')
    expect(layer).not.toBeNull()
    expect(layer?.querySelector('svg')).not.toBeNull()
    expect(layer).toHaveTextContent('SKU000005')

    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(document.body.querySelector('[data-barcode-print-root]')).toBeNull()
  })
})
