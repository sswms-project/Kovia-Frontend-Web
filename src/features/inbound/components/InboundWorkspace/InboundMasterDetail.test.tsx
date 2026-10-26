import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { useImperativeHandle, type HTMLAttributes, type ReactNode } from 'react'
import type { PanelProps, SeparatorProps } from 'react-resizable-panels'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { OperationalMasterDetail } from '@/components/operations/OperationalMasterDetail'
import { InboundMasterDetail, INBOUND_DETAIL_STORAGE_KEY } from './InboundMasterDetail'

const resizeMock = vi.hoisted(() => ({
  isMobile: false,
  masterId: '',
  detailId: '',
  onLayoutChange: undefined as ((layout: Record<string, number>) => void) | undefined,
  onLayoutChanged: undefined as ((layout: Record<string, number>) => void) | undefined,
  detailCollapsible: false,
  detailHasResizeCallback: false,
  masterOnResize: undefined as (() => void) | undefined,
  detailMinSize: '',
  resize: vi.fn(),
  collapse: vi.fn(),
}))

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => resizeMock.isMobile }))
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({
    children,
    onLayoutChange,
    onLayoutChanged,
  }: {
    children: ReactNode
    onLayoutChange: (layout: Record<string, number>) => void
    onLayoutChanged: (layout: Record<string, number>) => void
  }) => {
    resizeMock.onLayoutChange = onLayoutChange
    resizeMock.onLayoutChanged = onLayoutChanged
    return <div data-testid="panel-group">{children}</div>
  },
  ResizablePanel: ({
    children,
    id,
    collapsedSize,
    collapsible,
    onResize,
    minSize,
    panelRef,
  }: PanelProps) => {
    useImperativeHandle(panelRef, () => ({
      resize: resizeMock.resize,
      collapse: resizeMock.collapse,
      expand: vi.fn(),
      getSize: () => ({ asPercentage: 0, inPixels: 0 }),
      isCollapsed: () => false,
    }))
    if (!collapsedSize && onResize)
      resizeMock.masterOnResize = () => onResize({ asPercentage: 0, inPixels: 0 }, id, undefined)
    if (id && !collapsedSize) resizeMock.masterId = id
    if (collapsedSize) {
      resizeMock.detailId = id ?? ''
      resizeMock.detailCollapsible = Boolean(collapsible)
      resizeMock.detailHasResizeCallback = Boolean(onResize)
      resizeMock.detailMinSize = String(minSize)
    }
    return <div>{children}</div>
  },
}))
vi.mock('react-resizable-panels', () => ({
  Separator: ({
    disabled,
    elementRef,
    disableDoubleClick,
    ...props
  }: SeparatorProps & HTMLAttributes<HTMLDivElement>) => (
    <div
      ref={elementRef}
      role="separator"
      aria-disabled={disabled}
      data-disable-double-click={disableDoubleClick}
      {...props}
    />
  ),
}))

function PersistedWorkspace() {
  const [expanded, setExpanded] = useLocalStorage(INBOUND_DETAIL_STORAGE_KEY, false)
  return (
    <InboundMasterDetail expanded={expanded} onExpandedChange={setExpanded} detail="Goods">
      Documents
    </InboundMasterDetail>
  )
}

afterEach(() => {
  cleanup()
  resizeMock.isMobile = false
  localStorage.removeItem(INBOUND_DETAIL_STORAGE_KEY)
  vi.clearAllMocks()
})

