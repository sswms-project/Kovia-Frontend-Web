import { useState, type ComponentProps } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { P } from '@/config/permissionCodes'
import { USER_ROLES } from '@/config/roles'
import { getVisibleNavSections, type NavSection } from '../nav-config'
import { CatalogNavigation } from './CatalogNavigation'

const viewport = vi.hoisted(() => ({ mobile: false }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => viewport.mobile }))
vi.mock('next/link', () => ({
  default: ({
    onNavigate,
    onClick,
    ...props
  }: ComponentProps<'a'> & { onNavigate?: () => void }) => (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
        if (!event.ctrlKey && !event.metaKey && event.button === 0) onNavigate?.()
      }}
    />
  ),
}))

const allPermissions = [
  P.PRODUCTS_VIEW,
  P.CATEGORIES_VIEW,
  P.UNITS_VIEW,
  P.STOCK_RECIPIENTS_VIEW,
  P.SUPPLIERS_VIEW,
  P.WAREHOUSES_VIEW,
]
function catalogSection(permissions = allPermissions) {
  return getVisibleNavSections(USER_ROLES.TenantOwner, new Set(permissions)).find(
    (section) => section.presentation === 'catalog'
  )!
}

function Harness({
  section = catalogSection(),
  onNavigate = vi.fn(),
  pathname = '/products/product-1',
}: {
  section?: NavSection
  onNavigate?: () => void
  pathname?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <TooltipProvider>
      <SidebarProvider>
        <CatalogNavigation
          section={section}
          pathname={pathname}
          onNavigate={onNavigate}
          control={{ open, onOpenChange: setOpen }}
        />
        <button type="button">Ngoài menu</button>
      </SidebarProvider>
    </TooltipProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  viewport.mobile = false
})

