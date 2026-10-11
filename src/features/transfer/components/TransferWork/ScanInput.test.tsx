import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScanInput } from './ScanInput'

afterEach(cleanup)

describe('ScanInput', () => {
  it('submits the code when a keyboard-wedge scanner presses Enter and clears the field', async () => {
    const onScan = vi.fn()
    const user = userEvent.setup()
    render(<ScanInput id="scan" label="Quét mã vị trí" onScan={onScan} />)
    const input = screen.getByLabelText('Quét mã vị trí')
    await user.type(input, '  A-01 {Enter}')
    expect(onScan).toHaveBeenCalledExactlyOnceWith('A-01')
    expect(input).toHaveValue('')
  })

  it('submits typed codes with the confirm button and ignores empty input', async () => {
    const onScan = vi.fn()
    const user = userEvent.setup()
    render(<ScanInput id="scan" label="Quét mã hàng" onScan={onScan} />)
    const button = screen.getByRole('button', { name: /xác nhận/i })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('Quét mã hàng'), 'SKU-9')
    await user.click(button)
    expect(onScan).toHaveBeenCalledExactlyOnceWith('SKU-9')
  })

  it('does not accept scans while disabled or pending', async () => {
    const onScan = vi.fn()
    const user = userEvent.setup()
    const view = render(<ScanInput id="scan" label="Quét" disabled onScan={onScan} />)
    await user.type(screen.getByLabelText('Quét'), 'A{Enter}')
    expect(onScan).not.toHaveBeenCalled()
    view.rerender(<ScanInput id="scan" label="Quét" pending onScan={onScan} />)
    await user.type(screen.getByLabelText('Quét'), 'A{Enter}')
    expect(onScan).not.toHaveBeenCalled()
  })

  it('shows the confirmed value and announces errors', () => {
    const view = render(<ScanInput id="scan" label="Quét" confirmedValue="A-01" onScan={vi.fn()} />)
    expect(screen.getByText('A-01')).toBeInTheDocument()
    view.rerender(
      <ScanInput
        id="scan"
        label="Quét"
        confirmedValue="A-01"
        error="Mã không khớp."
        onScan={vi.fn()}
      />
    )
    expect(screen.queryByText('A-01')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Mã không khớp.')
    expect(screen.getByLabelText('Quét')).toHaveAttribute('aria-invalid', 'true')
  })
})
