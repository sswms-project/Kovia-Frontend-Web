import type { ComponentProps } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { P } from '@/config/permissionCodes'
import { USER_ROLES } from '@/config/roles'
import type { AuthUser } from '@/features/auth/types/auth.types'
import { AppSidebar } from './AppSidebar'

const session = vi.hoisted(() => ({
  pathname: '/inventory',
  mobile: false,
  user: null as AuthUser | null,
  permissions: [] as string[],
  pending: false,
  error: false,
  hasData: true,
  retry: vi.fn(),
}))
vi.mock('next/navigation', () => ({ usePathname: () => session.pathname }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => session.mobile }))
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { user: AuthUser | null }) => unknown) =>
    selector({ user: session.user }),
}))
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({
    data: session.hasData ? { permissions: session.permissions } : undefined,
    isPending: session.pending,
    isError: session.error,
    error: session.error ? new Error('permission lookup failed') : null,
    refetch: session.retry,
  }),
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('next/link', () => ({
  default: ({ onNavigate, ...props }: ComponentProps<'a'> & { onNavigate?: () => void }) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault()
        if (!event.ctrlKey && !event.metaKey) onNavigate?.()
      }}
    />
  ),
}))

function SidebarTestControls() {
  const { open, setOpenMobile } = useSidebar()
  return (
    <>
      <output aria-label="Trạng thái sidebar">{open ? 'expanded' : 'collapsed'}</output>
      <button onClick={() => setOpenMobile(true)}>Mở menu mobile</button>
      <button>Ngoài menu</button>
    </>
  )
}

function Harness() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarTestControls />
      </SidebarProvider>
    </TooltipProvider>
  )
}

