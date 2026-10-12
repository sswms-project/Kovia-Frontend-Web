import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DatePickerField } from './DatePickerField'

describe('DatePickerField', () => {
  it('marks a required field and shows its error under the picker', () => {
    render(
      <DatePickerField
        id="expectedDate"
        label="Ngày nhận dự kiến"
        required
        error="Vui lòng chọn ngày dự kiến hàng về."
        value=""
        onChange={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Ngày nhận dự kiến' })
    expect(trigger).toHaveAttribute('aria-required', 'true')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Vui lòng chọn ngày dự kiến hàng về.')).toBeInTheDocument()
  })

  it('stays quiet when the field is optional and valid', () => {
    render(<DatePickerField id="date" label="Ngày" value="2026-10-20" onChange={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: 'Ngày' })
    expect(trigger).not.toHaveAttribute('aria-required', 'true')
    expect(trigger).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText('20/10/2026')).toBeInTheDocument()
  })
})
