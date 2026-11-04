import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PdfExportButton } from './PdfExportButton'

const mocks = vi.hoisted(() => ({ pdf: vi.fn(), error: vi.fn() }))
vi.mock('@react-pdf/renderer', () => ({ pdf: mocks.pdf, Font: { getRegisteredFonts: () => ({}) } }))
vi.mock('./WarehousePdf', () => ({ createPdfFontFamily: () => 'test-font' }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { error: mocks.error, info: vi.fn() } }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PDF export button', () => {
  it('never renders a PDF when refreshing the authorized snapshot fails', async () => {
    render(
      <PdfExportButton
        prepare={async () => {
          throw new Error('Không có quyền')
        }}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Không có quyền'))
    expect(mocks.pdf).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toBeEnabled()
  })
  it('blocks duplicate clicks while checking the latest document', async () => {
    let reject!: (error: Error) => void
    const prepare = vi.fn(
      () =>
        new Promise<never>((_resolve, rejectPromise) => {
          reject = rejectPromise
        })
    )
    render(<PdfExportButton prepare={prepare} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(prepare).toHaveBeenCalledOnce())
    reject(new Error('Không thể tải dữ liệu mới'))
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
    expect(mocks.pdf).not.toHaveBeenCalled()
  })
})