describe('inbound master/detail persistent expand button', () => {
  it.each(['chi tiết hàng hóa', 'chi tiết xuất kho', 'chi tiết điều chuyển'])(
    'keeps %s in natural document flow on phones and restores resizing on desktop',
    (detailLabel) => {
      resizeMock.isMobile = true
      const onExpandedChange = vi.fn()
      const workspace = (expanded: boolean) => (
        <OperationalMasterDetail
          expanded={expanded}
          detailId="mobile-detail"
          detailLabel={detailLabel}
          onExpandedChange={onExpandedChange}
          detail={<section id="mobile-detail">Items</section>}
        >
          Orders
        </OperationalMasterDetail>
      )
      const view = render(workspace(true))
      const button = screen.getByRole('button', { name: `Thu gọn ${detailLabel}` })
      expect(button).toHaveClass('min-h-11')
      expect(button.parentElement).toHaveClass('shrink-0', 'min-h-fit')
      expect(screen.queryByRole('separator')).not.toBeInTheDocument()
      expect(screen.queryByTestId('panel-group')).not.toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeVisible()
      expect(screen.getByText('Items')).toBeVisible()
      fireEvent.click(button)
      expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(false)
      view.rerender(workspace(false))
      expect(screen.getByText('Items')).not.toBeVisible()
      expect(screen.getByText('Orders')).toBeVisible()
      resizeMock.isMobile = false
      view.rerender(workspace(true))
      expect(screen.getByTestId('panel-group')).toBeInTheDocument()
      expect(screen.getByRole('separator')).toBeInTheDocument()
      expect(resizeMock.resize).toHaveBeenLastCalledWith('35%')
    }
  )
  it('tracks the divider immediately in both resize directions', () => {
    render(
      <InboundMasterDetail expanded onExpandedChange={vi.fn()} detail="Goods">
        Documents
      </InboundMasterDetail>
    )
    const workspace = screen.getByTestId('panel-group').parentElement
    const separator = screen.getByRole('separator')
    const toggleWrapper = screen.getByRole('button', {
      name: 'Thu gọn chi tiết hàng hóa',
    }).parentElement
    vi.spyOn(workspace!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 800, 600))
    for (const top of [400, 250, 500, 680]) {
      vi.spyOn(separator, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 800, 12))
      act(() => resizeMock.masterOnResize?.())
      expect(toggleWrapper?.style.top).toBe(`${top - 100 + 6}px`)
    }
  })

  it('keeps the button outside the drag region without animating its position', () => {
    const onExpandedChange = vi.fn()
    render(
      <InboundMasterDetail expanded onExpandedChange={onExpandedChange} detail="Goods">
        Documents
      </InboundMasterDetail>
    )
    const toggle = screen.getByRole('button', { name: 'Thu gọn chi tiết hàng hóa' })
    expect(screen.getByTestId('panel-group').contains(toggle)).toBe(false)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveClass('transition-colors')
    expect(toggle).not.toHaveClass('transition-all')
    expect(toggle).toHaveClass('active:not-aria-[haspopup]:translate-y-0')
    expect(toggle).not.toHaveClass('-translate-y-1/2')
    expect(toggle.parentElement).toHaveClass('-translate-y-1/2', '-translate-x-1/2')
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(resizeMock.detailCollapsible).toBe(true)
    expect(resizeMock.detailMinSize).toBe('1px')
    expect(resizeMock.detailHasResizeCallback).toBe(false)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(toggle)
    expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('disables dragging while collapsed and opens only through the button', () => {
    const onExpandedChange = vi.fn()
    render(
      <InboundMasterDetail expanded={false} onExpandedChange={onExpandedChange} detail="Goods">
        Documents
      </InboundMasterDetail>
    )
    const toggle = screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('separator')).toHaveAttribute('aria-disabled', 'true')
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).not.toBeVisible()
    fireEvent.click(screen.getByText('Documents'))
    expect(onExpandedChange).not.toHaveBeenCalled()
    fireEvent.click(toggle)
    expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('does not close a restored open preference on the initial zero-sized layout', () => {
    const onExpandedChange = vi.fn()
    render(
      <InboundMasterDetail expanded onExpandedChange={onExpandedChange} detail="Goods">
        Documents
      </InboundMasterDetail>
    )
    act(() => resizeMock.onLayoutChange?.({ [resizeMock.masterId]: 100, [resizeMock.detailId]: 0 }))
    act(() =>
      resizeMock.onLayoutChanged?.({ [resizeMock.masterId]: 100, [resizeMock.detailId]: 0 })
    )
    expect(onExpandedChange).not.toHaveBeenCalled()
  })

  it('persists collapse when dragging an open detail panel down to zero', () => {
    localStorage.setItem(INBOUND_DETAIL_STORAGE_KEY, 'true')
    const view = render(<PersistedWorkspace />)
    fireEvent.pointerDown(screen.getByRole('separator'))
    act(() => resizeMock.onLayoutChange?.({ [resizeMock.masterId]: 60, [resizeMock.detailId]: 40 }))
    act(() => resizeMock.onLayoutChange?.({ [resizeMock.masterId]: 100, [resizeMock.detailId]: 0 }))
    expect(localStorage.getItem(INBOUND_DETAIL_STORAGE_KEY)).toBe('true')
    act(() =>
      resizeMock.onLayoutChanged?.({ [resizeMock.masterId]: 100, [resizeMock.detailId]: 0 })
    )
    expect(localStorage.getItem(INBOUND_DETAIL_STORAGE_KEY)).toBe('false')
    expect(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    view.unmount()
    render(<PersistedWorkspace />)
    expect(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' })).toBeInTheDocument()
  })

  it('does not collapse before the detail size reaches zero', () => {
    const onExpandedChange = vi.fn()
    render(
      <InboundMasterDetail expanded onExpandedChange={onExpandedChange} detail="Goods">
        Documents
      </InboundMasterDetail>
    )
    for (const size of [20, 10, 5, 1, 0.2]) {
      fireEvent.pointerDown(screen.getByRole('separator'))
      act(() => resizeMock.onLayoutChanged?.({ [resizeMock.detailId]: size }))
    }
    expect(onExpandedChange).not.toHaveBeenCalled()
  })

  it('restores the last usable height after a button collapse', async () => {
    render(<PersistedWorkspace />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' }))
    expect(resizeMock.resize).toHaveBeenLastCalledWith('35%')
    fireEvent.pointerDown(screen.getByRole('separator'))
    act(() => resizeMock.onLayoutChange?.({ [resizeMock.detailId]: 48 }))
    act(() => resizeMock.onLayoutChanged?.({ [resizeMock.detailId]: 48 }))
    await user.click(screen.getByRole('button', { name: 'Thu gọn chi tiết hàng hóa' }))
    await user.click(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' }))
    expect(resizeMock.resize).toHaveBeenLastCalledWith('48%')
    fireEvent.pointerDown(screen.getByRole('separator'))
    act(() => resizeMock.onLayoutChange?.({ [resizeMock.detailId]: 1 }))
    act(() => resizeMock.onLayoutChanged?.({ [resizeMock.detailId]: 1 }))
    await user.click(screen.getByRole('button', { name: 'Thu gọn chi tiết hàng hóa' }))
    await user.click(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' }))
    expect(resizeMock.resize).toHaveBeenLastCalledWith('25%')
  })

  it.each(['chi tiết xuất kho', 'chi tiết điều chuyển'])(
    'supports a composed %s workspace without inbound data',
    (detailLabel) => {
      const onExpandedChange = vi.fn()
      render(
        <OperationalMasterDetail
          expanded
          detailId="shared-detail"
          detailLabel={detailLabel}
          onExpandedChange={onExpandedChange}
          detail={<section id="shared-detail">Items</section>}
        >
          Orders
        </OperationalMasterDetail>
      )
      const button = screen.getByRole('button', { name: `Thu gọn ${detailLabel}` })
      expect(button).toHaveAttribute('aria-controls', 'shared-detail')
      fireEvent.click(button)
      expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(false)
    }
  )

  it('supports Space activation and associates the control with the detail panel', async () => {
    const onExpandedChange = vi.fn()
    render(
      <InboundMasterDetail expanded onExpandedChange={onExpandedChange} detail="Goods">
        Documents
      </InboundMasterDetail>
    )
    const toggle = screen.getByRole('button', { name: 'Thu gọn chi tiết hàng hóa' })
    toggle.focus()
    await userEvent.setup().keyboard(' ')
    expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeVisible()
  })

  it('remembers both enabled and disabled preferences after leaving and returning', async () => {
    const user = userEvent.setup()
    let view = render(<PersistedWorkspace />)
    expect(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    await user.click(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' }))
    expect(localStorage.getItem(INBOUND_DETAIL_STORAGE_KEY)).toBe('true')
    view.unmount()
    view = render(<PersistedWorkspace />)
    expect(screen.getByRole('button', { name: 'Thu gọn chi tiết hàng hóa' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    await user.click(screen.getByRole('button', { name: 'Thu gọn chi tiết hàng hóa' }))
    expect(localStorage.getItem(INBOUND_DETAIL_STORAGE_KEY)).toBe('false')
    view.unmount()
    render(<PersistedWorkspace />)
    expect(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('renders safely on the server and recovers from invalid stored JSON', () => {
    localStorage.setItem(INBOUND_DETAIL_STORAGE_KEY, 'true')
    expect(renderToString(<PersistedWorkspace />)).toContain('aria-expanded="false"')
    localStorage.setItem(INBOUND_DETAIL_STORAGE_KEY, '{broken')
    render(<PersistedWorkspace />)
    expect(screen.getByRole('button', { name: 'Mở chi tiết hàng hóa' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})
