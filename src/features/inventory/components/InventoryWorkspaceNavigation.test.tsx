import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { InventoryWorkspaceNavigation } from './InventoryWorkspaceNavigation'

afterEach(cleanup)
const permissions = [P.INVENTORY_VIEW, P.STOCK_ADJUSTMENTS_VIEW]
const views = [
  ['availability', 'Tồn kho khả dụng'],
  ['adjustments', 'Điều chỉnh'],
  ['movements', 'Lịch sử biến động'],
  ['reservations', 'Tồn đang giữ'],
  ['damage-cases', 'Hàng hỏng'],
  ['opening-stocks', 'Tồn đầu'],
  ['abc', 'Phân loại ABC'],
  ['discrepancies', 'Chênh lệch'],
] as const

describe('InventoryWorkspaceNavigation', () => {
  it.each(views)('uses the shared underline navigation on %s', (currentView, label) => {
    render(<InventoryWorkspaceNavigation currentView={currentView} permissions={permissions} />)
    const navigation = screen.getByRole('navigation', { name: 'Không gian kiểm soát tồn kho' })
    expect(navigation).toHaveAttribute('data-slot', 'operational-workspace-navigation')
    const links = within(navigation).getAllByRole('link')
    expect(links).toHaveLength(8)
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1)
    const active = within(navigation).getByRole('link', { name: label })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).not.toHaveClass('bg-primary', 'text-primary-foreground')
    expect(links.every((link) => link.getAttribute('href')?.startsWith('/inventory'))).toBe(true)
    expect(navigation.querySelector('svg')).not.toBeInTheDocument()
  })
  it('retains permission visibility and does not expose removed cycle-count navigation', () => {
    const view = render(
      <InventoryWorkspaceNavigation currentView="availability" permissions={[P.INVENTORY_VIEW]} />
    )
    expect(screen.getAllByRole('link')).toHaveLength(7)
    expect(screen.queryByRole('link', { name: 'Điều chỉnh' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Kiểm kê' })).not.toBeInTheDocument()
    view.rerender(
      <InventoryWorkspaceNavigation
        currentView="adjustments"
        permissions={[P.STOCK_ADJUSTMENTS_VIEW]}
      />
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Điều chỉnh' })).toHaveAttribute('aria-current', 'page')
  })
  it('keeps feature-owned actions outside the navigation and callable', () => {
    const onCreate = vi.fn()
    render(
      <InventoryWorkspaceNavigation
        currentView="opening-stocks"
        permissions={permissions}
        actions={<button onClick={onCreate}>Tạo chứng từ</button>}
      />
    )
    const action = screen.getByRole('button', { name: 'Tạo chứng từ' })
    expect(screen.getByRole('navigation')).not.toContainElement(action)
    fireEvent.click(action)
    expect(onCreate).toHaveBeenCalledOnce()
  })
})
