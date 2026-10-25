import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OperationalDateRangeFilter } from './OperationalDateRangeFilter'

function Harness({
  from = '',
  to = '',
  withTime = true,
  onChange,
}: {
  from?: string
  to?: string
  withTime?: boolean
  onChange: (range: { from: string; to: string }) => void
}) {
  const [range, setRange] = useState({ from, to })
  return (
    <OperationalDateRangeFilter
      {...range}
      label="ngày tạo"
      withTime={withTime}
      onChange={(next) => {
        setRange(next)
        onChange(next)
      }}
    />
  )
}

const trigger = () => screen.getByRole('button', { name: 'Lọc theo khoảng ngày tạo' })

describe('OperationalDateRangeFilter date and time', () => {
  afterEach(() => vi.useRealTimers())

  it('defaults newly selected dates to the current Vietnam time and only applies on confirmation', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T06:35:00Z'))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.click(trigger())
    expect(screen.getByLabelText('Từ giờ')).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /25 tháng 10/ }))
    expect(screen.getByLabelText('Từ giờ')).toHaveValue('13:35')
    expect(screen.getByLabelText('Đến giờ')).toHaveValue('13:35')
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      from: '2026-10-25T13:35',
      to: '2026-10-25T13:35',
    })
    expect(trigger()).toHaveTextContent('25/10/2026 13:35 – 25/10/2026 13:35')
  })

  it('blocks reversed times on one day and allows equal minute boundaries', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness from="2026-10-25T09:00" to="2026-10-25T10:00" onChange={onChange} />)
    await user.click(trigger())
    fireEvent.change(screen.getByLabelText('Từ giờ'), { target: { value: '11:00' } })
    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Thời điểm kết thúc phải bằng hoặc sau')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Đến giờ'), { target: { value: '11:00' } })
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-10-25T11:00', to: '2026-10-25T11:00' })
  })

  it('preserves entered times when changing the calendar range', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness from="2026-10-24T08:15" to="2026-10-25T17:45" onChange={onChange} />)
    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: /26 tháng 10/ }))
    expect(screen.getByLabelText('Từ giờ')).toHaveValue('08:15')
    expect(screen.getByLabelText('Đến giờ')).toHaveValue('17:45')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-10-24T08:15', to: '2026-10-26T17:45' })
  })

  it('discards unapplied edits on Escape and preserves the applied midnight time', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness from="2026-10-25T00:00" to="2026-10-25T15:00" onChange={onChange} />)
    await user.click(trigger())
    fireEvent.change(screen.getByLabelText('Từ giờ'), { target: { value: '12:00' } })
    await user.keyboard('{Escape}')
    expect(onChange).not.toHaveBeenCalled()
    await user.click(trigger())
    expect(screen.getByLabelText('Từ giờ')).toHaveValue('00:00')
  })

  it('lets users clear the hours for whole-day filtering and clear the entire filter', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness from="2026-10-25T09:00" to="2026-10-25T17:00" onChange={onChange} />)
    await user.click(trigger())
    fireEvent.change(screen.getByLabelText('Từ giờ'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Đến giờ'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-10-25', to: '2026-10-25' })
    await user.click(trigger())
    expect(screen.getByLabelText('Từ giờ')).toHaveValue('')
    expect(screen.getByLabelText('Đến giờ')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Xoá lọc ngày' }))
    expect(onChange).toHaveBeenLastCalledWith({ from: '', to: '' })
    expect(trigger()).toHaveTextContent('Khoảng ngày')
  })

  it('uses the current Vietnam day and time at Today click, including a midnight rollover', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T16:59:00Z'))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.click(trigger())
    vi.setSystemTime(new Date('2026-10-25T17:02:00Z'))
    await user.click(screen.getByRole('button', { name: 'Hôm nay' }))
    expect(screen.getByLabelText('Từ giờ')).toHaveValue('00:02')
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-10-26T00:02', to: '2026-10-26T00:02' })
  })

  it('keeps date-only callers immediate without time controls or Apply', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T06:35:00Z'))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness withTime={false} onChange={onChange} />)
    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: /October 25th/ }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-10-25', to: '2026-10-25' })
    expect(screen.queryByLabelText('Từ giờ')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Áp dụng' })).not.toBeInTheDocument()
  })
})
