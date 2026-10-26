import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { OrderType } from '@/types/api'
import { OperationalDateSort } from './OperationalDateSort'

describe('OperationalDateSort', () => {
  it('uses the shared API enum for both directions with keyboard and touch-friendly native selection', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState(OrderType.Descending)
      return (
        <OperationalDateSort
          value={value}
          onChange={(next) => {
            setValue(next)
            onChange(next)
          }}
        />
      )
    }
    render(<Harness />)
    const control = screen.getByRole('combobox', { name: 'Sắp xếp theo ngày tạo' })
    expect(control).toHaveValue(String(OrderType.Descending))
    const user = userEvent.setup()
    await user.selectOptions(control, 'Cũ nhất trước')
    expect(onChange).toHaveBeenLastCalledWith(OrderType.Ascending)
    await user.selectOptions(control, 'Mới nhất trước')
    expect(onChange).toHaveBeenLastCalledWith(OrderType.Descending)
  })
})