describe('catalog menu composition', () => {
  it('opens a non-modal portal with three groups, seven links and the current destination', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Danh mục' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('data-active', 'true')
    await user.click(trigger)
    const panel = screen.getByRole('dialog', { name: 'Danh mục' })
    expect(container.contains(panel)).toBe(false)
    expect(panel).not.toHaveAttribute('aria-modal', 'true')
    expect(within(panel).getAllByRole('link')).toHaveLength(7)
    expect(
      within(panel)
        .getAllByRole('heading')
        .map((heading) => heading.textContent)
    ).toEqual(['Vật tư hàng hóa', 'Đối tượng', 'Kho & bố trí'])
    expect(within(panel).getByRole('link', { name: 'Vật tư hàng hóa' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(within(panel).queryByRole('link', { name: 'Nhân viên' })).not.toBeInTheDocument()
    expect(panel).toHaveClass('border', 'border-border', 'motion-reduce:animate-none')
    expect(within(panel).getByRole('navigation')).toBeInTheDocument()
    expect(panel.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument()
  })

  it('supports keyboard open, focus order and Escape returning focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Danh mục' })
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Vật tư hàng hóa' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Nhóm vật tư hàng hóa' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('link', { name: 'Vật tư hàng hóa' })).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on outside interaction without stealing focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    const outside = screen.getByRole('button', { name: 'Ngoài menu' })
    await user.click(outside)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(outside).toHaveFocus()
  })

  it('keeps native modified links and closes only on ordinary navigation without restoring trigger focus', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<Harness onNavigate={onNavigate} />)
    const trigger = screen.getByRole('button', { name: 'Danh mục' })
    await user.click(trigger)
    const link = screen.getByRole('link', { name: 'Khách hàng' })
    expect(link).toHaveAttribute('href', '/stock-recipients')
    fireEvent.click(link, { ctrlKey: true })
    expect(onNavigate).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(link)
    expect(onNavigate).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).not.toHaveFocus()
  })

  it('omits empty groups and adapts the panel to the authorized group count', async () => {
    const user = userEvent.setup()
    render(<Harness section={catalogSection([P.SUPPLIERS_VIEW])} />)
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    const panel = screen.getByRole('dialog')
    expect(panel).toHaveClass('w-64')
    expect(within(panel).getAllByRole('heading')).toHaveLength(1)
    expect(within(panel).getAllByRole('link')).toHaveLength(1)
    expect(within(panel).getByRole('heading', { name: 'Đối tượng' })).toBeInTheDocument()
  })

  it('does not render an empty catalog trigger', () => {
    render(<Harness section={{ id: 'catalog', items: [] }} />)
    expect(screen.queryByRole('button', { name: 'Danh mục' })).not.toBeInTheDocument()
  })

  it('uses an inline vertical list on mobile, not a nested overlay', async () => {
    viewport.mobile = true
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const { container } = render(<Harness onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: 'Danh mục' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container).toContainElement(screen.getByRole('navigation', { name: 'Danh mục dữ liệu' }))
    expect(screen.getByRole('navigation')).toHaveClass('grid-cols-1')
    await user.click(screen.getByRole('link', { name: 'Sơ đồ kho' }))
    expect(onNavigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Danh mục' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})

function openByHover() {
  vi.useFakeTimers()
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Danh mục' })
  const outside = screen.getByRole('button', { name: 'Ngoài menu' })
  act(() => outside.focus())
  fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
  return { trigger, outside, panel: screen.getByRole('dialog', { name: 'Danh mục' }) }
}

function advanceCloseTime(milliseconds: number) {
  act(() => vi.advanceTimersByTime(milliseconds))
}

describe('catalog hover and focus delay', () => {
  it('opens on hover without taking focus and closes at 400ms, not 399ms', () => {
    const { trigger, outside } = openByHover()
    expect(outside).toHaveFocus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
    advanceCloseTime(399)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    advanceCloseTime(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(outside).toHaveFocus()
  })

  it('treats the trigger and portal as one hover region and delays closing after leaving the panel', () => {
    const { trigger, panel } = openByHover()
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
    advanceCloseTime(300)
    fireEvent.pointerEnter(panel, { pointerType: 'mouse' })
    advanceCloseTime(1000)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.pointerLeave(panel, { pointerType: 'mouse' })
    advanceCloseTime(399)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    advanceCloseTime(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancels the pending close when returning to the trigger', () => {
    const { trigger } = openByHover()
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
    advanceCloseTime(300)
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
    advanceCloseTime(1000)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
    advanceCloseTime(400)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes a hover-only menu on Escape without moving focus from the working page', () => {
    const { outside } = openByHover()
    fireEvent.keyDown(outside, { key: 'Escape' })
    advanceCloseTime(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(outside).toHaveFocus()
  })

  it('keeps keyboard focus on either region open, then waits 400ms after focus leaves both', () => {
    const { trigger, outside } = openByHover()
    act(() => trigger.focus())
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' })
    advanceCloseTime(1000)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => screen.getByRole('link', { name: 'Khách hàng' }).focus())
    advanceCloseTime(1000)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => outside.focus())
    advanceCloseTime(399)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    advanceCloseTime(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(outside).toHaveFocus()
  })

  it('opens on focus without a click and Escape closes immediately without reopening on restored focus', () => {
    vi.useFakeTimers()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Danh mục' })
    act(() => trigger.focus())
    const panel = screen.getByRole('dialog')
    fireEvent.keyDown(panel, { key: 'Escape' })
    advanceCloseTime(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    advanceCloseTime(1000)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clears a pending close callback on unmount', () => {
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const { unmount } = render(
      <TooltipProvider>
        <SidebarProvider>
          <CatalogNavigation
            section={catalogSection()}
            pathname="/products"
            control={{ open: true, onOpenChange }}
            onNavigate={vi.fn()}
          />
        </SidebarProvider>
      </TooltipProvider>
    )
    fireEvent.pointerLeave(screen.getByRole('dialog'), { pointerType: 'mouse' })
    unmount()
    advanceCloseTime(1000)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('does not open from a touch hover on desktop', () => {
    render(<Harness />)
    const pointerEvent = new Event('pointerover', { bubbles: true })
    Object.defineProperty(pointerEvent, 'pointerType', { value: 'touch' })
    fireEvent(screen.getByRole('button', { name: 'Danh mục' }), pointerEvent)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps mobile as tap-to-toggle rather than focus/hover-to-open', () => {
    vi.useFakeTimers()
    viewport.mobile = true
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Danh mục' })
    fireEvent.pointerEnter(trigger)
    act(() => trigger.focus())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.pointerLeave(trigger)
    advanceCloseTime(1000)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
