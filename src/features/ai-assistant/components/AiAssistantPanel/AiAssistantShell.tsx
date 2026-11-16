'use client'

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { useAiPanelLayout } from '../../hooks/use-ai-panel-layout'
import { clampAiPanelWidth } from '../../utils/ai-panel-layout'
import { AiPanelResizeHandle } from './AiPanelResizeHandle'

const TABBABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface AiAssistantShellProps {
  readonly children: ReactNode
}

/**
 * Fixed right-hand frame. Stays mounted once opened (hidden with `inert`), so the draft, the
 * current conversation and the scroll position survive minimizing and mode changes.
 */
export function AiAssistantShell({ children }: AiAssistantShellProps) {
  const isOpen = useAiAssistantPanelStore((state) => state.isOpen)
  const isResizing = useAiAssistantPanelStore((state) => state.isResizing)
  const mode = useAiAssistantPanelStore((state) => state.mode)
  const setOpen = useAiAssistantPanelStore((state) => state.setOpen)
  const setWidth = useAiAssistantPanelStore((state) => state.setWidth)
  const setResizing = useAiAssistantPanelStore((state) => state.setResizing)
  const layout = useAiPanelLayout()
  const isDocked = layout.placement === 'docked'
  // Overlay and full screen cover the page, so they behave as a dialog; docked stays a side landmark.
  const isModal = isOpen && !isDocked
  const panelRef = useRef<HTMLElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  // Remember who opened the panel (a layout effect runs before the composer takes focus) and hand
  // focus back when it closes, since `inert` otherwise drops it to the page start.
  useLayoutEffect(() => {
    if (!isModal) return
    const panel = panelRef.current
    returnFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      const target = returnFocusTo.current
      returnFocusTo.current = null
      // A switch to docked while open (window resize) is not a close: leave focus where it is.
      if (useAiAssistantPanelStore.getState().isOpen || !target?.isConnected) return
      const active = document.activeElement
      if (active === document.body || panel?.contains(active)) target.focus()
    }
  }, [isModal])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isDocked) return // Beside the page, so Escape and Tab belong to the page.
    if (event.key === 'Escape' && !event.defaultPrevented) setOpen(false)
    // aria-modal promises that focus stays inside: wrap Tab at both ends. Portaled popovers of the
    // panel's own controls bubble here too, so only wrap when focus is in the panel itself.
    const panel = panelRef.current
    if (event.key !== 'Tab' || !panel || !(event.target instanceof Node)) return
    if (!panel.contains(event.target)) return
    const tabbable = [...panel.querySelectorAll<HTMLElement>(TABBABLE)].filter(
      (element) => element.offsetParent !== null
    )
    const first = tabbable[0]
    const last = tabbable.at(-1)
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      {/* A floating panel is a layer over the page: dim it and let a click outside close it. Mouse
          convenience only, since Escape closes the dialog for the keyboard. */}
      {layout.placement === 'overlay' ? (
        <div
          aria-hidden
          data-slot="ai-assistant-scrim"
          onClick={() => setOpen(false)}
          className={cn(
            'bg-foreground/25 fixed inset-0 z-30 transition-opacity duration-(--ai-motion-panel) ease-(--ai-ease-out) motion-reduce:duration-150 print:hidden',
            isOpen ? 'opacity-100 starting:opacity-0' : 'pointer-events-none opacity-0'
          )}
        />
      ) : null}
      <aside
        ref={panelRef}
        data-slot="ai-assistant-panel"
        role={isModal ? 'dialog' : undefined}
        aria-modal={isModal ? true : undefined}
        aria-label="Trợ lý Kovia AI"
        aria-hidden={!isOpen}
        inert={!isOpen}
        onKeyDown={handleKeyDown}
        style={layout.width === null ? undefined : { width: layout.width }}
        className={cn(
          'bg-background fixed right-0 bottom-0 z-40 flex flex-col border-l print:hidden',
          // Docked: below the app header (h-14), beside the page that made room for it; the header and the
          // sidebar never move. Overlay and full screen cover the whole viewport.
          isDocked ? 'top-14' : 'top-0',
          layout.width === null && 'h-dvh w-screen',
          !isDocked && layout.width !== null && 'shadow-lg',
          // Tailwind v4 dịch chuyển bằng thuộc tính `translate`, không phải `transform`.
          'transition-[translate,opacity] duration-(--ai-motion-panel) ease-(--ai-ease-out) motion-reduce:duration-200',
          isResizing && 'transition-none',
          // Trượt hẳn ra mép phải khi đóng. `starting:` cho lần mở đầu tiên (khung vừa được mount đã ở trạng thái mở)
          // cũng trượt vào thay vì hiện ngay. Khi người dùng bật giảm chuyển động của hệ điều hành, quãng trượt
          // giảm xuống còn 1.5rem kèm mờ dần: vẫn thấy khung vào/ra nhưng không có chuyển động lớn.
          isOpen
            ? 'translate-x-0 opacity-100 starting:translate-x-full starting:opacity-0 motion-reduce:starting:translate-x-6'
            : 'pointer-events-none translate-x-full opacity-0 motion-reduce:translate-x-6'
        )}
      >
        {mode === 'docked' && layout.width !== null ? (
          <AiPanelResizeHandle
            width={layout.width}
            minWidth={layout.minWidth}
            maxWidth={layout.maxWidth}
            onResize={(width) => {
              setResizing(true)
              setWidth(clampAiPanelWidth(width, layout))
            }}
            onResizeEnd={(width) => {
              setWidth(clampAiPanelWidth(width, layout))
              setResizing(false)
            }}
          />
        ) : null}
        {children}
      </aside>
    </>
  )
}
