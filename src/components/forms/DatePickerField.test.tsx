import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DatePickerField } from './DatePickerField'

describe('DatePickerField', () => {
  afterEach(() => vi.useRealTimers())

  function DateTimeHarness({ required = false }: { required?: boolean }) {
    const [value, setValue] = useState('2026-10-20')
    return (
      <DatePickerField
        id="arrival"
        label="Ngày hàng về"
        withTime
        required={required}
        disablePastDates
        value={value}
        onChange={setValue}
      />
    )
  }

  it('selects a calendar date without introducing a time into date-only forms', async () => {
    const onChange = vi.fn()
    render(<DatePickerField id="date" label="Ngày" value="2026-10-20" onChange={onChange} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Ngày' }))
    await user.click(screen.getByRole('button', { name: /21 tháng 10/ }))
    expect(onChange).toHaveBeenCalledWith('2026-10-21')
    expect(screen.queryByLabelText('Thời gian (không bắt buộc)')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xóa' })).not.toBeInTheDocument()
  })

  it('selects time, clears optional dates and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<DateTimeHarness />)
    await user.click(screen.getByRole('button', { name: 'Ngày hàng về' }))
    fireEvent.change(screen.getByLabelText('Thời gian (không bắt buộc)'), {
      target: { value: '00:00' },
    })
    expect(screen.getByRole('button', { name: 'Ngày hàng về' })).toHaveTextContent(
      '20/10/2026 00:00'
    )
    await user.click(screen.getByRole('button', { name: 'Xóa' }))
    expect(screen.getByRole('button', { name: 'Ngày hàng về' })).toHaveTextContent('Chọn ngày')
    expect(screen.getByLabelText('Thời gian (không bắt buộc)')).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Hôm nay' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ngày hàng về' })).toHaveFocus()
  })

  it('constrains the scrollable popup to the space available around its trigger', async () => {
    const user = userEvent.setup()
    render(<DateTimeHarness />)
    await user.click(screen.getByRole('button', { name: 'Ngày hàng về' }))

    expect(screen.getByRole('dialog')).toHaveClass(
      'max-h-(--radix-popover-content-available-height)',
      'max-w-[calc(100vw-2rem)]',
      'overflow-y-auto',
      'motion-reduce:animate-none'
    )
    expect(screen.getByRole('dialog')).not.toHaveClass('max-h-[80dvh]')
  })

  it('keeps the date-time trigger compact on desktop with larger mobile and touch targets', () => {
    render(<DateTimeHarness />)
    const trigger = screen.getByRole('button', { name: 'Ngày hàng về' })
    expect(trigger).toHaveClass('h-8', 'min-h-8', 'max-md:min-h-11', 'pointer-coarse:min-h-11')
    expect(trigger).not.toHaveClass('min-h-11')
  })

  it('uses today in Vietnam and disables yesterday; a required date cannot be cleared', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-13T18:00:00Z')) // 14 October in Vietnam
    render(<DateTimeHarness required />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Ngày hàng về' }))
    const yesterday = screen.getByRole('button', { name: /13 tháng 10/ })
    expect(yesterday).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Xóa' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hôm nay' }))
    expect(screen.getByRole('button', { name: 'Ngày hàng về' })).toHaveTextContent('14/10/2026')
  })
  it.each(['', '2026-10-20', '2026-10-20T08:15'])(
    'sets the current Vietnam date and time at click time instead of retaining %s',
    async (value) => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-10-23T16:59:00Z'))
      const onChange = vi.fn()
      render(
        <DatePickerField
          id="now"
          label="Ngày điều chuyển"
          withTime
          value={value}
          onChange={onChange}
        />
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Ngày điều chuyển' }))
      vi.setSystemTime(new Date('2026-10-23T17:02:00Z'))
      await user.click(screen.getByRole('button', { name: 'Hôm nay' }))
      expect(onChange).toHaveBeenCalledWith('2026-10-24T00:02')
    }
  )

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
