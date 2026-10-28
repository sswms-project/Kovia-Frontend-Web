import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DatePickerField } from './DatePickerField'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('uses the current Vietnam minute for Today and allows changing or clearing the optional time', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-28T02:15:30Z'))
  function FieldHarness() {
    const [value, setValue] = useState('')
    return (
      <>
        <DatePickerField
          id="expectedDate"
          label="Ngày nhận hàng dự kiến"
          required
          withTime
          value={value}
          onChange={setValue}
        />
        <output data-testid="value">{value}</output>
      </>
    )
  }
  render(<FieldHarness />)
  fireEvent.click(screen.getByRole('button', { name: 'Ngày nhận hàng dự kiến' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
  expect(screen.getByTestId('value')).toHaveTextContent('2026-10-28T09:15')
  const time = screen.getByLabelText('Thời gian (không bắt buộc)')
  expect(time).toHaveValue('09:15')
  fireEvent.change(time, { target: { value: '10:20' } })
  expect(screen.getByTestId('value')).toHaveTextContent('2026-10-28T10:20')
  fireEvent.change(time, { target: { value: '' } })
  expect(screen.getByTestId('value').textContent).toBe('2026-10-28')
})