beforeEach(() => {
  session.pathname = '/inventory'
  session.mobile = false
  session.permissions = [P.PRODUCTS_VIEW, P.SUPPLIERS_VIEW, P.WAREHOUSES_VIEW, P.STAFF_VIEW]
  session.user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    role: USER_ROLES.WarehouseManager,
    fullName: 'Manager',
    email: 'manager@example.test',
    isActive: true,
  }
  session.pending = false
  session.error = false
  session.hasData = true
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('catalog integration with the application sidebar', () => {
  it.each(['/tasks', '/tasks/history'])(
    'opens the task group for %s and marks only its matching child',
    (pathname) => {
      session.pathname = pathname
      session.permissions = [P.WAREHOUSE_TASKS_VIEW_OWN]
      render(<Harness />)
      expect(screen.getByRole('button', { name: 'Công việc kho' })).toHaveAttribute(
        'aria-expanded',
        'true'
      )
      const current = screen.getByRole('link', { name: 'Công việc hiện tại' })
      const history = screen.getByRole('link', { name: 'Lịch sử công việc' })
      expect(pathname === '/tasks' ? current : history).toHaveAttribute('aria-current', 'page')
      expect(pathname === '/tasks' ? history : current).not.toHaveAttribute('aria-current')
    }
  )

  it('groups owner billing and audit navigation under System without obsolete menus', async () => {
    session.user = { ...session.user!, role: USER_ROLES.TenantOwner }
    session.pathname = '/subscription/payments'
    session.permissions = [
      P.SUBSCRIPTIONS_VIEW,
      P.PAYMENTS_VIEW,
      P.AUDIT_LOGS_VIEW,
      P.NOTIFICATIONS_VIEW,
    ]
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Hệ thống' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Gói dịch vụ' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Nhật ký hoạt động' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dịch vụ' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Thông báo' })).toHaveAttribute(
      'href',
      '/notifications'
    )
    expect(screen.queryByRole('link', { name: 'Cài đặt' })).not.toBeInTheDocument()
  })

  it.each([false, true])(
    'places the catalog directly after other sections with a shared divider on mobile=%s',
    async (mobile) => {
      session.mobile = mobile
      session.permissions = [...session.permissions, P.DASHBOARD_VIEW]
      render(<Harness />)
      if (mobile) await userEvent.click(screen.getByRole('button', { name: 'Mở menu mobile' }))
      const navigation = screen.getByRole('navigation', { name: 'Điều hướng chính' })
      const trigger = screen.getByRole('button', { name: 'Danh mục' })
      const catalogContainer = navigation.lastElementChild!
      expect(navigation).toHaveClass('flex', 'shrink-0', 'flex-col')
      expect(navigation).not.toHaveClass('flex-1')
      expect(catalogContainer).toContainElement(trigger)
      expect(catalogContainer).toHaveClass('pt-3', 'shrink-0')
      expect(catalogContainer).not.toHaveClass('mt-auto')
      expect(catalogContainer.firstElementChild).toHaveAttribute('data-slot', 'sidebar-separator')
      expect(catalogContainer.querySelector('[data-slot="sidebar-separator"]')).toHaveAttribute(
        'data-orientation',
        'horizontal'
      )
      expect(navigation.querySelectorAll('[data-slot="sidebar-separator"]')).toHaveLength(2)
      const workspace = navigation.firstElementChild!
      expect(workspace).toContainElement(screen.getByRole('link', { name: 'Dashboard' }))
      expect(workspace).toContainElement(screen.getByRole('link', { name: 'Vật tư hàng hóa' }))
      expect(workspace.lastElementChild).toHaveAttribute('data-slot', 'sidebar-separator')
    }
  )

  it('does not leave a catalog divider when there is no catalog access', () => {
    session.permissions = [P.STAFF_VIEW]
    render(<Harness />)
    expect(screen.queryByRole('button', { name: 'Danh mục' })).not.toBeInTheDocument()
    expect(
      screen
        .getByRole('navigation', { name: 'Điều hướng chính' })
        .querySelector('[data-slot="sidebar-separator"]')
    ).not.toBeInTheDocument()
  })

  it('waits 400ms before closing the catalog and restoring a hover-expanded sidebar', () => {
    vi.useFakeTimers()
    localStorage.setItem('sidebar_state', 'false')
    const { container } = render(<Harness />)
    const content = container.querySelector('[data-slot="sidebar-content"]')!
    fireEvent.mouseEnter(content)
    const trigger = screen.getByRole('button', { name: 'Danh mục' })
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
    fireEvent.mouseLeave(content)
    act(() => vi.advanceTimersByTime(399))
    expect(screen.getByRole('dialog', { name: 'Danh mục' })).toBeInTheDocument()
    expect(screen.getByLabelText('Trạng thái sidebar')).toHaveTextContent('expanded')
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('dialog', { name: 'Danh mục' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Trạng thái sidebar')).toHaveTextContent('collapsed')
    expect(localStorage.getItem('sidebar_state')).toBe('false')
  })

  it('cancels the old route timer before opening a menu in the new route', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Harness />)
    let trigger = screen.getByRole('button', { name: 'Danh mục' })
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(300))
    session.pathname = '/products'
    rerender(<Harness />)
    trigger = screen.getByRole('button', { name: 'Danh mục' })
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('dialog', { name: 'Danh mục' })).toBeInTheDocument()
  })

  it('keeps a hover-expanded sidebar open while entering the portal and restores its saved collapsed preference', async () => {
    localStorage.setItem('sidebar_state', 'false')
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    const content = container.querySelector('[data-slot="sidebar-content"]')!
    expect(screen.getByLabelText('Trạng thái sidebar')).toHaveTextContent('collapsed')
    fireEvent.mouseEnter(content)
    expect(screen.getByLabelText('Trạng thái sidebar')).toHaveTextContent('expanded')
    expect(localStorage.getItem('sidebar_state')).toBe('false')
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    fireEvent.mouseLeave(content)
    expect(screen.getByRole('dialog', { name: 'Danh mục' })).toBeInTheDocument()
    expect(screen.getByLabelText('Trạng thái sidebar')).toHaveTextContent('expanded')
    await user.click(screen.getByRole('button', { name: 'Ngoài menu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Trạng thái sidebar')).toHaveTextContent('collapsed')
    expect(localStorage.getItem('sidebar_state')).toBe('false')
  })

  it('does not collapse a pinned sidebar after closing the catalog', async () => {
    localStorage.setItem('sidebar_state', 'true')
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    fireEvent.mouseLeave(container.querySelector('[data-slot="sidebar-content"]')!)
    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Trạng thái sidebar')).toHaveTextContent('expanded')
    expect(localStorage.getItem('sidebar_state')).toBe('true')
  })

  it('closes across routes and never reopens a previous route automatically', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    session.pathname = '/products'
    rerender(<Harness />)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    session.pathname = '/inventory'
    rerender(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when authorized destinations or tenant identity change', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    session.permissions = [P.WAREHOUSES_VIEW]
    rerender(<Harness />)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    expect(screen.queryByRole('link', { name: 'Nhà cung cấp' })).not.toBeInTheDocument()
    session.user = { ...session.user!, tenantId: 'tenant-2' }
    rerender(<Harness />)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes the desktop overlay when entering the mobile breakpoint', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    session.mobile = true
    rerender(<Harness />)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Danh mục' })).not.toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: 'Mở menu mobile' }))
    expect(screen.getByRole('button', { name: 'Danh mục' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    expect(screen.getByRole('link', { name: 'Kho hàng' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Kho hàng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('does not expose unfiltered links while loading and preserves retry on permission lookup failure', async () => {
    session.hasData = false
    session.pending = true
    const { rerender } = render(<Harness />)
    expect(screen.getByText('Đang tải điều hướng…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Danh mục' })).not.toBeInTheDocument()
    session.pending = false
    session.error = true
    rerender(<Harness />)
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải quyền điều hướng')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(session.retry).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Danh mục' })).not.toBeInTheDocument()
  })
})
