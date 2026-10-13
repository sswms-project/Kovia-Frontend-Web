import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WarehouseList } from './WarehouseList'

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
const warehouses = [
  {
    id: 'warehouse-1',
    warehouseCode: 'KHO-01',
    warehouseName: 'Kho trung tâm',
    address: 'Hà Nội',
    status: 'Active',
    createdAt: '2026-10-01T00:00:00Z',
  },
]
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  push.mockClear()
})

describe('WarehouseList', () => {
  it('navigates from a plain cell once, while the real link owns link clicks', () => {
    render(<WarehouseList warehouses={warehouses} />)
    fireEvent.click(screen.getAllByText('KHO-01')[0]!)
    expect(push).toHaveBeenCalledExactlyOnceWith('/warehouses/warehouse-1')
    push.mockClear()
    fireEvent.click(screen.getAllByRole('link', { name: 'Kho trung tâm' })[0]!)
    expect(push).not.toHaveBeenCalled()
    expect(screen.queryByText('Xem chi tiết')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')[1]!.querySelector('a')).toBeNull()
  })

  it('does not navigate when selecting text; modifier row click opens a new tab', () => {
    render(<WarehouseList warehouses={warehouses} />)
    const selection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => 'KHO' } as Selection)
    fireEvent.click(screen.getAllByText('KHO-01')[0]!)
    expect(push).not.toHaveBeenCalled()
    selection.mockRestore()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    fireEvent.click(screen.getAllByText('KHO-01')[0]!, { ctrlKey: true })
    expect(open).toHaveBeenCalledWith('/warehouses/warehouse-1', '_blank', 'noopener')
    expect(push).not.toHaveBeenCalled()
  })
  it('links the warehouse name to its detail page on desktop and mobile', () => {
    render(
      <WarehouseList
        warehouses={[
          {
            id: 'warehouse-1',
            warehouseCode: 'KHO-01',
            warehouseName: 'Kho trung tâm',
            address: 'Hà Nội',
            status: 'Active',
            createdAt: '2026-10-01T00:00:00Z',
          },
        ]}
      />
    )

    const warehouseNameLinks = screen.getAllByRole('link', { name: 'Kho trung tâm' })
    expect(warehouseNameLinks).toHaveLength(2)
    warehouseNameLinks.forEach((link) =>
      expect(link).toHaveAttribute('href', '/warehouses/warehouse-1')
    )
  })
})
