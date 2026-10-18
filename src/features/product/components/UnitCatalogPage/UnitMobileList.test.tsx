import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { UnitResponse } from '../../types/product.types'
import { UnitMobileList } from './UnitMobileList'

const unit: UnitResponse = {
  id: 'unit-1',
  unitCode: 'THUNG',
  unitName: 'Thùng',
  symbol: 'th',
  quantityPrecision: 0,
  description: null,
  status: 'Active',
  createdAt: '2026-09-29T00:00:00Z',
  modifiedAt: null,
}

describe('UnitMobileList', () => {
  it('selects, edits and changes the status of a unit from its card', () => {
    const onSelectedChange = vi.fn()
    const onEdit = vi.fn()
    const onStatusChange = vi.fn()
    render(
      <UnitMobileList
        units={[unit]}
        canManage
        isPending={false}
        selectedIds={new Set()}
        onSelectedChange={onSelectedChange}
        onEdit={onEdit}
        onStatusChange={onStatusChange}
      />
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn Thùng' }))
    expect(onSelectedChange).toHaveBeenCalledWith(unit, true)
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Thùng' }))
    expect(onEdit).toHaveBeenCalledWith(unit)
    fireEvent.click(screen.getByRole('button', { name: 'Ngừng Thùng' }))
    expect(onStatusChange).toHaveBeenCalledWith(unit)
  })

  it('shows a read-only card without manage permission', () => {
    render(
      <UnitMobileList
        units={[unit]}
        canManage={false}
        isPending={false}
        selectedIds={new Set()}
        onSelectedChange={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn()}
      />
    )

    expect(screen.getByText('Thùng')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
