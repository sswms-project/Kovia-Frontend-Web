import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StagingPointChoice } from './StagingPointChoice'

afterEach(cleanup)
const points = {
  items: [
    { slotId: 'a', label: 'Khu A / Điểm chờ 01' },
    { slotId: 'b', label: 'Khu B / Điểm chờ 02' },
  ],
  suggestedSlotId: 'a',
  configuredDefaultSlotId: 'a',
  invalidDefault: false,
}

it('shows the complete path and lets staff choose another point only for this task', () => {
  const onChange = vi.fn()
  render(
    <StagingPointChoice
      id="stage"
      title="Điểm chờ xuất"
      points={points}
      value="a"
      onChange={onChange}
    />
  )
  expect(screen.getByText('Khu A / Điểm chờ 01')).toBeInTheDocument()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Đổi vị trí' }))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
  expect(onChange).toHaveBeenCalledWith('b')
})

it('locks a point already bound to the shipment', () => {
  render(
    <StagingPointChoice
      id="stage"
      title="Điểm chờ nhận"
      points={points}
      value="b"
      frozen
      onChange={vi.fn()}
    />
  )
  expect(screen.getByText('Khu B / Điểm chờ 02')).toBeInTheDocument()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Đổi vị trí' })).not.toBeInTheDocument()
})
